#!/usr/bin/env node
import { ApifyClient } from 'apify-client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../lib/logger.mjs';
import { formatScrapedItem, saveResults, isWithinDays } from './base-scraper.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('linkedin-scraper');

const sources = JSON.parse(readFileSync(resolve(__dirname, '../config/sources.json'), 'utf-8'));
const config = sources.linkedin;

function getClient() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN environment variable required');
  return new ApifyClient({ token });
}

function categorizeResult(item) {
  const url = item.url || '';
  if (url.includes('/jobs/') || item.type === 'job') return 'job';
  if (url.includes('/events/') || item.type === 'event') return 'event';
  return 'post';
}

async function scrapeLinkedInPosts(client, query) {
  log.info(`Running Apify actor for query: "${query}"`);

  // Using curious_coder/linkedin-post-search-scraper
  const run = await client.actor('curious_coder/linkedin-post-search-scraper').call({
    searchKeywords: query,
    maxResults: config.maxResults || 10,
    sortBy: 'date_posted',
  }, {
    waitSecs: 120,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return items;
}

async function scrapeLinkedInJobs(client, query) {
  log.info(`Running Apify actor for jobs query: "${query}"`);

  // Using hMvNSpz3JnHgl5jkh (LinkedIn Jobs Scraper)
  const run = await client.actor('hMvNSpz3JnHgl5jkh').call({
    searchUrl: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}`,
    maxResults: config.maxResults || 10,
  }, {
    waitSecs: 120,
  });

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return items;
}

function transformPostItem(item, query) {
  const text = item.text || item.postText || item.content || '';
  const title = text.slice(0, 100).split('\n')[0] || 'LinkedIn Post';
  const url = item.postUrl || item.url || item.linkedinUrl || '';

  return formatScrapedItem({
    source: 'linkedin',
    sourceUrl: url,
    sourceId: item.urn || item.postId || url,
    title,
    body: text.slice(0, 5000),
    metadata: {
      type: 'post',
      author: item.authorName || item.author || null,
      authorTitle: item.authorTitle || item.headline || null,
      authorProfileUrl: item.authorProfileUrl || item.authorUrl || null,
      likes: item.likesCount || item.numLikes || 0,
      comments: item.commentsCount || item.numComments || 0,
      reposts: item.repostsCount || item.numShares || 0,
      query,
    },
    tags: ['linkedin', 'post', ...query.split(' ').slice(0, 3)],
  });
}

function transformJobItem(item, query) {
  const title = item.title || item.jobTitle || 'LinkedIn Job';
  const url = item.jobUrl || item.url || item.link || '';
  const company = item.companyName || item.company || '';
  const description = item.description || item.descriptionText || '';

  return formatScrapedItem({
    source: 'linkedin',
    sourceUrl: url,
    sourceId: item.jobId || url,
    title: `${title} at ${company}`,
    body: description.slice(0, 5000),
    metadata: {
      type: 'job',
      company,
      location: item.location || item.formattedLocation || null,
      salary: item.salary || item.salaryRange || null,
      applicants: item.applicantsCount || null,
      postedTime: item.postedTime || item.listedAt || null,
      query,
    },
    tags: ['linkedin', 'job', ...query.split(' ').slice(0, 3)],
  });
}

async function main() {
  log.info('Starting LinkedIn scraper (via Apify)');
  const client = getClient();
  const allItems = [];

  for (const queryConfig of config.searches) {
    const { query, type } = queryConfig;
    try {
      if (type === 'jobs') {
        const items = await scrapeLinkedInJobs(client, query);
        const transformed = items.map(item => transformJobItem(item, query));
        allItems.push(...transformed);
        log.info(`Jobs query "${query}": ${transformed.length} results`);
      } else {
        const items = await scrapeLinkedInPosts(client, query);
        const transformed = items.map(item => transformPostItem(item, query));
        allItems.push(...transformed);
        log.info(`Posts query "${query}": ${transformed.length} results`);
      }
    } catch (err) {
      log.error(`Failed query: ${query}`, { error: err.message });
    }
  }

  const filepath = saveResults('linkedin', allItems);
  log.info(`LinkedIn scrape complete: ${allItems.length} items saved to ${filepath}`);
}

main().catch(err => {
  log.error('LinkedIn scraper failed', { error: err.message });
  process.exit(1);
});
