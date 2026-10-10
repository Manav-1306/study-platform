"use client";

import { useEffect, useRef, useState } from "react";

const sessionLengths = [1, 25, 50, 90];

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function FocusTimer() {
  const timerRef = useRef(null);
  const statusRef = useRef("ready");
  const fullscreenRequestPendingRef = useRef(false);
  const fullscreenTransitionAtRef = useRef(0);
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [leaveCount, setLeaveCount] = useState(0);
  const [status, setStatus] = useState("ready");
  const [fullscreenNotice, setFullscreenNotice] = useState("");
  const hasTimeLeft = remainingSeconds > 0;
  const sessionComplete = status === "running" && !hasTimeLeft;

  useEffect(() => {
    if (status !== "running" || !hasTimeLeft) return undefined;

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [hasTimeLeft, status]);

  useEffect(() => {
    if (status !== "running" || !hasTimeLeft) return undefined;

    function pauseForLeaving() {
      if (statusRef.current !== "running") return;

      statusRef.current = "paused";
      setStatus("paused");
      setLeaveCount((count) => count + 1);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        pauseForLeaving();
      }
    }

    function handleFullscreenChange() {
      fullscreenTransitionAtRef.current = Date.now();
    }

    let blurTimeoutId;
    function handleWindowBlur() {
      const blurStartedAt = Date.now();
      const wasFullscreen = Boolean(document.fullscreenElement);
      const wasFullscreenRequestPending = fullscreenRequestPendingRef.current;

      blurTimeoutId = window.setTimeout(() => {
        const isFullscreen = Boolean(document.fullscreenElement);
        if (
          wasFullscreenRequestPending ||
          fullscreenRequestPendingRef.current ||
          fullscreenTransitionAtRef.current >= blurStartedAt ||
          wasFullscreen !== isFullscreen
        ) {
          return;
        }

        pauseForLeaving();
      }, 50);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.clearTimeout(blurTimeoutId);
    };
  }, [hasTimeLeft, status]);

  useEffect(() => {
    if (sessionComplete) {
      if (document.fullscreenElement === timerRef.current) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [sessionComplete]);

  function requestFocusFullscreen() {
    const timerElement = timerRef.current;
    setFullscreenNotice("");

    if (!timerElement?.requestFullscreen) {
      setFullscreenNotice("Fullscreen is not available in this browser.");
      return;
    }

    fullscreenRequestPendingRef.current = true;
    try {
      Promise.resolve(timerElement.requestFullscreen())
        .catch(() => {
          setFullscreenNotice("Fullscreen was blocked. You can still use the timer.");
        })
        .finally(() => {
          fullscreenRequestPendingRef.current = false;
        });
    } catch {
      fullscreenRequestPendingRef.current = false;
      setFullscreenNotice("Fullscreen was blocked. You can still use the timer.");
    }
  }

  function startSession() {
    setRemainingSeconds(selectedMinutes * 60);
    setLeaveCount(0);
    requestFocusFullscreen();
    statusRef.current = "running";
    setStatus("running");
  }

  function resumeSession() {
    requestFocusFullscreen();
    statusRef.current = "running";
    setStatus("running");
  }

  return (
    <section
      ref={timerRef}
      className="grid w-full place-items-center bg-[#f8f7f3] p-5 text-slate-900 [:fullscreen]:min-h-screen [:fullscreen]:p-8"
      aria-label="Focus timer"
    >
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">
          Focus time
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">
          {sessionComplete ? "Session complete" : "Study without distractions"}
        </h2>

        {status === "ready" || sessionComplete ? (
          <>
            <p className="mt-2 leading-7 text-slate-600">
              Choose how long you want to focus. The timer pauses if you leave this tab.
            </p>
            <div className="mt-6 flex flex-wrap gap-3" aria-label="Session length">
              {sessionLengths.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={selectedMinutes === minutes}
                  onClick={() => setSelectedMinutes(minutes)}
                  className={`rounded-xl border px-5 py-3 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                    selectedMinutes === minutes
                      ? "border-violet-300 bg-violet-50 text-violet-800"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {minutes === 1 ? "1 minute (test)" : `${minutes} minutes`}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={startSession}
              className="mt-5 w-full rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 sm:w-auto"
            >
              {sessionComplete ? "Start another session" : "Start focus session"}
            </button>
            {sessionComplete && (
              <p className="mt-4 font-medium text-slate-700" role="status">
                You left the page {leaveCount} {leaveCount === 1 ? "time" : "times"}.
              </p>
            )}
          </>
        ) : (
          <>
            <p
              className="mt-6 font-mono text-6xl font-bold tracking-tight text-slate-900 sm:text-7xl"
              role="timer"
              aria-live="off"
            >
              {formatTime(remainingSeconds)}
            </p>
            <p className="mt-3 text-slate-600">
              You have left the page {leaveCount} {leaveCount === 1 ? "time" : "times"}.
            </p>
            {status === "paused" && (
              <p
                className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 font-medium text-amber-900"
                role="alert"
              >
                Your session is paused because you left this page. Return to your study,
                then resume when you are ready.
              </p>
            )}
            <button
              type="button"
              onClick={resumeSession}
              disabled={status === "running"}
              className="mt-5 rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Resume session
            </button>
          </>
        )}

        {fullscreenNotice && (
          <p className="mt-4 text-sm text-slate-500" role="status">
            {fullscreenNotice}
          </p>
        )}
      </div>
    </section>
  );
}