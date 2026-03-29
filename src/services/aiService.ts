import Sentiment from 'sentiment';

const sentiment = new Sentiment();

export function analyzeSentiment(text: string) {
  if (!text || text.trim() === '') return null;
  const result = sentiment.analyze(text);
  return result;
}

export function extractKeywords(text: string): string[] {
  if (!text || text.trim() === '') return [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const unique = [...new Set(words)];
  return unique.sort((a, b) => b.length - a.length).slice(0, 3);
}

// ─── OpenRouter AI ────────────────────────────────────────────────────────────
// Setup: add EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-... to your .env file
// Get a free key at https://openrouter.ai

const OPENROUTER_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'mistralai/mistral-7b-instruct:free';

export interface SoundscapeRecommendation {
  message: string;
  recommendations: string[]; // soundscape keys from soundscapes.ts
}

/**
 * Ask the AI to recommend soundscapes based on the user's current state.
 * Throws 'OPENROUTER_KEY_MISSING' if the API key is not configured.
 */
export async function getSoundscapeRecommendation(params: {
  mood: string;
  moodLabel: string;
  meditationType: string;
  availableSoundscapes: Array<{ key: string; name: string; desc: string }>;
}): Promise<SoundscapeRecommendation> {
  if (!OPENROUTER_KEY) throw new Error('OPENROUTER_KEY_MISSING');

  const h = new Date().getHours();
  const timeOfDay = h < 6 ? 'early morning' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';

  const soundscapeList = params.availableSoundscapes
    .map(s => `  "${s.key}": ${s.name} — ${s.desc}`)
    .join('\n');

  const prompt =
    `You are a compassionate mindfulness coach helping someone pick a meditation soundscape.\n\n` +
    `About this person right now:\n` +
    `- Time: ${timeOfDay}\n` +
    `- Mood: ${params.mood} (${params.moodLabel})\n` +
    `- Meditation style: ${params.meditationType}\n\n` +
    `Available soundscapes:\n${soundscapeList}\n\n` +
    `Recommend exactly 3 soundscapes that best match their current state. ` +
    `If anxious, suggest calming lower-frequency options. ` +
    `If tired, suggest gentle/delta waves. If sad, suggest uplifting or connection frequencies. ` +
    `If focused/energized, suggest beta or gamma.\n\n` +
    `Reply ONLY with valid JSON (no markdown):\n` +
    `{"message":"[One warm sentence starting with 'Since you...' explaining the picks]","recommendations":["key1","key2","key3"]}`;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://clarity-wellness.app',
      'X-Title': 'Clarity Wellness',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 250,
      temperature: 0.65,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${body}`);
  }

  const data    = await response.json();
  const content = (data.choices?.[0]?.message?.content ?? '').replace(/```json|```/g, '').trim();
  const match   = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Unexpected AI response format');

  const parsed  = JSON.parse(match[0]) as SoundscapeRecommendation;
  const validKeys = new Set(params.availableSoundscapes.map(s => s.key));
  parsed.recommendations = parsed.recommendations.filter(k => validKeys.has(k)).slice(0, 3);

  return parsed;
}
