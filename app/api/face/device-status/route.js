import { cookies } from "next/headers";
import { DEVICE_COOKIE, getSupabaseAdmin, hashDeviceToken } from "../../../lib/face-server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEVICE_COOKIE)?.value;
  if (!token) {
    return Response.json({ available: false });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("trusted_devices")
      .select("user_id")
      .eq("token_hash", hashDeviceToken(token))
      .maybeSingle();
    return Response.json({ available: Boolean(data) });
  } catch (error) {
    console.error("Device status failed:", error?.message);
    return Response.json({ available: false });
  }
}