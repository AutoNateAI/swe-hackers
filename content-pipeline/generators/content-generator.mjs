#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../lib/firebase-admin-init.mjs';
import { chatCompletion } from '../lib/openai-client.mjs';
import { createLogger } from '../lib/logger.mjs';
import { selectPersonaRoundRobin, buildSystemPrompt } from './persona-engine.mjs';
import { buildStrategyPrompt } from './prompt-templates/strategy-post.mjs';
import { buildResultsPrompt } from './prompt-templates/results-post.mjs';
import { buildTipsPrompt } from './prompt-templates/tips-post.mjs';
import { buildJobsPrompt } from './prompt-templates/jobs-post.mjs';
import { buildKeywordsPrompt } from './prompt-templates/keywords-post.mjs';
import { buildInteractivePrompt } from './prompt-templates/interactive-post.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('content-generator');

const scheduleConfig = JSON.parse(readFileSync(resolve(__dirname, '../config/schedule.json'), 'utf-8'));

const CATEGORY_TEMPLATES = {
  strategies: buildStrategyPrompt,
  results: buildResultsPrompt,
  tips: buildTipsPrompt,
  jobs: buildJobsPrompt,
  keywords: buildKeywordsPrompt,
};

const CATEGORIES = ['strategies', 'results', 'tips', 'jobs', 'keywords'];

async function fetchNewScrapedData(limit = 20) {
  const db = getDb();
  const snapshot = await db.collection('scrapedData')
    .where('status', '==', 'new')
    .orderBy('scrapedAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function pickCategory(scrapedItems) {
  const sourceCounts = {};
  for (const item of scrapedItems) {
    const tags = item.tags || [];
    for (const cat of CATEGORIES) {
      if (tags.some(t => t.toLowerCase().includes(cat.slice(0, 4)))) {
        sourceCounts[cat] = (sourceCounts[cat] || 0) + 1;
      }
    }
  }

  // Weighted random based on available content, with fallback to round-robin
  const hasJobs = scrapedItems.some(i =>
    i.source === 'linkedin' && i.metadata?.type === 'job'
  );
  if (hasJobs && Math.random() < 0.3) return 'jobs';

  // Random category selection weighted toward less-posted categories
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
}

async function stage1Analysis(scrapedItems, category) {
  log.info(`Stage 1: Analyzing ${scrapedItems.length} items for category "${category}"`);

  const summaries = scrapedItems.slice(0, 10).map(item => ({
    source: item.source,
    title: item.title,
    body: item.body?.slice(0, 500),
    tags: item.tags,
    metadata: item.metadata
  }));

  const prompt = `You are a content analyst for an AI automation community marketplace called AutoNateAI.

Analyze the following scraped content and extract insights for a "${category}" post.

SCRAPED CONTENT:
${JSON.stringify(summaries, null, 2)}

Respond with JSON:
{
  "themes": ["list of 3-5 key themes found"],
  "insights": ["list of 3-5 specific insights, stats, or takeaways"],
  "suggestedCategory": "${category}",
  "suggestedTags": ["5 tags"],
  "interactiveOpportunity": "none" or "chart" or "cytoscape",
  "interactiveReason": "why a visual would work here (if applicable)",
  "keyStats": ["any specific numbers or percentages found"],
  "trendDirection": "up" or "down" or "stable"
}`;

  const result = await chatCompletion({
    model: scheduleConfig.generation.stage1Model,
    messages: [{ role: 'user', content: prompt }],
    temperature: scheduleConfig.generation.temperature.stage1,
    maxTokens: scheduleConfig.generation.maxTokens.stage1,
    responseFormat: { type: 'json_object' }
  });

  return JSON.parse(result);
}

async function stage2Generation(analysis, persona, category) {
  log.info(`Stage 2: Generating ${category} post as ${persona.displayName}`);

  const templateFn = CATEGORY_TEMPLATES[category];
  let userPrompt;

  if (analysis.interactiveOpportunity !== 'none' && Math.random() < 0.3) {
    userPrompt = buildInteractivePrompt(analysis, analysis.interactiveOpportunity === 'cytoscape' ? 'cytoscape' : 'chart');
  } else {
    userPrompt = templateFn(analysis);
  }

  const result = await chatCompletion({
    model: scheduleConfig.generation.stage2Model,
    messages: [
      { role: 'system', content: buildSystemPrompt(persona) },
      { role: 'user', content: userPrompt }
    ],
    temperature: scheduleConfig.generation.temperature.stage2,
    maxTokens: scheduleConfig.generation.maxTokens.stage2,
    responseFormat: { type: 'json_object' }
  });

  return JSON.parse(result);
}

async function generatePost(scrapedItems) {
  const category = pickCategory(scrapedItems);
  const persona = await selectPersonaRoundRobin(category);

  // Stage 1: Analysis
  const analysis = await stage1Analysis(scrapedItems, category);

  // Stage 2: Generation
  const postData = await stage2Generation(analysis, persona, category);

  // Attach metadata
  return {
    ...postData,
    category,
    author: persona.displayName,
    authorInitial: persona.initial,
    personaId: persona.id,
    sourceIds: scrapedItems.slice(0, 5).map(i => i.id),
    status: 'draft'
  };
}

async function main() {
  log.info('Starting content generation');

  const scrapedItems = await fetchNewScrapedData();
  if (scrapedItems.length === 0) {
    log.info('No new scraped data available');
    return;
  }

  const postsPerRun = scheduleConfig.pipeline.postsPerRun;
  const generatedPosts = [];
  const usedPersonaIds = [];

  for (let i = 0; i < postsPerRun; i++) {
    try {
      const post = await generatePost(scrapedItems);
      generatedPosts.push(post);
      usedPersonaIds.push(post.personaId);
      log.info(`Generated post ${i + 1}/${postsPerRun}: "${post.title}" by ${post.author}`);
    } catch (err) {
      log.error(`Failed to generate post ${i + 1}`, { error: err.message });
    }
  }

  // Save generated posts to data/ for the publisher to pick up
  if (generatedPosts.length > 0) {
    const { writeFileSync } = await import('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = resolve(__dirname, `../data/generated-posts-${timestamp}.json`);
    writeFileSync(filepath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      count: generatedPosts.length,
      posts: generatedPosts
    }, null, 2));
    log.info(`${generatedPosts.length} posts saved to ${filepath}`);
  }
}

main().catch(err => {
  log.error('Content generation failed', { error: err.message });
  process.exit(1);
});
