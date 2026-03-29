import { analyzeSentiment } from './aiService';

const AI_ANALYTICS_URL = "https://us-central1-clarity-311c3.cloudfunctions.net/analyzeText";

export async function analyzeTextWithAI(text: string) {
  try {
    const response = await fetch(AI_ANALYTICS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("AI analytics request failed");
    return await response.json();
  } catch (error) {
    console.error("AI analytics error:", error);
    return null;
  }
}

export async function analyzeTextHybrid(text: string) {
  try {
    const response = await fetch(AI_ANALYTICS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("AI analytics request failed");
    const aiResult = await response.json();
    return {
      sentiment: aiResult.sentiment?.score ?? null,
      entities: aiResult.entities ?? [],
      source: 'cloud',
    };
  } catch (error) {
    console.error("AI analytics error (falling back to local):", error);
    const localSentiment = analyzeSentiment(text);
    return {
      sentiment: localSentiment?.score ?? null,
      entities: [],
      source: 'local',
    };
  }
}

export function getAIRecommendation(sentiment: number | null, entities: string[]): string | null {
  if (!entities || entities.length === 0) return null;
  const e = entities.map((x) => x.toLowerCase());

  if ((e.includes('tired') || e.includes('fatigue') || e.includes('stressed') || e.includes('stress')) && sentiment !== null && sentiment < 0) {
    return "Sorry you're feeling tired or stressed. Try a 10-minute guided meditation or a relaxing soundscape to unwind.";
  }
  if ((e.includes('sleep') || e.includes('insomnia')) && sentiment !== null && sentiment < 0) {
    return "Having trouble sleeping? Try a sleep meditation or a calming bedtime routine tonight.";
  }
  if ((e.includes('sore') || e.includes('soreness')) && e.includes('workout')) {
    return "Great job on your workout! Since you're sore, consider a gentle stretching session or a rest day tomorrow.";
  }
  if (e.includes('water') || e.includes('hydration')) {
    return "Remember to stay hydrated! Try setting a water reminder or keeping a bottle at your desk.";
  }
  if (e.includes('motivation') && sentiment !== null && sentiment < 0) {
    return "Feeling unmotivated? Try a short walk, a new workout, or listen to an uplifting playlist!";
  }
  if ((e.includes('work') || e.includes('meeting')) && (e.includes('stress') || e.includes('tired'))) {
    return "Work can be draining. Take a mindful break or try a breathing exercise after your next meeting.";
  }
  if (e.includes('workout') && sentiment !== null && sentiment > 0) {
    return "Awesome job on your workout! Keep up the great work and celebrate your progress!";
  }
  if (sentiment !== null && sentiment < -0.3) {
    return "It's okay to have tough days. Be kind to yourself and try a wellness activity you enjoy.";
  }
  if (sentiment !== null && sentiment > 0.5) {
    return "You're on a roll! Keep up the positive momentum!";
  }
  return null;
}
