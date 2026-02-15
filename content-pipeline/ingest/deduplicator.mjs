import { getDb } from '../lib/firebase-admin-init.mjs';
import { createLogger } from '../lib/logger.mjs';

const log = createLogger('deduplicator');

export async function isDuplicate(contentHash) {
  const db = getDb();
  const snapshot = await db.collection('scrapedData')
    .where('contentHash', '==', contentHash)
    .limit(1)
    .get();
  return !snapshot.empty;
}

export async function filterDuplicates(items) {
  const unique = [];
  const seen = new Set();

  for (const item of items) {
    if (seen.has(item.contentHash)) continue;
    seen.add(item.contentHash);

    const exists = await isDuplicate(item.contentHash);
    if (exists) {
      log.debug(`Duplicate skipped: ${item.title?.slice(0, 50)}`);
      continue;
    }
    unique.push(item);
  }

  log.info(`Deduplication: ${items.length} → ${unique.length} unique items`);
  return unique;
}
