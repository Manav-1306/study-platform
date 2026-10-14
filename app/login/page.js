"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ALLOWED_LOGIN_DOMAINS } from "../lib/auth-config";

function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase is not configured yet.");
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getRedirectDestination() {
    const requestedDestination = new URLSearchParams(window.location.search).get("redirectTo");
    if (!requestedDestination) {
      return "/";
    }

    try {
      const destination = new URL(requestedDestination, window.location.origin);
      if (destination.origin !== window.location.origin) {
        return "/";
      }

      return `${destination.pathname}${destination.search}${destination.hash}`;
    } catch {
      return "/";
    }
  }

  function getAuthErrorMessage(authError, isCreatingAccount) {
    const code = authError?.code?.toLowerCase() ?? "";
    const message = authError?.message?.toLowerCase() ?? "";

    if (
      code === "invalid_credentials" ||
      code === "user_not_found" ||
      message.includes("invalid login credentials")
    ) {
      return "Wrong email or password";
    }

    if (
      code === "user_already_exists" ||
      code === "email_exists" ||
      message.includes("already registered") ||
      message.includes("already exists")
    ) {
      return "Account already exists";
    }

    return (
      authError?.message ||
      (isCreatingAccount
        ? "Could not create your account. Please try again."
        : "Could not sign in. Please try again.")
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }

    const isCreatingAccount = activeTab === "create-account";
    if (!password) {
      setError("Enter your password.");
      return;
    }

    if (isCreatingAccount && password.length < 8) {
      setError("Password too short (at least 8 characters).");
      return;
    }

    if (isCreatingAccount && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (ALLOWED_LOGIN_DOMAINS.length > 0) {
      const domain = normalizedEmail.split("@")[1]?.toLowerCase();
      if (!ALLOWED_LOGIN_DOMAINS.includes(domain)) {
        setError(`Use an email from ${ALLOWED_LOGIN_DOMAINS.join(", ")}.`);
        return;
      }
    }

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: authError } = isCreatingAccount
        ? await supabase.auth.signUp({ email: normalizedEmail, password })
        : await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

      if (authError) {
        console.error("Supabase authentication failed:", authError.message);
        setError(getAuthErrorMessage(authError, isCreatingAccount));
        return;
      }

      if (data.session) {
        router.replace(getRedirectDestination());
        router.refresh();
      } else if (isCreatingAccount) {
        setSuccessMessage("Check your email to confirm your account");
      } else {
        const message = "Sign-in completed without creating a session. Please try again.";
        console.error("Supabase authentication failed:", message);
        setError(message);
      }
    } catch (submitError) {
      const message = submitError?.message || "Could not complete authentication. Please try again.";
      console.error("Supabase authentication failed:", message);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeTab(tab) {
    setActiveTab(tab);
    setError("");
    setSuccessMessage("");
  }

  const isCreatingAccount = activeTab === "create-account";

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
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Welcome to Study Platform</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Use your thapar.edu email to use the AI chat.</p>

          <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Account access">
            <button
              id="sign-in-tab"
              type="button"
              role="tab"
              aria-selected={!isCreatingAccount}
              aria-controls="login-panel"
              onClick={() => changeTab("sign-in")}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                !isCreatingAccount ? "bg-white text-violet-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign in
            </button>
            <button
              id="create-account-tab"
              type="button"
              role="tab"
              aria-selected={isCreatingAccount}
              aria-controls="login-panel"
              onClick={() => changeTab("create-account")}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                isCreatingAccount ? "bg-white text-violet-800 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Create account
            </button>
          </div>

          <form
            id="login-panel"
            role="tabpanel"
            aria-labelledby={isCreatingAccount ? "create-account-tab" : "sign-in-tab"}
            onSubmit={handleSubmit}
            className="mt-6 space-y-4"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@thapar.edu"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isCreatingAccount ? "new-password" : "current-password"}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              />
            </label>

            {isCreatingAccount && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Confirm password</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                />
              </label>
            )}

            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-pressed={showPassword}
              className="text-sm font-semibold text-violet-700 hover:text-violet-900"
            >
              {showPassword ? "Hide password" : "Show password"}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Please wait..." : isCreatingAccount ? "Create account" : "Sign in"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert" aria-live="polite">
              {error}
            </p>
          )}

          {successMessage && (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">
              {successMessage}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
