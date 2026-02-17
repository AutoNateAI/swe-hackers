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

/**
 * Fetch comments for a specific Reddit post.
 * Returns top-level comments with up to 1 level of replies.
 */
async function fetchPostComments(permalink, maxComments = 20) {
  try {
    const data = await redditGet(`${permalink}`, { limit: String(maxComments), raw_json: '1', sort: 'best' });

    // Reddit returns [postListing, commentListing]
    const commentListing = Array.isArray(data) ? data[1] : null;
    if (!commentListing?.data?.children) return [];

    const comments = [];
    for (const { data: comment } of commentListing.data.children) {
      if (comment.body === '[deleted]' || comment.body === '[removed]') continue;
      if (!comment.body) continue;

      const replies = [];
      if (comment.replies?.data?.children) {
        for (const { data: reply } of comment.replies.data.children.slice(0, 5)) {
          if (!reply.body || reply.body === '[deleted]' || reply.body === '[removed]') continue;
          replies.push({
            body: reply.body?.slice(0, 500),
            score: reply.score || 0,
            author: reply.author || '[deleted]',
          });
        }
      }

      comments.push({
        body: comment.body?.slice(0, 800),
        score: comment.score || 0,
        author: comment.author || '[deleted]',
        replies,
      });
    }

    return comments;
  } catch (err) {
    log.warn(`Failed to fetch comments for ${permalink}`, { error: err.message });
    return [];
  }
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

    // Fetch comments for posts with enough engagement
    let comments = [];
    if (post.num_comments >= 3) {
      comments = await fetchPostComments(post.permalink, 20);
      await sleep(500); // Rate limit between comment fetches
    }

    items.push(formatScrapedItem({
      source: 'reddit',
      sourceUrl: `https://reddit.com${post.permalink}`,
      sourceId: post.id,
      title: post.title,
      body: post.selftext || '',
      comments,
      metadata: {
        subreddit: sub.name,
        score: post.score,
        numComments: post.num_comments,
        author: post.author || '[deleted]',
        flair: post.link_flair_text || null,
      },
      tags: [sub.name, post.link_flair_text].filter(Boolean)
    }));
  }

  log.info(`r/${sub.name}: ${items.length} posts collected (with comments)`);
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
