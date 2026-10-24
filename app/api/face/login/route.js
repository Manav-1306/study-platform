import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  DEVICE_COOKIE,
  FACE_MATCH_LIMIT,
  MAX_FACE_FAILURES,
  faceDistance,
  getSupabaseAdmin,
  hashDeviceToken,
  isValidDescriptor,
} from "../../../lib/face-server";

function readSessionId(accessToken) {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString());
    return payload.session_id ?? null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a valid face scan." }, { status: 400 });
  }

  if (!isValidDescriptor(body?.descriptor)) {
    return Response.json({ error: "Send a valid face scan." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(DEVICE_COOKIE)?.value;
  if (!token) {
    return Response.json(
      { error: "Face login is not set up on this device. Use your email and password.", noDevice: true },
      { status: 401 },
    );
  }

  try {
    const admin = getSupabaseAdmin();
    const tokenHash = hashDeviceToken(token);

    const { data: device } = await admin
      .from("trusted_devices")
      .select("user_id, failed_attempts")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!device) {
      cookieStore.delete(DEVICE_COOKIE);
      return Response.json(
        { error: "Face login is not set up on this device. Use your email and password.", noDevice: true },
        { status: 401 },
      );
    }

    const { data: profile } = await admin
      .from("face_profiles")
      .select("descriptor")
      .eq("user_id", device.user_id)
      .maybeSingle();

    if (!profile || !isValidDescriptor(profile.descriptor)) {
      return Response.json({ error: "No saved face for this account. Use your email and password." }, { status: 401 });
    }

    const distance = faceDistance(body.descriptor, profile.descriptor);
    if (!(distance < FACE_MATCH_LIMIT)) {
      const failures = (device.failed_attempts ?? 0) + 1;
      if (failures >= MAX_FACE_FAILURES) {
        await admin.from("trusted_devices").delete().eq("token_hash", tokenHash);
        cookieStore.delete(DEVICE_COOKIE);
        return Response.json(
          { error: "Too many failed attempts. Please sign in with your email and password.", locked: true },
          { status: 401 },
        );
      }
      await admin.from("trusted_devices").update({ failed_attempts: failures }).eq("token_hash", tokenHash);
      return Response.json({ error: "Face not recognised." }, { status: 401 });
    }

    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(device.user_id);
    const email = userResult?.user?.email;
    if (userError || !email) {
      throw new Error("Could not find the account.");
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const hashedToken = linkData?.properties?.hashed_token;
    if (linkError || !hashedToken) {
      throw new Error("Could not start the sign-in.");
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          },
        },
      },
    );

    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: hashedToken,
      type: "magiclink",
    });
    const session = sessionData?.session;
    if (verifyError || !session) {
      throw new Error("Could not create the session.");
    }

    const sessionId = readSessionId(session.access_token);
    if (!sessionId) {
      throw new Error("Could not read the session.");
    }

    const { error: checkError } = await admin
      .from("face_checks")
      .upsert({ session_id: sessionId, user_id: device.user_id, verified_at: new Date().toISOString() });
    if (checkError) {
      throw checkError;
    }

    await admin
      .from("trusted_devices")
      .update({ failed_attempts: 0, last_used_at: new Date().toISOString() })
      .eq("token_hash", tokenHash);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Face login failed:", error?.message);
    return Response.json({ error: "Face login could not finish. Use your email and password." }, { status: 500 });
  }
}