/**
 * Whop Payment Service for AutoNateAI Marketplace
 * Client-side service for Whop.com checkout and access management
 *
 * Usage:
 * 1. Include script: <script src="shared/js/whop-service.js"></script>
 * 2. Access via window.WhopService
 */

const WhopService = {
  // Whop checkout base URL (public, no API key needed client-side)
  WHOP_CHECKOUT_BASE: 'https://whop.com/checkout',

  // Product catalog (hardcoded initially, can migrate to Firestore later)
  PRODUCTS: [
    // EXISTING SEARCH PACK PRODUCTS (updated with new fields)
    {
      id: 'linkedin-boolean-pack',
      name: 'LinkedIn Boolean Search Pack',
      description: 'Advanced Boolean search strings for LinkedIn. Find hiring managers, decision-makers, and hidden job postings with precision targeting.',
      price: 29,
      platform: 'linkedin',
      platformIcon: '💼',
      whopProductId: 'prod_XXXXXXXXX1',
      tags: ['boolean', 'linkedin', 'job-search'],
      featured: true,
      type: 'search-pack',
      category: 'starter-packs',
      rating: 4.5,
      reviewCount: 142,
      badge: null,
      image: null,
      originalPrice: null
    },
    {
      id: 'facebook-groups-pack',
      name: 'Facebook Groups Search Pack',
      description: 'Curated search queries to find high-value Facebook groups where 6-figure opportunities are shared daily.',
      price: 19,
      platform: 'facebook',
      platformIcon: '📘',
      whopProductId: 'prod_XXXXXXXXX2',
      tags: ['facebook', 'groups', 'networking'],
      type: 'search-pack',
      category: 'starter-packs',
      rating: 4.5,
      reviewCount: 89,
      badge: null,
      image: null,
      originalPrice: null
    },
    {
      id: 'reddit-opportunity-pack',
      name: 'Reddit Opportunity Finder Pack',
      description: 'Search strings optimized for Reddit to surface freelance gigs, contract roles, and startup opportunities across key subreddits.',
      price: 19,
      platform: 'reddit',
      platformIcon: '🤖',
      whopProductId: 'prod_XXXXXXXXX3',
      tags: ['reddit', 'freelance', 'contracts'],
      type: 'search-pack',
      category: 'starter-packs',
      rating: 4.5,
      reviewCount: 67,
      badge: null,
      image: null,
      originalPrice: null
    },
    {
      id: 'multi-platform-bundle',
      name: 'Multi-Platform Power Bundle',
      description: 'Our complete collection: LinkedIn + Facebook + Reddit search packs. The ultimate toolkit for sourcing 6-figure opportunities everywhere.',
      price: 49,
      platform: 'multi',
      platformIcon: '🚀',
      whopProductId: 'prod_XXXXXXXXX4',
      tags: ['bundle', 'all-platforms', 'best-value'],
      featured: true,
      type: 'search-pack',
      category: 'starter-packs',
      rating: 4.5,
      reviewCount: 178,
      badge: 'best-value',
      image: null,
      originalPrice: null
    },
    {
      id: 'twitter-x-search-pack',
      name: 'Twitter/X Opportunity Pack',
      description: 'Advanced search operators for Twitter/X to find job leads, consulting opportunities, and industry connections in real-time.',
      price: 19,
      platform: 'twitter',
      platformIcon: '🐦',
      whopProductId: 'prod_XXXXXXXXX5',
      tags: ['twitter', 'real-time', 'networking'],
      type: 'search-pack',
      category: 'starter-packs',
      rating: 4.5,
      reviewCount: 103,
      badge: null,
      image: null,
      originalPrice: null
    },
    {
      id: 'google-dorking-pack',
      name: 'Google Dorking for Jobs Pack',
      description: 'Google search operators that bypass job boards entirely. Find unlisted positions, company career pages, and direct hiring manager contacts.',
      price: 24,
      platform: 'google',
      platformIcon: '🔍',
      whopProductId: 'prod_XXXXXXXXX6',
      tags: ['google', 'advanced-search', 'hidden-jobs'],
      type: 'search-pack',
      category: 'starter-packs',
      rating: 4.5,
      reviewCount: 125,
      badge: null,
      image: null,
      originalPrice: null
    },

    // MERCH PRODUCTS
    {
      id: 'ai-nexus-tee',
      type: 'merch',
      category: 'ai-tees',
      name: 'AI Nexus Tee',
      description: 'Premium AI-themed tee featuring cutting-edge design. Represent the future of technology.',
      price: 25.99,
      originalPrice: 34.99,
      rating: 4.7,
      reviewCount: 128,
      badge: 'best-seller',
      image: 'assets/shop/ai-nexus-tee.png',
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      tags: ['tee', 'ai', 'streetwear'],
      featured: true,
      whopProductId: 'prod_MERCH_001',
      platform: 'merch',
      platformIcon: '👕'
    },
    {
      id: 'matrix-dev-hoodie',
      type: 'merch',
      category: 'developer-hoodies',
      name: 'Matrix Dev Hoodie',
      description: 'Premium quality hoodie for developers who live in the matrix. Comfortable and stylish.',
      price: 59.99,
      originalPrice: null,
      rating: 4.9,
      reviewCount: 86,
      badge: 'best-seller',
      image: 'assets/shop/matrix-dev-hoodie.png',
      sizes: ['S', 'M', 'L', 'XL'],
      tags: ['hoodie', 'developer', 'premium'],
      featured: true,
      whopProductId: 'prod_MERCH_002',
      platform: 'merch',
      platformIcon: '🧥'
    },
    {
      id: 'future-ai-tee',
      type: 'merch',
      category: 'ai-tees',
      name: 'Future of AI Tee',
      description: 'Limited edition tee celebrating the future of artificial intelligence.',
      price: 25.99,
      originalPrice: 34.99,
      rating: 4.5,
      reviewCount: 74,
      badge: 'new',
      image: 'assets/shop/future-ai-tee.png',
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      tags: ['tee', 'ai', 'future'],
      featured: false,
      whopProductId: 'prod_MERCH_003',
      platform: 'merch',
      platformIcon: '👕'
    },
    {
      id: 'women-tech-tee',
      type: 'merch',
      category: 'women-in-tech',
      name: 'Women in Tech Tee',
      description: 'Celebrate and support women in technology with this empowering design.',
      price: 27.99,
      originalPrice: null,
      rating: 4.8,
      reviewCount: 52,
      badge: null,
      image: 'assets/shop/women-in-tech-tee.png',
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      tags: ['tee', 'women', 'tech'],
      featured: false,
      whopProductId: 'prod_MERCH_004',
      platform: 'merch',
      platformIcon: '👕'
    },
    {
      id: 'ai-syntax-mug',
      type: 'merch',
      category: 'accessories',
      name: 'AI Syntax Mug',
      description: 'Start your coding sessions right with this AI-themed ceramic mug. Perfect for coffee or tea.',
      price: 18.99,
      originalPrice: null,
      rating: 4.6,
      reviewCount: 203,
      badge: 'best-seller',
      image: 'assets/shop/ai-syntax-mug.png',
      tags: ['mug', 'accessories', 'coffee'],
      featured: true,
      whopProductId: 'prod_MERCH_005',
      platform: 'merch',
      platformIcon: '☕'
    },
    {
      id: 'bot-life-hoodie',
      type: 'merch',
      category: 'developer-hoodies',
      name: 'Bot Life Hoodie',
      description: 'Embrace the bot life with this comfortable hoodie for AI enthusiasts.',
      price: 54.99,
      originalPrice: 69.99,
      rating: 4.7,
      reviewCount: 41,
      badge: null,
      image: 'assets/shop/bot-life-hoodie.png',
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      tags: ['hoodie', 'bot', 'life'],
      featured: false,
      whopProductId: 'prod_MERCH_006',
      platform: 'merch',
      platformIcon: '🧥'
    },
    {
      id: 'circuit-tee',
      type: 'merch',
      category: 'ai-tees',
      name: 'Circuit Board Tee',
      description: 'Intricate circuit board design for the hardware-minded developer.',
      price: 23.99,
      originalPrice: null,
      rating: 4.4,
      reviewCount: 65,
      badge: null,
      image: 'assets/shop/circuit-tee.png',
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      tags: ['tee', 'circuit', 'design'],
      featured: false,
      whopProductId: 'prod_MERCH_007',
      platform: 'merch',
      platformIcon: '👕'
    },
    {
      id: 'ai-origin-drop-tee',
      type: 'merch',
      category: 'limited-drops',
      name: 'AI Origin Drop Tee',
      description: 'Exclusive limited drop celebrating the origins of AI. Get it before it is gone.',
      price: 34.99,
      originalPrice: null,
      rating: 4.9,
      reviewCount: 18,
      badge: 'limited',
      image: 'assets/shop/ai-origin-drop-tee.png',
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      tags: ['tee', 'limited', 'origin'],
      featured: true,
      whopProductId: 'prod_MERCH_008',
      platform: 'merch',
      platformIcon: '👕'
    },
    {
      id: 'sticker-pack',
      type: 'merch',
      category: 'accessories',
      name: 'AutoNateAI Sticker Pack',
      description: 'Pack of 10 high-quality stickers featuring AutoNateAI designs. Perfect for laptops and water bottles.',
      price: 9.99,
      originalPrice: null,
      rating: 4.3,
      reviewCount: 312,
      badge: null,
      image: 'assets/shop/sticker-pack.png',
      tags: ['stickers', 'accessories'],
      featured: false,
      whopProductId: 'prod_MERCH_009',
      platform: 'merch',
      platformIcon: '🎨'
    },
    {
      id: 'dev-coaster-set',
      type: 'merch',
      category: 'accessories',
      name: 'Dev Coaster Set',
      description: 'Set of 4 cork-backed coasters with developer-themed designs. Protect your desk in style.',
      price: 14.99,
      originalPrice: null,
      rating: 4.5,
      reviewCount: 89,
      badge: null,
      image: 'assets/shop/dev-coaster-set.png',
      tags: ['coasters', 'accessories', 'desk'],
      featured: false,
      whopProductId: 'prod_MERCH_010',
      platform: 'merch',
      platformIcon: '🛋️'
    },

    // COURSE PRODUCTS
    {
      id: 'course-apprentice',
      type: 'course',
      category: 'courses',
      name: 'The Apprentice\'s Path',
      description: 'Master the fundamentals of software engineering with our comprehensive beginner course. Build real projects and earn your certificate.',
      price: 49,
      originalPrice: 99,
      rating: 4.8,
      reviewCount: 2431,
      badge: 'highest-rated',
      image: 'assets/courses/course-apprentice.png',
      level: 'beginner',
      instructor: 'AutoNateAI Team',
      duration: '6 Weeks',
      chapters: 7,
      capstones: 2,
      certificate: true,
      courseUrl: 'course/apprentice.html',
      tags: ['beginner', 'fundamentals', 'certificate'],
      featured: true,
      whopProductId: 'prod_COURSE_001',
      platform: 'courses',
      platformIcon: '📚'
    },
    {
      id: 'course-undergrad',
      type: 'course',
      category: 'courses',
      name: 'The Bridge to Industry',
      description: 'Bridge the gap between academic knowledge and industry requirements. Perfect for recent graduates and career changers.',
      price: 69,
      originalPrice: 129,
      rating: 4.7,
      reviewCount: 1205,
      badge: null,
      image: 'assets/courses/course-undergrad.png',
      level: 'intermediate',
      instructor: 'AutoNateAI Team',
      duration: '4-8 Weeks',
      chapters: 7,
      capstones: 2,
      certificate: true,
      courseUrl: 'course/undergrad.html',
      tags: ['intermediate', 'industry', 'career'],
      featured: false,
      whopProductId: 'prod_COURSE_002',
      platform: 'courses',
      platformIcon: '📚'
    },
    {
      id: 'course-junior',
      type: 'course',
      category: 'courses',
      name: 'The Junior Accelerator',
      description: 'Accelerate your junior developer career. Learn advanced patterns, best practices, and professional workflows.',
      price: 79,
      originalPrice: 149,
      rating: 4.8,
      reviewCount: 987,
      badge: 'best-seller',
      image: 'assets/courses/course-junior.png',
      level: 'intermediate',
      instructor: 'AutoNateAI Team',
      duration: '4-8 Weeks',
      chapters: 7,
      capstones: 2,
      certificate: true,
      courseUrl: 'course/junior.html',
      tags: ['intermediate', 'acceleration', 'best-practices'],
      featured: true,
      whopProductId: 'prod_COURSE_003',
      platform: 'courses',
      platformIcon: '📚'
    },
    {
      id: 'course-senior',
      type: 'course',
      category: 'courses',
      name: 'The Senior Amplifier',
      description: 'Amplify your impact as a senior developer. System design, architecture, leadership, and scaling expertise.',
      price: 89,
      originalPrice: 169,
      rating: 4.9,
      reviewCount: 643,
      badge: null,
      image: 'assets/courses/course-senior.png',
      level: 'advanced',
      instructor: 'AutoNateAI Team',
      duration: '4-8 Weeks',
      chapters: 7,
      capstones: 2,
      certificate: true,
      courseUrl: 'course/senior.html',
      tags: ['advanced', 'architecture', 'leadership'],
      featured: false,
      whopProductId: 'prod_COURSE_004',
      platform: 'courses',
      platformIcon: '📚'
    },
    {
      id: 'course-endless',
      type: 'course',
      category: 'courses',
      name: 'AI Freelancing Bootcamp',
      description: 'Launch your AI freelancing career with this intensive bootcamp. Learn to find clients, deliver projects, and scale your business.',
      price: 39,
      originalPrice: 79,
      rating: 4.6,
      reviewCount: 1850,
      badge: null,
      image: 'assets/courses/course-endless-opportunities.png',
      level: 'beginner',
      instructor: 'Endless Opportunities',
      duration: '4 Weeks',
      chapters: 5,
      capstones: 1,
      certificate: true,
      courseUrl: 'course/endless-opportunities.html',
      tags: ['beginner', 'freelancing', 'ai'],
      featured: false,
      whopProductId: 'prod_COURSE_005',
      platform: 'courses',
      platformIcon: '📚'
    },

    // BUNDLE PRODUCTS
    {
      id: 'starter-pack-dev',
      type: 'bundle',
      category: 'starter-packs',
      name: 'Dev Starter Pack',
      description: 'Everything you need to start your developer journey in style. Premium merch bundle at an unbeatable price.',
      price: 89.99,
      originalPrice: 124.96,
      rating: 4.8,
      reviewCount: 156,
      badge: 'best-value',
      image: null,
      bundleContents: 'AI Nexus Tee + Matrix Hoodie + Syntax Mug + Sticker Pack + Coaster Set',
      savings: 34.97,
      tags: ['bundle', 'starter', 'value'],
      featured: true,
      whopProductId: 'prod_BUNDLE_001',
      platform: 'bundles',
      platformIcon: '📦'
    },
    {
      id: 'course-bundle-all',
      type: 'bundle',
      category: 'starter-packs',
      name: 'Full Course Bundle',
      description: 'Complete your software engineering education. All 5 courses with certificates and lifetime community access.',
      price: 249,
      originalPrice: 385,
      rating: 4.9,
      reviewCount: 78,
      badge: 'best-value',
      image: null,
      bundleContents: 'All 5 courses + certificates + community access',
      savings: 136,
      tags: ['bundle', 'courses', 'all'],
      featured: true,
      whopProductId: 'prod_BUNDLE_002',
      platform: 'bundles',
      platformIcon: '📦'
    },
    {
      id: 'merch-bundle-essentials',
      type: 'bundle',
      category: 'starter-packs',
      name: 'Merch Essentials Pack',
      description: 'The essential merch collection for any developer. Perfect for getting started or gifting.',
      price: 64.99,
      originalPrice: 84.97,
      rating: 4.6,
      reviewCount: 94,
      badge: null,
      image: null,
      bundleContents: 'AI Nexus Tee + AI Syntax Mug + Sticker Pack',
      savings: 19.98,
      tags: ['bundle', 'merch', 'essentials'],
      featured: false,
      whopProductId: 'prod_BUNDLE_003',
      platform: 'bundles',
      platformIcon: '📦'
    }
  ],

  /**
   * Get all available products
   * @returns {Array} Array of product objects
   */
  getProducts() {
    return this.PRODUCTS.filter(p => true); // All active products
  },

  /**
   * Get a single product by ID
   * @param {string} productId
   * @returns {Object|null}
   */
  getProduct(productId) {
    return this.PRODUCTS.find(p => p.id === productId) || null;
  },

  /**
   * Get featured products
   * @returns {Array}
   */
  getFeaturedProducts() {
    return this.PRODUCTS.filter(p => p.featured);
  },

  /**
   * Get products by type
   * @param {string} type - 'merch', 'course', 'bundle', 'search-pack'
   * @returns {Array}
   */
  getProductsByType(type) {
    return this.PRODUCTS.filter(p => p.type === type);
  },

  /**
   * Get products by category
   * @param {string} category
   * @returns {Array}
   */
  getProductsByCategory(category) {
    return this.PRODUCTS.filter(p => p.category === category);
  },

  /**
   * Search products by name, tags, or description
   * @param {string} query
   * @returns {Array}
   */
  searchProducts(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return this.PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.tags && p.tags.some(t => t.includes(q))) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  },

  /**
   * Create a Whop checkout session
   * Redirects user to Whop.com for payment
   * @param {string} productId - The product to purchase
   * @param {string} email - User's email (for linking purchase)
   */
  createCheckout(productId, email) {
    const product = this.getProduct(productId);
    if (!product) {
      console.error('WhopService: Product not found:', productId);
      return;
    }

    // Store pending purchase info in sessionStorage
    // This allows us to link the purchase after redirect back
    sessionStorage.setItem('pendingPurchase', JSON.stringify({
      productId: product.id,
      whopProductId: product.whopProductId,
      email: email || '',
      timestamp: Date.now()
    }));

    // Build Whop checkout URL
    // The return URL will include our site so we can handle post-purchase
    const returnUrl = `${window.location.origin}${this._detectBaseUrl()}shop.html?purchased=${product.id}`;
    const checkoutUrl = `${this.WHOP_CHECKOUT_BASE}/${product.whopProductId}?d=${encodeURIComponent(returnUrl)}`;

    // Redirect to Whop checkout
    window.location.href = checkoutUrl;
  },

  /**
   * Check if user has access to a specific product
   * Reads from Firestore user library
   * @param {string} productId
   * @returns {Promise<boolean>}
   */
  async checkAccess(productId) {
    const user = window.AuthService?.getUser();
    if (!user) return false;

    try {
      const db = window.FirebaseApp.getDb();
      if (!db) return false;

      const libraryDoc = await db
        .collection('users')
        .doc(user.uid)
        .collection('library')
        .doc(productId)
        .get();

      return libraryDoc.exists && libraryDoc.data().accessGranted === true;
    } catch (error) {
      console.error('WhopService: Error checking access:', error);
      return false;
    }
  },

  /**
   * Get user's purchased product library
   * @returns {Promise<Array>} Array of purchased product objects with metadata
   */
  async getLibrary() {
    const user = window.AuthService?.getUser();
    if (!user) return [];

    try {
      const db = window.FirebaseApp.getDb();
      if (!db) return [];

      const librarySnapshot = await db
        .collection('users')
        .doc(user.uid)
        .collection('library')
        .orderBy('purchasedAt', 'desc')
        .get();

      const library = [];
      librarySnapshot.forEach(doc => {
        const data = doc.data();
        const product = this.getProduct(doc.id);
        library.push({
          ...data,
          id: doc.id,
          product: product // Enrich with product details
        });
      });

      return library;
    } catch (error) {
      console.error('WhopService: Error loading library:', error);
      return [];
    }
  },

  /**
   * Detect base URL for building return URLs
   * @private
   */
  _detectBaseUrl() {
    const path = window.location.pathname;
    if (path.includes('/auth/') || path.includes('/dashboard/') ||
        path.includes('/course/') || path.includes('/blog/')) {
      return path.substring(0, path.lastIndexOf('/', path.lastIndexOf('/') - 1) + 1);
    }
    return path.substring(0, path.lastIndexOf('/') + 1);
  }
};

// Export
window.WhopService = WhopService;
