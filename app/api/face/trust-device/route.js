import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  DEVICE_COOKIE,
  deviceCookieOptions,
  getSupabaseAdmin,
  hashDeviceToken,
  newDeviceToken,
} from "../../../lib/face-server";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Cookies can be refreshed later by middleware.
          }
        },
      },
    },
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return Response.json({ error: "Please sign in first." }, { status: 401 });
  }

  const { data: faceOk } = await supabase.rpc("face_session_ok");
  if (!faceOk) {
    return Response.json({ error: "Face check not completed." }, { status: 403 });
  }

  try {
    const admin = getSupabaseAdmin();
    const existing = cookieStore.get(DEVICE_COOKIE)?.value;

    if (existing) {
      const existingHash = hashDeviceToken(existing);
      const { data: row } = await admin
        .from("trusted_devices")
        .select("user_id")
        .eq("token_hash", existingHash)
        .maybeSingle();
      if (row?.user_id === user.id) {
        return Response.json({ ok: true });
      }
      if (row) {
        await admin.from("trusted_devices").delete().eq("token_hash", existingHash);
      }
    }

    const token = newDeviceToken();
    const { error } = await admin
      .from("trusted_devices")
      .insert({ token_hash: hashDeviceToken(token), user_id: user.id });
    if (error) {
      throw error;
    }

    cookieStore.set(DEVICE_COOKIE, token, deviceCookieOptions());
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Trust device failed:", error?.message);
    return Response.json({ error: "Could not remember this device." }, { status: 500 });
  }
}