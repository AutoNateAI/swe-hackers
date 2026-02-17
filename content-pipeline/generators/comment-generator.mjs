#!/usr/bin/env node
/**
 * Comment Thread Generator
 *
 * Generates multi-level AI agent comment threads for carousel posts.
 * Creates a "live" feel with nested conversations from animated animal personas.
 *
 * Thread structure:
 *   Level 1: ~9 agents reply to the post's question
 *   Level 2: ~6 agents reply per Level 1 comment
 *   Level 3: ~3 agents reply per Level 2 comment
 *
 * Each agent:
 *   - Has a unique animated animal avatar
 *   - Responds in character with their persona's voice
 *   - Can be an existing persona or a "new" agent drawn to the conversation
 *   - Original poster/commenter can respond if the algo says they should
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../lib/firebase-admin-init.mjs';
import { chatCompletion } from '../lib/openai-client.mjs';
import { createLogger } from '../lib/logger.mjs';
import { loadPersonas, buildSystemPrompt } from './persona-engine.mjs';
import { rankPersonasForComments, shouldAgentRespond } from './ranking-engine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const log = createLogger('comment-generator');

const scheduleConfig = JSON.parse(readFileSync(resolve(__dirname, '../config/schedule.json'), 'utf-8'));

/**
 * Build avatar info from the persona's existing profile.
 */
function getPersonaAvatar(persona) {
  return {
    displayName: persona.displayName,
    initial: persona.initial,
    color: persona.avatarColor,
    role: persona.role,
    personaId: persona.id,
  };
}

/**
 * Generate a single comment from a persona in response to content.
 */
async function generateComment({ persona, postQuestion, postContext, parentComment, threadContext }) {
  const isReplyToComment = !!parentComment;

  const contextBlock = threadContext
    ? `\nTHREAD SO FAR:\n${threadContext}`
    : '';

  const parentBlock = isReplyToComment
    ? `\nYOU ARE REPLYING TO THIS COMMENT:\n"${parentComment.text}" — ${parentComment.authorName}`
    : '';

  const prompt = `You are participating in a conversation on a social learning platform. The post is an image carousel with the central question:

"${postQuestion}"

Post context: ${postContext}
${contextBlock}
${parentBlock}

Write a ${isReplyToComment ? 'reply to the above comment' : 'top-level comment on this post'}. Your comment should:
- Be conversational and natural (like a real social media comment)
- Add genuine substance — share an insight, ask a follow-up, offer a different angle
- Be 1-4 sentences (keep it punchy, not an essay)
- ${isReplyToComment ? 'Directly engage with the parent comment — agree, disagree, build on it' : 'Share your unique take on the question based on your expertise'}
- Feel like a real person talking, not an AI generating content
- Occasionally use casual language, humor, or analogies

Respond with JSON:
{
  "text": "your comment text",
  "sentiment": "agree|disagree|nuanced|curious|humorous",
  "engagementHook": true/false,
  "suggestsFollowUp": "optional follow-up question or null"
}`;

  const result = await chatCompletion({
    model: scheduleConfig.generation.commentModel || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: buildSystemPrompt(persona) + '\n\nYou are commenting on a social learning platform. Be conversational, authentic, and engaging. Stay in character as ' + persona.displayName + ', ' + persona.role + '.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.85,
    maxTokens: 500,
    responseFormat: { type: 'json_object' }
  });

  const parsed = JSON.parse(result);

  const avatar = getPersonaAvatar(persona);

  return {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: parsed.text,
    sentiment: parsed.sentiment,
    engagementHook: parsed.engagementHook,
    suggestsFollowUp: parsed.suggestsFollowUp || null,
    authorName: persona.displayName,
    authorRole: persona.role,
    personaId: persona.id,
    avatar: {
      initial: avatar.initial,
      color: avatar.color,
      displayName: avatar.displayName,
      role: avatar.role,
    },
    createdAt: new Date().toISOString(),
    replies: [],
  };
}

/**
 * Generate Level 1 comments (top-level replies to the post).
 */
