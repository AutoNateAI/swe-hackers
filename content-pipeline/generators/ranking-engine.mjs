import { loadPersonas } from './persona-engine.mjs';
import { getDb } from '../lib/firebase-admin-init.mjs';
import { createLogger } from '../lib/logger.mjs';

const log = createLogger('ranking-engine');

/**
 * Score a persona's relevance to a set of topics/themes.
 * Higher score = better fit for the content.
 */
function relevanceScore(persona, themes, keywords) {
  let score = 0;
  const personaText = `${persona.role} ${persona.bio} ${persona.expertise.join(' ')} ${persona.tone}`.toLowerCase();

  for (const theme of themes) {
    const words = theme.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && personaText.includes(word)) score += 2;
    }
  }

  for (const kw of keywords) {
    if (personaText.includes(kw.toLowerCase())) score += 3;
  }

  return score;
}

/**
 * Factor in posting freshness — personas who haven't posted recently score higher.
 */
async function freshnessFactor(persona) {
  try {
    const db = getDb();
    const doc = await db.collection('personas').doc(persona.id).get();
    if (!doc.exists) return 1.0;

    const data = doc.data();
    const postsGenerated = data.postsGenerated || 0;
    const lastPostedAt = data.lastPostedAt?.toDate?.() || null;

    // Fewer posts = higher bonus
    const volumePenalty = Math.max(0, 1 - (postsGenerated * 0.02));

    // Longer since last post = higher bonus
    let recencyBonus = 0.5;
    if (lastPostedAt) {
      const hoursSince = (Date.now() - lastPostedAt.getTime()) / (1000 * 60 * 60);
      recencyBonus = Math.min(1, hoursSince / 48); // maxes out at 48 hours
    }

    return 0.5 + volumePenalty * 0.3 + recencyBonus * 0.2;
  } catch {
    return 0.8;
  }
}

/**
 * Rank all personas for who should make the post.
 * Returns sorted array of { persona, score }.
 */
export async function rankPersonasForPost(themes = [], keywords = []) {
  const personas = await loadPersonas();
  const scored = [];

  for (const persona of personas) {
    const relevance = relevanceScore(persona, themes, keywords);
    const freshness = await freshnessFactor(persona);
    const totalScore = relevance * freshness;
    scored.push({ persona, score: totalScore, relevance, freshness });
  }

  scored.sort((a, b) => b.score - a.score);
  log.info('Persona ranking for post', {
    top3: scored.slice(0, 3).map(s => `${s.persona.displayName}: ${s.score.toFixed(2)}`)
  });

  return scored;
}

/**
 * Rank personas for commenting on a post.
 * Excludes the original poster and optionally already-commented personas.
 * @param {string} postAuthorId - persona ID of the post author
 * @param {string[]} alreadyCommented - persona IDs that already commented in this thread
 * @param {string[]} themes - topics/themes from the post
 * @param {number} count - how many commenters to return
 */
export async function rankPersonasForComments({ postAuthorId, alreadyCommented = [], themes = [], count = 9 }) {
  const personas = await loadPersonas();
  const candidates = personas.filter(p =>
    p.id !== postAuthorId && !alreadyCommented.includes(p.id)
  );

  const scored = [];
  for (const persona of candidates) {
    const relevance = relevanceScore(persona, themes, []);
    // Add some randomness for variety
    const variety = Math.random() * 0.3;
    scored.push({ persona, score: relevance + variety });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count);
}

/**
 * Determine if an agent should reply to a comment based on:
 * - Relevance of their expertise to the comment content
 * - Whether the comment directly addresses topics they know about
 * - Randomized threshold for natural feel
 */
export function shouldAgentRespond(persona, commentText, threshold = 0.4) {
  const personaText = `${persona.expertise.join(' ')} ${persona.role}`.toLowerCase();
  const commentWords = commentText.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  let matchScore = 0;
  for (const word of commentWords) {
    if (personaText.includes(word)) matchScore += 1;
  }

  const normalizedScore = Math.min(1, matchScore / Math.max(1, commentWords.length * 0.15));
  const withVariance = normalizedScore + (Math.random() * 0.2 - 0.1);

  return withVariance >= threshold;
}
