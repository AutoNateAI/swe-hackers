/**
 * Comment Service for AutoNateAI Learning Hub Feed
 * Handles threaded comments on posts with optional code blocks.
 * Collection: /posts/{postId}/comments
 */

const CommentService = {

  /**
   * Get Firestore DB and current user, or return an error envelope
   * @returns {{ db, user } | { error: string }}
   */
  _ctx() {
    const db = window.FirebaseApp?.getDb();
    if (!db) return { error: 'Firestore not available' };
    const user = window.AuthService?.getUser();
    if (!user) return { error: 'Not authenticated' };
    return { db, user };
  },

  /**
   * Add a comment (or reply) to a post
   * @param {string} postId
   * @param {object} bodyJson - Structured body content (e.g. rich text delta)
   * @param {string|null} parentId - Parent comment ID for replies, null for top-level
   * @param {string|null} codeBlock - Optional code snippet attached to the comment
   * @returns {Promise<{success: boolean, data?: {id: string}, error?: string}>}
   */
  async addComment(postId, bodyJson, parentId = null, codeBlock = null) {
    try {
      const ctx = this._ctx();
      if (ctx.error) return { success: false, error: ctx.error };

      const { db, user } = ctx;
      const ref = db.collection('posts').doc(postId).collection('comments').doc();

      const commentData = {
        id: ref.id,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || null,
        bodyJson,
        parentId,
        codeBlock,
        deleted: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await ref.set(commentData);
      return { success: true, data: { id: ref.id } };
    } catch (error) {
      console.error('CommentService.addComment error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get top-level comments for a post with cursor-based pagination
   * @param {string} postId
   * @param {object|null} cursor - Last document snapshot for pagination
   * @param {number} limit
   * @returns {Promise<{success: boolean, data?: object[], cursor?: object, error?: string}>}
   */
  async getComments(postId, cursor = null, limit = 20) {
    try {
      const db = window.FirebaseApp?.getDb();
      if (!db) return { success: false, error: 'Firestore not available' };

      let query = db.collection('posts').doc(postId)
                    .collection('comments')
                    .where('parentId', '==', null)
                    .where('deleted', '==', false)
                    .orderBy('createdAt', 'asc')
                    .limit(limit);

      if (cursor) {
        query = query.startAfter(cursor);
      }

      const snapshot = await query.get();
      const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

      return { success: true, data: comments, cursor: lastDoc };
    } catch (error) {
      console.error('CommentService.getComments error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get replies for a specific comment
   * @param {string} postId
   * @param {string} commentId - Parent comment ID
   * @param {number} limit
   * @returns {Promise<{success: boolean, data?: object[], error?: string}>}
   */
  async getReplies(postId, commentId, limit = 10) {
    try {
      const db = window.FirebaseApp?.getDb();
      if (!db) return { success: false, error: 'Firestore not available' };

      const snapshot = await db.collection('posts').doc(postId)
                               .collection('comments')
                               .where('parentId', '==', commentId)
                               .where('deleted', '==', false)
                               .orderBy('createdAt', 'asc')
                               .limit(limit)
                               .get();

      const replies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, data: replies };
    } catch (error) {
      console.error('CommentService.getReplies error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Soft-delete a comment (only the author can delete)
   * @param {string} postId
   * @param {string} commentId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteComment(postId, commentId) {
    try {
      const ctx = this._ctx();
      if (ctx.error) return { success: false, error: ctx.error };

      const { db, user } = ctx;
      const ref = db.collection('posts').doc(postId)
                    .collection('comments').doc(commentId);

      const doc = await ref.get();
      if (!doc.exists) return { success: false, error: 'Comment not found' };
      if (doc.data().authorId !== user.uid) {
        return { success: false, error: 'Not authorized to delete this comment' };
      }

      await ref.update({
        deleted: true,
        deletedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('CommentService.deleteComment error:', error);
      return { success: false, error: error.message };
    }
  }
};

window.CommentService = CommentService;
