import { GoogleGenAI } from "@google/genai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AI_CHAT_DOMAINS } from "../lib/auth-config";

const MAX_MESSAGES_PER_USER_PER_DAY = 20;
const MAX_REQUESTS_PER_MINUTE = 30;
const MAX_MESSAGE_LENGTH = 4000;
const dailyUsageByUserId = new Map();
let globalMinuteUsage = { minute: 0, count: 0 };

function isRateLimitError(error) {
  const status = error?.status ?? error?.statusCode ?? error?.code;
  return (
    status === 429 ||
    status === "429" ||
    /429|resource[_ ]exhausted|rate.?limit|quota/i.test(error?.message ?? "")
  );
}

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { user: null, error: new Error("Supabase is not configured yet.") };
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  return supabase.auth.getUser();
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a valid chat message." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Send a valid chat message." }, { status: 400 });
  }

  const { user, error: authError } = await getAuthenticatedUser();
  if (authError || !user) {
    return Response.json({ error: "Please sign in to use the AI chat." }, { status: 401 });
  }

  const emailDomain = user.email?.split("@")[1]?.toLowerCase();
  if (!AI_CHAT_DOMAINS.includes(emailDomain)) {
    return Response.json({ error: "AI chat is for college emails." }, { status: 403 });
  }

  const subjectName = typeof body.subjectName === "string" ? body.subjectName.trim() : "";
  const subjectCode = typeof body.subjectCode === "string" ? body.subjectCode.trim() : "";
  if (
    !subjectName ||
    !subjectCode ||
    subjectName.length > 120 ||
    subjectCode.length > 40 ||
    !Array.isArray(body.messages)
  ) {
    return Response.json({ error: "Send a valid chat message." }, { status: 400 });
  }

  const messages = body.messages
    .filter(
      (message) =>
        (message?.role === "user" || message?.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    )
    .slice(-10)
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content.trim().slice(0, MAX_MESSAGE_LENGTH) }],
    }));

  if (messages.length === 0) {
    return Response.json({ error: "Send a valid chat message." }, { status: 400 });
  }

  const now = Date.now();
  const currentMinute = Math.floor(now / 60_000);
  if (globalMinuteUsage.minute !== currentMinute) {
    globalMinuteUsage = { minute: currentMinute, count: 0 };
  }

  const currentDay = new Date(now).toISOString().slice(0, 10);
  const userUsage = dailyUsageByUserId.get(user.id);
  if (
    globalMinuteUsage.count >= MAX_REQUESTS_PER_MINUTE ||
    (userUsage?.day === currentDay && userUsage.count >= MAX_MESSAGES_PER_USER_PER_DAY)
  ) {
    return Response.json(
      { error: "The AI is busy, please try again in a minute" },
      { status: 429 },
    );
  }

  globalMinuteUsage.count += 1;
  dailyUsageByUserId.set(user.id, {
    day: currentDay,
    count: userUsage?.day === currentDay ? userUsage.count + 1 : 1,
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI chat is not configured yet." }, { status: 503 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
      contents: messages,
      config: {
        systemInstruction: `You are a study helper for college engineering students. You are given a subject name and code. Help with that subject: explain concepts simply, give examples, and suggest practice. Keep answers concise. If asked about unrelated things, politely steer back to studying.\n\nCurrent subject: ${subjectName} (${subjectCode}).`,
        maxOutputTokens: 500,
      },
    });

    const reply = result.text?.trim();
    if (!reply) {
      return Response.json({ error: "The AI could not form a reply. Please try again." }, { status: 502 });
    }

    return Response.json({ reply });
  } catch (error) {
    if (isRateLimitError(error)) {
      return Response.json(
        { error: "The AI is busy, please try again in a minute" },
        { status: 429 },
      );
    }

    console.error("Gemini chat request failed.", error?.status ?? "unknown status");
    return Response.json({ error: "The AI could not respond right now. Please try again." }, { status: 502 });
  }
}