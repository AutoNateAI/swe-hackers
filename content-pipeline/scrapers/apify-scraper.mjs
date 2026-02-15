#!/usr/bin/env node
/**
 * Unified Apify scraper — uses platform-specific actors for Reddit, YouTube, and LinkedIn.
 * One API key, plug-and-play actors.
 *
 * Actors used:
 *   Reddit:   muscular_quadruplet/reddit-scraper (subreddit-based, Playwright)
 *   YouTube:  streamers/youtube-scraper (search-based)
 *   LinkedIn: curious_coder/linkedin-post-search-scraper (post search)
 */
import { ApifyClient } from 'apify-client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../lib/logger.mjs';
import { formatScrapedItem, saveResults } from './base-scraper.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('apify-scraper');

const sources = JSON.parse(readFileSync(resolve(__dirname, '../config/sources.json'), 'utf-8'));

function getClient() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN environment variable required');
  return new ApifyClient({ token });
}

async function runActor(client, actorId, input, label) {
  log.info(`  Running ${actorId} for: ${label}`);
  const run = await client.actor(actorId).call(input, { waitSecs: 180 });
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  log.info(`  → ${items.length} results from ${label}`);
  return items;
}

// ─── Reddit ───────────────────────────────────────────────────────────────────

async function scrapeReddit(client, config) {
  log.info('Scraping Reddit...');
  const allItems = [];

  for (const sub of config.subreddits) {
    try {
      const items = await runActor(client, 'muscular_quadruplet/reddit-scraper', {
        subreddit: sub.name,
        sort: sub.sort || 'hot',
        maxPosts: sub.limit || 25,
      }, `r/${sub.name}`);

      // Filter by score and take only what we need
      const filtered = items
        .filter(item => (item.score || 0) >= (config.minScore || 0))
        .slice(0, sub.limit || 25);

      for (const item of filtered) {
        allItems.push(formatScrapedItem({
          source: 'reddit',
          sourceUrl: item.url || `https://reddit.com${item.permalink || ''}`,
          sourceId: item.id || item.url || '',
          title: item.title || '',
          body: (item.selftext || item.body || '').slice(0, 5000),
          metadata: {
            subreddit: item.subreddit || sub.name,
            score: item.score || 0,
            numComments: item.numComments || 0,
            author: item.author || null,
            flair: item.flair || null,
          },
          tags: [sub.name, item.flair, sub.category].filter(Boolean),
        }));
      }
    } catch (err) {
      log.error(`  Reddit r/${sub.name} failed`, { error: err.message });
    }
  }

  return allItems;
}

// ─── YouTube ──────────────────────────────────────────────────────────────────

async function scrapeYouTube(client, config) {
  log.info('Scraping YouTube...');
  const allItems = [];

  for (const search of config.searches) {
    try {
      const items = await runActor(client, 'streamers/youtube-scraper', {
        searchKeywords: search.query,
        maxResults: search.limit || 5,
        uploadDate: search.uploadDate || 'month',
        sortBy: search.sortBy || 'relevance',
      }, search.query);

      for (const item of items) {
        allItems.push(formatScrapedItem({
          source: 'youtube',
          sourceUrl: item.url || `https://www.youtube.com/watch?v=${item.id}`,
          sourceId: item.id || item.url || '',
          title: item.title || '',
          body: (item.description || item.text || '').slice(0, 5000),
          metadata: {
            channelName: item.channelName || item.channel || null,
            channelUrl: item.channelUrl || null,
            viewCount: item.viewCount || item.views || 0,
            likes: item.likes || 0,
            duration: item.duration || null,
            publishedAt: item.date || item.uploadDate || null,
            category: search.category,
          },
          tags: ['youtube', search.category, item.channelName || ''].filter(Boolean),
        }));
      }
    } catch (err) {
      log.error(`  YouTube "${search.query}" failed`, { error: err.message });
    }
  }

  return allItems;
}

// ─── LinkedIn ─────────────────────────────────────────────────────────────────

async function scrapeLinkedIn(client, config) {
  log.info('Scraping LinkedIn...');
  const allItems = [];

  for (const search of config.searches) {
    try {
      const items = await runActor(client, 'curious_coder/linkedin-post-search-scraper', {
        searchKeywords: search.query,
        maxResults: search.limit || 10,
        sortBy: 'date_posted',
      }, search.query);

      for (const item of items) {
        const text = item.text || item.postText || item.content || '';
        allItems.push(formatScrapedItem({
          source: 'linkedin',
          sourceUrl: item.postUrl || item.url || item.linkedinUrl || '',
          sourceId: item.urn || item.postId || item.url || '',
          title: text.slice(0, 100).split('\n')[0] || 'LinkedIn Post',
          body: text.slice(0, 5000),
          metadata: {
            type: search.type || 'post',
            author: item.authorName || item.author || null,
            authorTitle: item.authorTitle || item.headline || null,
            likes: item.likesCount || item.numLikes || 0,
            comments: item.commentsCount || item.numComments || 0,
            category: search.category,
          },
          tags: ['linkedin', search.category].filter(Boolean),
        }));
      }
    } catch (err) {
      log.error(`  LinkedIn "${search.query}" failed`, { error: err.message });
    }
  }

  return allItems;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log.info('Starting Apify unified scraper');
  const client = getClient();
  const allItems = [];

  if (sources.reddit?.subreddits?.length) {
    const items = await scrapeReddit(client, sources.reddit);
    allItems.push(...items);
  }

  if (sources.youtube?.searches?.length) {
    const items = await scrapeYouTube(client, sources.youtube);
    allItems.push(...items);
  }

  if (sources.linkedin?.searches?.length) {
    const items = await scrapeLinkedIn(client, sources.linkedin);
    allItems.push(...items);
  }

  const filepath = saveResults('apify', allItems);
  log.info(`Apify scrape complete: ${allItems.length} total items saved to ${filepath}`);
}

main().catch(err => {
  log.error('Apify scraper failed', { error: err.message });
  process.exit(1);
});
