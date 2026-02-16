#!/usr/bin/env node
/**
 * Synthesize AI personas from LinkedIn profiles stored in Firestore.
 * Clusters profiles by archetype, generates composite personas via OpenAI,
 * then writes them back to Firestore.
 */
import { getDb } from '../lib/firebase-admin-init.mjs';
import { createLogger } from '../lib/logger.mjs';
import { clusterProfiles, synthesizePersona } from '../lib/persona-synthesizer.mjs';

const log = createLogger('synthesize-personas');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function synthesizePersonas() {
  const db = getDb();

  // 1. Fetch LinkedIn profiles from Firestore
  const profilesSnap = await db.collection('linkedinProfiles').get();
  log.info(`Fetched ${profilesSnap.size} LinkedIn profiles from Firestore`);

  const categoryMap = new Map();
  profilesSnap.forEach(doc => {
    const data = doc.data();
    const category = data.category || 'unknown';
    if (!categoryMap.has(category)) categoryMap.set(category, []);
    categoryMap.get(category).push(data);
  });

  // 2. Synthesize personas per category
  const synthesizedPersonas = [];
  const usedNames = [];
  const archetypeKeys = ['senior', 'mid', 'specialist'];

  for (const [category, profiles] of categoryMap) {
    log.info(`Processing category: ${category} (${profiles.length} profiles)`);

    const clusters = clusterProfiles(profiles);

    for (let i = 0; i < archetypeKeys.length; i++) {
      const key = archetypeKeys[i];
      const cluster = clusters[key];

      if (!cluster || cluster.length < 3) {
        log.info(`Skipping ${category}/${key} — only ${cluster ? cluster.length : 0} profiles (need >= 3)`);
        continue;
      }

      const persona = await synthesizePersona(cluster, category, i, usedNames);
      synthesizedPersonas.push(persona);
      usedNames.push(persona.displayName);

      await sleep(1000);
    }
  }

  // 3. Merge personas with duplicate IDs (same name generated across categories)
  const personaMap = new Map();
  for (const persona of synthesizedPersonas) {
    if (personaMap.has(persona.id)) {
      const existing = personaMap.get(persona.id);
      // Merge categories (deduplicated)
      existing.categories = [...new Set([...existing.categories, ...persona.categories])];
      // Merge expertise (deduplicated)
      existing.expertise = [...new Set([...existing.expertise, ...persona.expertise])];
      // Accumulate source info
      existing.sourceCategory = [existing.sourceCategory, persona.sourceCategory]
        .flat().filter((v, i, a) => a.indexOf(v) === i);
      existing.sourceProfileCount += persona.sourceProfileCount;
      // Keep the longer/richer bio and systemPrompt
      if (persona.bio.length > existing.bio.length) existing.bio = persona.bio;
      if (persona.systemPrompt.length > existing.systemPrompt.length) existing.systemPrompt = persona.systemPrompt;
      log.info(`Merged duplicate persona: ${persona.id} (added ${persona.sourceCategory} data)`);
    } else {
      // Normalize sourceCategory to an array for consistency
      persona.sourceCategory = [persona.sourceCategory].flat();
      personaMap.set(persona.id, persona);
    }
  }
  const mergedPersonas = [...personaMap.values()];
  log.info(`Merged ${synthesizedPersonas.length} raw personas → ${mergedPersonas.length} unique personas`);

  // 4. Deactivate old personas that were not from linkedin-synthesis
  const existingSnap = await db.collection('personas').get();
  let deactivatedCount = 0;

  const deactivateBatch = db.batch();
  existingSnap.forEach(doc => {
    const data = doc.data();
    if (data.source !== 'linkedin-synthesis') {
      deactivateBatch.update(doc.ref, {
        active: false,
        deactivatedAt: new Date(),
        deactivatedReason: 'replaced-by-synthesis'
      });
      deactivatedCount++;
    }
  });

  if (deactivatedCount > 0) {
    await deactivateBatch.commit();
    log.info(`Deactivated ${deactivatedCount} old personas`);
  }

  // 5. Write merged personas to Firestore in batches of 500
  for (let i = 0; i < mergedPersonas.length; i += 500) {
    const chunk = mergedPersonas.slice(i, i + 500);
    const batch = db.batch();

    for (const persona of chunk) {
      const ref = db.collection('personas').doc(persona.id);
      batch.set(ref, {
        ...persona,
        postsGenerated: 0,
        lastPostedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await batch.commit();
    log.info(`Wrote batch of ${chunk.length} personas to Firestore`);
  }

  // 6. Summary
  const categoryCounts = {};
  for (const p of mergedPersonas) {
    for (const cat of p.sourceCategory) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  log.info('Unique personas covering categories', categoryCounts);
  log.info(`Total unique personas: ${mergedPersonas.length} (from ${synthesizedPersonas.length} raw)`);
  log.info('Synthesis complete!');
}

synthesizePersonas().catch(err => {
  log.error('Persona synthesis failed', { error: err.message, stack: err.stack });
  process.exit(1);
});
