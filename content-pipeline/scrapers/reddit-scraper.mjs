#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../lib/logger.mjs';
import { formatScrapedItem, saveResults, isWithinDays, withRetry, sleep } from './base-scraper.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('reddit-scraper');

const sources = JSON.parse(readFileSync(resolve(__dirname, '../config/sources.json'), 'utf-8'));
const config = sources.reddit;

let accessToken = null;

async function authenticate() {
  const { REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT } = process.env;
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
    throw new Error('Reddit OAuth credentials required: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET');
  }

  // Application-only OAuth (read-only access to public data)
  const credentials = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': REDDIT_USER_AGENT || 'autonateai-scraper/1.0',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`Reddit auth failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (data.error) throw new Error(`Reddit auth error: ${data.error}`);
  accessToken = data.access_token;
  log.info('Reddit application-only auth successful');
  return accessToken;
}

async function redditGet(path, params = {}) {
  const userAgent = process.env.REDDIT_USER_AGENT || 'autonateai-scraper/1.0';
  const qs = new URLSearchParams(params).toString();
  const url = `https://oauth.reddit.com${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': userAgent,
    },
  });
  if (!res.ok) throw new Error(`Reddit API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function scrapeSubreddit(sub) {
  log.info(`Scraping r/${sub.name} (${sub.sort}, limit ${sub.limit})`);

  const params = { limit: String(sub.limit), raw_json: '1' };
  if (sub.sort === 'top') params.t = sub.time || 'day';

  const endpoint = `/r/${sub.name}/${sub.sort || 'hot'}`;
  const data = await redditGet(endpoint, params);

  const posts = data?.data?.children || [];
  const items = [];

  for (const { data: post } of posts) {
    if (post.score < config.minScore) continue;
    if (!isWithinDays(new Date(post.created_utc * 1000).toISOString(), config.maxAgeDays)) continue;
    if (post.over_18 || post.removed_by_category) continue;

    items.push(formatScrapedItem({
      source: 'reddit',
      sourceUrl: `https://reddit.com${post.permalink}`,
      sourceId: post.id,
      title: post.title,
      body: post.selftext || '',
      metadata: {
        subreddit: sub.name,
        score: post.score,
        numComments: post.num_comments,
        author: post.author || '[deleted]',
        flair: post.link_flair_text || null
      },
      tags: [sub.name, post.link_flair_text].filter(Boolean)
    }));
  }

  log.info(`r/${sub.name}: ${items.length} posts collected`);
  return items;
}

async function main() {
  log.info('Starting Reddit scraper');
  await authenticate();
  const allItems = [];

  for (const sub of config.subreddits) {
    try {
      const items = await withRetry(() => scrapeSubreddit(sub), { label: `r/${sub.name}` });
      allItems.push(...items);
      await sleep(1000); // Rate limiting
    } catch (err) {
      log.error(`Failed to scrape r/${sub.name}`, { error: err.message });
    }
  }

  const filepath = saveResults('reddit', allItems);
  log.info(`Reddit scrape complete: ${allItems.length} items saved to ${filepath}`);
}

main().catch(err => {
  log.error('Reddit scraper failed', { error: err.message });
  process.exit(1);
});
