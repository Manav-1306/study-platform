"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ALLOWED_LOGIN_DOMAINS } from "../lib/auth-config";

function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase is not configured yet.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email to continue.");
      return;
    }

    if (ALLOWED_LOGIN_DOMAINS.length > 0) {
      const domain = normalizedEmail.split("@")[1]?.toLowerCase();
      if (!ALLOWED_LOGIN_DOMAINS.includes(domain)) {
        setError(`Only ${ALLOWED_LOGIN_DOMAINS.join(", ")} emails can sign in.`);
        return;
      }
    }

    setError("");
    setSuccessMessage("");
    setIsSending(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setSuccessMessage("Check your email (and spam)");
    } catch (submitError) {
      setError(submitError?.message || "Could not send the sign-in link.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f7f3] px-6 py-12 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900"
        >
          <span aria-hidden="true">←</span> Back home
        </Link>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">
            Student access
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Sign in with your email</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We will send a secure sign-in link to your inbox.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@college.edu"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              />
            </label>

            <button
              type="submit"
              disabled={isSending}
              className="w-full rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? "Sending..." : "Send sign-in link"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}

          {successMessage && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">{successMessage}</p>
              <button
                type="button"
                onClick={handleSubmit}
                className="mt-3 text-sm font-semibold text-emerald-900 underline underline-offset-2"
              >
                Resend sign-in link
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
