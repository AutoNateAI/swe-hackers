/**
 * Partner Service for AutoNateAI Partnership Portal
 * 
 * Handles CRUD operations for partners, interactions, attachments, and analytics.
 * Admin-only access - all methods check for admin role before executing.
 * 
 * USAGE:
 *   // Get all partners
 *   const partners = await PartnerService.getPartners();
 *   
 *   // Create a partner
 *   const result = await PartnerService.createPartner({ name: 'Org Name', type: 'school', ... });
 *   
 *   // Add an interaction
 *   await PartnerService.createInteraction(partnerId, { type: 'call', title: '...', ... });
 */

const PartnerService = {
  COLLECTION: 'partners',

  // Partner types
  PARTNER_TYPES: ['school', 'university', 'church', 'foundation', 'business', 'community', 'government'],

  // Partner statuses
  PARTNER_STATUSES: ['prospect', 'active', 'paused', 'churned'],

  // Interaction types
  INTERACTION_TYPES: ['call', 'meeting', 'email', 'milestone', 'note', 'demo', 'proposal'],

  // Attachment types
  ATTACHMENT_TYPES: ['document', 'image', 'video', 'presentation', 'spreadsheet', 'screenshot'],

  // Analytics event types
  ANALYTICS_EVENTS: [
    'partner_created',
    'status_changed', 
    'interaction_logged',
    'student_enrolled',
    'cohort_started',
    'cohort_completed',
    'revenue_recorded'
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if current user is admin
   */
  async _checkAdminAccess() {
    const user = window.AuthService?.getUser();
    if (!user) {
      return { allowed: false, error: 'Not authenticated' };
    }

    if (window.RBACService) {
      const isAdmin = await window.RBACService.hasRole('admin');
      if (!isAdmin) {
        return { allowed: false, error: 'Admin access required' };
      }
    }

    return { allowed: true, user };
  },

  /**
   * Get Firestore database reference
   */
  _getDb() {
    return window.FirebaseApp?.getDb();
  },

  /**
   * Get Firebase Storage reference
   */
  _getStorage() {
    return firebase.storage();
  },

  /**
   * Determine attachment type from MIME type
   */
  _getAttachmentType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'spreadsheet';
    return 'document';
  },

  /**
   * Format date for analytics queries (YYYY-MM-DD)
   */
  _formatDate(date) {
    return date.toISOString().split('T')[0];
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTNER CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all partners with optional filtering
   * @param {object} filters - Optional filters: { status, type, search }
   * @returns {Promise<object[]>}
   */
  async getPartners(filters = {}) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      console.warn('PartnerService.getPartners:', access.error);
      return [];
    }

    const db = this._getDb();
    if (!db) return [];

    try {
      let query = db.collection(this.COLLECTION);

      // Apply status filter
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      // Apply type filter
      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }

      // Order by last update
      query = query.orderBy('updatedAt', 'desc');

      const snapshot = await query.get();
      let partners = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply search filter client-side (Firestore doesn't support full-text search)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        partners = partners.filter(p => 
          p.name?.toLowerCase().includes(searchLower) ||
          p.contact?.name?.toLowerCase().includes(searchLower) ||
          p.contact?.email?.toLowerCase().includes(searchLower)
        );
      }

      return partners;
    } catch (error) {
      console.error('Error getting partners:', error);
      return [];
    }
  },

  /**
   * Get a single partner by ID
   * @param {string} partnerId
   * @returns {Promise<object|null>}
   */
  async getPartner(partnerId) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      console.warn('PartnerService.getPartner:', access.error);
      return null;
    }

    const db = this._getDb();
    if (!db) return null;

    try {
      const doc = await db.collection(this.COLLECTION).doc(partnerId).get();
      if (!doc.exists) return null;

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting partner:', error);
      return null;
    }
  },

  /**
   * Create a new partner
   * @param {object} data - Partner data
   * @returns {Promise<{success: boolean, partnerId?: string, error?: string}>}
   */
  async createPartner(data) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const db = this._getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    // Validate required fields
    if (!data.name || !data.type) {
      return { success: false, error: 'Name and type are required' };
    }

    if (!this.PARTNER_TYPES.includes(data.type)) {
      return { success: false, error: `Invalid partner type: ${data.type}` };
    }

    try {
      const partner = {
        name: data.name,
        type: data.type,
        status: data.status || 'prospect',
        contact: {
          name: data.contact?.name || '',
          email: data.contact?.email || '',
          phone: data.contact?.phone || '',
          title: data.contact?.title || ''
        },
        website: data.website || '',
        description: data.description || '',
        logoURL: data.logoURL || '',
        address: {
          street: data.address?.street || '',
          city: data.address?.city || '',
          state: data.address?.state || '',
          zip: data.address?.zip || '',
          country: data.address?.country || ''
        },
        tags: data.tags || [],
        metrics: {
          totalStudents: 0,
          totalCourses: 0,
          activeCohorts: 0,
          revenue: 0
        },
        totalInteractions: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: access.user.uid
      };

      const docRef = await db.collection(this.COLLECTION).add(partner);

      // Record analytics event
      await this.recordAnalyticsEvent(docRef.id, {
        eventType: 'partner_created',
        data: { partnerType: data.type, partnerName: data.name }
      });

      console.log('✅ Partner created:', docRef.id);
      return { success: true, partnerId: docRef.id };
    } catch (error) {
      console.error('Error creating partner:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update an existing partner
   * @param {string} partnerId
   * @param {object} data - Partial partner data to update
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updatePartner(partnerId, data) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const db = this._getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      // Get current partner to check for status change
      const currentDoc = await db.collection(this.COLLECTION).doc(partnerId).get();
      const currentData = currentDoc.exists ? currentDoc.data() : {};

      const updateData = {
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: access.user.uid
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await db.collection(this.COLLECTION).doc(partnerId).update(updateData);

      // Record status change event if status changed
      if (data.status && data.status !== currentData.status) {
        await this.recordAnalyticsEvent(partnerId, {
          eventType: 'status_changed',
          data: { oldStatus: currentData.status, newStatus: data.status }
        });
      }

      console.log('✅ Partner updated:', partnerId);
      return { success: true };
    } catch (error) {
      console.error('Error updating partner:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a partner (soft delete - sets status to 'deleted')
   * @param {string} partnerId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deletePartner(partnerId) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const db = this._getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      // Soft delete - mark as deleted rather than removing
      await db.collection(this.COLLECTION).doc(partnerId).update({
        status: 'deleted',
        deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
        deletedBy: access.user.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      console.log('✅ Partner deleted (soft):', partnerId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting partner:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERACTION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get interactions for a partner
   * @param {string} partnerId
   * @param {number} limit - Optional limit (default 50)
   * @returns {Promise<object[]>}
   */
  async getInteractions(partnerId, limit = 50) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      console.warn('PartnerService.getInteractions:', access.error);
      return [];
    }

    const db = this._getDb();
    if (!db) return [];

    try {
      const snapshot = await db.collection(this.COLLECTION)
        .doc(partnerId)
        .collection('interactions')
        .orderBy('interactionDate', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting interactions:', error);
      return [];
    }
  },

  /**
   * Create a new interaction for a partner
   * @param {string} partnerId
   * @param {object} data - Interaction data
   * @returns {Promise<{success: boolean, interactionId?: string, error?: string}>}
   */
  async createInteraction(partnerId, data) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const db = this._getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    // Validate required fields
    if (!data.type || !data.title) {
      return { success: false, error: 'Type and title are required' };
    }

    if (!this.INTERACTION_TYPES.includes(data.type)) {
      return { success: false, error: `Invalid interaction type: ${data.type}` };
    }

    try {
      const interaction = {
        partnerId,
        type: data.type,
        title: data.title,
        description: data.description || '',
        outcome: data.outcome || '',
        nextSteps: data.nextSteps || '',
        interactionDate: data.interactionDate || firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: access.user.uid,
        attachmentIds: []
      };

      const interactionRef = await db.collection(this.COLLECTION)
        .doc(partnerId)
        .collection('interactions')
        .add(interaction);

      // Update partner's last interaction info
      await db.collection(this.COLLECTION).doc(partnerId).update({
        lastInteractionId: interactionRef.id,
        lastInteractionAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalInteractions: firebase.firestore.FieldValue.increment(1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Record analytics event
      await this.recordAnalyticsEvent(partnerId, {
        eventType: 'interaction_logged',
        data: { interactionType: data.type, interactionId: interactionRef.id }
      });

      console.log('✅ Interaction created:', interactionRef.id);
      return { success: true, interactionId: interactionRef.id };
    } catch (error) {
      console.error('Error creating interaction:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update an interaction
   * @param {string} partnerId
   * @param {string} interactionId
   * @param {object} data
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateInteraction(partnerId, interactionId, data) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const db = this._getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      const updateData = {
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: access.user.uid
      };

      await db.collection(this.COLLECTION)
        .doc(partnerId)
        .collection('interactions')
        .doc(interactionId)
        .update(updateData);

      return { success: true };
    } catch (error) {
      console.error('Error updating interaction:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete an interaction
   * @param {string} partnerId
   * @param {string} interactionId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteInteraction(partnerId, interactionId) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const db = this._getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      await db.collection(this.COLLECTION)
        .doc(partnerId)
        .collection('interactions')
        .doc(interactionId)
        .delete();

      // Decrement interaction count
      await db.collection(this.COLLECTION).doc(partnerId).update({
        totalInteractions: firebase.firestore.FieldValue.increment(-1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting interaction:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTACHMENT METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get attachments for a partner
   * @param {string} partnerId
   * @param {string} interactionId - Optional: filter by interaction
   * @returns {Promise<object[]>}
   */
  async getAttachments(partnerId, interactionId = null) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      console.warn('PartnerService.getAttachments:', access.error);
      return [];
    }

    const db = this._getDb();
    if (!db) return [];

    try {
      let query = db.collection(this.COLLECTION)
        .doc(partnerId)
        .collection('attachments')
        .orderBy('uploadedAt', 'desc');

      if (interactionId) {
        query = query.where('interactionId', '==', interactionId);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting attachments:', error);
      return [];
    }
  },

  /**
   * Upload an attachment for a partner
   * @param {string} partnerId
   * @param {File} file - The file to upload
   * @param {object} metadata - Optional: { interactionId, description }
   * @returns {Promise<{success: boolean, attachmentId?: string, url?: string, error?: string}>}
   */
  async uploadAttachment(partnerId, file, metadata = {}) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const db = this._getDb();
    const storage = this._getStorage();
    if (!db || !storage) {
      return { success: false, error: 'Database or storage not available' };
    }

    try {
      // Generate attachment ID
      const attachmentId = db.collection('_').doc().id;
      
      // Create storage path
      const storagePath = `partners/${partnerId}/attachments/${attachmentId}_${file.name}`;
      const storageRef = storage.ref(storagePath);

      // Upload file
      await storageRef.put(file);
      const url = await storageRef.getDownloadURL();

      // Create Firestore record
      const attachment = {
        id: attachmentId,
        partnerId,
        interactionId: metadata.interactionId || null,
        type: this._getAttachmentType(file.type),
        name: file.name,
        url,
        storagePath,
        mimeType: file.type,
        sizeBytes: file.size,
        description: metadata.description || '',
        uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
        uploadedBy: access.user.uid
      };

      await db.collection(this.COLLECTION)
        .doc(partnerId)
        .collection('attachments')
        .doc(attachmentId)
        .set(attachment);

      // If linked to an interaction, update the interaction's attachmentIds
      if (metadata.interactionId) {
        await db.collection(this.COLLECTION)
          .doc(partnerId)
          .collection('interactions')
          .doc(metadata.interactionId)
          .update({
            attachmentIds: firebase.firestore.FieldValue.arrayUnion(attachmentId)
          });
      }

      console.log('✅ Attachment uploaded:', attachmentId);
      return { success: true, attachmentId, url };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Upload partner logo
   * @param {string} partnerId
   * @param {File} file - The logo file
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async uploadLogo(partnerId, file) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const db = this._getDb();
    const storage = this._getStorage();
    if (!db || !storage) {
      return { success: false, error: 'Database or storage not available' };
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Logo must be an image file' };
    }

    try {
      const storagePath = `partners/${partnerId}/logo/logo${this._getFileExtension(file.name)}`;
      const storageRef = storage.ref(storagePath);

      await storageRef.put(file);
      const url = await storageRef.getDownloadURL();

      // Update partner document
      await db.collection(this.COLLECTION).doc(partnerId).update({
        logoURL: url,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      console.log('✅ Logo uploaded for partner:', partnerId);
      return { success: true, url };
    } catch (error) {
      console.error('Error uploading logo:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get file extension from filename
   */
  _getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  },

  /**
   * Delete an attachment
   * @param {string} partnerId
   * @param {string} attachmentId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteAttachment(partnerId, attachmentId) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const db = this._getDb();
    const storage = this._getStorage();
    if (!db || !storage) {
      return { success: false, error: 'Database or storage not available' };
    }

    try {
      // Get attachment to find storage path
      const attachmentDoc = await db.collection(this.COLLECTION)
        .doc(partnerId)
        .collection('attachments')
        .doc(attachmentId)
        .get();

      if (!attachmentDoc.exists) {
        return { success: false, error: 'Attachment not found' };
      }

      const attachment = attachmentDoc.data();

      // Delete from storage
      if (attachment.storagePath) {
        try {
          await storage.ref(attachment.storagePath).delete();
        } catch (storageError) {
          console.warn('Could not delete storage file:', storageError);
        }
      }

      // Delete from Firestore
      await db.collection(this.COLLECTION)
        .doc(partnerId)
        .collection('attachments')
        .doc(attachmentId)
        .delete();

      // Remove from interaction if linked
      if (attachment.interactionId) {
        await db.collection(this.COLLECTION)
          .doc(partnerId)
          .collection('interactions')
          .doc(attachment.interactionId)
          .update({
            attachmentIds: firebase.firestore.FieldValue.arrayRemove(attachmentId)
          });
      }

      console.log('✅ Attachment deleted:', attachmentId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting attachment:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record an analytics event for a partner
   * @param {string} partnerId
   * @param {object} eventData - { eventType, data }
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async recordAnalyticsEvent(partnerId, eventData) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const db = this._getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      const event = {
        partnerId,
        eventType: eventData.eventType,
        data: eventData.data || {},
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        date: this._formatDate(new Date()),
        recordedBy: access.user.uid
      };

      await db.collection(this.COLLECTION)
        .doc(partnerId)
        .collection('analytics')
        .add(event);

      return { success: true };
    } catch (error) {
      console.error('Error recording analytics event:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get analytics events for a partner within a date range
   * @param {string} partnerId
   * @param {object} options - { startDate, endDate, eventType, limit }
   * @returns {Promise<object[]>}
   */
  async getAnalytics(partnerId, options = {}) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      console.warn('PartnerService.getAnalytics:', access.error);
      return [];
    }

    const db = this._getDb();
    if (!db) return [];

    try {
      let query = db.collection(this.COLLECTION)
        .doc(partnerId)
        .collection('analytics');

      // Filter by date range
      if (options.startDate) {
        query = query.where('date', '>=', this._formatDate(options.startDate));
      }
      if (options.endDate) {
        query = query.where('date', '<=', this._formatDate(options.endDate));
      }

      // Filter by event type
      if (options.eventType) {
        query = query.where('eventType', '==', options.eventType);
      }

      query = query.orderBy('date', 'asc');

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting analytics:', error);
      return [];
    }
  },

  /**
   * Get aggregated statistics across all partners
   * @returns {Promise<object>}
   */
  async getPartnerStats() {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      console.warn('PartnerService.getPartnerStats:', access.error);
      return null;
    }

    const db = this._getDb();
    if (!db) return null;

    try {
      const snapshot = await db.collection(this.COLLECTION)
        .where('status', '!=', 'deleted')
        .get();

      const stats = {
        total: 0,
        byStatus: { prospect: 0, active: 0, paused: 0, churned: 0 },
        byType: {},
        totalStudents: 0,
        totalCourses: 0,
        totalRevenue: 0,
        recentPartners: []
      };

      const partners = [];

      snapshot.docs.forEach(doc => {
        const partner = { id: doc.id, ...doc.data() };
        partners.push(partner);

        stats.total++;
        
        // Count by status
        if (partner.status && stats.byStatus.hasOwnProperty(partner.status)) {
          stats.byStatus[partner.status]++;
        }

        // Count by type
        if (partner.type) {
          stats.byType[partner.type] = (stats.byType[partner.type] || 0) + 1;
        }

        // Aggregate metrics
        if (partner.metrics) {
          stats.totalStudents += partner.metrics.totalStudents || 0;
          stats.totalCourses += partner.metrics.totalCourses || 0;
          stats.totalRevenue += partner.metrics.revenue || 0;
        }
      });

      // Get 5 most recently updated partners
      stats.recentPartners = partners
        .sort((a, b) => {
          const aTime = a.updatedAt?._seconds || 0;
          const bTime = b.updatedAt?._seconds || 0;
          return bTime - aTime;
        })
        .slice(0, 5)
        .map(p => ({ id: p.id, name: p.name, status: p.status, type: p.type }));

      return stats;
    } catch (error) {
      console.error('Error getting partner stats:', error);
      return null;
    }
  },

  /**
   * Get activity timeline across all partners (for dashboard)
   * @param {number} days - Number of days to look back (default 30)
   * @returns {Promise<object[]>}
   */
  async getRecentActivity(days = 30) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      console.warn('PartnerService.getRecentActivity:', access.error);
      return [];
    }

    const db = this._getDb();
    if (!db) return [];

    try {
      // Get all partners
      const partnersSnapshot = await db.collection(this.COLLECTION)
        .where('status', '!=', 'deleted')
        .get();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = this._formatDate(startDate);

      const allActivity = [];

      // Fetch recent interactions from each partner
      for (const partnerDoc of partnersSnapshot.docs) {
        const partner = { id: partnerDoc.id, ...partnerDoc.data() };

        const interactionsSnapshot = await db.collection(this.COLLECTION)
          .doc(partner.id)
          .collection('interactions')
          .where('interactionDate', '>=', startDate)
          .orderBy('interactionDate', 'desc')
          .limit(10)
          .get();

        interactionsSnapshot.docs.forEach(doc => {
          allActivity.push({
            ...doc.data(),
            id: doc.id,
            partnerName: partner.name,
            partnerId: partner.id
          });
        });
      }

      // Sort by date descending
      allActivity.sort((a, b) => {
        const aTime = a.interactionDate?._seconds || a.createdAt?._seconds || 0;
        const bTime = b.interactionDate?._seconds || b.createdAt?._seconds || 0;
        return bTime - aTime;
      });

      return allActivity.slice(0, 20);
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTNER COURSE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get courses for a partner
   * @param {string} partnerId
   * @returns {Promise<object[]>}
   */
  async getPartnerCourses(partnerId) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      console.warn('PartnerService.getPartnerCourses:', access.error);
      return [];
    }

    const db = this._getDb();
    if (!db) return [];

    try {
      const snapshot = await db.collection(this.COLLECTION)
        .doc(partnerId)
        .collection('courses')
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting partner courses:', error);
      return [];
    }
  },

  /**
   * Add a course to a partner
   * @param {string} partnerId
   * @param {object} courseData
   * @returns {Promise<{success: boolean, courseId?: string, error?: string}>}
   */
  async addPartnerCourse(partnerId, courseData) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const db = this._getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      const course = {
        partnerId,
        courseId: courseData.courseId,
        courseType: courseData.courseType || 'custom',
        courseName: courseData.courseName,
        status: courseData.status || 'planning',
        cohortSize: courseData.cohortSize || 0,
        startDate: courseData.startDate || null,
        endDate: courseData.endDate || null,
        schedule: courseData.schedule || '',
        instructor: courseData.instructor || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        metrics: {
          enrolled: 0,
          completed: 0,
          avgProgress: 0,
          avgQuizScore: 0
        }
      };

      const courseRef = await db.collection(this.COLLECTION)
        .doc(partnerId)
        .collection('courses')
        .add(course);

      // Update partner metrics
      await db.collection(this.COLLECTION).doc(partnerId).update({
        'metrics.totalCourses': firebase.firestore.FieldValue.increment(1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, courseId: courseRef.id };
    } catch (error) {
      console.error('Error adding partner course:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update partner metrics
   * @param {string} partnerId
   * @param {object} metrics - Partial metrics to update
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updatePartnerMetrics(partnerId, metrics) {
    const access = await this._checkAdminAccess();
    if (!access.allowed) {
      return { success: false, error: access.error };
    }

    const db = this._getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      const updateData = {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // Build metric updates
      Object.entries(metrics).forEach(([key, value]) => {
        updateData[`metrics.${key}`] = value;
      });

      await db.collection(this.COLLECTION).doc(partnerId).update(updateData);

      return { success: true };
    } catch (error) {
      console.error('Error updating partner metrics:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export
window.PartnerService = PartnerService;
