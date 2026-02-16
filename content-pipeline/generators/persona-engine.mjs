import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../lib/firebase-admin-init.mjs';
import { createLogger } from '../lib/logger.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('persona-engine');

let personaCache = {
  personas: null,
  lastFetched: null,
  ttl: 5 * 60 * 1000  // 5 minutes
};

export async function loadPersonas() {
  // Return cached if still valid
  if (personaCache.personas && personaCache.lastFetched &&
      (Date.now() - personaCache.lastFetched) < personaCache.ttl) {
    return personaCache.personas;
  }

  try {
    const db = getDb();
    const snapshot = await db.collection('personas')
      .where('active', '==', true)
      .get();

    if (!snapshot.empty) {
      personaCache.personas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      personaCache.lastFetched = Date.now();
      log.info(`Loaded ${personaCache.personas.length} active personas from Firestore`);
      return personaCache.personas;
    }
  } catch (err) {
    log.warn('Failed to load from Firestore, falling back to JSON', { error: err.message });
  }

  // Fallback to JSON file
  const data = JSON.parse(readFileSync(resolve(__dirname, '../config/personas.json'), 'utf-8'));
  personaCache.personas = data.personas.filter(p => p.active);
  personaCache.lastFetched = Date.now();
  log.info(`Loaded ${personaCache.personas.length} personas from JSON fallback`);
  return personaCache.personas;
}

export async function getPersonasForCategory(category) {
  const all = await loadPersonas();
  return all.filter(p => p.categories.includes(category));
}

export async function selectPersona(category, excludeIds = []) {
  const candidates = (await getPersonasForCategory(category)).filter(p => !excludeIds.includes(p.id));
  if (candidates.length === 0) {
    log.warn(`No available personas for category: ${category}, falling back to all`);
    const all = (await loadPersonas()).filter(p => !excludeIds.includes(p.id));
    if (all.length === 0) return (await loadPersonas())[0];
    return all[Math.floor(Math.random() * all.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export async function selectPersonaRoundRobin(category) {
  const candidates = await getPersonasForCategory(category);
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
