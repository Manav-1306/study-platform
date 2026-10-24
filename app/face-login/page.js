"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getDestination() {
  const requested = new URLSearchParams(window.location.search).get("redirectTo") || "/";
  return requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
}

export default function FaceLoginPage() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const runningRef = useRef(false);
  const [stage, setStage] = useState("loading");
  const [message, setMessage] = useState("");

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/face/device-status")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setStage(data.available ? "ready" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setStage("unavailable");
      });
    return () => {
      cancelled = true;
      runningRef.current = false;
      stopCamera();
    };
  }, []);

  async function startScan() {
    setStage("running");
    setMessage("Loading face models...");
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

      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      let rejected = 0;
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

        const response = await fetch("/api/face/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ descriptor: Array.from(result.descriptor) }),
        });
        const data = await response.json().catch(() => ({}));

        if (response.ok && data.ok) {
          runningRef.current = false;
          stopCamera();
          setMessage("Face recognised. Opening your study space...");
          window.location.assign(getDestination());
          return;
        }

        if (data.locked || data.noDevice) {
          runningRef.current = false;
          stopCamera();
          setMessage(data.error);
          setStage("unavailable");
          return;
        }

        if (response.status >= 500) {
          throw new Error("Server could not finish the face login.");
        }

        rejected += 1;
        if (rejected >= 4) {
          runningRef.current = false;
          stopCamera();
          setMessage("Face not recognised.");
          setStage("failed");
          return;
        }
        setMessage("Not recognised yet. Look straight at the camera.");
        await sleep(900);
      }
    } catch (scanError) {
      console.error("Face login failed:", scanError?.name, scanError?.message);
      runningRef.current = false;
      stopCamera();
      setMessage(
        scanError?.name === "NotAllowedError"
          ? "Camera access was blocked. Allow the camera for this site in Safari settings and try again."
          : "Face login could not finish. Use your email and password instead.",
      );
      setStage("failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f7f3] px-6 py-12 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900">
          <span aria-hidden="true">←</span> Back to email and password
        </Link>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">Face login</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Sign in with your face</h1>

          {stage === "loading" && <p className="mt-6 text-sm text-slate-600">Getting ready...</p>}

          {stage === "unavailable" && (
            <p className="mt-6 text-sm leading-6 text-slate-600">
              {message || "Sign in once with your email and password on this device to turn on face login here."}
            </p>
          )}

          {stage === "ready" && (
            <p className="mt-6 text-sm leading-6 text-slate-600">
              Look at the camera to sign in. Nothing is recorded.
            </p>
          )}

          <video
            ref={videoRef}
            muted
            playsInline
            className={stage === "running" ? "mt-6 w-full rounded-2xl border border-slate-200 bg-slate-100" : "hidden"}
          />

          {message && stage !== "unavailable" && (
            <p className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800" role="status">
              {message}
            </p>
          )}

          {(stage === "ready" || stage === "failed") && (
            <button
              type="button"
              onClick={startScan}
              className="mt-6 w-full rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white transition hover:bg-violet-800"
            >
              {stage === "failed" ? "Try again" : "Start camera"}
            </button>
          )}

          <Link
            href="/login"
            className="mt-3 block w-full rounded-xl border border-slate-300 px-4 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Use email and password instead
          </Link>
        </div>
      </div>
    </main>
  );
}
