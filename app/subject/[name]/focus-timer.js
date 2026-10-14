"use client";

import { useEffect, useRef, useState } from "react";
import {
  BREAK_EVERY_MINUTES,
  BREAK_MINUTES,
  GRACE_SECONDS,
  LOCK_SECONDS,
  MAX_VIOLATIONS,
} from "../../lib/focus-config";

const sessionLengths = [1, 3, 25, 50, 90, 120];
const STORAGE_KEY = "study-platform-focus-session";
const ACTIVE_STATUSES = new Set(["running", "locked", "lock-ready", "break", "break-ready"]);
const BREAK_SECONDS = BREAK_MINUTES * 60;
const BREAK_INTERVAL_SECONDS = BREAK_EVERY_MINUTES * 60;

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function createReadySession(minutes = 25) {
  return {
    status: "ready",
    mode: "lock",
    durationSeconds: minutes * 60,
    remainingSeconds: minutes * 60,
    violations: 0,
    lockEndsAt: null,
    breakEndsAt: null,
    breaksTaken: 0,
    nextBreakAt: BREAK_INTERVAL_SECONDS,
    endTime: null,
    resumeStatus: "running",
    failed: false,
  };
}

function isIgnoredFocusTarget() {
  const activeElement = document.activeElement;
  return Boolean(
    activeElement?.matches?.('iframe[src*="youtube"]') ||
      activeElement?.closest?.("[data-focus-chat-input]")
  );
}

