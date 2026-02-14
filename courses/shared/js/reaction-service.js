/**
 * Reaction Service for AutoNateAI Learning Hub Feed
 * Handles emoji reactions on posts (fire, brain, rocket, heart, clap).
 * Collection: /posts/{postId}/reactions/{uid}
 */

const ReactionService = {
  // Supported reaction types with emoji mapping
  TYPES: {
    fire: '\uD83D\uDD25',
    brain: '\uD83E\uDDE0',
    rocket: '\uD83D\uDE80',
    heart: '\u2764\uFE0F',
    clap: '\uD83D\uDC4F'
  },

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
   * Add or update a reaction on a post
   * @param {string} postId
   * @param {'fire'|'brain'|'rocket'|'heart'|'clap'} type
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async addReaction(postId, type) {
    try {
      if (!this.TYPES[type]) {
        return { success: false, error: `Invalid reaction type: ${type}` };
      }
      const ctx = this._ctx();
      if (ctx.error) return { success: false, error: ctx.error };

      const { db, uid } = ctx;
      const ref = db.collection('posts').doc(postId)
                    .collection('reactions').doc(uid);

      await ref.set({
        type,
        uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('ReactionService.addReaction error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Remove the current user's reaction from a post
   * @param {string} postId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async removeReaction(postId) {
    try {
      const ctx = this._ctx();
      if (ctx.error) return { success: false, error: ctx.error };

      const { db, uid } = ctx;
      const ref = db.collection('posts').doc(postId)
                    .collection('reactions').doc(uid);

      await ref.delete();
      return { success: true };
    } catch (error) {
      console.error('ReactionService.removeReaction error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get the current user's reaction for a post
   * @param {string} postId
   * @returns {Promise<{success: boolean, data?: object|null, error?: string}>}
   */
  async getMyReaction(postId) {
    try {
      const ctx = this._ctx();
      if (ctx.error) return { success: false, error: ctx.error };

      const { db, uid } = ctx;
      const ref = db.collection('posts').doc(postId)
                    .collection('reactions').doc(uid);

      const doc = await ref.get();
      return { success: true, data: doc.exists ? { id: doc.id, ...doc.data() } : null };
    } catch (error) {
      console.error('ReactionService.getMyReaction error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all reactions for a post
   * @param {string} postId
   * @param {number} limit
   * @returns {Promise<{success: boolean, data?: object[], error?: string}>}
   */
  async getReactions(postId, limit = 50) {
    try {
      const db = window.FirebaseApp?.getDb();
      if (!db) return { success: false, error: 'Firestore not available' };

      const snapshot = await db.collection('posts').doc(postId)
                               .collection('reactions')
                               .limit(limit)
                               .get();

      const reactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, data: reactions };
    } catch (error) {
      console.error('ReactionService.getReactions error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get the emoji string for a reaction type
   * @param {string} type
   * @returns {string}
   */
  getEmoji(type) {
    return this.TYPES[type] || '';
  }
};

window.ReactionService = ReactionService;
