/**
 * Progress Tracker Component
 * Tracks student progress through lesson sections in real-time
 * Persists to Firestore for analytics and continuation
 */

const ProgressTracker = {
  courseId: null,
  lessonId: null,
  sections: [],
  currentSection: null,
  startTime: Date.now(),
  sectionTimes: {},
  isInitialized: false,
  
  /**
   * Initialize the progress tracker for a lesson
   * @param {string} courseId - e.g., 'apprentice', 'junior'
   * @param {string} lessonId - e.g., 'ch0-origins', 'ch1-stone'
   */
  async init(courseId, lessonId) {
    // Prevent double initialization
    if (this.isInitialized && this.courseId === courseId && this.lessonId === lessonId) {
      console.log('📊 Progress Tracker already initialized for this lesson');
      return;
    }
    
    // Reset state for new initialization
    this.courseId = courseId;
    this.lessonId = lessonId;
    this.startTime = Date.now();
    this.sectionTimes = {};
    this.sections = [];
    this.currentSection = null;
    this.isInitialized = false;
    
    // Find all sections on the page
    this.discoverSections();
    
    // Only proceed if we found sections
    if (this.sections.length === 0) {
      console.log('📊 No sections found, retrying in 500ms...');
      setTimeout(() => this.init(courseId, lessonId), 500);
      return;
    }
    
    // Render the tracker UI immediately
    this.renderTracker();
    
    // Set up scroll observer
    this.setupScrollObserver();
    
    // Update UI to show initial state
    this.updateTrackerUI();
    
    // Load existing progress (async, don't block)
    this.loadProgress().catch(err => console.error('Error loading progress:', err));
    
    // Set up auto-save
    this.setupAutoSave();
    
    // Track page visibility for accurate time tracking
    this.setupVisibilityTracking();
    
    this.isInitialized = true;
    console.log('📊 Progress Tracker initialized:', { courseId, lessonId, sections: this.sections.length });
  },
  
  /**
   * Discover all trackable sections on the page
   */
  discoverSections() {
    // Find sections using multiple selectors to handle different lesson structures
    const sectionElements = document.querySelectorAll(
      '.lesson-section, section[id], section[data-section], section.section, .origin-section'
    );
    this.sections = [];
    
    // Use a Set to avoid duplicates (same element matching multiple selectors)
    const seen = new Set();
    
    sectionElements.forEach((el, index) => {
      // Skip duplicates
      if (seen.has(el)) return;
      seen.add(el);
      
      // Get section title from various possible elements
      const titleEl = el.querySelector('.section-title, h2, h3, .section-header h2');
      let title = titleEl ? titleEl.textContent.trim() : null;
      
      // Also check the data-section attribute for title hints
      if (!title && el.dataset.section) {
        title = el.dataset.section.charAt(0).toUpperCase() + el.dataset.section.slice(1);
      }
      
      if (!title) {
        title = `Section ${index + 1}`;
      }
      
      // Get ID from various sources
      let id = el.id || el.dataset.section || el.dataset.sectionId;
      if (!id) {
        id = `section-${index}`;
        el.id = id;
      }
      
      this.sections.push({
        id,
        title: title.substring(0, 50), // Truncate long titles
        element: el,
        viewed: false,
        completed: false,
        timeSpent: 0
      });
    });
    
    console.log('📊 Discovered sections:', this.sections.map(s => s.title));
  },
  
  /**
   * Render the progress tracker UI
   */
  renderTracker() {
    // Remove existing tracker
    const existing = document.getElementById('progress-tracker');
    if (existing) existing.remove();
    
    const tracker = document.createElement('div');
    tracker.id = 'progress-tracker';
    tracker.className = 'progress-tracker';
    tracker.innerHTML = `
      <div class="tracker-header">
        <div class="tracker-title">
          <span class="tracker-icon">📍</span>
          <span>Your Progress</span>
        </div>
        <div class="tracker-toggle" onclick="ProgressTracker.toggleCollapse()">
          <span class="toggle-icon">◀</span>
        </div>
      </div>
      <div class="tracker-content">
        <div class="tracker-progress-bar">
          <div class="tracker-progress-fill" id="tracker-progress-fill"></div>
        </div>
        <div class="tracker-percent" id="tracker-percent">0% complete</div>
        <div class="tracker-sections" id="tracker-sections">
          ${this.sections.map((section, i) => `
            <div class="tracker-section" data-section-id="${section.id}" onclick="ProgressTracker.scrollToSection('${section.id}')">
              <div class="section-indicator">
                <span class="indicator-dot"></span>
                <span class="indicator-line"></span>
              </div>
              <div class="section-info">
                <span class="section-number">${i + 1}</span>
                <span class="section-name">${this.truncateTitle(section.title)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="tracker-stats">
          <div class="stat">
            <span class="stat-value" id="stat-time">0m</span>
            <span class="stat-label">Time</span>
          </div>
          <div class="stat">
            <span class="stat-value" id="stat-sections">0/${this.sections.length}</span>
            <span class="stat-label">Sections</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(tracker);
    this.addTrackerStyles();
  },
  
  truncateTitle(title) {
    // Remove emoji at start if present
    const cleaned = title.replace(/^[\p{Emoji}\s]+/u, '').trim();
    return cleaned.length > 25 ? cleaned.substring(0, 22) + '...' : cleaned;
  },
  
  /**
   * Add tracker styles
   */
  addTrackerStyles() {
    if (document.getElementById('progress-tracker-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'progress-tracker-styles';
    styles.textContent = `
      .progress-tracker {
        position: fixed;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        width: 240px;
        background: rgba(22, 22, 42, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        z-index: 1000;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
        font-family: 'Inter', -apple-system, sans-serif;
      }
      
      .progress-tracker.collapsed {
        width: 50px;
      }
      
      .progress-tracker.collapsed .tracker-content,
      .progress-tracker.collapsed .tracker-title span:last-child {
        display: none;
      }
      
      .progress-tracker.collapsed .toggle-icon {
        transform: rotate(180deg);
      }
      
      .tracker-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .tracker-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #e8e8f0;
      }
      
      .tracker-icon {
        font-size: 16px;
      }
      
      .tracker-toggle {
        cursor: pointer;
        padding: 4px;
        opacity: 0.6;
        transition: opacity 0.2s;
      }
      
      .tracker-toggle:hover {
        opacity: 1;
      }
      
      .toggle-icon {
        display: inline-block;
        transition: transform 0.3s;
        font-size: 10px;
        color: #8b8ba3;
      }
      
      .tracker-content {
        padding: 16px;
      }
      
      .tracker-progress-bar {
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      
      .tracker-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #7986cb, #4db6ac);
        border-radius: 3px;
        width: 0%;
        transition: width 0.5s ease;
      }
      
      .tracker-percent {
        font-size: 11px;
        color: #8b8ba3;
        text-align: center;
        margin-bottom: 16px;
      }
      
      .tracker-sections {
        max-height: 300px;
        overflow-y: auto;
        margin-bottom: 16px;
      }
      
      .tracker-sections::-webkit-scrollbar {
        width: 4px;
      }
      
      .tracker-sections::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
      }
      
      .tracker-section {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 8px 0;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .tracker-section:hover {
        background: rgba(255, 255, 255, 0.03);
        margin: 0 -8px;
        padding-left: 8px;
        padding-right: 8px;
        border-radius: 6px;
      }
      
      .section-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-top: 2px;
      }
      
      .indicator-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        border: 2px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s;
      }
      
      .indicator-line {
        width: 2px;
        height: 20px;
        background: rgba(255, 255, 255, 0.1);
        margin-top: 4px;
      }
      
      .tracker-section:last-child .indicator-line {
        display: none;
      }
      
      .tracker-section.viewed .indicator-dot {
        background: rgba(121, 134, 203, 0.3);
        border-color: #7986cb;
      }
      
      .tracker-section.completed .indicator-dot {
        background: #4db6ac;
        border-color: #4db6ac;
      }
      
      .tracker-section.current .indicator-dot {
        background: #7986cb;
        border-color: #7986cb;
        box-shadow: 0 0 10px rgba(121, 134, 203, 0.5);
      }
      
      .section-info {
        flex: 1;
        min-width: 0;
      }
      
      .section-number {
        display: inline-block;
        width: 18px;
        height: 18px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        color: #8b8ba3;
        text-align: center;
        line-height: 18px;
        margin-right: 8px;
      }
      
      .tracker-section.current .section-number {
        background: rgba(121, 134, 203, 0.2);
        color: #7986cb;
      }
      
      .section-name {
        font-size: 12px;
        color: #a8a8b8;
        line-height: 1.3;
      }
      
      .tracker-section.current .section-name {
        color: #e8e8f0;
        font-weight: 500;
      }
      
      .tracker-stats {
        display: flex;
        gap: 16px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .stat {
        flex: 1;
        text-align: center;
      }
      
      .stat-value {
        display: block;
        font-size: 16px;
        font-weight: 600;
        color: #e8e8f0;
      }
      
      .stat-label {
        font-size: 10px;
        color: #8b8ba3;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      
      /* Mobile responsive */
      @media (max-width: 1200px) {
        .progress-tracker {
          right: 10px;
          width: 200px;
        }
      }
      
      @media (max-width: 900px) {
        .progress-tracker {
          display: none;
        }
      }
    `;
    
    document.head.appendChild(styles);
  },
  
  /**
   * Toggle collapsed state
   */
  toggleCollapse() {
    const tracker = document.getElementById('progress-tracker');
    tracker.classList.toggle('collapsed');
  },
  
  /**
   * Scroll to a specific section
   */
  scrollToSection(sectionId) {
    const section = this.sections.find(s => s.id === sectionId);
    if (section && section.element) {
      section.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },
  
  /**
   * Get section ID from an element (checks id, data-section, data-section-id)
   */
  getSectionIdFromElement(el) {
    return el.id || el.dataset.section || el.dataset.sectionId || null;
  },
  
  /**
   * Find section by element
   */
  findSectionByElement(el) {
    const sectionId = this.getSectionIdFromElement(el);
    if (sectionId) {
      return this.sections.find(s => s.id === sectionId);
    }
    // Fallback: find by element reference
    return this.sections.find(s => s.element === el);
  },
  
  /**
   * Set up intersection observer for section tracking
   */
  setupScrollObserver() {
    const options = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const section = this.findSectionByElement(entry.target);
        
        if (section && entry.isIntersecting) {
          this.setCurrentSection(section);
        }
      });
    }, options);
    
    this.sections.forEach(section => {
      if (section.element) {
        observer.observe(section.element);
      }
    });
    
    // Also track when sections are fully viewed
    const viewObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const section = this.findSectionByElement(entry.target);
          if (section && !section.viewed) {
            section.viewed = true;
            this.updateTrackerUI();
          }
        }
      });
    }, { threshold: 0.5 });
    
    this.sections.forEach(section => {
      if (section.element) {
        viewObserver.observe(section.element);
      }
    });
    
    // Set initial section based on scroll position
    this.detectInitialSection();
  },
  
  /**
   * Detect which section is currently visible on page load
   */
  detectInitialSection() {
    const viewportMiddle = window.innerHeight / 2;
    
    for (const section of this.sections) {
      if (!section.element) continue;
      
      const rect = section.element.getBoundingClientRect();
      if (rect.top <= viewportMiddle && rect.bottom >= viewportMiddle) {
        this.setCurrentSection(section);
        break;
      }
    }
    
    // If no section found in middle, mark first section as current
    if (!this.currentSection && this.sections.length > 0) {
      this.setCurrentSection(this.sections[0]);
    }
  },
  
  /**
   * Set the current active section
   */
  setCurrentSection(section) {
    // Track time in previous section
    if (this.currentSection) {
      const elapsed = Date.now() - (this.sectionTimes[this.currentSection.id] || Date.now());
      this.currentSection.timeSpent += elapsed;
    }
    
    // Start timing new section
    this.currentSection = section;
    this.sectionTimes[section.id] = Date.now();
    
    // Check if state changed
    const wasViewed = section.viewed;
    section.viewed = true;
    
    // Mark all sections before this one as viewed (user scrolled past them)
    const currentIndex = this.sections.indexOf(section);
    let stateChanged = !wasViewed;
    
    if (currentIndex > 0) {
      for (let i = 0; i < currentIndex; i++) {
        if (!this.sections[i].viewed) {
          this.sections[i].viewed = true;
          stateChanged = true;
        }
      }
    }
    
    this.updateTrackerUI();
    
    // Save immediately if state changed (debounced)
    if (stateChanged) {
      this.debouncedSave();
    }
  },
  
  /**
   * Debounced save to avoid too many writes
   */
  debouncedSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveProgress();
    }, 1000); // Save after 1 second of no changes
  },
  
  /**
   * Update the tracker UI
   */
  updateTrackerUI() {
    const viewedCount = this.sections.filter(s => s.viewed).length;
    const completedCount = this.sections.filter(s => s.completed).length;
    const percent = Math.round((viewedCount / this.sections.length) * 100);
    
    // Update progress bar
    const fill = document.getElementById('tracker-progress-fill');
    if (fill) fill.style.width = `${percent}%`;
    
    // Update percent text
    const percentEl = document.getElementById('tracker-percent');
    if (percentEl) percentEl.textContent = `${percent}% viewed`;
    
    // Update sections count
    const sectionsEl = document.getElementById('stat-sections');
    if (sectionsEl) sectionsEl.textContent = `${viewedCount}/${this.sections.length}`;
    
    // Update time
    const timeEl = document.getElementById('stat-time');
    if (timeEl) {
      const totalTime = Math.round((Date.now() - this.startTime) / 60000);
      timeEl.textContent = `${totalTime}m`;
    }
    
    // Update section indicators
    this.sections.forEach(section => {
      const el = document.querySelector(`.tracker-section[data-section-id="${section.id}"]`);
      if (el) {
        el.classList.toggle('viewed', section.viewed);
        el.classList.toggle('completed', section.completed);
        el.classList.toggle('current', section === this.currentSection);
      }
    });
  },
  
  /**
   * Mark current section as completed
   */
  markSectionComplete(sectionId) {
    const section = this.sections.find(s => s.id === sectionId);
    if (section) {
      section.completed = true;
      this.updateTrackerUI();
      this.saveProgress();
    }
  },
  
  /**
   * Load progress from Firestore
   */
  async loadProgress() {
    // Wait for auth to be ready
    if (!window.AuthService) {
      console.log('📊 AuthService not ready, retrying in 500ms...');
      setTimeout(() => this.loadProgress(), 500);
      return;
    }
    
    // Check if user is logged in
    const user = window.AuthService.getUser();
    if (!user) {
      // Try waiting for auth state
      try {
        await window.AuthService.waitForAuthState();
      } catch (e) {
        console.log('📊 User not authenticated, skipping progress load');
        return;
      }
    }
    
    if (!window.DataService) {
      console.log('📊 DataService not ready');
      return;
    }
    
    try {
      console.log('📊 Loading progress for:', this.courseId, this.lessonId);
      const progress = await window.DataService.getLessonProgress(this.courseId, this.lessonId);
      
      if (progress && progress.sections) {
        console.log('📊 Loaded saved progress:', progress.sections.length, 'sections');
        
        // Restore section states
        progress.sections.forEach(savedSection => {
          const section = this.sections.find(s => s.id === savedSection.id);
          if (section) {
            section.viewed = savedSection.viewed || false;
            section.completed = savedSection.completed || false;
            section.timeSpent = savedSection.timeSpent || 0;
          }
        });
        
        this.updateTrackerUI();
      } else {
        console.log('📊 No saved progress found');
      }
    } catch (error) {
      console.error('📊 Error loading progress:', error);
    }
  },
  
  /**
   * Save progress to Firestore
   */
  async saveProgress() {
    if (!window.DataService || !window.AuthService?.getUser()) {
      console.log('📊 Cannot save - DataService or Auth not ready');
      return;
    }
    
    console.log('📊 Saving progress...');
    
    // Update current section time
    if (this.currentSection) {
      const elapsed = Date.now() - (this.sectionTimes[this.currentSection.id] || Date.now());
      this.currentSection.timeSpent += elapsed;
      this.sectionTimes[this.currentSection.id] = Date.now();
    }
    
    const totalTimeSpent = Date.now() - this.startTime;
    const viewedCount = this.sections.filter(s => s.viewed).length;
    const completedCount = this.sections.filter(s => s.completed).length;
    const progressPercent = Math.round((viewedCount / this.sections.length) * 100);
    
    const progressData = {
      lessonId: this.lessonId,
      courseId: this.courseId,
      sections: this.sections.map(s => ({
        id: s.id,
        title: s.title,
        viewed: s.viewed,
        completed: s.completed,
        timeSpent: s.timeSpent
      })),
      totalSections: this.sections.length,
      viewedSections: viewedCount,
      completedSections: completedCount,
      progressPercent,
      totalTimeSpent,
      lastSection: this.currentSection?.id,
      lastUpdated: new Date().toISOString()
    };
    
    try {
      const result = await window.DataService.saveLessonProgress(this.courseId, this.lessonId, progressData);
      console.log('📊 Progress saved:', viewedCount + '/' + this.sections.length, 'sections viewed');
    } catch (error) {
      console.error('📊 Error saving progress:', error);
    }
  },
  
  /**
   * Set up auto-save every 30 seconds
   */
  setupAutoSave() {
    setInterval(() => {
      if (this.isInitialized) {
        this.saveProgress();
      }
    }, 30000);
    
    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.saveProgress();
    });
  },
  
  /**
   * Track page visibility for accurate timing
   */
  setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Pause timing
        if (this.currentSection) {
          const elapsed = Date.now() - (this.sectionTimes[this.currentSection.id] || Date.now());
          this.currentSection.timeSpent += elapsed;
        }
        this.saveProgress();
      } else {
        // Resume timing
        if (this.currentSection) {
          this.sectionTimes[this.currentSection.id] = Date.now();
        }
      }
    });
  }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressTracker;
}

// Make available globally
window.ProgressTracker = ProgressTracker;

