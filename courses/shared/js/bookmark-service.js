/**
 * Bookmark Service for AutoNateAI Learning Hub Feed
 * Lets users save and manage bookmarked posts.
 * Collection: /users/{uid}/bookmarks/{postId}
 */

const BookmarkService = {

  /**
   * Get Firestore DB and current user, or return an error envelope
   * @returns {{ db, uid } | { error: string }}
   */
  _ctx() {
    const db = window.FirebaseApp?.getDb();
    if (!db) return { error: 'Firestore not available' };
    const user = window.AuthService?.getUser();
    if (!user) return { error: 'Not authenticated' };
    return { db, uid: user.uid };
  },

  /**
   * Bookmark a post
   * @param {string} postId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async bookmark(postId) {
    try {
      const ctx = this._ctx();
      if (ctx.error) return { success: false, error: ctx.error };

      const { db, uid } = ctx;
      const ref = db.collection('users').doc(uid)
                    .collection('bookmarks').doc(postId);

      await ref.set({
        postId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('BookmarkService.bookmark error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Remove a bookmark
   * @param {string} postId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async unbookmark(postId) {
    try {
      const ctx = this._ctx();
      if (ctx.error) return { success: false, error: ctx.error };

      const { db, uid } = ctx;
      const ref = db.collection('users').doc(uid)
                    .collection('bookmarks').doc(postId);

      await ref.delete();
      return { success: true };
    } catch (error) {
      console.error('BookmarkService.unbookmark error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Check whether a post is bookmarked by the current user
   * @param {string} postId
   * @returns {Promise<{success: boolean, data?: boolean, error?: string}>}
   */
  async isBookmarked(postId) {
    try {
      const ctx = this._ctx();
      if (ctx.error) return { success: false, error: ctx.error };

      const { db, uid } = ctx;
      const ref = db.collection('users').doc(uid)
                    .collection('bookmarks').doc(postId);

      const doc = await ref.get();
      return { success: true, data: doc.exists };
    } catch (error) {
      console.error('BookmarkService.isBookmarked error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get the current user's bookmarks with cursor-based pagination
   * @param {object|null} cursor - Last document snapshot for pagination
   * @param {number} limit
   * @returns {Promise<{success: boolean, data?: object[], cursor?: object, error?: string}>}
   */
  async getBookmarks(cursor = null, limit = 20) {
    try {
      const ctx = this._ctx();
      if (ctx.error) return { success: false, error: ctx.error };

      const { db, uid } = ctx;
      let query = db.collection('users').doc(uid)
                    .collection('bookmarks')
                    .orderBy('createdAt', 'desc')
                    .limit(limit);

      if (cursor) {
        query = query.startAfter(cursor);
      }

      const snapshot = await query.get();
      const bookmarks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

      return { success: true, data: bookmarks, cursor: lastDoc };
    } catch (error) {
      console.error('BookmarkService.getBookmarks error:', error);
      return { success: false, error: error.message };
    }
  }
};

window.BookmarkService = BookmarkService;
