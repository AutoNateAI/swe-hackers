#!/usr/bin/env node
/**
 * Clear all documents from feedPosts and commentThreads collections.
 * Usage: node scripts/clear-feed-posts.mjs
 */
import { getDb } from '../lib/firebase-admin-init.mjs';
import { createLogger } from '../lib/logger.mjs';

const log = createLogger('clear-feed-posts');

async function deleteCollection(collectionName) {
  const db = getDb();
  const collRef = db.collection(collectionName);
  const snapshot = await collRef.get();

  if (snapshot.empty) {
    log.info(`${collectionName}: already empty`);
    return 0;
  }

  const BATCH_SIZE = 400;
  let deleted = 0;

  for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = snapshot.docs.slice(i, i + BATCH_SIZE);
    for (const doc of chunk) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deleted += chunk.length;
    log.info(`${collectionName}: deleted ${deleted}/${snapshot.size}`);
  }

  return deleted;
}

async function main() {
  log.info('Clearing all feed posts and comment threads...');

  const feedDeleted = await deleteCollection('feedPosts');
  const threadsDeleted = await deleteCollection('commentThreads');

  log.info(`Done: ${feedDeleted} feed posts deleted, ${threadsDeleted} comment threads deleted`);
}

main().catch(err => {
  log.error('Failed to clear posts', { error: err.message });
  process.exit(1);
});
