import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(__dirname, '../../cache');
const CACHE_DURATION_SEC = 2592000;
function cachePathSync(prompt: string): string {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  return resolve(CACHE_DIR, `${createHash('md5').update(prompt).digest('hex')}.json`);
}

/* ──────────────────────────────────────────────────────────────
 *  Multi-provider AI — thử lần lượt các provider miễn phí.
 *  Khi 1 provider hết quota (429) hoặc lỗi, tự chuyển sang cái tiếp theo.
 *  Thứ tự ưu tiên: Gemini → Groq → OpenRouter free → null
 * ────────────────────────────────────────────────────────────── */

type AiProvider = {
  name: string;
  call: (prompt: string, timeoutMs: number) => Promise<string | null>;
};

/** Danh sách providers – được nối vào runtime dựa trên env keys khả dụng. */
function getProviders(): AiProvider[] {
  const list: AiProvider[] = [];

  // 1. Google Gemini (AI_API_KEY)
  if (env.aiApiKey) list.push({ name: 'Gemini', call: callGemini });

  // 2. Groq — Llama models, rất nhanh, free 30 req/min
  const groqKey = process.env.GROQ_API_KEY ?? '';
  if (groqKey) list.push({ name: 'Groq', call: callGroq });

  // 3. OpenRouter — free models (meta-llama, mistral, etc.)
  const orKey = process.env.OPENROUTER_API_KEY ?? '';
  if (orKey) list.push({ name: 'OpenRouter', call: callOpenRouter });

  return list;
}

/* ──────── Public API ──────── */

export async function generateContent(
  prompt: string,
  forceRefresh = false,
  timeoutMs = 30_000
): Promise<Record<string, unknown> | unknown[] | null> {
  // Check cache
  const file = cachePathSync(prompt);
  if (!forceRefresh && existsSync(file)) {
    try {
      const raw = readFileSync(file, 'utf8');
      const data = JSON.parse(raw) as { timestamp: number; payload: unknown };
      if (data.payload && Date.now() / 1000 - data.timestamp < CACHE_DURATION_SEC) {
        return data.payload as Record<string, unknown>;
      }
    } catch { /* ignore corrupt cache */ }
  }

  // Try each provider in order
  const providers = getProviders();
  for (const provider of providers) {
    try {
      const text = await provider.call(prompt, timeoutMs);
      if (text) {
        const parsed = parseAiJson(text);
        if (parsed) {
          writeFileSync(file, JSON.stringify({ timestamp: Math.floor(Date.now() / 1000), payload: parsed }));
          return parsed;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[AI] ${provider.name} failed:`, msg);
    }
  }

  if (providers.length === 0) {
    console.error('[AI] No API keys configured. Set AI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY in .env');
  }
  return null;
}

/* ──────── Provider: Google Gemini ──────── */

async function callGemini(prompt: string, timeoutMs: number): Promise<string | null> {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.aiApiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error('[AI:Gemini]', res.status, errBody.slice(0, 200));
    return null;
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

/* ──────── Provider: Groq (Llama 3) ──────── */

async function callGroq(prompt: string, timeoutMs: number): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY ?? '';
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error('[AI:Groq]', res.status, errBody.slice(0, 200));
    return null;
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? null;
}

/* ──────── Provider: OpenRouter (Free models) ──────── */

async function callOpenRouter(prompt: string, timeoutMs: number): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? '';
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemma-4-31b-it:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error('[AI:OpenRouter]', res.status, errBody.slice(0, 200));
    return null;
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? null;
}

/* ──────── JSON Parser ──────── */

/**
 * Parse JSON từ output AI – xử lý nhiều dạng markdown/code fence mà AI thường trả về.
 */
function parseAiJson(raw: string): Record<string, unknown> | unknown[] | null {
  let cleaned = raw.trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1]!.trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned) as Record<string, unknown> | unknown[];
  } catch { /* continue */ }

  // Fallback: extract first JSON object {...} or array [...]
  const objMatch = cleaned.match(/(\{[\s\S]*\})/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[1]!) as Record<string, unknown>;
    } catch { /* continue */ }
  }
  const arrMatch = cleaned.match(/(\[[\s\S]*\])/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[1]!) as unknown[];
    } catch { /* continue */ }
  }

  console.error('[AI] Could not parse JSON from AI response:', cleaned.slice(0, 200));
  return null;
}
