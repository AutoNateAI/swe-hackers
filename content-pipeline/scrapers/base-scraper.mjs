import { createHash } from 'crypto';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../lib/logger.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../data');

export function contentHash(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function withRetry(fn, { retries = 3, delayMs = 2000, label = 'operation' } = {}) {
  const log = createLogger('retry');
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      log.warn(`${label} attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await sleep(delayMs * attempt);
    }
  }
}

export function isWithinDays(dateStr, maxDays) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  return diffMs <= maxDays * 24 * 60 * 60 * 1000;
}

export function saveResults(source, items) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${source}-${timestamp}.json`;
  const filepath = resolve(DATA_DIR, filename);
  writeFileSync(filepath, JSON.stringify({ source, scrapedAt: new Date().toISOString(), count: items.length, items }, null, 2));
  return filepath;
}

export function formatScrapedItem({ source, sourceUrl, sourceId, title, body, metadata = {}, tags = [], comments = [] }) {
  return {
    source,
    sourceUrl,
    sourceId,
    contentHash: contentHash(`${title}${body}`),
    title: title?.slice(0, 500) || '',
    body: body?.slice(0, 5000) || '',
    metadata,
    tags,
    comments: comments || metadata.comments || [],
    scrapedAt: new Date().toISOString(),
    status: 'new'
  };
}
