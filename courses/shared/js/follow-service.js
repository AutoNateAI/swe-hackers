/**
 * Follow Service for AutoNateAI Learning Hub
 * Handles follow/unfollow, follower lists, and suggestions.
 */
const FollowService = {

  _getDb() { return window.FirebaseApp?.getDb(); },
  _getUser() { return window.AuthService?.getUser(); },

  // ═══════════════════════════════════════════════════════════════════════════
  // FOLLOW / UNFOLLOW
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Follow a user.
   * Batch-writes three docs and increments counters on both user docs.
   * @param {string} targetId - UID of the user to follow
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async followUser(targetId) {
    const user = this._getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    if (user.uid === targetId) return { success: false, error: 'Cannot follow yourself' };

    const db = this._getDb();
    if (!db) return { success: false, error: 'Database not available' };

    try {
      const already = await this.isFollowing(targetId);
      if (already) {
        console.log('\u{1F465} Already following', targetId);
        return { success: true };
      }

      const batch = db.batch();
      const now = firebase.firestore.FieldValue.serverTimestamp();

      // /users/{uid}/following/{targetId}
      const followingRef = db.collection('users').doc(user.uid)
        .collection('following').doc(targetId);
      batch.set(followingRef, { uid: targetId, followedAt: now });

      // /users/{targetId}/followers/{uid}
      const followerRef = db.collection('users').doc(targetId)
        .collection('followers').doc(user.uid);
      batch.set(followerRef, { uid: user.uid, followedAt: now });

      // /follows/{uid}_{targetId}
      const followDocRef = db.collection('follows').doc(`${user.uid}_${targetId}`);
      batch.set(followDocRef, {
        followerId: user.uid,
        followingId: targetId,
        createdAt: now
      });

      // Increment counters
      batch.update(db.collection('users').doc(targetId), {
        followerCount: firebase.firestore.FieldValue.increment(1)
      });
      batch.update(db.collection('users').doc(user.uid), {
        followingCount: firebase.firestore.FieldValue.increment(1)
      });

      await batch.commit();
      console.log('\u{1F465} Followed user:', targetId);
      return { success: true };
    } catch (error) {
      console.error('\u{1F465} Error following user:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Unfollow a user.
   * Batch-deletes three docs and decrements counters on both user docs.
   * @param {string} targetId - UID of the user to unfollow
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async unfollowUser(targetId) {
    const user = this._getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const db = this._getDb();
    if (!db) return { success: false, error: 'Database not available' };

    try {
      const following = await this.isFollowing(targetId);
      if (!following) {
        console.log('\u{1F465} Not following', targetId);
        return { success: true };
      }

      const batch = db.batch();

      // /users/{uid}/following/{targetId}
      batch.delete(db.collection('users').doc(user.uid)
        .collection('following').doc(targetId));

      // /users/{targetId}/followers/{uid}
      batch.delete(db.collection('users').doc(targetId)
        .collection('followers').doc(user.uid));

      // /follows/{uid}_{targetId}
      batch.delete(db.collection('follows').doc(`${user.uid}_${targetId}`));

      // Decrement counters
      batch.update(db.collection('users').doc(targetId), {
        followerCount: firebase.firestore.FieldValue.increment(-1)
      });
      batch.update(db.collection('users').doc(user.uid), {
        followingCount: firebase.firestore.FieldValue.increment(-1)
      });

      await batch.commit();
      console.log('\u{1F465} Unfollowed user:', targetId);
      return { success: true };
    } catch (error) {
      console.error('\u{1F465} Error unfollowing user:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check whether the current user is following a target user.
   * @param {string} targetId - UID to check
   * @returns {Promise<boolean>}
   */
  async isFollowing(targetId) {
    const user = this._getUser();
    if (!user) return false;
    const db = this._getDb();
    if (!db) return false;

    try {
      const doc = await db.collection('users').doc(user.uid)
        .collection('following').doc(targetId).get();
      return doc.exists;
    } catch (error) {
      console.error('\u{1F465} Error checking follow status:', error);
      return false;
    }
  },

  /**
   * Get the list of followers for a user.
   * @param {string} userId - UID whose followers to retrieve
   * @param {number} limit  - Max results (default 50)
   * @returns {Promise<object[]>}
   */
  async getFollowers(userId, limit = 50) {
    const db = this._getDb();
    if (!db) return [];

    try {
      const snapshot = await db.collection('users').doc(userId)
        .collection('followers')
        .orderBy('followedAt', 'desc')
        .limit(limit)
        .get();

      const followers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`\u{1F465} Loaded ${followers.length} followers for ${userId}`);
      return followers;
    } catch (error) {
      console.error('\u{1F465} Error getting followers:', error);
      return [];
    }
  },

  /**
   * Get the list of users that a user is following.
   * @param {string} userId - UID whose following list to retrieve
   * @param {number} limit  - Max results (default 50)
   * @returns {Promise<object[]>}
   */
  async getFollowing(userId, limit = 50) {
    const db = this._getDb();
    if (!db) return [];

    try {
      const snapshot = await db.collection('users').doc(userId)
        .collection('following')
        .orderBy('followedAt', 'desc')
        .limit(limit)
        .get();

      const following = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`\u{1F465} Loaded ${following.length} following for ${userId}`);
      return following;
    } catch (error) {
      console.error('\u{1F465} Error getting following:', error);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SUGGESTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get follow suggestions for the current user.
   * Tries Firestore first; falls back to demo suggestions.
   * @returns {Promise<object[]>}
   */
  async getSuggestions() {
    const user = this._getUser();
    if (!user) return this.getDemoSuggestions();
    const db = this._getDb();
    if (!db) return this.getDemoSuggestions();

    try {
      const doc = await db.collection('users').doc(user.uid)
        .collection('suggestions').doc('follow').get();

      if (doc.exists && Array.isArray(doc.data().users) && doc.data().users.length > 0) {
        console.log('\u{1F465} Loaded suggestions from Firestore');
        return doc.data().users;
      }

      console.log('\u{1F465} No Firestore suggestions, using demo data');
      return this.getDemoSuggestions();
    } catch (error) {
      console.error('\u{1F465} Error loading suggestions:', error);
      return this.getDemoSuggestions();
    }
  },

  /**
   * Return a static list of demo follow suggestions.
   * @returns {object[]}
   */
  getDemoSuggestions() {
    return [
      { uid: 'demo_alex',   displayName: 'Alex Rivera',    reason: 'Similar interests',  photoURL: null },
      { uid: 'demo_jordan', displayName: 'Jordan Kim',     reason: 'Popular mentor',      photoURL: null },
      { uid: 'demo_priya',  displayName: 'Priya Sharma',   reason: 'Top contributor',     photoURL: null },
      { uid: 'demo_marcus', displayName: 'Marcus Johnson',  reason: 'In your cohort',     photoURL: null },
      { uid: 'demo_sofia',  displayName: 'Sofia Chen',     reason: 'Recommended for you', photoURL: null }
    ];
  }
};

window.FollowService = FollowService;
