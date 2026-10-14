"use client";

import { useState } from "react";

const BUSY_MESSAGE = "The AI is busy, please try again in a minute";

export default function ChatBox({ subjectName, subjectCode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isLoading) return;

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectName,
          subjectCode,
          messages: nextMessages.slice(-10),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(response.status === 429 ? BUSY_MESSAGE : result.error || "Could not send your message.");
      }

      setMessages((current) => [...current, { role: "assistant", content: result.reply }]);
    } catch (sendError) {
      setError(sendError.message || "Could not send your message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="study-chat-title"
      className="rounded-3xl border border-violet-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">
          Focus session helper
        </p>
        <h2 id="study-chat-title" className="mt-1 text-2xl font-bold tracking-tight">
          Ask about {subjectName}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Your questions stay focused on {subjectCode}.
        </p>
      </div>

      <div
        aria-live="polite"
        aria-label="Chat messages"
        className="mb-4 max-h-80 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4"
      >
        {messages.length === 0 && (
          <p className="text-sm leading-6 text-slate-600">
            Ask for a simple explanation, an example, or a practice question.
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
              message.role === "user"
                ? "ml-auto bg-violet-700 text-white"
                : "bg-white text-slate-800 shadow-sm"
            }`}
          >
            <span className="mb-1 block text-xs font-semibold opacity-75">
              {message.role === "user" ? "You" : "Study helper"}
            </span>
            {message.content}
          </div>
        ))}
        {isLoading && (
          <p className="text-sm text-slate-600" role="status">
            Thinking…
          </p>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={sendMessage} className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="study-chat-input">
          Your study question
        </label>
        <input
          id="study-chat-input"
          data-focus-chat-input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={4000}
          placeholder="Ask a question about this subject…"
          disabled={isLoading}
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-xl bg-violet-700 px-6 py-3 font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Sending…" : "Send"}
        </button>
      </form>
    </section>
  );
}