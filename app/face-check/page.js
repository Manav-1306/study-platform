"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const REGISTER_SAMPLES = 5;
const MAX_FAILED_MATCHES = 8;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase is not configured yet.");
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
}

function getDestination() {
  const requested = new URLSearchParams(window.location.search).get("redirectTo") || "/";
  return requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
}

export default function FaceCheckPage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const runningRef = useRef(false);
  const [stage, setStage] = useState("loading");
  const [mode, setMode] = useState("verify");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        setEmail(data.user.email ?? "");

        const { data: alreadyOk } = await supabase.rpc("face_session_ok");
        if (alreadyOk) {
          window.location.assign(getDestination());
          return;
        }

        const { data: registered, error } = await supabase.rpc("face_registered");
        if (error) throw error;
        if (cancelled) return;
        setMode(registered ? "verify" : "register");
        setStage("ready");
      } catch (initError) {
        console.error("Face check setup failed:", initError?.message);
        if (!cancelled) {
          setMessage("Could not start the face check. Please try again.");
          setStage("error");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      runningRef.current = false;
      stopCamera();
    };
  }, [router]);

    async function finish() {
    runningRef.current = false;
    stopCamera();
    setMessage("Face verified. Opening your study space...");
    try {
      await fetch("/api/face/trust-device", { method: "POST" });
    } catch {
      // Face login on this device can be set up the next time.
    }
    window.location.assign(getDestination());
  }

  async function startCheck() {
    if (mode === "register" && !consent) {
      setMessage("Please tick the box to agree first.");
      return;
    }

    setMessage("Loading face models...");
    setStage("running");
    runningRef.current = true;

    try {
      const faceapi = await import("@vladmandic/face-api");
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const supabase = getSupabaseBrowserClient();
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      const samples = [];
      let failedMatches = 0;

      setMessage("Look at the camera and hold still...");

      while (runningRef.current) {
        const result = await faceapi
          .detectSingleFace(videoRef.current, options)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!result) {
          setMessage("No face found. Face the camera in good light.");
          await sleep(600);
          continue;
        }

        const descriptor = Array.from(result.descriptor);

        if (mode === "register") {
          samples.push(descriptor);
          setMessage(`Capturing... ${samples.length} of ${REGISTER_SAMPLES}`);

          if (samples.length >= REGISTER_SAMPLES) {
            const average = descriptor.map(
              (_, index) => samples.reduce((sum, sample) => sum + sample[index], 0) / samples.length,
            );
                        const { data: saved, error: insertError } = await supabase.rpc("face_register", {
              candidate: average,
            });
            if (insertError) throw insertError;
            if (!saved) throw new Error("Could not save the face.");

            const { data: matched, error: matchError } = await supabase.rpc("face_match", {
              candidate: average,
            });
            if (matchError) throw matchError;
            if (matched) {
              finish();
              return;
            }
            throw new Error("Saved face did not match.");
          }
          await sleep(700);
        } else {
          const { data: matched, error: matchError } = await supabase.rpc("face_match", {
            candidate: descriptor,
          });
          if (matchError) throw matchError;
          if (matched) {
            finish();
            return;
          }

          failedMatches += 1;
          if (failedMatches >= MAX_FAILED_MATCHES) {
            runningRef.current = false;
            stopCamera();
            setMessage("Your face did not match this account.");
            setStage("failed");
            return;
          }
          setMessage("Not recognised yet. Look straight at the camera.");
          await sleep(800);
        }
      }
    } catch (checkError) {
      console.error("Face check failed:", checkError?.name, checkError?.message);
      runningRef.current = false;
      stopCamera();
      setMessage(
        checkError?.name === "NotAllowedError"
          ? "Camera access was blocked. Allow the camera for this site in Safari settings and try again."
          : "The face check could not finish. Please try again.",
      );
      setStage("error");
    }
  }

  async function signOut() {
    runningRef.current = false;
    stopCamera();
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-[#f8f7f3] px-6 py-12 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">Face check</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            {mode === "register" ? "Set up face login" : "Confirm it is you"}
          </h1>
          {email && <p className="mt-2 text-sm text-slate-600">Signed in as {email}</p>}

          {stage === "loading" && <p className="mt-6 text-sm text-slate-600">Getting ready...</p>}

          {stage === "ready" && mode === "register" && (
            <div className="mt-6 space-y-4">
              <p className="text-sm leading-6 text-slate-600">
                Study Platform will take a few camera snapshots and turn them into a list of 128 numbers that
                describe your face. Photos and video are not saved or uploaded. Only the numbers are stored with
                your account, to confirm it is you each time you sign in. You can ask the Study Platform team to
                delete them at any time.
              </p>
              <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-1"
                />
                I agree to this.
              </label>
            </div>
          )}

          {stage === "ready" && mode === "verify" && (
            <p className="mt-6 text-sm leading-6 text-slate-600">
              Look at the camera to open your study space. Nothing is recorded.
            </p>
          )}

          <video
            ref={videoRef}
            muted
            playsInline
            className={
              stage === "running"
                ? "mt-6 w-full rounded-2xl border border-slate-200 bg-slate-100"
                : "hidden"
            }
          />

          {message && (
            <p className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800" role="status">
              {message}
            </p>
          )}

          {stage === "ready" && (
            <button
              type="button"
              onClick={startCheck}
              className="mt-6 w-full rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white transition hover:bg-violet-800"
            >
              {mode === "register" ? "Start camera and save my face" : "Start camera"}
            </button>
          )}

          {(stage === "failed" || stage === "error") && (
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setStage("ready");
                }}
                className="w-full rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white transition hover:bg-violet-800"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={signOut}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}