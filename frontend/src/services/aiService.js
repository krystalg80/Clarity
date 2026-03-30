import Sentiment from 'sentiment';

const sentiment = new Sentiment();

export function analyzeSentiment(text) {
  if (!text || text.trim() === '') return null;
  const result = sentiment.analyze(text);
  // result.score: positive (>0), negative (<0), neutral (0)
  return result;
}

// Simple keyword extraction: returns top 3 longest words (placeholder for future AI)
export function extractKeywords(text) {
  if (!text || text.trim() === '') return [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3);
  // Return top 3 longest unique words
  const unique = [...new Set(words)];
  return unique.sort((a, b) => b.length - a.length).slice(0, 3);
} 