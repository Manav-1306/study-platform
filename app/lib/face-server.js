import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

export const DEVICE_COOKIE = "sp_device";
export const MAX_FACE_FAILURES = 5;
export const FACE_MATCH_LIMIT = 0.5;

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Server keys are missing.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function newDeviceToken() {
  return randomBytes(32).toString("hex");
}

export function hashDeviceToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function deviceCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  };
}

export function isValidDescriptor(value) {
  return (
    Array.isArray(value) &&
    value.length === 128 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

export function faceDistance(a, b) {
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) {
    const diff = a[index] - b[index];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}