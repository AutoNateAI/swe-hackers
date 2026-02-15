#!/usr/bin/env node
/**
 * Unified Google Custom Search scraper.
 * Searches for AI/automation content across Reddit, YouTube, LinkedIn, and the open web.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../lib/logger.mjs';
import { formatScrapedItem, saveResults, sleep } from './base-scraper.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('google-cse-scraper');

const sources = JSON.parse(readFileSync(resolve(__dirname, '../config/sources.json'), 'utf-8'));

function getCredentials() {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cseId) throw new Error('GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID environment variables required');
  return { apiKey, cseId };
}

async function search(apiKey, cseId, query, opts = {}) {
  const params = new URLSearchParams({
    key: apiKey,
    cx: cseId,
    q: query,
    num: String(opts.num || 10),
  });
  if (opts.dateRestrict) params.set('dateRestrict', opts.dateRestrict);
  if (opts.siteSearch) params.set('siteSearch', opts.siteSearch);
  if (opts.siteSearchFilter) params.set('siteSearchFilter', opts.siteSearchFilter);

  const url = `https://www.googleapis.com/customsearch/v1?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google CSE error ${res.status}: ${body}`);
  }

  return res.json();
}

function detectSource(url) {
  if (url.includes('reddit.com')) return 'reddit';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('linkedin.com')) return 'linkedin';
  return 'web';
}

function detectContentType(url) {
  if (url.includes('/jobs/')) return 'job';
  if (url.includes('/posts/') || url.includes('/pulse/')) return 'post';
  if (url.includes('/events/')) return 'event';
  if (url.includes('/watch') || url.includes('youtu.be')) return 'video';
  if (url.includes('/comments/')) return 'discussion';
  return 'article';
}

function extractTags(item, queryConfig) {
  const tags = [queryConfig.category];
  const source = detectSource(item.link);
  if (source !== 'web') tags.push(source);
  const contentType = detectContentType(item.link);
  if (contentType !== 'article') tags.push(contentType);
  // Extract keywords from the query
  const keywords = queryConfig.query
    .replace(/site:\S+/g, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 2);
  tags.push(...keywords.slice(0, 3));
  return [...new Set(tags)];
}

function transformResult(item, queryConfig) {
  const source = detectSource(item.link);
  const metatags = item.pagemap?.metatags?.[0] || {};

  return formatScrapedItem({
    source,
    sourceUrl: item.link,
    sourceId: item.cacheId || item.link,
    title: item.title || '',
    body: [
      item.snippet || '',
      metatags['og:description'] || '',
    ].filter(Boolean).join('\n\n').slice(0, 5000),
    metadata: {
      contentType: detectContentType(item.link),
      displayLink: item.displayLink,
      query: queryConfig.query,
      category: queryConfig.category,
      ogTitle: metatags['og:title'] || null,
      ogImage: metatags['og:image'] || null,
      author: metatags['author'] || metatags['article:author'] || null,
    },
    tags: extractTags(item, queryConfig),
  });
}

async function main() {
  log.info('Starting Google Custom Search scraper');
  const { apiKey, cseId } = getCredentials();
  const allItems = [];
  const queries = sources.googleCSE?.queries || [];

  if (queries.length === 0) {
    log.error('No search queries configured in sources.json');
    process.exit(1);
  }

  for (const queryConfig of queries) {
    try {
      const opts = {
        num: queryConfig.num || 10,
        dateRestrict: queryConfig.dateRestrict || `d${sources.googleCSE.maxAgeDays || 7}`,
      };

      // If a site is specified, add site restriction
      if (queryConfig.site) {
        opts.siteSearch = queryConfig.site;
        opts.siteSearchFilter = 'i'; // include only this site
      }

      log.info(`Searching: "${queryConfig.query}"${queryConfig.site ? ` (site:${queryConfig.site})` : ''}`);
      const data = await search(apiKey, cseId, queryConfig.query, opts);
      const results = data.items || [];

      for (const item of results) {
        allItems.push(transformResult(item, queryConfig));
      }

      log.info(`  → ${results.length} results`);
      await sleep(500); // Rate limiting (100 queries/day free tier)
    } catch (err) {
      log.error(`Failed query: "${queryConfig.query}"`, { error: err.message });
    }
  }

  const filepath = saveResults('google-cse', allItems);
  log.info(`Google CSE scrape complete: ${allItems.length} items saved to ${filepath}`);
}

main().catch(err => {
  log.error('Google CSE scraper failed', { error: err.message });
  process.exit(1);
});
