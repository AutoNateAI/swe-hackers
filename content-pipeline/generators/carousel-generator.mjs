#!/usr/bin/env node
/**
 * Carousel Content Generator
 *
 * Transforms scraped Reddit posts + comments into image carousel posts.
 * Each post is 7-9 slides: question graphic + supporting memes/diagrams/perspectives.
 * An AI persona is ranked and selected to "author" the post in their voice.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../lib/firebase-admin-init.mjs';
import { chatCompletion } from '../lib/openai-client.mjs';
import { generateCarousel } from '../lib/image-generator.mjs';
import { createLogger } from '../lib/logger.mjs';
import { buildSystemPrompt } from './persona-engine.mjs';
import { rankPersonasForPost } from './ranking-engine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('carousel-generator');

const scheduleConfig = JSON.parse(readFileSync(resolve(__dirname, '../config/schedule.json'), 'utf-8'));

/**
 * Fetch scraped Reddit data that includes comments.
 */
async function fetchRedditDataWithComments(limit = 15) {
  const db = getDb();
  const snapshot = await db.collection('scrapedData')
    .where('status', '==', 'new')
    .where('source', '==', 'reddit')
    .orderBy('scrapedAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Stage 1: Analyze Reddit posts + comments to extract the best nuanced question.
 * Looks at both post content AND comment threads for deeper insight.
 */
async function extractBestQuestion(redditItems) {
  log.info(`Analyzing ${redditItems.length} Reddit items for question extraction`);

  const itemSummaries = redditItems.slice(0, 10).map(item => ({
    title: item.title,
    body: item.body?.slice(0, 600),
    score: item.metadata?.score,
    numComments: item.metadata?.numComments,
    flair: item.metadata?.flair,
    comments: (item.comments || []).slice(0, 15).map(c => ({
      text: c.body?.slice(0, 300),
      score: c.score,
      replies: (c.replies || []).slice(0, 3).map(r => r.body?.slice(0, 200))
    }))
  }));

  const prompt = `You are a content strategist for an AI-powered social learning platform. Analyze these Reddit posts and their comments to find the BEST nuanced, thought-provoking question that would spark deep conversation.

REDDIT DATA (posts + comments):
${JSON.stringify(itemSummaries, null, 2)}

Your job:
1. Read through ALL the posts AND their comments
2. Identify the most interesting debates, questions, tensions, or insights happening
3. Synthesize a single powerful question that captures the most engaging angle
4. The question should be deep enough to generate 7+ different visual perspectives
5. It should be specific enough to be interesting but broad enough for diverse opinions

Respond with JSON:
{
  "question": "The synthesized question (compelling, thought-provoking, 10-25 words)",
  "questionContext": "Brief context about why this question matters (2-3 sentences)",
  "sourceInsights": ["3-5 specific insights/perspectives found in the comments"],
  "themes": ["4-6 themes this question touches on"],
  "keywords": ["5-8 keywords relevant to this topic"],
  "perspectives": [
    {
      "angle": "A specific perspective or stance on the question",
      "visualIdea": "How this could be visualized (meme, diagram, chart, infographic, comparison)"
    }
  ],
  "memeOpportunities": ["2-3 humorous/relatable angles for meme-style images"],
  "sourcePostIds": ["IDs of the most relevant source posts used"]
}`;

  const result = await chatCompletion({
    model: scheduleConfig.generation.stage1Model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    maxTokens: 2000,
    responseFormat: { type: 'json_object' }
  });

  return JSON.parse(result);
}

/**
 * Stage 2: Generate image prompts for the carousel slides.
 * Persona shapes the visual style and framing.
 */
async function generateImagePrompts(questionAnalysis, persona) {
  log.info(`Generating image prompts as ${persona.displayName}`);

  const prompt = `You are ${persona.displayName}, ${persona.role}. ${persona.bio}

Based on this question and analysis, create image prompts for a 7-9 slide Instagram-style carousel post. Each image must be visually striking and add unique value.

THE QUESTION: "${questionAnalysis.question}"
CONTEXT: ${questionAnalysis.questionContext}
KEY PERSPECTIVES: ${JSON.stringify(questionAnalysis.perspectives)}
MEME OPPORTUNITIES: ${JSON.stringify(questionAnalysis.memeOpportunities)}
THEMES: ${questionAnalysis.themes.join(', ')}

Rules for image prompts:
- Slide 1 is ALWAYS the question as bold text on a striking graphic background
- Slides 2-4 should show different perspectives (serious, analytical, contrarian)
- Slides 5-6 should be memes or humorous takes that are relatable
- Slides 7+ should be diagrams, charts, or infographic-style knowledge drops
- Each prompt should specify exact visual style, colors, composition
- NO text-heavy slides except slide 1 — use visual metaphors instead
- Make images that stop the scroll — bold, unexpected, visually diverse

Respond with JSON:
{
  "slidePrompts": [
    {
      "slideNumber": 2,
      "type": "perspective|meme|diagram|infographic|comparison",
      "description": "What this slide communicates",
      "imagePrompt": "Detailed image generation prompt (50-100 words, specific visual direction)"
    }
  ],
  "carouselStyle": "Overall visual style description",
  "targetAudience": "Who this carousel speaks to"
}`;

  const result = await chatCompletion({
    model: scheduleConfig.generation.stage2Model,
    messages: [
      { role: 'system', content: buildSystemPrompt(persona) },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8,
    maxTokens: 3000,
    responseFormat: { type: 'json_object' }
  });

  return JSON.parse(result);
}

/**
 * Full carousel post generation pipeline.
 */
async function generateCarouselPost(redditItems) {
  // Stage 1: Extract the best question from posts + comments
  const questionAnalysis = await extractBestQuestion(redditItems);
  log.info(`Best question: "${questionAnalysis.question}"`);

  // Rank and select the best persona for this content
  const ranked = await rankPersonasForPost(questionAnalysis.themes, questionAnalysis.keywords);
  const persona = ranked[0].persona;
  log.info(`Selected persona: ${persona.displayName} (score: ${ranked[0].score.toFixed(2)})`);

  // Stage 2: Generate image prompts through the persona's lens
  const imagePromptData = await generateImagePrompts(questionAnalysis, persona);

  // Stage 3: Generate actual images via OpenAI
  const slidePrompts = imagePromptData.slidePrompts.map(s => s.imagePrompt);
  log.info(`Generating ${slidePrompts.length + 1} carousel images...`);

  const carouselImages = await generateCarousel({
    question: questionAnalysis.question,
    imagePrompts: slidePrompts,
    style: imagePromptData.carouselStyle || 'modern bold graphic'
  });

  // Build the final post object
  const sourceIds = (questionAnalysis.sourcePostIds || [])
    .concat(redditItems.slice(0, 5).map(i => i.id))
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe
    .slice(0, 10);

  return {
    contentType: 'carousel',
    question: questionAnalysis.question,
    questionContext: questionAnalysis.questionContext,
    themes: questionAnalysis.themes,
    keywords: questionAnalysis.keywords,
    perspectives: questionAnalysis.perspectives,
    slides: carouselImages.map((img, i) => ({
      slideNumber: img.slideNumber,
      type: img.type,
      prompt: img.prompt,
      hasImage: !!img.imageData,
      imageUrl: img.imageData?.url || null,
      imageB64: img.imageData?.b64_json || null,
    })),
    slideMetadata: imagePromptData.slidePrompts,
    carouselStyle: imagePromptData.carouselStyle,
    author: persona.displayName,
    authorInitial: persona.initial,
    personaId: persona.id,
    avatarColor: persona.avatarColor,
    sourceIds,
    status: 'draft',
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  // Accept --count=N from CLI to override postsPerRun
  const countArg = process.argv.find(a => a.startsWith('--count='));
  const countOverride = countArg ? parseInt(countArg.split('=')[1], 10) : null;

  log.info('Starting carousel content generation');

  const redditItems = await fetchRedditDataWithComments();
  if (redditItems.length === 0) {
    log.info('No new Reddit data with comments available');
    return;
  }

  const carouselConfig = scheduleConfig.carousel || {};
  const postsPerRun = countOverride || carouselConfig.postsPerRun || 1;
  const concurrency = carouselConfig.concurrency || 5;
  log.info(`Generating ${postsPerRun} carousel posts (concurrency: ${concurrency})`);

  // Run posts in parallel batches
  const generatedPosts = [];

  for (let batch = 0; batch < postsPerRun; batch += concurrency) {
    const batchSize = Math.min(concurrency, postsPerRun - batch);
    const batchPromises = Array.from({ length: batchSize }, (_, i) => {
      const postIndex = batch + i + 1;
      return generateCarouselPost(redditItems)
        .then(post => {
          log.info(`Generated carousel ${postIndex}/${postsPerRun}: "${post.question}" by ${post.author}`);
          return post;
        })
        .catch(err => {
          log.error(`Failed to generate carousel ${postIndex}`, { error: err.message });
          return null;
        });
    });

    const batchResults = await Promise.all(batchPromises);
    generatedPosts.push(...batchResults.filter(Boolean));
    log.info(`Batch complete: ${generatedPosts.length} posts generated so far`);
  }

  if (generatedPosts.length > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = resolve(__dirname, `../data/generated-carousels-${timestamp}.json`);
    writeFileSync(filepath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      count: generatedPosts.length,
      posts: generatedPosts
    }, null, 2));
    log.info(`${generatedPosts.length} carousel posts saved to ${filepath}`);
  }
}

main().catch(err => {
  log.error('Carousel generation failed', { error: err.message });
  process.exit(1);
});
