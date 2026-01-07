/**
 * Role-Based Access Control (RBAC) Service for AutoNateAI Learning Hub
 * 
 * Handles user roles, organization access, and course permissions.
 * 
 * ROLES:
 *   - user: Basic user, can access free public courses
 *   - admin: Full platform access, can manage users and all courses
 *   - enterprise: Organization-specific access, can see partner courses
 * 
 * ORGANIZATION ACCESS:
 *   Users can be tagged with organization IDs to access private partner courses.
 *   Example: A user with organizationAccess: ['endless-opportunities'] can access
 *   courses tagged for that organization.
 * 
 * USAGE:
 *   // Check if user can access a course
 *   const canAccess = await RBACService.canAccessCourse('endless-opportunities');
 *   
 *   // Check if user is admin
 *   const isAdmin = await RBACService.hasRole('admin');
 *   
 *   // Get user's accessible courses
 *   const courses = await RBACService.getAccessibleCourses();
 */

const RBACService = {
  // Cache for user permissions (cleared on auth state change)
  _permissionsCache: null,
  _cacheExpiry: null,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

  // Role hierarchy (higher index = more permissions)
  ROLE_HIERARCHY: ['user', 'enterprise', 'admin'],

  // Super admin emails that automatically get admin role
  // These are platform owners who should always have admin access
  SUPER_ADMIN_EMAILS: [
    'autonate.ai@gmail.com',
    'autonateai@gmail.com'
  ],

  // Course visibility types
  VISIBILITY: {
    PUBLIC: 'public',           // Anyone can see (logged in or not)
    AUTHENTICATED: 'authenticated', // Must be logged in
    ORGANIZATION: 'organization',  // Must belong to specific org
    ADMIN: 'admin'              // Admin only
  },

  /**
   * Initialize RBAC service
   * Should be called after AuthService.init()
   */
  init() {
    // Clear cache when auth state changes
    if (window.AuthService) {
      window.AuthService.onAuthStateChanged(() => {
        this.clearCache();
      });
    }
    console.log('🔐 RBAC Service initialized');
  },

  /**
   * Clear permissions cache
   */
  clearCache() {
    this._permissionsCache = null;
    this._cacheExpiry = null;
  },

  /**
   * Get user permissions from Firestore (with caching)
   */
  async getUserPermissions() {
    // Check cache first
    if (this._permissionsCache && this._cacheExpiry && Date.now() < this._cacheExpiry) {
      return this._permissionsCache;
    }

    const user = window.AuthService?.getUser();
    if (!user) {
      return {
        role: 'guest',
        organizationAccess: [],
        courseAccess: [],
        isAdmin: false,
        isEnterprise: false
      };
    }

    const db = window.FirebaseApp?.getDb();
    if (!db) {
      console.warn('Firestore not initialized');
      return this._getDefaultPermissions();
    }

    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (!userDoc.exists) {
        // User document doesn't exist, create with defaults
        await this._createUserWithDefaults(user);
        return this._getDefaultPermissions();
      }

      const userData = userDoc.data();
      
      // Check if user is a super admin by email
      const isSuperAdmin = this.SUPER_ADMIN_EMAILS.includes(user.email?.toLowerCase());
      
      // If super admin but not marked as admin in DB, auto-update
      if (isSuperAdmin && userData.role !== 'admin') {
        await this._promoteSuperAdmin(user.uid);
      }
      
      const permissions = {
        role: isSuperAdmin ? 'admin' : (userData.role || 'user'),
        organizationAccess: userData.organizationAccess || [],
        courseAccess: userData.courseAccess || [],
        isAdmin: isSuperAdmin || userData.role === 'admin',
        isEnterprise: userData.role === 'enterprise' || (userData.organizationAccess?.length > 0)
      };

      // Cache the permissions
      this._permissionsCache = permissions;
      this._cacheExpiry = Date.now() + this.CACHE_DURATION;

      return permissions;
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      return this._getDefaultPermissions();
    }
  },

  /**
   * Get default permissions for a basic user
   */
  _getDefaultPermissions() {
    return {
      role: 'user',
      organizationAccess: [],
      courseAccess: [],
      isAdmin: false,
      isEnterprise: false
    };
  },

  /**
   * Create user document with default permissions
   */
  async _createUserWithDefaults(user) {
    const db = window.FirebaseApp?.getDb();
    if (!db) return;

    // Check if this is a super admin
    const isSuperAdmin = this.SUPER_ADMIN_EMAILS.includes(user.email?.toLowerCase());

    try {
      await db.collection('users').doc(user.uid).set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: isSuperAdmin ? 'admin' : 'user',
        organizationAccess: [],
        courseAccess: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      if (isSuperAdmin) {
        console.log('🔐 Super admin account initialized:', user.email);
      }
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  },

  /**
   * Promote a super admin user to admin role in database
   */
  async _promoteSuperAdmin(userId) {
    const db = window.FirebaseApp?.getDb();
    if (!db) return;

    try {
      await db.collection('users').doc(userId).update({
        role: 'admin',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('🔐 Super admin promoted to admin role');
    } catch (error) {
      console.error('Error promoting super admin:', error);
    }
  },

  /**
   * Check if user has a specific role
   * @param {string} requiredRole - The role to check for
   * @returns {Promise<boolean>}
   */
  async hasRole(requiredRole) {
    const permissions = await this.getUserPermissions();
    
    // Admin has all roles
    if (permissions.isAdmin) return true;

    // Check role hierarchy
    const userRoleIndex = this.ROLE_HIERARCHY.indexOf(permissions.role);
    const requiredRoleIndex = this.ROLE_HIERARCHY.indexOf(requiredRole);

    return userRoleIndex >= requiredRoleIndex;
  },

  /**
   * Check if user belongs to an organization
   * @param {string} organizationId - The organization to check
   * @returns {Promise<boolean>}
   */
  async belongsToOrganization(organizationId) {
    const permissions = await this.getUserPermissions();
    
    // Admin has access to all organizations
    if (permissions.isAdmin) return true;

    return permissions.organizationAccess.includes(organizationId);
  },

  /**
   * Check if user can access a specific course
   * @param {string} courseId - The course to check
   * @param {object} courseConfig - Optional course configuration
   * @returns {Promise<boolean>}
   */
  async canAccessCourse(courseId, courseConfig = null) {
    const permissions = await this.getUserPermissions();

    // Admin can access everything
    if (permissions.isAdmin) return true;

    // Check explicit course access
    if (permissions.courseAccess.includes(courseId)) return true;

    // Get course configuration if not provided
    if (!courseConfig) {
      courseConfig = await this.getCourseConfig(courseId);
    }

    if (!courseConfig) {
      // Default to public for unknown courses
      return true;
    }

    switch (courseConfig.visibility) {
      case this.VISIBILITY.PUBLIC:
        return true;

      case this.VISIBILITY.AUTHENTICATED:
        return window.AuthService?.isAuthenticated() || false;

      case this.VISIBILITY.ORGANIZATION:
        // Check if user belongs to any of the course's organizations
        const courseOrgs = courseConfig.organizations || [];
        return courseOrgs.some(org => permissions.organizationAccess.includes(org));

      case this.VISIBILITY.ADMIN:
        return permissions.isAdmin;

      default:
        return true;
    }
  },

  /**
   * Get course configuration from Firestore or local config
   * @param {string} courseId - The course ID
   * @returns {Promise<object|null>}
   */
  async getCourseConfig(courseId) {
    // First check local course registry
    const localConfig = this.COURSE_REGISTRY[courseId];
    if (localConfig) return localConfig;

    // Then check Firestore
    const db = window.FirebaseApp?.getDb();
    if (!db) return null;

    try {
      const courseDoc = await db.collection('courses').doc(courseId).get();
      return courseDoc.exists ? courseDoc.data() : null;
    } catch (error) {
      console.error('Error fetching course config:', error);
      return null;
    }
  },

  /**
   * Local course registry for quick access
   * This can be extended or replaced with Firestore data
   */
  COURSE_REGISTRY: {
    // Public free courses
    'apprentice': {
      visibility: 'public',
      organizations: []
    },
    'junior': {
      visibility: 'public',
      organizations: []
    },
    'senior': {
      visibility: 'public',
      organizations: []
    },
    'undergrad': {
      visibility: 'public',
      organizations: []
    },
    
    // Partner courses (organization-specific)
    'endless-opportunities': {
      visibility: 'organization',
      organizations: ['endless-opportunities'],
      displayName: 'Endless Opportunities AI Bootcamp',
      partnerLogo: '/assets/partners/endless-opportunities-logo.png'
    }
  },

  /**
   * Get all courses the user can access
   * @returns {Promise<object[]>}
   */
  async getAccessibleCourses() {
    const permissions = await this.getUserPermissions();
    const accessibleCourses = [];

    for (const [courseId, config] of Object.entries(this.COURSE_REGISTRY)) {
      if (await this.canAccessCourse(courseId, config)) {
        accessibleCourses.push({
          id: courseId,
          ...config
        });
      }
    }

    return accessibleCourses;
  },

  /**
   * Get courses for a specific organization
   * @param {string} organizationId - The organization ID
   * @returns {Promise<object[]>}
   */
  async getOrganizationCourses(organizationId) {
    const courses = [];

    for (const [courseId, config] of Object.entries(this.COURSE_REGISTRY)) {
      if (config.organizations?.includes(organizationId)) {
        courses.push({
          id: courseId,
          ...config
        });
      }
    }

    return courses;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set user role (admin only)
   * @param {string} userId - The user ID to update
   * @param {string} role - The new role
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async setUserRole(userId, role) {
    const permissions = await this.getUserPermissions();
    if (!permissions.isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    if (!this.ROLE_HIERARCHY.includes(role)) {
      return { success: false, error: `Invalid role: ${role}` };
    }

    const db = window.FirebaseApp?.getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      await db.collection('users').doc(userId).update({
        role,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: window.AuthService.getUser().uid
      });

      return { success: true };
    } catch (error) {
      console.error('Error setting user role:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Grant organization access to a user (admin only)
   * @param {string} userId - The user ID
   * @param {string} organizationId - The organization to grant access to
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async grantOrganizationAccess(userId, organizationId) {
    const permissions = await this.getUserPermissions();
    if (!permissions.isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const db = window.FirebaseApp?.getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      await db.collection('users').doc(userId).update({
        organizationAccess: firebase.firestore.FieldValue.arrayUnion(organizationId),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: window.AuthService.getUser().uid
      });

      return { success: true };
    } catch (error) {
      console.error('Error granting organization access:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Revoke organization access from a user (admin only)
   * @param {string} userId - The user ID
   * @param {string} organizationId - The organization to revoke access from
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async revokeOrganizationAccess(userId, organizationId) {
    const permissions = await this.getUserPermissions();
    if (!permissions.isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const db = window.FirebaseApp?.getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      await db.collection('users').doc(userId).update({
        organizationAccess: firebase.firestore.FieldValue.arrayRemove(organizationId),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: window.AuthService.getUser().uid
      });

      return { success: true };
    } catch (error) {
      console.error('Error revoking organization access:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Grant course access to a user (admin only)
   * @param {string} userId - The user ID
   * @param {string} courseId - The course to grant access to
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async grantCourseAccess(userId, courseId) {
    const permissions = await this.getUserPermissions();
    if (!permissions.isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const db = window.FirebaseApp?.getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      await db.collection('users').doc(userId).update({
        courseAccess: firebase.firestore.FieldValue.arrayUnion(courseId),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: window.AuthService.getUser().uid
      });

      return { success: true };
    } catch (error) {
      console.error('Error granting course access:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Bulk grant organization access to multiple users (admin only)
   * @param {string[]} userIds - Array of user IDs
   * @param {string} organizationId - The organization to grant access to
   * @returns {Promise<{success: boolean, results: object[]}>}
   */
  async bulkGrantOrganizationAccess(userIds, organizationId) {
    const permissions = await this.getUserPermissions();
    if (!permissions.isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const results = await Promise.all(
      userIds.map(userId => this.grantOrganizationAccess(userId, organizationId))
    );

    const allSuccess = results.every(r => r.success);
    return {
      success: allSuccess,
      results: userIds.map((userId, i) => ({
        userId,
        ...results[i]
      }))
    };
  },

  /**
   * Get all users for an organization (admin only)
   * @param {string} organizationId - The organization ID
   * @returns {Promise<object[]>}
   */
  async getOrganizationUsers(organizationId) {
    const permissions = await this.getUserPermissions();
    if (!permissions.isAdmin) {
      console.warn('Unauthorized: Admin access required');
      return [];
    }

    const db = window.FirebaseApp?.getDb();
    if (!db) return [];

    try {
      const snapshot = await db.collection('users')
        .where('organizationAccess', 'array-contains', organizationId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching organization users:', error);
      return [];
    }
  },

  /**
   * Register a new course in the system (admin only)
   * @param {string} courseId - The course ID
   * @param {object} courseConfig - Course configuration
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async registerCourse(courseId, courseConfig) {
    const permissions = await this.getUserPermissions();
    if (!permissions.isAdmin) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const db = window.FirebaseApp?.getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      await db.collection('courses').doc(courseId).set({
        ...courseConfig,
        courseId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: window.AuthService.getUser().uid
      });

      // Also update local registry
      this.COURSE_REGISTRY[courseId] = courseConfig;

      return { success: true };
    } catch (error) {
      console.error('Error registering course:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a route guard function for a specific requirement
   * @param {object} requirements - Access requirements
   * @returns {Function} Guard function that returns true if access allowed
   */
  createGuard(requirements) {
    return async () => {
      // Check role requirement
      if (requirements.role && !(await this.hasRole(requirements.role))) {
        return false;
      }

      // Check organization requirement
      if (requirements.organization && !(await this.belongsToOrganization(requirements.organization))) {
        return false;
      }

      // Check course requirement
      if (requirements.course && !(await this.canAccessCourse(requirements.course))) {
        return false;
      }

      return true;
    };
  },

  /**
   * Redirect to appropriate page based on access denial reason
   * @param {string} reason - The reason for denial
   */
  handleAccessDenied(reason = 'unauthorized') {
    const path = window.location.pathname;
    let basePath = '';
    
    // Calculate base path
    const parts = path.split('/');
    const coursesIndex = parts.indexOf('courses');
    if (coursesIndex !== -1) {
      const depth = parts.length - coursesIndex - 2;
      basePath = '../'.repeat(depth);
    }

    switch (reason) {
      case 'unauthenticated':
        // Store intended destination and redirect to login
        window.AuthService?.setRedirectUrl(window.location.href);
        window.location.href = basePath + 'auth/login.html';
        break;

      case 'unauthorized':
        // Redirect to catalog with message
        window.location.href = basePath + 'catalog.html?error=unauthorized';
        break;

      case 'organization':
        // Redirect to enterprise page
        window.location.href = basePath + 'enterprise.html?error=organization';
        break;

      default:
        window.location.href = basePath + 'index.html';
    }
  },

  /**
   * Debug: Log current permissions
   */
  async debug() {
    const permissions = await this.getUserPermissions();
    console.log('🔐 Current User Permissions:', permissions);
    console.log('🔐 Accessible Courses:', await this.getAccessibleCourses());
    return permissions;
  }
};

// Export
window.RBACService = RBACService;

// Auto-initialize when AuthService is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.AuthService) {
      RBACService.init();
    }
  }, 200);
});

