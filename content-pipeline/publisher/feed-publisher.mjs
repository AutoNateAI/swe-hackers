import { readFile, rename, readdir } from 'fs/promises';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDb } from '../lib/firebase-admin-init.mjs';
import { createLogger } from '../lib/logger.mjs';

const logger = createLogger('feed-publisher');

const VALID_CATEGORIES = new Set(['strategies', 'results', 'tips', 'jobs', 'keywords']);
const VALID_CONTENT_TYPES = new Set(['text', 'interactive', 'chart']);
const MAX_BATCH_OPS = 500;

/**
 * Discover generated-posts JSON files in the data/ directory.
 */
async function findGeneratedPostFiles() {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const dataDir = resolve(__dirname, '..', 'data');

  let files;
  try {
    files = await readdir(dataDir);
  } catch (err) {
    logger.warn('data/ directory not found or unreadable', { error: err.message });
    return [];
  }

  return files
    .filter(f => f.startsWith('generated-posts-') && f.endsWith('.json'))
    .map(f => join(dataDir, f));
}

/**
 * Validate a single post object. Returns an error string or null if valid.
 */
function validatePost(post, index) {
  const required = ['title', 'content', 'category', 'author', 'personaId'];
  for (const field of required) {
    if (!post[field]) {
      return `Post ${index}: missing required field "${field}"`;
    }
  }
  if (!VALID_CATEGORIES.has(post.category)) {
    return `Post ${index}: invalid category "${post.category}" (must be one of ${[...VALID_CATEGORIES].join(', ')})`;
  }
  return null;
}

/**
 * Publish all generated posts to Firestore.
 * Returns { published: number, errors: number }
 */
export async function publishPosts() {
  const db = getDb();
  const postFiles = await findGeneratedPostFiles();

  if (postFiles.length === 0) {
    logger.info('No generated post files found');
    return { published: 0, errors: 0 };
  }

  let totalPublished = 0;
  let totalErrors = 0;

  for (const filePath of postFiles) {
    logger.info('Processing file', { filePath });

    let posts;
    try {
      const raw = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      // Handle both formats: bare array or { posts: [...] } wrapper
      if (Array.isArray(parsed)) {
        posts = parsed;
      } else if (parsed.posts && Array.isArray(parsed.posts)) {
        posts = parsed.posts;
      } else {
        posts = [parsed];
      }
    } catch (err) {
      logger.error('Failed to read/parse post file', { filePath, error: err.message });
      totalErrors++;
      continue;
    }

    // Validate all posts first
    const validPosts = [];
    for (let i = 0; i < posts.length; i++) {
      const err = validatePost(posts[i], i);
      if (err) {
        logger.warn('Skipping invalid post', { reason: err });
        totalErrors++;
      } else {
        validPosts.push(posts[i]);
      }
    }

    if (validPosts.length === 0) {
      logger.warn('No valid posts in file, skipping', { filePath });
      continue;
    }

    // Publish valid posts in batches
    // Each post requires: 1 feedPost write + N sourceId updates + 1 persona update
    // We chunk carefully to stay under the 500 ops limit per batch.
    let batchOps = 0;
    let batch = db.batch();
    const personaIncrements = new Map(); // personaId -> count of posts

    for (const post of validPosts) {
      const sourceIds = Array.isArray(post.sourceIds) ? post.sourceIds : [];

      // Calculate ops this post will need: 1 (feedPost) + sourceIds.length
      const opsNeeded = 1 + sourceIds.length;

      // If adding this post would exceed limit, commit current batch first
      if (batchOps + opsNeeded > MAX_BATCH_OPS) {
        try {
          await batch.commit();
          logger.debug('Intermediate batch committed', { ops: batchOps });
        } catch (err) {
          logger.error('Batch commit failed', { error: err.message });
          totalErrors += validPosts.length;
          break;
        }
        batch = db.batch();
        batchOps = 0;
      }

      // 1. Create feedPost document
      const feedPostRef = db.collection('feedPosts').doc();
      const now = Timestamp.now();

      const contentType = VALID_CONTENT_TYPES.has(post.contentType)
        ? post.contentType
        : 'text';

      const feedPostData = {
        id: feedPostRef.id,
        category: post.category,
        title: post.title,
        content: post.content,
        contentType,
        interactiveData: post.interactiveData || null,
        author: post.author,
        authorInitial: post.author.charAt(0),
        personaId: post.personaId,
        date: now,
        tags: Array.isArray(post.tags) ? post.tags : [],
        premium: Boolean(post.premium),
        sourceIds,
        status: 'published',
        likes: 0,
        commentCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(feedPostRef, feedPostData);
      batchOps++;

      // 2. Update each scrapedData source doc
      for (const sourceId of sourceIds) {
        const sourceRef = db.collection('scrapedData').doc(sourceId);
        batch.update(sourceRef, {
          usedInPosts: FieldValue.arrayUnion(feedPostRef.id),
          status: 'used',
        });
        batchOps++;
      }

      // Track persona increments (applied after batch to consolidate)
      const prev = personaIncrements.get(post.personaId) || 0;
      personaIncrements.set(post.personaId, prev + 1);

      totalPublished++;
    }

    // Add persona updates to the batch
    for (const [personaId, count] of personaIncrements) {
      if (batchOps + 1 > MAX_BATCH_OPS) {
        try {
          await batch.commit();
          logger.debug('Intermediate batch committed before persona updates', { ops: batchOps });
        } catch (err) {
          logger.error('Batch commit failed during persona updates', { error: err.message });
        }
        batch = db.batch();
        batchOps = 0;
      }

      const personaRef = db.collection('personas').doc(personaId);
      batch.update(personaRef, {
        postsGenerated: FieldValue.increment(count),
        lastPostedAt: Timestamp.now(),
      });
      batchOps++;
    }

    // Final commit
    if (batchOps > 0) {
      try {
        await batch.commit();
        logger.info('Batch committed', { ops: batchOps });
      } catch (err) {
        logger.error('Final batch commit failed', { error: err.message });
        totalErrors++;
      }
    }

    // Rename processed file so it is not reprocessed
    const publishedPath = filePath + '.published';
    try {
      await rename(filePath, publishedPath);
      logger.info('Renamed processed file', { from: filePath, to: publishedPath });
    } catch (err) {
      logger.error('Failed to rename processed file', { filePath, error: err.message });
    }
  }

  return { published: totalPublished, errors: totalErrors };
}

// --- CLI entry point ---
const isMainModule = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  publishPosts()
    .then(({ published, errors }) => {
      logger.info('Publish run complete', { published, errors });
      console.log(`Done: ${published} posts published, ${errors} errors`);
      process.exit(errors > 0 ? 1 : 0);
    })
    .catch(err => {
      logger.error('Fatal error in publish run', { error: err.message, stack: err.stack });
      process.exit(1);
    });
}