async function generateLevel1Comments({ postQuestion, postContext, postAuthorId, themes }) {
  log.info('Generating Level 1 comments (top-level replies)');

  const commentConfig = scheduleConfig.comments || {};
  const level1Count = commentConfig.level1Count || 9;

  const ranked = await rankPersonasForComments({
    postAuthorId,
    alreadyCommented: [],
    themes,
    count: level1Count
  });

  const comments = await Promise.all(
    ranked.map(async ({ persona }) => {
      try {
        const comment = await generateComment({
          persona,
          postQuestion,
          postContext,
          parentComment: null,
          threadContext: null,
        });
        log.info(`L1 comment by ${persona.displayName}: "${comment.text.slice(0, 60)}..."`);
        return comment;
      } catch (err) {
        log.error(`Failed L1 comment by ${persona.displayName}`, { error: err.message });
        return null;
      }
    })
  );

  return comments.filter(Boolean);
}

/**
 * Generate Level 2 comments (replies to Level 1 comments).
 */
async function generateLevel2Comments({ postQuestion, postContext, postAuthorId, level1Comments, themes }) {
  log.info('Generating Level 2 comments (replies to L1)');

  const commentConfig = scheduleConfig.comments || {};
  const level2Count = commentConfig.level2Count || 6;
  const alreadyCommented = level1Comments.map(c => c.personaId);

  const allPersonas = await loadPersonas();
  const poster = allPersonas.find(p => p.id === postAuthorId);

  await Promise.all(level1Comments.map(async (l1Comment) => {
    const ranked = await rankPersonasForComments({
      postAuthorId,
      alreadyCommented: [...alreadyCommented],
      themes,
      count: level2Count
    });

    // Check if the original poster should respond
    if (poster && shouldAgentRespond(poster, l1Comment.text, 0.35)) {
      try {
        const reply = await generateComment({
          persona: poster,
          postQuestion,
          postContext,
          parentComment: l1Comment,
          threadContext: `${l1Comment.authorName}: "${l1Comment.text}"`,
        });
        l1Comment.replies.push(reply);
        log.info(`L2 reply by poster ${poster.displayName}`);
      } catch (err) {
        log.error(`Failed L2 poster reply`, { error: err.message });
      }
    }

    const replies = await Promise.all(
      ranked.map(async ({ persona }) => {
        try {
          const threadContext = [
            `${l1Comment.authorName}: "${l1Comment.text}"`,
          ].join('\n');

          const reply = await generateComment({
            persona,
            postQuestion,
            postContext,
            parentComment: l1Comment,
            threadContext,
          });
          return reply;
        } catch (err) {
          log.error(`Failed L2 comment by ${persona.displayName}`, { error: err.message });
          return null;
        }
      })
    );
    l1Comment.replies.push(...replies.filter(Boolean));
  }));
}

/**
 * Generate Level 3 comments (replies to Level 2 comments).
 */
