/**
 * Cache Service for SWE Hackers Analytics
 * 
 * Two-tier caching strategy:
 * 1. Memory cache (Map) - Fastest access, LRU eviction
 * 2. localStorage - Persistent across sessions, shared across tabs
 * 
 * Used by QueryService for cache-first data fetching patterns.
 * 
 * @example
 * // Basic usage
 * await CacheService.set('user:123', userData, 300); // Cache for 5 minutes
 * const data = await CacheService.get('user:123');
 * 
 * // Pattern invalidation
 * await CacheService.invalidatePattern('user:*'); // Clear all user caches
 */

const CacheService = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Default TTL in seconds (5 minutes) */
  DEFAULT_TTL: 300,
  
  /** Maximum entries in memory cache before LRU eviction */
  MEMORY_MAX_SIZE: 100,
  
  /** localStorage key for persisted cache */
  STORAGE_KEY: 'swe_hackers_cache',
  
  /** Debounce delay for localStorage writes (ms) */
  STORAGE_DEBOUNCE_MS: 500,
  
  /** Cache key prefixes for namespacing */
  PREFIXES: {
    USER_ANALYTICS: 'ua:',
    LEADERBOARD: 'lb:',
    COURSE_STATS: 'cs:',
    USER_PROFILE: 'up:',
    RECOMMENDATIONS: 'rec:'
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL STATE
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** In-memory cache (Map for fastest access) */
  _memoryCache: new Map(),
  
  /** LRU tracking: array of keys in access order (most recent last) */
  _accessOrder: [],
  
  /** Pending localStorage write (for debouncing) */
  _pendingStorageWrite: null,
  
  /** Flag to track if localStorage cache has been loaded */
  _storageLoaded: false,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CORE METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get a cached value
   * Checks memory cache first, then localStorage
   * 
   * @param {string} key - Cache key
   * @returns {Promise<*>} Cached value or null if not found/expired
   */
  async get(key) {
    // 1. Check memory cache first (fastest)
    if (this._memoryCache.has(key)) {
      const entry = this._memoryCache.get(key);
      
      if (this.isExpired(entry)) {
        console.log(`🗄️ Cache EXPIRED (memory): ${key}`);
        this._memoryCache.delete(key);
        this._removeFromAccessOrder(key);
      } else {
        // Update LRU access order
        this._updateAccessOrder(key);
        console.log(`🗄️ Cache HIT (memory): ${key}`);
        return entry.value;
      }
    }
    
    // 2. Check localStorage (slower but persistent)
    await this._ensureStorageLoaded();
    const storageCache = this._getStorageCache();
    
    if (storageCache && storageCache[key]) {
      const entry = storageCache[key];
      
      if (this.isExpired(entry)) {
        console.log(`🗄️ Cache EXPIRED (storage): ${key}`);
        delete storageCache[key];
        this._scheduleStorageWrite(storageCache);
      } else {
        // Promote to memory cache
        this._memoryCache.set(key, entry);
        this._updateAccessOrder(key);
        this._pruneMemoryIfNeeded();
        console.log(`🗄️ Cache HIT (storage → memory): ${key}`);
        return entry.value;
      }
    }
    
    console.log(`🗄️ Cache MISS: ${key}`);
    return null;
  },
  
  /**
   * Set a cached value in both tiers
   * 
   * @param {string} key - Cache key
   * @param {*} value - Value to cache (must be JSON-serializable for localStorage)
   * @param {number} [ttlSeconds] - Time to live in seconds (defaults to DEFAULT_TTL)
   * @returns {Promise<void>}
   */
  async set(key, value, ttlSeconds = this.DEFAULT_TTL) {
    const entry = {
      value,
      cachedAt: Date.now(),
      ttl: ttlSeconds
    };
    
    // 1. Store in memory cache
    this._memoryCache.set(key, entry);
    this._updateAccessOrder(key);
    this._pruneMemoryIfNeeded();
    
    // 2. Store in localStorage (debounced)
    await this._ensureStorageLoaded();
    const storageCache = this._getStorageCache() || {};
    storageCache[key] = entry;
    this._scheduleStorageWrite(storageCache);
    
    console.log(`🗄️ Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
  },
  
  /**
   * Invalidate (remove) a specific cache key
   * 
   * @param {string} key - Cache key to remove
   * @returns {Promise<void>}
   */
  async invalidate(key) {
    // Remove from memory
    this._memoryCache.delete(key);
    this._removeFromAccessOrder(key);
    
    // Remove from localStorage
    await this._ensureStorageLoaded();
    const storageCache = this._getStorageCache();
    if (storageCache && storageCache[key]) {
      delete storageCache[key];
      this._scheduleStorageWrite(storageCache);
    }
    
    console.log(`🗄️ Cache INVALIDATE: ${key}`);
  },
  
  /**
   * Invalidate all cache keys matching a pattern
   * Supports wildcards: 'user:*' matches 'user:123', 'user:456', etc.
   * 
   * @param {string} pattern - Pattern with optional wildcard (*)
   * @returns {Promise<number>} Number of keys invalidated
   */
  async invalidatePattern(pattern) {
    const regex = this._patternToRegex(pattern);
    let count = 0;
    
    // Remove from memory cache
    const keysToDelete = [];
    for (const key of this._memoryCache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => {
      this._memoryCache.delete(key);
      this._removeFromAccessOrder(key);
      count++;
    });
    
    // Remove from localStorage
    await this._ensureStorageLoaded();
    const storageCache = this._getStorageCache();
    if (storageCache) {
      let storageModified = false;
      for (const key of Object.keys(storageCache)) {
        if (regex.test(key)) {
          delete storageCache[key];
          storageModified = true;
          if (!keysToDelete.includes(key)) count++;
        }
      }
      if (storageModified) {
        this._scheduleStorageWrite(storageCache);
      }
    }
    
    console.log(`🗄️ Cache INVALIDATE PATTERN: ${pattern} (${count} keys)`);
    return count;
  },
  
  /**
   * Clear all cached data (both tiers)
   * 
   * @returns {Promise<void>}
   */
  async clear() {
    this._memoryCache.clear();
    this._accessOrder = [];
    
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('🗄️ Error clearing localStorage cache:', error);
    }
    
    console.log('🗄️ Cache CLEARED (all)');
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Check if a cache entry is expired
   * 
   * @param {Object} entry - Cache entry with cachedAt and ttl
   * @returns {boolean} True if expired
   */
  isExpired(entry) {
    if (!entry || !entry.cachedAt) return true;
    const now = Date.now();
    const expiresAt = entry.cachedAt + (entry.ttl * 1000);
    return now > expiresAt;
  },
  
  /**
   * Get remaining TTL for a key in seconds
   * 
   * @param {string} key - Cache key
   * @returns {Promise<number>} Remaining seconds, 0 if expired/not found
   */
  async getTTL(key) {
    const entry = this._memoryCache.get(key);
    if (!entry) return 0;
    
    const now = Date.now();
    const expiresAt = entry.cachedAt + (entry.ttl * 1000);
    const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
    return remaining;
  },
  
  /**
   * Get cache statistics
   * 
   * @returns {Object} Stats about memory and storage cache
   */
  getStats() {
    const storageCache = this._getStorageCache() || {};
    const storageKeys = Object.keys(storageCache);
    
    let expiredMemory = 0;
    let expiredStorage = 0;
    
    for (const entry of this._memoryCache.values()) {
      if (this.isExpired(entry)) expiredMemory++;
    }
    
    for (const key of storageKeys) {
      if (this.isExpired(storageCache[key])) expiredStorage++;
    }
    
    return {
      memory: {
        size: this._memoryCache.size,
        maxSize: this.MEMORY_MAX_SIZE,
        expired: expiredMemory
      },
      storage: {
        size: storageKeys.length,
        expired: expiredStorage
      },
      accessOrderLength: this._accessOrder.length
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LRU MEMORY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Update access order for LRU tracking
   * @private
   */
  _updateAccessOrder(key) {
    this._removeFromAccessOrder(key);
    this._accessOrder.push(key);
  },
  
  /**
   * Remove key from access order array
   * @private
   */
  _removeFromAccessOrder(key) {
    const index = this._accessOrder.indexOf(key);
    if (index > -1) {
      this._accessOrder.splice(index, 1);
    }
  },
  
  /**
   * Prune memory cache if over max size (LRU eviction)
   * @private
   */
  _pruneMemoryIfNeeded() {
    while (this._memoryCache.size > this.MEMORY_MAX_SIZE && this._accessOrder.length > 0) {
      const lruKey = this._accessOrder.shift(); // Remove least recently used
      this._memoryCache.delete(lruKey);
      console.log(`🗄️ Cache LRU EVICT: ${lruKey}`);
    }
  },
  
  /**
   * Manually prune memory cache (public method for maintenance)
   * 
   * @returns {number} Number of entries evicted
   */
  pruneMemory() {
    const sizeBefore = this._memoryCache.size;
    
    // First remove expired entries
    const expiredKeys = [];
    for (const [key, entry] of this._memoryCache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }
    expiredKeys.forEach(key => {
      this._memoryCache.delete(key);
      this._removeFromAccessOrder(key);
    });
    
    // Then apply LRU if still over size
    this._pruneMemoryIfNeeded();
    
    const evicted = sizeBefore - this._memoryCache.size;
    if (evicted > 0) {
      console.log(`🗄️ Cache PRUNE: ${evicted} entries removed`);
    }
    return evicted;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LOCALSTORAGE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Ensure localStorage cache is loaded into memory
   * @private
   */
  async _ensureStorageLoaded() {
    if (this._storageLoaded) return;
    
    try {
      const storageCache = this._getStorageCache();
      if (storageCache) {
        // Optionally pre-warm memory cache with non-expired entries
        // (disabled by default to avoid memory bloat)
      }
      this._storageLoaded = true;
    } catch (error) {
      console.error('🗄️ Error loading storage cache:', error);
      this._storageLoaded = true; // Don't retry on error
    }
  },
  
  /**
   * Get parsed cache object from localStorage
   * @private
   */
  _getStorageCache() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.error('🗄️ Error parsing localStorage cache:', error);
      // Clear corrupted cache
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch (e) {
        // Ignore
      }
      return null;
    }
  },
  
  /**
   * Schedule a debounced write to localStorage
   * @private
   */
  _scheduleStorageWrite(cache) {
    // Clear any pending write
    if (this._pendingStorageWrite) {
      clearTimeout(this._pendingStorageWrite);
    }
    
    // Schedule new write
    this._pendingStorageWrite = setTimeout(() => {
      this._writeToStorage(cache);
      this._pendingStorageWrite = null;
    }, this.STORAGE_DEBOUNCE_MS);
  },
  
  /**
   * Write cache object to localStorage
   * @private
   */
  _writeToStorage(cache) {
    try {
      const json = JSON.stringify(cache);
      localStorage.setItem(this.STORAGE_KEY, json);
    } catch (error) {
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.warn('🗄️ localStorage quota exceeded, clearing old entries...');
        this._handleQuotaExceeded(cache);
      } else {
        console.error('🗄️ Error writing to localStorage:', error);
      }
    }
  },
  
  /**
   * Handle localStorage quota exceeded by clearing old/expired entries
   * @private
   */
  _handleQuotaExceeded(cache) {
    if (!cache) return;
    
    // 1. Remove all expired entries
    let removed = 0;
    for (const key of Object.keys(cache)) {
      if (this.isExpired(cache[key])) {
        delete cache[key];
        removed++;
      }
    }
    
    // 2. If still too big, remove oldest entries
    if (removed === 0) {
      const entries = Object.entries(cache)
        .sort((a, b) => (a[1].cachedAt || 0) - (b[1].cachedAt || 0));
      
      // Remove oldest 25%
      const toRemove = Math.ceil(entries.length * 0.25);
      for (let i = 0; i < toRemove; i++) {
        delete cache[entries[i][0]];
        removed++;
      }
    }
    
    console.log(`🗄️ Cleared ${removed} entries due to quota`);
    
    // Try writing again
    try {
      const json = JSON.stringify(cache);
      localStorage.setItem(this.STORAGE_KEY, json);
    } catch (error) {
      // If still failing, clear everything
      console.error('🗄️ Still over quota, clearing all cache');
      localStorage.removeItem(this.STORAGE_KEY);
    }
  },
  
  /**
   * Convert wildcard pattern to regex
   * @private
   */
  _patternToRegex(pattern) {
    // Escape special regex chars except *
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Convert * to .*
    const regexStr = escaped.replace(/\*/g, '.*');
    return new RegExp(`^${regexStr}$`);
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS FOR COMMON PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get or compute: Returns cached value or computes and caches it
   * 
   * @param {string} key - Cache key
   * @param {Function} computeFn - Async function to compute value if not cached
   * @param {number} [ttlSeconds] - TTL for new cache entry
   * @returns {Promise<*>} Cached or computed value
   */
  async getOrCompute(key, computeFn, ttlSeconds = this.DEFAULT_TTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    console.log(`🗄️ Computing value for: ${key}`);
    const value = await computeFn();
    await this.set(key, value, ttlSeconds);
    return value;
  },
  
  /**
   * Build a cache key with prefix
   * 
   * @param {string} prefix - Prefix from PREFIXES
   * @param {string} id - Unique identifier
   * @returns {string} Combined cache key
   */
  buildKey(prefix, id) {
    return `${prefix}${id}`;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TEST SUITE
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Run comprehensive test suite
   * Execute in browser console: CacheService.runTests()
   */
  async runTests() {
    console.log('🧪 ========== CacheService Tests ==========');
    const results = { passed: 0, failed: 0 };
    
    const assert = (condition, message) => {
      if (condition) {
        console.log(`  ✅ ${message}`);
        results.passed++;
      } else {
        console.error(`  ❌ ${message}`);
        results.failed++;
      }
    };
    
    // Clean slate
    await this.clear();
    
    // Test 1: Basic set/get
    console.log('\n🧪 Test 1: Basic set/get');
    await this.set('test:basic', { name: 'test', value: 42 }, 60);
    const basic = await this.get('test:basic');
    assert(basic !== null, 'Retrieved value is not null');
    assert(basic.name === 'test', 'Value.name matches');
    assert(basic.value === 42, 'Value.value matches');
    
    // Test 2: Cache miss
    console.log('\n🧪 Test 2: Cache miss');
    const missing = await this.get('test:nonexistent');
    assert(missing === null, 'Missing key returns null');
    
    // Test 3: Expiration
    console.log('\n🧪 Test 3: Expiration');
    await this.set('test:expiring', 'short-lived', 1); // 1 second TTL
    const beforeExpire = await this.get('test:expiring');
    assert(beforeExpire === 'short-lived', 'Value exists before expiration');
    
    console.log('  ⏳ Waiting 1.5 seconds for expiration...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const afterExpire = await this.get('test:expiring');
    assert(afterExpire === null, 'Value is null after expiration');
    
    // Test 4: Invalidation
    console.log('\n🧪 Test 4: Single key invalidation');
    await this.set('test:invalidate', 'will-be-removed', 300);
    await this.invalidate('test:invalidate');
    const invalidated = await this.get('test:invalidate');
    assert(invalidated === null, 'Invalidated key returns null');
    
    // Test 5: Pattern invalidation
    console.log('\n🧪 Test 5: Pattern invalidation');
    await this.set('user:100', { id: 100 }, 300);
    await this.set('user:101', { id: 101 }, 300);
    await this.set('user:102', { id: 102 }, 300);
    await this.set('other:999', { id: 999 }, 300);
    
    const count = await this.invalidatePattern('user:*');
    assert(count === 3, `Invalidated 3 user keys (got ${count})`);
    
    const u100 = await this.get('user:100');
    const u101 = await this.get('user:101');
    const other = await this.get('other:999');
    assert(u100 === null, 'user:100 is invalidated');
    assert(u101 === null, 'user:101 is invalidated');
    assert(other !== null, 'other:999 is preserved');
    
    // Test 6: LRU eviction
    console.log('\n🧪 Test 6: LRU eviction');
    await this.clear();
    const originalMax = this.MEMORY_MAX_SIZE;
    this.MEMORY_MAX_SIZE = 5; // Temporarily reduce for testing
    
    // Add 7 entries (more than max)
    for (let i = 0; i < 7; i++) {
      await this.set(`lru:${i}`, `value-${i}`, 300);
    }
    
    assert(this._memoryCache.size <= 5, `Memory size is ${this._memoryCache.size}, max is 5`);
    
    // LRU entries (0, 1) should be evicted, recent ones should remain
    const lru0 = this._memoryCache.get('lru:0');
    const lru6 = this._memoryCache.get('lru:6');
    assert(lru0 === undefined, 'LRU entry 0 was evicted');
    assert(lru6 !== undefined, 'Recent entry 6 remains');
    
    this.MEMORY_MAX_SIZE = originalMax; // Restore
    
    // Test 7: getOrCompute
    console.log('\n🧪 Test 7: getOrCompute');
    await this.clear();
    let computeCount = 0;
    const computeFn = async () => {
      computeCount++;
      return { computed: true, count: computeCount };
    };
    
    const first = await this.getOrCompute('test:compute', computeFn, 300);
    const second = await this.getOrCompute('test:compute', computeFn, 300);
    
    assert(first.computed === true, 'First call computed value');
    assert(computeCount === 1, 'Compute function called once');
    assert(second.count === 1, 'Second call returned cached value');
    
    // Test 8: buildKey
    console.log('\n🧪 Test 8: buildKey');
    const key = this.buildKey(this.PREFIXES.USER_ANALYTICS, '12345');
    assert(key === 'ua:12345', `buildKey produces correct format: ${key}`);
    
    // Test 9: getStats
    console.log('\n🧪 Test 9: getStats');
    await this.clear();
    await this.set('stats:1', 'a', 300);
    await this.set('stats:2', 'b', 300);
    const stats = this.getStats();
    assert(stats.memory.size === 2, `Memory has 2 entries (got ${stats.memory.size})`);
    
    // Test 10: getTTL
    console.log('\n🧪 Test 10: getTTL');
    await this.set('ttl:test', 'value', 60);
    const ttl = await this.getTTL('ttl:test');
    assert(ttl > 55 && ttl <= 60, `TTL is approximately 60s (got ${ttl})`);
    
    // Cleanup
    await this.clear();
    
    // Summary
    console.log('\n🧪 ========== Test Summary ==========');
    console.log(`  ✅ Passed: ${results.passed}`);
    console.log(`  ❌ Failed: ${results.failed}`);
    console.log(`  📊 Total:  ${results.passed + results.failed}`);
    
    return results;
  }
};

// Export for global access
window.CacheService = CacheService;
