import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../lib/firebase-admin-init.mjs';
import { createLogger } from '../lib/logger.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('persona-engine');

let personas = null;

export function loadPersonas() {
  if (personas) return personas;
  const data = JSON.parse(readFileSync(resolve(__dirname, '../config/personas.json'), 'utf-8'));
  personas = data.personas.filter(p => p.active);
  return personas;
}

export function getPersonasForCategory(category) {
  const all = loadPersonas();
  return all.filter(p => p.categories.includes(category));
}

export function selectPersona(category, excludeIds = []) {
  const candidates = getPersonasForCategory(category).filter(p => !excludeIds.includes(p.id));
  if (candidates.length === 0) {
    log.warn(`No available personas for category: ${category}, falling back to all`);
    const all = loadPersonas().filter(p => !excludeIds.includes(p.id));
    if (all.length === 0) return loadPersonas()[0];
    return all[Math.floor(Math.random() * all.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export async function selectPersonaRoundRobin(category) {
  const candidates = getPersonasForCategory(category);
  if (candidates.length === 0) return selectPersona(category);

  try {
    const db = getDb();
    let leastUsed = candidates[0];
    let minPosts = Infinity;

    for (const persona of candidates) {
      const doc = await db.collection('personas').doc(persona.id).get();
      const postsGenerated = doc.exists ? (doc.data().postsGenerated || 0) : 0;
      if (postsGenerated < minPosts) {
        minPosts = postsGenerated;
        leastUsed = persona;
      }
    }

    log.info(`Selected persona: ${leastUsed.displayName} (${minPosts} posts generated)`);
    return leastUsed;
  } catch (err) {
    log.warn('Round-robin failed, using random', { error: err.message });
    return selectPersona(category);
  }
}

export function buildSystemPrompt(persona) {
  return persona.systemPrompt;
}
