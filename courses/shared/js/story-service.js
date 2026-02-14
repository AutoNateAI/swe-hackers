/**
 * Story Service for AutoNateAI Learning Hub Feed
 * Ephemeral 24-hour stories with view tracking.
 * Collection: /stories/{id}
 */

const StoryService = {

  /** How long a story stays active (24 hours in ms) */
  STORY_TTL_MS: 24 * 60 * 60 * 1000,

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
   * Create a new story
   * @param {object} data - { type, text, backgroundColor }
   * @returns {Promise<{success: boolean, data?: {id: string}, error?: string}>}
   */
  async createStory(data) {
    try {
      const ctx = this._ctx();
      if (ctx.error) return { success: false, error: ctx.error };

      const { db, user } = ctx;
      const ref = db.collection('stories').doc();
      const now = Date.now();

      const storyData = {
        id: ref.id,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || null,
        type: data.type || 'text',
        text: data.text || '',
        backgroundColor: data.backgroundColor || '#1a1a2e',
        mediaUrl: data.mediaUrl || null,
        viewCount: 0,
        viewedBy: [],
        expiresAt: firebase.firestore.Timestamp.fromMillis(now + this.STORY_TTL_MS),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await ref.set(storyData);
      return { success: true, data: { id: ref.id } };
    } catch (error) {
      console.error('StoryService.createStory error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get active (non-expired) stories, grouped by author
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async getActiveStories() {
    try {
      const db = window.FirebaseApp?.getDb();
      if (!db) return { success: false, error: 'Firestore not available' };

      const now = firebase.firestore.Timestamp.now();
      const snapshot = await db.collection('stories')
                               .where('expiresAt', '>', now)
                               .orderBy('expiresAt')
                               .orderBy('createdAt', 'desc')
                               .get();

      const stories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const grouped = this._groupByAuthor(stories);

      return { success: true, data: grouped };
    } catch (error) {
      console.error('StoryService.getActiveStories error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Record a story view (increment viewCount, add uid to viewedBy)
   * @param {string} storyId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async viewStory(storyId) {
    try {
      const ctx = this._ctx();
      if (ctx.error) return { success: false, error: ctx.error };

      const { db, user } = ctx;
      const ref = db.collection('stories').doc(storyId);

      await ref.update({
        viewCount: firebase.firestore.FieldValue.increment(1),
        viewedBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
      });

      return { success: true };
    } catch (error) {
      console.error('StoryService.viewStory error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Return demo stories grouped by author for preview / unauthenticated users
   * @returns {{success: boolean, data: object}}
   */
  getDemoStories() {
    const now = Date.now();
    const demo = [
      {
        id: 'demo-1',
        authorId: 'demo-alex',
        authorName: 'Alex Chen',
        authorPhoto: null,
        type: 'text',
        text: 'Just shipped my first API with Python Flask!',
        backgroundColor: '#0d47a1',
        viewCount: 12,
        viewedBy: [],
        expiresAt: { toMillis: () => now + this.STORY_TTL_MS },
        createdAt: { toMillis: () => now - 3600000 }
      },
      {
        id: 'demo-2',
        authorId: 'demo-alex',
        authorName: 'Alex Chen',
        authorPhoto: null,
        type: 'text',
        text: 'Debugging tip: console.table() is underrated.',
        backgroundColor: '#1b5e20',
        viewCount: 8,
        viewedBy: [],
        expiresAt: { toMillis: () => now + this.STORY_TTL_MS },
        createdAt: { toMillis: () => now - 1800000 }
      },
      {
        id: 'demo-3',
        authorId: 'demo-maya',
        authorName: 'Maya Johnson',
        authorPhoto: null,
        type: 'text',
        text: 'Completed Chapter 3 - The Magnetism. Functions finally click!',
        backgroundColor: '#4a148c',
        viewCount: 20,
        viewedBy: [],
        expiresAt: { toMillis: () => now + this.STORY_TTL_MS },
        createdAt: { toMillis: () => now - 7200000 }
      }
    ];

    return { success: true, data: this._groupByAuthor(demo) };
  },

  /**
   * Group a flat array of stories by authorId
   * @param {object[]} stories
   * @returns {object} { [authorId]: { authorName, authorPhoto, stories[] } }
   */
  _groupByAuthor(stories) {
    const grouped = {};
    for (const story of stories) {
      if (!grouped[story.authorId]) {
        grouped[story.authorId] = {
          authorId: story.authorId,
          authorName: story.authorName,
          authorPhoto: story.authorPhoto,
          stories: []
        };
      }
      grouped[story.authorId].stories.push(story);
    }
    return grouped;
  }
};

window.StoryService = StoryService;
