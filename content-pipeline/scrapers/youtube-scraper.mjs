#!/usr/bin/env node
import { youtube } from '@googleapis/youtube';
import { YoutubeTranscript } from 'youtube-transcript';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../lib/logger.mjs';
import { formatScrapedItem, saveResults, isWithinDays, withRetry, sleep } from './base-scraper.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('youtube-scraper');

const sources = JSON.parse(readFileSync(resolve(__dirname, '../config/sources.json'), 'utf-8'));
const config = sources.youtube;

function getClient() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY environment variable required');
  return youtube({ version: 'v3', auth: apiKey });
}

async function fetchTranscript(videoId) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map(t => t.text).join(' ').slice(0, 5000);
  } catch {
    return '';
  }
}

async function searchVideos(yt, query) {
  log.info(`Searching YouTube: "${query}"`);
  const publishedAfter = new Date(Date.now() - config.maxAgeDays * 86400000).toISOString();

  const res = await yt.search.list({
    part: ['snippet'],
    q: query,
    type: ['video'],
    maxResults: config.maxResults,
    order: 'relevance',
    publishedAfter
  });

  const items = [];
  for (const item of (res.data.items || [])) {
    const videoId = item.id.videoId;
    const snippet = item.snippet;

    let transcript = '';
    if (config.fetchTranscript) {
      transcript = await fetchTranscript(videoId);
      await sleep(500);
    }

    items.push(formatScrapedItem({
      source: 'youtube',
      sourceUrl: `https://youtube.com/watch?v=${videoId}`,
      sourceId: videoId,
      title: snippet.title,
      body: transcript || snippet.description,
      metadata: {
        channelTitle: snippet.channelTitle,
        channelId: snippet.channelId,
        publishedAt: snippet.publishedAt,
        thumbnail: snippet.thumbnails?.high?.url || null,
        hasTranscript: !!transcript
      },
      tags: [snippet.channelTitle]
    }));
  }

  return items;
}

async function scrapeChannel(yt, channel) {
  log.info(`Scraping channel: ${channel.name}`);
  const publishedAfter = new Date(Date.now() - config.maxAgeDays * 86400000).toISOString();

  const res = await yt.search.list({
    part: ['snippet'],
    channelId: channel.id,
    type: ['video'],
    maxResults: config.maxResults,
    order: 'date',
    publishedAfter
  });

  const items = [];
  for (const item of (res.data.items || [])) {
    const videoId = item.id.videoId;
    const snippet = item.snippet;

    let transcript = '';
    if (config.fetchTranscript) {
      transcript = await fetchTranscript(videoId);
      await sleep(500);
    }

    items.push(formatScrapedItem({
      source: 'youtube',
      sourceUrl: `https://youtube.com/watch?v=${videoId}`,
      sourceId: videoId,
      title: snippet.title,
      body: transcript || snippet.description,
      metadata: {
        channelTitle: snippet.channelTitle,
        channelId: snippet.channelId,
        publishedAt: snippet.publishedAt,
        thumbnail: snippet.thumbnails?.high?.url || null,
        hasTranscript: !!transcript
      },
      tags: [channel.name]
    }));
  }

  return items;
}

async function main() {
  log.info('Starting YouTube scraper');
  const yt = getClient();
  const allItems = [];

  for (const query of config.searchTerms) {
    try {
      const items = await withRetry(() => searchVideos(yt, query), { label: `search:${query}` });
      allItems.push(...items);
      await sleep(1000);
    } catch (err) {
      log.error(`Failed search: ${query}`, { error: err.message });
    }
  }

  for (const channel of config.channels) {
    try {
      const items = await withRetry(() => scrapeChannel(yt, channel), { label: `channel:${channel.name}` });
      allItems.push(...items);
      await sleep(1000);
    } catch (err) {
      log.error(`Failed channel: ${channel.name}`, { error: err.message });
    }
  }

  const filepath = saveResults('youtube', allItems);
  log.info(`YouTube scrape complete: ${allItems.length} items saved to ${filepath}`);
}

main().catch(err => {
  log.error('YouTube scraper failed', { error: err.message });
  process.exit(1);
});