async function generateLevel3Comments({ postQuestion, postContext, postAuthorId, level1Comments, themes }) {
  log.info('Generating Level 3 comments (replies to L2)');

  const commentConfig = scheduleConfig.comments || {};
  const level3Count = commentConfig.level3Count || 3;

  const allPersonas = await loadPersonas();

  // Collect all L2 comments across all L1 comments for parallel processing
  const l2Tasks = [];
  for (const l1Comment of level1Comments) {
    for (const l2Comment of l1Comment.replies) {
      l2Tasks.push({ l1Comment, l2Comment });
    }
  }

  await Promise.all(l2Tasks.map(async ({ l1Comment, l2Comment }) => {
    const alreadyInThread = [
      l1Comment.personaId,
      ...l1Comment.replies.map(r => r.personaId)
    ];

    const ranked = await rankPersonasForComments({
      postAuthorId,
      alreadyCommented: alreadyInThread,
      themes,
      count: level3Count
    });

    // Check if L1 commenter should respond to L2
    const l1Author = allPersonas.find(p => p.id === l1Comment.personaId);
    if (l1Author && shouldAgentRespond(l1Author, l2Comment.text, 0.45)) {
      try {
        const reply = await generateComment({
          persona: l1Author,
          postQuestion,
          postContext,
          parentComment: l2Comment,
          threadContext: [
            `${l1Comment.authorName}: "${l1Comment.text}"`,
            `${l2Comment.authorName}: "${l2Comment.text}"`
          ].join('\n'),
        });
        l2Comment.replies = l2Comment.replies || [];
        l2Comment.replies.push(reply);
      } catch (err) {
        log.error(`Failed L3 reply by L1 author`, { error: err.message });
      }
    }

    const replies = await Promise.all(
      ranked.map(async ({ persona }) => {
        try {
          const threadContext = [
            `${l1Comment.authorName}: "${l1Comment.text}"`,
            `${l2Comment.authorName}: "${l2Comment.text}"`,
          ].join('\n');

          return await generateComment({
            persona,
            postQuestion,
            postContext,
            parentComment: l2Comment,
            threadContext,
          });
        } catch (err) {
          log.error(`Failed L3 comment by ${persona.displayName}`, { error: err.message });
          return null;
        }
      })
    );
    l2Comment.replies = l2Comment.replies || [];
    l2Comment.replies.push(...replies.filter(Boolean));
  }));
}

/**
 * Count total comments in a thread tree.
 */
function countComments(comments) {
  let count = 0;
  for (const c of comments) {
    count++;
    if (c.replies) count += countComments(c.replies);
  }
  return count;
}

/**
 * Generate full comment thread for a carousel post.
 */
async function generateThreadForPost(carouselPost) {
  const { question, questionContext, themes, personaId: postAuthorId } = carouselPost;

  // Level 1: Top-level replies
  const level1Comments = await generateLevel1Comments({
    postQuestion: question,
    postContext: questionContext,
    postAuthorId,
    themes
  });

  // Level 2: Replies to Level 1
  await generateLevel2Comments({
    postQuestion: question,
    postContext: questionContext,
    postAuthorId,
    level1Comments,
    themes
  });

  // Level 3: Replies to Level 2
  await generateLevel3Comments({
    postQuestion: question,
    postContext: questionContext,
    postAuthorId,
    level1Comments,
    themes
  });

  const totalComments = countComments(level1Comments);
  log.info(`Thread generated: ${totalComments} total comments across 3 levels`);

  return {
    postId: carouselPost.id || null,
    question: question,
    comments: level1Comments,
    totalComments,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Load the most recent carousel posts and generate threads.
 */
async function main() {
  log.info('Starting comment thread generation');

  // Find generated carousel files that need threads
  const dataDir = resolve(__dirname, '../data');
  let files;
  try {
    files = readdirSync(dataDir)
      .filter(f => f.startsWith('generated-carousels-') && f.endsWith('.json'))
      .sort()
      .reverse();
  } catch {
    log.info('No data directory found');
    return;
  }

  if (files.length === 0) {
    log.info('No carousel posts found to generate threads for');
    return;
  }

  const latestFile = resolve(dataDir, files[0]);
  const carouselData = JSON.parse(readFileSync(latestFile, 'utf-8'));
  const posts = carouselData.posts || [];

  const allThreads = [];

  for (const post of posts) {
    try {
      const thread = await generateThreadForPost(post);
      allThreads.push(thread);
      log.info(`Thread for "${post.question.slice(0, 50)}...": ${thread.totalComments} comments`);
    } catch (err) {
      log.error('Failed to generate thread', { error: err.message, question: post.question });
    }
  }

  if (allThreads.length > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = resolve(dataDir, `generated-threads-${timestamp}.json`);
    writeFileSync(filepath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      count: allThreads.length,
      totalComments: allThreads.reduce((sum, t) => sum + t.totalComments, 0),
      threads: allThreads
    }, null, 2));
    log.info(`${allThreads.length} threads saved to ${filepath}`);
  }
}

main().catch(err => {
  log.error('Comment generation failed', { error: err.message });
  process.exit(1);
});
