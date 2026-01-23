/**
 * Query Service for SWE Hackers Analytics
 * 
 * Provides efficient data fetching patterns with caching:
 * - Cache-first reads with configurable TTL
 * - Batch fetching with deduplication
 * - Paginated aggregation for large datasets
 * 
 * Uses CacheService for two-tier caching (memory + localStorage).
 * 
 * @example
 * // Cache-first read
 * const analytics = await QueryService.getWithCache('userAnalytics', userId, 300);
 * 
 * // Batch fetching
 * const users = await QueryService.batchGet('users', ['id1', 'id2', 'id3']);
 * 
 * @module services/query-service
 */

const QueryService = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Default TTL for cache entries (5 minutes) */
  DEFAULT_TTL: 300,
  
  /** Default page size for pagination */
  DEFAULT_PAGE_SIZE: 100,
  
  /** Maximum batch size for Firestore getAll */
  MAX_BATCH_SIZE: 10,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CORE METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get a document with cache-first strategy
   * 
   * 1. Check cache (memory → localStorage)
   * 2. If cached and not expired, return cached value
   * 3. If not cached or expired, fetch from Firestore and cache
   * 4. Handle offline gracefully by returning stale cache if available
   * 
   * @param {string} collection - Firestore collection name
   * @param {string} docId - Document ID to fetch
   * @param {number} [ttlSeconds=300] - Cache TTL in seconds
   * @returns {Promise<Object|null>} Document data or null if not found
   * 
   * @example
   * const userAnalytics = await QueryService.getWithCache('userAnalytics', 'user123', 600);
   */
  async getWithCache(collection, docId, ttlSeconds = this.DEFAULT_TTL) {
    const cacheKey = `${collection}:${docId}`;
    
    try {
      // 1. Check cache first
      const cached = await window.CacheService.get(cacheKey);
      if (cached !== null) {
        console.log(`📊 QueryService: Cache hit for ${cacheKey}`);
        return cached;
      }
      
      // 2. Fetch from Firestore
      console.log(`📊 QueryService: Fetching ${cacheKey} from Firestore`);
      const db = window.FirebaseApp.getDb();
      const doc = await db.collection(collection).doc(docId).get();
      
      if (!doc.exists) {
        console.log(`📊 QueryService: Document not found: ${cacheKey}`);
        return null;
      }
      
      const data = doc.data();
      
      // 3. Cache for future requests
      await window.CacheService.set(cacheKey, data, ttlSeconds);
      
      return data;
      
    } catch (error) {
      console.error(`📊 QueryService: Error fetching ${cacheKey}:`, error);
      
      // 4. Handle offline: try to return stale cache
      if (this._isOfflineError(error)) {
        console.log(`📊 QueryService: Offline, checking for stale cache`);
        // Force get from storage even if expired
        const stale = await this._getStaleCache(cacheKey);
        if (stale !== null) {
          console.log(`📊 QueryService: Returning stale cached data for ${cacheKey}`);
          return stale;
        }
      }
      
      throw error;
    }
  },
  
  /**
   * Batch fetch multiple documents efficiently
   * 
   * - Deduplicates document IDs
   * - Uses Firestore getAll for optimal performance
   * - Returns a map of docId → data
   * 
   * @param {string} collection - Firestore collection name
   * @param {string[]} docIds - Array of document IDs to fetch
   * @returns {Promise<Object>} Map of docId → document data
   * 
   * @example
   * const users = await QueryService.batchGet('users', ['user1', 'user2', 'user3']);
   * // Returns: { user1: {...}, user2: {...}, user3: {...} }
   */
  async batchGet(collection, docIds) {
    if (!docIds || docIds.length === 0) {
      return {};
    }
    
    // Deduplicate IDs
    const uniqueIds = [...new Set(docIds)];
    console.log(`📊 QueryService: Batch fetching ${uniqueIds.length} docs from ${collection}`);
    
    const db = window.FirebaseApp.getDb();
    const results = {};
    
    // Process in chunks to respect Firestore limits
    for (let i = 0; i < uniqueIds.length; i += this.MAX_BATCH_SIZE) {
      const chunk = uniqueIds.slice(i, i + this.MAX_BATCH_SIZE);
      const refs = chunk.map(id => db.collection(collection).doc(id));
      
      try {
        // Use getAll for efficient batch fetching
        const snapshots = await db.getAll(...refs);
        
        snapshots.forEach((snap, index) => {
          if (snap.exists) {
            results[chunk[index]] = snap.data();
          }
        });
      } catch (error) {
        console.error(`📊 QueryService: Error in batch fetch chunk:`, error);
        
        // Fallback to individual fetches on error
        for (const id of chunk) {
          try {
            const doc = await db.collection(collection).doc(id).get();
            if (doc.exists) {
              results[id] = doc.data();
            }
          } catch (individualError) {
            console.error(`📊 QueryService: Error fetching ${id}:`, individualError);
          }
        }
      }
    }
    
    console.log(`📊 QueryService: Batch fetch returned ${Object.keys(results).length} docs`);
    return results;
  },
  
  /**
   * Aggregate data from a query with pagination
   * 
   * Fetches all matching documents in pages to avoid memory issues
   * and Firestore read limits. Returns aggregated results.
   * 
   * @param {Object} queryConfig - Query configuration
   * @param {string} queryConfig.collection - Collection to query
   * @param {Array} [queryConfig.where] - Array of where clauses: [[field, op, value], ...]
   * @param {Array} [queryConfig.orderBy] - Array of orderBy clauses: [[field, direction], ...]
   * @param {number} [pageSize=100] - Number of documents per page
   * @returns {Promise<Object[]>} Array of all matching documents
   * 
   * @example
   * const attempts = await QueryService.aggregateWithPagination({
   *   collection: 'users/user123/activityAttempts',
   *   where: [['createdAt', '>=', thirtyDaysAgo]],
   *   orderBy: [['createdAt', 'asc']]
   * }, 50);
   */
  async aggregateWithPagination(queryConfig, pageSize = this.DEFAULT_PAGE_SIZE) {
    const { collection, where = [], orderBy = [] } = queryConfig;
    
    console.log(`📊 QueryService: Aggregating ${collection} with pagination (pageSize: ${pageSize})`);
    
    const db = window.FirebaseApp.getDb();
    let query = db.collection(collection);
    
    // Apply where clauses
    for (const [field, op, value] of where) {
      query = query.where(field, op, value);
    }
    
    // Apply orderBy clauses
    for (const [field, direction] of orderBy) {
      query = query.orderBy(field, direction);
    }
    
    const results = [];
    let lastDoc = null;
    let pageCount = 0;
    
    while (true) {
      let pageQuery = query.limit(pageSize);
      
      if (lastDoc) {
        pageQuery = pageQuery.startAfter(lastDoc);
      }
      
      try {
        const snapshot = await pageQuery.get();
        pageCount++;
        
        if (snapshot.empty) {
          console.log(`📊 QueryService: Aggregation complete after ${pageCount} pages, ${results.length} docs`);
          break;
        }
        
        snapshot.docs.forEach(doc => {
          results.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Check if this is the last page
        if (snapshot.docs.length < pageSize) {
          console.log(`📊 QueryService: Last page reached (${snapshot.docs.length} docs)`);
          break;
        }
        
        // Save last doc for pagination cursor
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        
      } catch (error) {
        console.error(`📊 QueryService: Error in pagination page ${pageCount}:`, error);
        throw error;
      }
    }
    
    console.log(`📊 QueryService: Aggregation returned ${results.length} total docs`);
    return results;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Invalidate cache for a document
   * 
   * @param {string} collection - Collection name
   * @param {string} docId - Document ID
   * @returns {Promise<void>}
   */
  async invalidateCache(collection, docId) {
    const cacheKey = `${collection}:${docId}`;
    await window.CacheService.invalidate(cacheKey);
    console.log(`📊 QueryService: Invalidated cache for ${cacheKey}`);
  },
  
  /**
   * Invalidate all cache entries for a collection
   * 
   * @param {string} collection - Collection name
   * @returns {Promise<number>} Number of entries invalidated
   */
  async invalidateCollection(collection) {
    const count = await window.CacheService.invalidatePattern(`${collection}:*`);
    console.log(`📊 QueryService: Invalidated ${count} cache entries for ${collection}`);
    return count;
  },
  
  /**
   * Check if an error indicates offline/network issues
   * @private
   */
  _isOfflineError(error) {
    return error.code === 'unavailable' || 
           error.code === 'failed-precondition' ||
           error.message?.includes('network') ||
           error.message?.includes('offline');
  },
  
  /**
   * Get stale cache entry (ignoring TTL)
   * @private
   */
  async _getStaleCache(key) {
    // Access internal cache storage directly
    const memCache = window.CacheService._memoryCache?.get(key);
    if (memCache) {
      return memCache.value;
    }
    
    // Try localStorage
    try {
      const storage = window.CacheService._getStorageCache?.();
      if (storage && storage[key]) {
        return storage[key].value;
      }
    } catch (e) {
      // Ignore storage errors
    }
    
    return null;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONVENIENCE METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get user analytics with caching
   * Convenience wrapper for common use case
   * 
   * @param {string} userId - User ID
   * @param {number} [ttlSeconds=300] - Cache TTL
   * @returns {Promise<Object|null>} User analytics or null
   */
  async getUserAnalytics(userId, ttlSeconds = 300) {
    return this.getWithCache('userAnalytics', userId, ttlSeconds);
  },
  
  /**
   * Get leaderboard with caching
   * 
   * @param {string} leaderboardId - Leaderboard ID (e.g., 'global-weekly')
   * @param {number} [ttlSeconds=60] - Cache TTL (shorter for leaderboards)
   * @returns {Promise<Object|null>} Leaderboard data or null
   */
  async getLeaderboard(leaderboardId, ttlSeconds = 60) {
    return this.getWithCache('leaderboards', leaderboardId, ttlSeconds);
  }
};

// Export for global access
window.QueryService = QueryService;

// ═══════════════════════════════════════════════════════════════════════════
// MANUAL TESTING
// Uncomment and run in browser console to test
// ═══════════════════════════════════════════════════════════════════════════

// Test getWithCache:
// QueryService.getWithCache('userAnalytics', 'test-user', 60).then(console.log);

// Test batchGet:
// QueryService.batchGet('users', ['user1', 'user2']).then(console.log);

// Test aggregateWithPagination:
// QueryService.aggregateWithPagination({
//   collection: 'users/test-user/activityAttempts',
//   orderBy: [['createdAt', 'desc']]
// }, 10).then(console.log);
