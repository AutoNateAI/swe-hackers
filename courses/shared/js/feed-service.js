/**
 * Feed Service for AutoNateAI Learning Hub
 * Handles social feed: creating posts, timelines, trending, and global feed.
 * Falls back to demo data when Firebase or auth is unavailable.
 */
const FeedService = {

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Check whether Firebase and an authenticated user are available. */
  _getContext() {
    try {
      const db   = window.FirebaseApp && window.FirebaseApp.getDb();
      const auth = window.FirebaseApp && window.FirebaseApp.getAuth();
      const user = auth && auth.currentUser;
      if (db && user) return { db, auth, uid: user.uid };
    } catch (e) { /* Firebase not initialised */ }
    return null;
  },

  /** True when we must operate in demo mode (no Firebase / no auth). */
  _isDemoMode() { return this._getContext() === null; },

  // ═══════════════════════════════════════════════════════════════════════════
  // POST CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new post in /posts/{postId}.
   * Automatically sets authorId, counters, flags, and timestamps.
   */
  async createPost(postData) {
    if (this._isDemoMode()) {
      console.log('📰 Demo mode — createPost simulated');
      return { success: true, data: { id: 'demo_' + Date.now(), ...postData } };
    }
    const ctx = this._getContext();
    if (!ctx) return { success: false, error: 'Not authenticated' };
    const { db, uid } = ctx;
    const postRef = db.collection('posts').doc();
    const doc = {
      type:        postData.type        || 'status',
      bodyJson:    postData.bodyJson    || null,
      tags:        postData.tags        || [],
      visibility:  postData.visibility  || 'public',
      codeBlock:   postData.codeBlock   || null,
      images:      postData.images      || [],
      attachments: postData.attachments || [],
      title:       postData.title       || null,
      authorId:      uid,
      reactionCount: 0, commentCount: 0, bookmarkCount: 0,
      repostCount:   0, viewCount:    0, xpAwarded:     0,
      pinned: false, deleted: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      await postRef.set(doc);
      console.log('📰 Post created:', postRef.id);
      return { success: true, data: { id: postRef.id, ...doc } };
    } catch (error) {
      console.error('📰 Error creating post:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMELINE (per-user fan-out)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the current user's timeline from /users/{uid}/timeline.
   * Supports cursor-based pagination (startAfter the last DocumentSnapshot).
   */
  async getTimeline(cursor = null, limit = 20) {
    if (this._isDemoMode()) {
      console.log('📰 Demo mode — returning demo timeline');
      return { success: true, data: { posts: this.getDemoPosts(), cursor: null } };
    }
    const ctx = this._getContext();
    if (!ctx) return { success: false, error: 'Not authenticated' };
    const { db, uid } = ctx;
    try {
      let query = db.collection('users').doc(uid)
        .collection('timeline')
        .orderBy('createdAt', 'desc').limit(limit);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      const posts   = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const lastDoc = posts.length ? snapshot.docs[snapshot.docs.length - 1] : null;
      console.log('📰 Timeline fetched:', posts.length, 'items');
      return { success: true, data: { posts, cursor: lastDoc } };
    } catch (error) {
      console.error('📰 Error fetching timeline:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HYDRATION — batch-get full post documents
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Batch-fetch full post documents from /posts/{id}.
   * Firestore "in" queries accept at most 10 values, so we chunk.
   */
  async hydratePosts(postIds) {
    if (!postIds || postIds.length === 0) return { success: true, data: [] };
    if (this._isDemoMode()) {
      console.log('📰 Demo mode — hydratePosts returning demo data');
      const demo = this.getDemoPosts();
      return { success: true, data: postIds.map(id => demo.find(p => p.id === id)).filter(Boolean) };
    }
    const ctx = this._getContext();
    if (!ctx) return { success: false, error: 'Not authenticated' };
    const { db } = ctx;
    const CHUNK = 10;
    try {
      const results = [];
      for (let i = 0; i < postIds.length; i += CHUNK) {
        const snap = await db.collection('posts')
          .where(firebase.firestore.FieldPath.documentId(), 'in', postIds.slice(i, i + CHUNK))
          .get();
        snap.docs.forEach(d => results.push({ id: d.id, ...d.data() }));
      }
      console.log('📰 Hydrated', results.length, 'posts from', postIds.length, 'ids');
      return { success: true, data: results };
    } catch (error) {
      console.error('📰 Error hydrating posts:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SINGLE POST
  // ═══════════════════════════════════════════════════════════════════════════

  /** Get a single post by ID from /posts/{postId}. */
  async getPost(postId) {
    if (this._isDemoMode()) {
      const demo = this.getDemoPosts().find(p => p.id === postId);
      return demo ? { success: true, data: demo } : { success: false, error: 'Post not found' };
    }
    const ctx = this._getContext();
    if (!ctx) return { success: false, error: 'Not authenticated' };
    try {
      const doc = await ctx.db.collection('posts').doc(postId).get();
      if (!doc.exists) return { success: false, error: 'Post not found' };
      console.log('📰 Fetched post:', postId);
      return { success: true, data: { id: doc.id, ...doc.data() } };
    } catch (error) {
      console.error('📰 Error fetching post:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // USER POSTS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Get posts authored by a specific user, ordered newest-first. */
  async getUserPosts(userId, cursor = null, limit = 20) {
    if (this._isDemoMode()) {
      return { success: true, data: { posts: this.getDemoPosts().filter(p => p.authorId === userId), cursor: null } };
    }
    const ctx = this._getContext();
    if (!ctx) return { success: false, error: 'Not authenticated' };
    const { db } = ctx;
    try {
      let query = db.collection('posts')
        .where('authorId', '==', userId).where('deleted', '==', false)
        .orderBy('createdAt', 'desc').limit(limit);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      const posts   = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const lastDoc = posts.length ? snapshot.docs[snapshot.docs.length - 1] : null;
      console.log('📰 User posts fetched:', posts.length, 'for', userId);
      return { success: true, data: { posts, cursor: lastDoc } };
    } catch (error) {
      console.error('📰 Error fetching user posts:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOFT DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  /** Soft-delete a post by setting deleted=true. */
  async deletePost(postId) {
    if (this._isDemoMode()) {
      console.log('📰 Demo mode — deletePost simulated for', postId);
      return { success: true };
    }
    const ctx = this._getContext();
    if (!ctx) return { success: false, error: 'Not authenticated' };
    try {
      await ctx.db.collection('posts').doc(postId).update({
        deleted: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('📰 Post soft-deleted:', postId);
      return { success: true };
    } catch (error) {
      console.error('📰 Error deleting post:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRENDING
  // ═══════════════════════════════════════════════════════════════════════════

  /** Read the pre-computed trending document from /feedAlgo/trending. */
  async getTrending() {
    if (this._isDemoMode()) {
      console.log('📰 Demo mode — returning demo trending data');
      return { success: true, data: { postIds: this.getDemoPosts().slice(0, 5).map(p => p.id), updatedAt: new Date().toISOString() } };
    }
    const ctx = this._getContext();
    if (!ctx) return { success: false, error: 'Not authenticated' };
    try {
      const doc = await ctx.db.collection('feedAlgo').doc('trending').get();
      if (!doc.exists) { console.log('📰 No trending document found'); return { success: true, data: null }; }
      console.log('📰 Trending data fetched');
      return { success: true, data: doc.data() };
    } catch (error) {
      console.error('📰 Error fetching trending:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL FEED
  // ═══════════════════════════════════════════════════════════════════════════

  /** Query the global public feed from /posts where visibility=public. */
  async getGlobalFeed(cursor = null, limit = 20) {
    if (this._isDemoMode()) {
      console.log('📰 Demo mode — returning demo global feed');
      return { success: true, data: { posts: this.getDemoPosts(), cursor: null } };
    }
    const ctx = this._getContext();
    if (!ctx) return { success: false, error: 'Not authenticated' };
    const { db } = ctx;
    try {
      let query = db.collection('posts')
        .where('visibility', '==', 'public').where('deleted', '==', false)
        .orderBy('createdAt', 'desc').limit(limit);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      const posts   = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const lastDoc = posts.length ? snapshot.docs[snapshot.docs.length - 1] : null;
      console.log('📰 Global feed fetched:', posts.length, 'posts');
      return { success: true, data: { posts, cursor: lastDoc } };
    } catch (error) {
      console.error('📰 Error fetching global feed:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEMO MODE — sample data for offline / unauthenticated usage
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Returns 10 realistic demo posts spanning different types.
   * Useful for UI development and previewing the feed without a backend.
   */
  getDemoPosts() {
    const now  = Date.now();
    const HOUR = 3600000;
    const DAY  = 86400000;

    // Shared author profiles
    const authors = {
      sarah:  { authorId: 'demo_user_sarah',  authorName: 'Sarah Chen',      authorHandle: '@sarahcodes',      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah' },
      marcus: { authorId: 'demo_user_marcus', authorName: 'Marcus Johnson',  authorHandle: '@marcusj',         authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus' },
      aisha:  { authorId: 'demo_user_aisha',  authorName: 'Aisha Patel',     authorHandle: '@aisha_builds',    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=aisha' },
      devon:  { authorId: 'demo_user_devon',  authorName: 'Devon Blake',     authorHandle: '@devonautomator',  authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=devon' },
      jaylen: { authorId: 'demo_user_jaylen', authorName: 'Jaylen Torres',   authorHandle: '@jaylent',         authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jaylen' }
    };

    // Helper to build a post with sensible defaults
    const post = (id, overrides) => ({
      id, visibility: 'public', codeBlock: null, images: [], attachments: [],
      title: null, repostCount: 0, bookmarkCount: 0, xpAwarded: 0,
      pinned: false, deleted: false, ...overrides
    });

    return [
      post('demo_post_001', {
        ...authors.sarah, type: 'status', createdAt: new Date(now - 1 * HOUR),
        bodyJson: '{"text":"Just deployed my first Firebase Cloud Function in production. The feeling when you see those logs light up green is unmatched. Took me three days of debugging CORS issues but we made it!"}',
        tags: ['firebase', 'javascript', 'backend'],
        reactionCount: 24, commentCount: 7, bookmarkCount: 3, repostCount: 2, viewCount: 189, xpAwarded: 15
      }),
      post('demo_post_002', {
        ...authors.marcus, type: 'code_snippet', createdAt: new Date(now - 3 * HOUR),
        title: 'React useDebounce Hook',
        bodyJson: '{"text":"Clean pattern for debouncing API calls in React. Saves tons of unnecessary network requests when users type in a search box."}',
        tags: ['react', 'javascript', 'performance'],
        codeBlock: 'function useDebounce(value, delay = 300) {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const timer = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(timer);\n  }, [value, delay]);\n  return debounced;\n}',
        reactionCount: 58, commentCount: 12, bookmarkCount: 31, repostCount: 9, viewCount: 432, xpAwarded: 25
      }),
      post('demo_post_003', {
        ...authors.aisha, type: 'project_showcase', createdAt: new Date(now - 6 * HOUR),
        title: 'StudyPlanner AI - Capstone Project',
        bodyJson: '{"text":"Presenting my capstone project: an AI-powered study planner that uses GPT-4 to break down any syllabus into daily tasks. Built with Next.js, Tailwind, and the OpenAI API. It adjusts your schedule based on practice quiz scores."}',
        tags: ['ai', 'nextjs', 'react', 'openai'],
        images: ['https://placehold.co/800x450/1a1a2e/e94560?text=StudyPlanner+AI'],
        reactionCount: 112, commentCount: 28, bookmarkCount: 45, repostCount: 18, viewCount: 1024, xpAwarded: 50, pinned: true
      }),
      post('demo_post_004', {
        ...authors.devon, type: 'automation_template', createdAt: new Date(now - 10 * HOUR),
        title: 'Auto-Deploy + Lighthouse Audit Workflow',
        bodyJson: '{"text":"Sharing my GitHub Actions workflow that auto-deploys to Firebase Hosting on every push to main, runs Lighthouse audits, and posts the score to Slack. 2 hours to set up, saves 15 minutes every deploy."}',
        tags: ['automation', 'github-actions', 'firebase', 'devops'],
        codeBlock: 'name: Deploy & Audit\non:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci && npm run build\n      - uses: FirebaseExtended/action-hosting-deploy@v0',
        reactionCount: 41, commentCount: 9, bookmarkCount: 22, repostCount: 7, viewCount: 305, xpAwarded: 30
      }),
      post('demo_post_005', {
        ...authors.sarah, type: 'run_result', createdAt: new Date(now - 1 * DAY),
        title: 'Async Scraper Benchmark Results',
        bodyJson: '{"text":"My Python scraper just finished processing 50,000 job listings in under 4 minutes. Async requests with aiohttp are ridiculously fast compared to the synchronous version that took 45 minutes. Pipeline is production-ready."}',
        tags: ['python', 'async', 'data-engineering'],
        reactionCount: 33, commentCount: 11, bookmarkCount: 8, repostCount: 4, viewCount: 247, xpAwarded: 20
      }),
      post('demo_post_006', {
        ...authors.jaylen, type: 'collab_request', createdAt: new Date(now - 1.5 * DAY),
        title: 'Collab: Real-Time Whiteboard App',
        bodyJson: '{"text":"Looking for 1-2 people to team up on a real-time collaborative whiteboard app. Planning to use WebSockets + Canvas API frontend and Node/Express backend. Perfect for leveling up on real-time systems. DM me!"}',
        tags: ['collaboration', 'websockets', 'javascript', 'nodejs'],
        reactionCount: 19, commentCount: 14, bookmarkCount: 6, repostCount: 5, viewCount: 198, xpAwarded: 10
      }),
      post('demo_post_007', {
        ...authors.marcus, type: 'milestone', createdAt: new Date(now - 2 * DAY),
        title: '100-Day Coding Streak',
        bodyJson: '{"text":"100-day coding streak! Started with zero JavaScript knowledge and now I\'ve built 3 full-stack apps, contributed to 2 open-source projects, and landed my first freelance client. Consistency really is the cheat code."}',
        tags: ['milestone', 'streak', 'motivation'],
        reactionCount: 203, commentCount: 42, bookmarkCount: 15, repostCount: 27, viewCount: 1876, xpAwarded: 100
      }),
      post('demo_post_008', {
        ...authors.aisha, type: 'challenge_win', createdAt: new Date(now - 2.5 * DAY),
        title: 'Weekly Challenge Win: Shortest Path',
        bodyJson: '{"text":"Won this week\'s algorithm challenge! The problem was to find the shortest path in a weighted DAG with negative edges. Bellman-Ford came through. My solution ran in O(V*E) and beat 94% of submissions."}',
        tags: ['algorithms', 'challenge', 'python', 'graphs'],
        codeBlock: 'def shortest_path(graph, src):\n    dist = {v: float("inf") for v in graph}\n    dist[src] = 0\n    for _ in range(len(graph) - 1):\n        for u in graph:\n            for v, w in graph[u]:\n                if dist[u] + w < dist[v]:\n                    dist[v] = dist[u] + w\n    return dist',
        reactionCount: 87, commentCount: 19, bookmarkCount: 34, repostCount: 11, viewCount: 654, xpAwarded: 75
      }),
      post('demo_post_009', {
        ...authors.devon, type: 'status', createdAt: new Date(now - 3 * DAY),
        bodyJson: '{"text":"TIL that Firestore compound queries need a composite index. Spent an hour wondering why my query kept failing until I checked the console and found the helpful link Firebase provides to create the index with one click. Read the errors, folks."}',
        tags: ['firebase', 'firestore', 'til'],
        reactionCount: 45, commentCount: 16, bookmarkCount: 10, repostCount: 6, viewCount: 321, xpAwarded: 10
      }),
      post('demo_post_010', {
        ...authors.jaylen, type: 'code_snippet', createdAt: new Date(now - 4 * DAY),
        title: 'Python Retry Decorator with Backoff',
        bodyJson: '{"text":"Handy Python decorator that retries any function up to N times with exponential backoff. Been using this for every API integration. Handles transient network errors gracefully without cluttering calling code."}',
        tags: ['python', 'patterns', 'backend'],
        codeBlock: 'import time, functools\n\ndef retry(max_attempts=3, backoff=2):\n    def decorator(fn):\n        @functools.wraps(fn)\n        def wrapper(*args, **kwargs):\n            for attempt in range(max_attempts):\n                try:\n                    return fn(*args, **kwargs)\n                except Exception:\n                    if attempt == max_attempts - 1:\n                        raise\n                    time.sleep(backoff ** attempt)\n        return wrapper\n    return decorator',
        reactionCount: 62, commentCount: 8, bookmarkCount: 29, repostCount: 13, viewCount: 487, xpAwarded: 25
      })
    ];
  }
};

// Export
window.FeedService = FeedService;
