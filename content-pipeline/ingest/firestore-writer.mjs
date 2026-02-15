#!/usr/bin/env node
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../lib/firebase-admin-init.mjs';
import { createLogger } from '../lib/logger.mjs';
import { filterDuplicates } from './deduplicator.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../data');
const log = createLogger('firestore-writer');

function loadDataFiles() {
  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== '.gitkeep');
  const allItems = [];

  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf-8'));
      if (data.items && Array.isArray(data.items)) {
        allItems.push(...data.items);
        log.info(`Loaded ${data.items.length} items from ${file}`);
      }
    } catch (err) {
      log.error(`Failed to load ${file}`, { error: err.message });
    }
  }

  return allItems;
}

async function writeBatch(items) {
  const db = getDb();
  const BATCH_SIZE = 50;
  let written = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const item of chunk) {
      const ref = db.collection('scrapedData').doc();
      batch.set(ref, {
        ...item,
        usedInPosts: [],
        scrapedAt: new Date(item.scrapedAt),
        createdAt: new Date()
      });
    }

    await batch.commit();
    written += chunk.length;
    log.info(`Written ${written}/${items.length} items`);
  }

  return written;
}

async function main() {
  log.info('Starting Firestore ingestion');

  const allItems = loadDataFiles();
  if (allItems.length === 0) {
    log.info('No data files found to ingest');
    return;
  }

  const unique = await filterDuplicates(allItems);
  if (unique.length === 0) {
    log.info('All items are duplicates, nothing to ingest');
    return;
  }

  const written = await writeBatch(unique);
  log.info(`Ingestion complete: ${written} new items written to scrapedData`);
}

main().catch(err => {
  log.error('Ingestion failed', { error: err.message });
  process.exit(1);
});
