#!/usr/bin/env node
/**
 * One-time script: Seed personas from config/personas.json → Firestore personas collection
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../lib/firebase-admin-init.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const personasPath = resolve(__dirname, '../config/personas.json');

async function seedPersonas() {
  const db = getDb();
  const { personas } = JSON.parse(readFileSync(personasPath, 'utf-8'));

  console.log(`Seeding ${personas.length} personas to Firestore...`);

  const batch = db.batch();

  for (const persona of personas) {
    const ref = db.collection('personas').doc(persona.id);
    batch.set(ref, {
      ...persona,
      postsGenerated: 0,
      lastPostedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`  + ${persona.id}: ${persona.displayName} (${persona.categories.join(', ')})`);
  }

  await batch.commit();
  console.log(`\nDone! ${personas.length} personas seeded.`);
}

seedPersonas().catch(err => {
  console.error('Failed to seed personas:', err);
  process.exit(1);
});
