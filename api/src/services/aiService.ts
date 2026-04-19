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

export async function generateContent(prompt: string, forceRefresh = false): Promise<Record<string, unknown> | unknown[] | null> {
  const file = cachePathSync(prompt);
  if (!forceRefresh && existsSync(file)) {
    try {
      const raw = readFileSync(file, 'utf8');
      const data = JSON.parse(raw) as { timestamp: number; payload: unknown };
      if (data.payload && Date.now() / 1000 - data.timestamp < CACHE_DURATION_SEC) {
        return data.payload as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }
  }

  const result = await callGemini(prompt);
  if (result) {
    writeFileSync(file, JSON.stringify({ timestamp: Math.floor(Date.now() / 1000), payload: result }));
  }
  return result;
}

async function callGemini(prompt: string): Promise<Record<string, unknown> | unknown[] | null> {
  const apiKey = env.aiApiKey;
  if (!apiKey) return null;

  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  let jsonText = text.trim();
  const md = jsonText.match(/```json\s*(.*?)\s*```/s);
  if (md) jsonText = md[1]!.trim();

  try {
    return JSON.parse(jsonText) as Record<string, unknown> | unknown[];
  } catch {
    return null;
  }
}
