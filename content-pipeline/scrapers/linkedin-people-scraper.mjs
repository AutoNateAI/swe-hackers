#!/usr/bin/env node
/**
 * LinkedIn People Scraper — searches for LinkedIn profiles using Apify actor
 * `curious_coder/linkedin-people-search-scraper` (actor ID: pdcNMezBkIlhX0LwO).
 *
 * Reads search configs from config/sources.json under linkedin.peopleSearches
 * and LinkedIn session cookies from config/linkedin-cookies.json.
 *
 * Usage:
 *   node scrapers/linkedin-people-scraper.mjs
 *
 * Respects a 500 profiles/day safety limit to stay within actor quotas.
 */
import { ApifyClient } from 'apify-client';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../lib/logger.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('linkedin-people-scraper');

const ACTOR_ID = 'pdcNMezBkIlhX0LwO'; // curious_coder/linkedin-people-search-scraper
const DAILY_PROFILE_LIMIT = 500;
const DATA_DIR = resolve(__dirname, '../data');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadSources() {
  const sourcesPath = resolve(__dirname, '../config/sources.json');
  return JSON.parse(readFileSync(sourcesPath, 'utf-8'));
}

function loadCookies() {
  const cookiePath = resolve(__dirname, '../config/linkedin-cookies.json');
  if (!existsSync(cookiePath)) {
    throw new Error(`LinkedIn cookies file not found: ${cookiePath}`);
  }
  return JSON.parse(readFileSync(cookiePath, 'utf-8'));
}

function getClient() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN environment variable required');
  return new ApifyClient({ token });
}

function saveGroupResults(group, profiles) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = group.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const filename = `linkedin-people-${slug}-${timestamp}.json`;
  const filepath = resolve(DATA_DIR, filename);

  const payload = {
    scrapedAt: new Date().toISOString(),
    source: 'linkedin-people',
    group,
    count: profiles.length,
    profiles,
  };

  writeFileSync(filepath, JSON.stringify(payload, null, 2));
  return filepath;
}

// ─── Core scraping ────────────────────────────────────────────────────────────

async function scrapeGroup(client, cookies, searchConfig) {
  const { group, searchUrl, keywords, category } = searchConfig;

  // Build searchUrl from keywords if not provided directly
  const url = searchUrl || (keywords
    ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}&origin=SWITCH_SEARCH_VERTICAL`
    : null);

  if (!url) {
    log.warn(`Skipping group "${group}" — no searchUrl or keywords provided`);
    return [];
  }

  log.info(`Scraping people: "${group}"`);

  const input = {
    searchUrl: url,
    cookie: cookies,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  };

  const run = await client.actor(ACTOR_ID).call(input, { waitSecs: 600 });
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  log.info(`  → ${items.length} profiles from "${group}"`);

  // Tag each profile with the category / group for downstream use
  return items.map(profile => ({
    ...profile,
    _meta: {
      group,
      category: category || group,
      scrapedAt: new Date().toISOString(),
    },
  }));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function scrapeLinkedInPeople() {
  log.info('Starting LinkedIn People scraper');

  const sources = loadSources();
  const searches = sources.linkedin?.peopleSearches;

  if (!searches?.length) {
    log.warn('No linkedin.peopleSearches configured in sources.json — nothing to do');
    return [];
  }

  const cookies = loadCookies();
  const client = getClient();

  let totalProfiles = 0;
  const allResults = [];

  for (const searchConfig of searches) {
    // Enforce daily limit
    if (totalProfiles >= DAILY_PROFILE_LIMIT) {
      log.warn(
        `Daily profile limit reached (${DAILY_PROFILE_LIMIT}). ` +
        `Skipping remaining searches. Collected ${totalProfiles} profiles so far.`
      );
      break;
    }

    const remaining = DAILY_PROFILE_LIMIT - totalProfiles;
    if (remaining < 50) {
      log.warn(`Approaching daily limit — only ${remaining} profiles remaining before cap`);
    }

    try {
      const profiles = await scrapeGroup(client, cookies, searchConfig);

      // Trim if we'd exceed the daily cap
      const trimmed = profiles.slice(0, DAILY_PROFILE_LIMIT - totalProfiles);
      if (trimmed.length < profiles.length) {
        log.warn(
          `Trimmed ${profiles.length - trimmed.length} profiles from "${searchConfig.group}" ` +
          `to stay within daily limit`
        );
      }

      totalProfiles += trimmed.length;

      // Save per-group file
      if (trimmed.length > 0) {
        const filepath = saveGroupResults(searchConfig.group, trimmed);
        log.info(`  Saved ${trimmed.length} profiles → ${filepath}`);
        allResults.push({ group: searchConfig.group, count: trimmed.length, filepath });
      }
    } catch (err) {
      log.error(`  Failed to scrape "${searchConfig.group}"`, { error: err.message });
    }
  }

  log.info(`LinkedIn People scrape complete: ${totalProfiles} total profiles across ${allResults.length} groups`);
  return allResults;
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  scrapeLinkedInPeople().catch(err => {
    log.error('LinkedIn People scraper failed', { error: err.message });
    process.exit(1);
  });
}