export default function FocusTimer({ onActiveChange, onTimerStateChange }) {
  const [session, setSession] = useState(() => createReadySession());
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [selectedMode, setSelectedMode] = useState("lock");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenNotice, setFullscreenNotice] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(0);
  const pendingLeaveRef = useRef(null);
  const fullscreenRequestPendingRef = useRef(false);
  const sessionRef = useRef(session);

  const isActive = session.status === "running" && session.remainingSeconds > 0;
  const isSessionInProgress = ACTIVE_STATUSES.has(session.status);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    let restored = null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) restored = JSON.parse(stored);
    } catch {
      restored = null;
    }

    const hydrateTimeoutId = window.setTimeout(() => {
      if (restored && typeof restored === "object" && restored.status !== "ready") {
        if (restored.status === "ended") {
          setSession(restored);
        } else if (ACTIVE_STATUSES.has(restored.status)) {
          const now = Date.now();
          const remainingSeconds = restored.status === "running" && restored.endTime
            ? Math.max(0, Math.ceil((restored.endTime - now) / 1000))
            : Math.max(0, Number(restored.remainingSeconds) || 0);
          const violations = (Number(restored.violations) || 0) + 1;
          const failed = violations >= MAX_VIOLATIONS;
          setSession({
            ...createReadySession(Math.max(1, Math.ceil((Number(restored.durationSeconds) || 60) / 60))),
            ...restored,
            status: failed || remainingSeconds === 0 ? "ended" : "locked",
            remainingSeconds,
            violations,
            lockEndsAt: failed ? null : now + LOCK_SECONDS * 1000,
            resumeStatus: restored.status.startsWith("break") || restored.resumeStatus === "break" ? "break" : "running",
            failed,
            endTime: now + remainingSeconds * 1000,
          });
        }
      }
      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrateTimeoutId);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (session.status === "ready") {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      }
    } catch {
      // Storage can be disabled or unavailable; the session still works in memory.
    }
  }, [isHydrated, session]);

  useEffect(() => {
    onActiveChange(isActive);
    onTimerStateChange({
      isActive,
      isSessionInProgress,
      remainingSeconds: session.remainingSeconds,
      violations: session.violations,
      mode: session.mode,
      status: session.status,
      breaksTaken: session.breaksTaken,
    });
  }, [
    isActive,
    isSessionInProgress,
    onActiveChange,
    onTimerStateChange,
    session.breaksTaken,
    session.mode,
    session.remainingSeconds,
    session.status,
    session.violations,
  ]);

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(document.fullscreenElement === document.documentElement);
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    if (!isHydrated || session.status !== "running") return undefined;

    const intervalId = window.setInterval(() => {
      setSession((current) => {
        if (current.status !== "running") return current;
        const remainingSeconds = Math.max(
          0,
          Math.ceil(((current.endTime || Date.now()) - Date.now()) / 1000)
        );
        if (remainingSeconds === 0) {
          return { ...current, status: "ended", remainingSeconds: 0, endTime: Date.now() };
        }

        const studiedSeconds = current.durationSeconds - remainingSeconds;
        if (
          current.durationSeconds > BREAK_INTERVAL_SECONDS &&
          studiedSeconds >= current.nextBreakAt
        ) {
          return {
            ...current,
            status: "break",
            remainingSeconds,
            breakEndsAt: Date.now() + BREAK_SECONDS * 1000,
            breaksTaken: current.breaksTaken + 1,
            nextBreakAt: current.nextBreakAt + BREAK_INTERVAL_SECONDS,
            endTime: Date.now() + remainingSeconds * 1000,
          };
        }
        return { ...current, remainingSeconds };
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isHydrated, session.status]);

  useEffect(() => {
    if (!isHydrated || !["locked", "break"].includes(session.status)) return undefined;
    const intervalId = window.setInterval(() => {
      if (sessionRef.current.status === "locked") {
        setLockSecondsLeft(Math.max(0, Math.ceil(((sessionRef.current.lockEndsAt || Date.now()) - Date.now()) / 1000)));
      } else if (sessionRef.current.status === "break") {
        setBreakSecondsLeft(Math.max(0, Math.ceil(((sessionRef.current.breakEndsAt || Date.now()) - Date.now()) / 1000)));
      }
      setSession((current) => {
        const target = current.status === "locked" ? current.lockEndsAt : current.breakEndsAt;
        if (!target || target <= Date.now()) {
          if (current.status === "locked") return { ...current, status: "lock-ready", lockEndsAt: null };
          if (current.status === "break") return { ...current, status: "break-ready", breakEndsAt: null };
          return current;
        }
        return { ...current };
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isHydrated, session.status]);

  useEffect(() => {
    if (!isHydrated || !isSessionInProgress) return undefined;

    function cancelPendingLeave() {
      if (pendingLeaveRef.current) {
        window.clearTimeout(pendingLeaveRef.current);
        pendingLeaveRef.current = null;
      }
    }

    function shouldCountLeaving() {
      const current = sessionRef.current;
      if (current.status !== "running") return false;
      if (document.visibilityState === "hidden") return true;
      if (current.mode === "exam" && document.fullscreenElement !== document.documentElement) return true;
      return !document.hasFocus() && !isIgnoredFocusTarget();
    }

    function lockSessionForLeaving() {
      const current = sessionRef.current;
      if (current.status !== "running") return;
      cancelPendingLeave();
      setSession((latest) => {
        if (latest.status !== "running") return latest;
        const violations = latest.violations + 1;
        const failed = violations >= MAX_VIOLATIONS;
        return {
          ...latest,
          status: failed ? "ended" : "locked",
          violations,
          lockEndsAt: failed ? null : Date.now() + LOCK_SECONDS * 1000,
          endTime: Date.now() + latest.remainingSeconds * 1000,
          failed,
        };
      });
    }

    function scheduleLeaveCheck() {
      if (pendingLeaveRef.current || sessionRef.current.status !== "running") return;
      pendingLeaveRef.current = window.setTimeout(() => {
        pendingLeaveRef.current = null;
        if (shouldCountLeaving()) lockSessionForLeaving();
      }, GRACE_SECONDS * 1000);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") scheduleLeaveCheck();
      else if (document.hasFocus()) cancelPendingLeave();
    }

    function handleWindowBlur() {
      if (!isIgnoredFocusTarget()) scheduleLeaveCheck();
    }

    function handleWindowFocus() {
      cancelPendingLeave();
    }

    function handleFullscreenChange() {
      const current = sessionRef.current;
      if (
        current.status === "running" &&
        current.mode === "exam" &&
        document.fullscreenElement !== document.documentElement
      ) {
        scheduleLeaveCheck();
      } else if (document.fullscreenElement === document.documentElement) {
        cancelPendingLeave();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      cancelPendingLeave();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [isHydrated, isSessionInProgress]);

  useEffect(() => {
    if (!isHydrated || !isSessionInProgress) return undefined;

    function warnBeforeLeaving(event) {
      event.preventDefault();
      event.returnValue = "Your focus session is still active.";
      return event.returnValue;
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isHydrated, isSessionInProgress]);

  useEffect(() => {
    if (!["ended", "ready", "break", "break-ready"].includes(session.status)) return;
    if (document.fullscreenElement === document.documentElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (navigator.keyboard?.unlock) {
      try {
        navigator.keyboard.unlock();
      } catch {
        // Keyboard locking is optional and browser-dependent.
      }
    }
  }, [session.status]);

  async function requestPageFullscreen() {
    setFullscreenNotice("");
    if (document.fullscreenElement === document.documentElement) return true;
    const pageElement = document.documentElement;
    if (!pageElement?.requestFullscreen) {
      setFullscreenNotice("Fullscreen is not available in this browser. Try Lock mode instead.");
      return false;
    }

    fullscreenRequestPendingRef.current = true;
    try {
      await pageElement.requestFullscreen();
      return document.fullscreenElement === document.documentElement;
    } catch {
      setFullscreenNotice("Fullscreen was blocked. Allow fullscreen to use Exam mode.");
      return false;
    } finally {
      fullscreenRequestPendingRef.current = false;
    }
  }

  async function lockEscapeKey() {
    if (navigator.keyboard?.lock) {
      try {
        await navigator.keyboard.lock(["Escape"]);
      } catch {
        // Keyboard locking is optional and browser-dependent.
      }
    }
  }

  async function startSession() {
    const mode = selectedMode;
    if (mode === "exam") {
      const enteredFullscreen = await requestPageFullscreen();
      if (!enteredFullscreen) return;
      await lockEscapeKey();
    }

    const durationSeconds = selectedMinutes * 60;
    const now = Date.now();
    setSession({
      ...createReadySession(selectedMinutes),
      status: "running",
      mode,
      durationSeconds,
      remainingSeconds: durationSeconds,
      endTime: now + durationSeconds * 1000,
    });
  }

  async function resumeSession() {
    if (session.resumeStatus === "break") {
      if (session.breakEndsAt && session.breakEndsAt > Date.now()) {
        setSession((current) => ({ ...current, status: "break" }));
      } else {
        setSession((current) => ({ ...current, status: "break-ready", breakEndsAt: null }));
      }
      return;
    }

    if (session.mode === "exam") {
      const enteredFullscreen = await requestPageFullscreen();
      if (!enteredFullscreen) return;
      await lockEscapeKey();
    }

    setSession((current) => ({
      ...current,
      status: "running",
      lockEndsAt: null,
      endTime: Date.now() + current.remainingSeconds * 1000,
    }));
  }

  async function backToStudying() {
    if (session.mode === "exam") {
      const enteredFullscreen = await requestPageFullscreen();
      if (!enteredFullscreen) return;
      await lockEscapeKey();
    }

    setSession((current) => ({
      ...current,
      status: "running",
      breakEndsAt: null,
      endTime: Date.now() + current.remainingSeconds * 1000,
    }));
  }

  function endSession() {
    if (!window.confirm("End this focus session now? Your summary will be saved.")) return;
    setSession((current) => ({ ...current, status: "ended", endTime: Date.now() }));
  }

  function startAnotherSession() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage is optional; a new session can still start.
    }
    setSession(createReadySession(selectedMinutes));
  }

  const studiedSeconds = Math.max(0, session.durationSeconds - session.remainingSeconds);
  const locked = session.status === "locked" || session.status === "lock-ready";
  const ended = session.status === "ended";

  return (
    <>
      <section
        className="grid w-full place-items-center bg-[#f8f7f3] p-5 text-slate-900"
        aria-label="Focus timer"
      >
        <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">
            Focus time
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            {ended ? (session.failed ? "Session failed" : "Session complete") : "Study without distractions"}
          </h2>

          {session.status === "ready" && (
            <>
              <p className="mt-2 leading-7 text-slate-600">
                Choose a duration and focus mode. Exam mode requires fullscreen.
              </p>
              <div className="mt-6 flex flex-wrap gap-3" aria-label="Session length">
                {sessionLengths.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    aria-pressed={selectedMinutes === minutes}
                    onClick={() => setSelectedMinutes(minutes)}
                    className={`rounded-xl border px-4 py-3 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                      selectedMinutes === minutes
                        ? "border-violet-300 bg-violet-50 text-violet-800"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {minutes === 1 || minutes === 3 ? `${minutes} minutes (test)` : `${minutes} minutes`}
                  </button>
                ))}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="Focus mode">
                {["lock", "exam"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={selectedMode === mode}
                    onClick={() => setSelectedMode(mode)}
                    className={`rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                      selectedMode === mode
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block font-semibold capitalize text-slate-900">{mode === "lock" ? "Lock" : "Exam"}{mode === "lock" ? " (default)" : ""}</span>
                    <span className="mt-1 block text-sm leading-5 text-slate-600">
                      {mode === "exam" ? "Full page fullscreen with stricter checks." : "A focused session with timed re-entry locks."}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={startSession}
                className="mt-5 w-full rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 sm:w-auto"
              >
                Start focus session
              </button>
            </>
          )}

          {isSessionInProgress && !locked && (
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <p className="font-mono text-5xl font-bold tabular-nums tracking-tight text-slate-900" role="timer" aria-live="off">
                {formatTime(session.remainingSeconds)}
              </p>
              <p className="text-sm font-semibold capitalize text-slate-600">{session.mode} mode</p>
              {session.status === "break" && (
                <p className="w-full rounded-xl border border-sky-200 bg-sky-50 p-4 font-medium text-sky-900" role="status">
                  Break time: {formatTime(breakSecondsLeft)} remaining. Your study timer is paused.
                </p>
              )}
              {session.status === "break-ready" && (
                <div className="w-full rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <p className="font-medium text-sky-900">Break complete. Ready to continue?</p>
                  <button type="button" onClick={backToStudying} className="mt-3 rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white hover:bg-violet-800">
                    Back to studying
                  </button>
                </div>
              )}
              <p className="w-full text-slate-600">
                Leave / violation count: {session.violations} of {MAX_VIOLATIONS}
              </p>
              {session.status !== "break" && session.status !== "break-ready" && (
                <button
                  type="button"
                  onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
                  className="rounded-xl border border-violet-300 px-4 py-2 font-semibold text-violet-800 transition hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
                >
                  {isFullscreen ? "Fullscreen on" : "Enter fullscreen"}
                </button>
              )}
              <button type="button" onClick={endSession} className="rounded-xl border border-rose-200 px-4 py-2 font-semibold text-rose-700 transition hover:bg-rose-50">
                End session
              </button>
            </div>
          )}

          {ended && (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5" role="status">
              <p className="font-semibold text-slate-900">Session summary</p>
              <p className="mt-2 text-slate-700">Time studied: {formatTime(studiedSeconds)}</p>
              <p className="mt-1 text-slate-700">Violations: {session.violations}</p>
              <p className="mt-1 text-slate-700">Breaks taken: {session.breaksTaken}</p>
              {session.failed && <p className="mt-3 font-semibold text-rose-700">The session ended because you reached the violation limit.</p>}
              <button type="button" onClick={startAnotherSession} className="mt-5 rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white hover:bg-violet-800">
                Start another session
              </button>
            </div>
          )}

          {fullscreenNotice && <p className="mt-4 text-sm text-amber-800" role="alert">{fullscreenNotice}</p>}
        </div>
      </section>

      {locked && (
        <div className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-slate-950 p-5 text-white" role="dialog" aria-modal="true" aria-labelledby="focus-lock-title">
          <div className="absolute inset-x-0 top-0 border-b border-white/15 bg-slate-900/95 px-5 py-3 shadow-lg sm:px-8">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
              <span className="text-sm font-semibold text-violet-200">Focus session</span>
              <span className="font-mono text-lg font-bold tabular-nums" role="timer" aria-live="off">{formatTime(session.remainingSeconds)}</span>
              <span className="text-right text-sm">Violations {session.violations}/{MAX_VIOLATIONS}</span>
            </div>
          </div>
          <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-slate-900 p-7 text-center shadow-2xl sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">Focus lock</p>
            <h2 id="focus-lock-title" className="mt-3 text-3xl font-bold">Study content is locked</h2>
            <p className="mt-3 leading-7 text-slate-300">You left the study page. Your timer is paused while the lock runs.</p>
            <p className="mt-5 font-mono text-6xl font-bold tabular-nums" role="timer" aria-live="off">
              {session.status === "locked" ? formatTime(lockSecondsLeft) : "00:00"}
            </p>
            <p className="mt-4 text-slate-300">Leave / violation count: {session.violations} of {MAX_VIOLATIONS}</p>
            {session.status === "lock-ready" && (
              <button type="button" onClick={resumeSession} className="mt-6 rounded-xl bg-violet-500 px-6 py-3 font-bold text-white transition hover:bg-violet-400">
                Resume session
              </button>
            )}
            <button type="button" onClick={endSession} className="mt-6 block w-full rounded-xl border border-white/25 px-5 py-3 font-semibold text-white transition hover:bg-white/10">
              End session
            </button>
            {fullscreenNotice && <p className="mt-4 text-sm text-amber-200" role="alert">{fullscreenNotice}</p>}
          </div>
        </div>
      )}
    </>
  );
}
