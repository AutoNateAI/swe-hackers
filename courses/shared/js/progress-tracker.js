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
    // Prevent double initialization for the same lesson
    if (this.isInitialized && this.courseId === courseId && this.lessonId === lessonId) {
      console.log('📊 Progress Tracker already initialized for this lesson');
      return;
    }

    // Check if we're returning to the same lesson (page refresh/navigation back)
    const isSameLesson = this.courseId === courseId && this.lessonId === lessonId;
    const hadPreviousProgress = this.sections.length > 0 && this.sections.some(s => s.viewed);

    // Store previous state if returning to same lesson
    const previousSectionStates = isSameLesson && hadPreviousProgress
      ? this.sections.map(s => ({ id: s.id, viewed: s.viewed, completed: s.completed, timeSpent: s.timeSpent }))
      : null;

    // Set course/lesson identifiers
    this.courseId = courseId;
    this.lessonId = lessonId;

    // Only reset timing if this is a fresh visit (not returning to same lesson)
    if (!isSameLesson || !hadPreviousProgress) {
      this.startTime = Date.now();
      this.sectionTimes = {};
    }

    // Initialize state
    this.sections = [];
    this.currentSection = null;
    this.isInitialized = false;
    this.completionShown = false;

    // Find all sections on the page
    this.discoverSections();

    // Only proceed if we found sections
    if (this.sections.length === 0) {
      console.log('📊 No sections found, retrying in 500ms...');
      setTimeout(() => this.init(courseId, lessonId), 500);
      return;
    }

    // Restore previous section states if returning to same lesson
    if (previousSectionStates) {
      console.log('📊 Restoring previous section states from memory');
      previousSectionStates.forEach(prevSection => {
        const section = this.sections.find(s => s.id === prevSection.id);
        if (section) {
          section.viewed = prevSection.viewed;
          section.completed = prevSection.completed;
          section.timeSpent = prevSection.timeSpent;
        }
      });

      // Check if lesson was already complete
      const viewedCount = this.sections.filter(s => s.viewed).length;
      if (viewedCount === this.sections.length) {
        this.completionShown = true;
        console.log('📊 Lesson was already complete (from memory)');
      }
    }

    // Render the tracker UI immediately
    this.renderTracker();

    // Set up scroll observer
    this.setupScrollObserver();

    // Update UI to show initial state
    this.updateTrackerUI();

    // Load existing progress from Firestore (await to ensure we restore state before user interacts)
    try {
      await this.loadProgress();
    } catch (err) {
      console.error('Error loading progress:', err);
    }

    // Set up auto-save (only once)
    if (!this._autoSaveSetup) {
      this.setupAutoSave();
      this._autoSaveSetup = true;
    }

    // Track page visibility for accurate time tracking (only once)
    if (!this._visibilitySetup) {
      this.setupVisibilityTracking();
      this._visibilitySetup = true;
    }

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
    
    // Check if lesson is now complete (all sections viewed)
    const viewedCount = this.sections.filter(s => s.viewed).length;
    const isNowComplete = viewedCount === this.sections.length;
    
    // Save - immediate if complete, debounced otherwise
    if (stateChanged) {
      if (isNowComplete) {
        // Save immediately when complete and WAIT for it to finish
        console.log('📊 Lesson complete! Saving immediately...');
        this.saveProgress().then(() => {
          console.log('📊 Save complete, showing modal');
          // Show completion modal AFTER save completes
          if (!this.completionShown) {
            this.completionShown = true;
            this.showCompletionToast();
          }
        });
      } else {
        this.debouncedSave();
      }
    }
  },
  
  /**
   * Scroll to the user's last viewed section
   */
  scrollToLastSection(lastSectionId) {
    console.log('📊 Scrolling to last section:', lastSectionId);
    
    // Find the section element
    let targetElement = document.getElementById(lastSectionId);
    
    // If not found by ID, try data-section attribute
    if (!targetElement) {
      targetElement = document.querySelector(`[data-section="${lastSectionId}"]`);
    }
    
    // If still not found, try matching by section index
    if (!targetElement) {
      const sectionIndex = this.sections.findIndex(s => s.id === lastSectionId);
      if (sectionIndex >= 0) {
        const allSections = document.querySelectorAll('.lesson-section, section[id], section[data-section], section.section, .origin-section');
        targetElement = allSections[sectionIndex];
      }
    }
    
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      console.log('📊 Scrolled to section:', lastSectionId);
    } else {
      console.log('📊 Could not find section element for:', lastSectionId);
    }
  },
  
  /**
   * Show completion modal when all sections are viewed
   */
  showCompletionToast() {
    console.log('📊 All sections viewed! Showing completion modal');
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'lesson-complete-modal';
    modal.innerHTML = `
      <div class="completion-backdrop"></div>
      <div class="completion-content">
        <div class="completion-confetti" id="confetti-container"></div>
        <div class="completion-icon">🎉</div>
        <h2 class="completion-title">Lesson Complete!</h2>
        <p class="completion-message">Amazing work! You've completed all sections of this lesson.</p>
        <div class="completion-stats">
          <div class="completion-stat">
            <span class="stat-value">${this.sections.length}</span>
            <span class="stat-label">Sections</span>
          </div>
          <div class="completion-stat">
            <span class="stat-value">${Math.round((Date.now() - this.startTime) / 60000)}m</span>
            <span class="stat-label">Time</span>
          </div>
          <div class="completion-stat">
            <span class="stat-value">100%</span>
            <span class="stat-label">Complete</span>
          </div>
        </div>
        <div class="completion-actions">
          <button class="completion-btn secondary" onclick="this.closest('.lesson-complete-modal').remove()">Review Lesson</button>
          <a class="completion-btn primary" href="${this.getNextLessonUrl()}">Next Lesson →</a>
        </div>
      </div>
    `;
    
    // Add styles
    if (!document.getElementById('completion-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'completion-modal-styles';
      style.textContent = `
        .lesson-complete-modal {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          animation: modalFadeIn 0.3s ease;
        }
        .completion-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
        }
        .completion-content {
          position: relative;
          background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 3rem;
          max-width: 480px;
          width: 90%;
          text-align: center;
          animation: modalSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }
        .completion-confetti {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          animation: confettiFall 3s ease-out forwards;
        }
        .completion-icon {
          font-size: 4rem;
          animation: iconBounce 0.6s ease 0.3s;
        }
        .completion-title {
          font-size: 2rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem;
          background: linear-gradient(135deg, #7986cb, #4db6ac);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .completion-message {
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 2rem;
        }
        .completion-stats {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        }
        .completion-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #4db6ac;
        }
        .stat-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
        }
        .completion-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .completion-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          border: none;
          font-size: 1rem;
        }
        .completion-btn.secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .completion-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .completion-btn.primary {
          background: linear-gradient(135deg, #7986cb, #4db6ac);
          color: white;
        }
        .completion-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(77, 182, 172, 0.4);
        }
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { transform: translateY(50px) scale(0.9); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes iconBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(modal);
    
    // Add confetti
    const confettiContainer = modal.querySelector('#confetti-container');
    const colors = ['#7986cb', '#4db6ac', '#ffb74d', '#f06292', '#64b5f6', '#81c784'];
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
      confettiContainer.appendChild(confetti);
    }
    
    // Close on backdrop click
    modal.querySelector('.completion-backdrop').addEventListener('click', () => {
      modal.remove();
    });
  },
  
  /**
   * Get the URL for the next lesson
   */
  getNextLessonUrl() {
    const chapterOrder = ['ch0-origins', 'ch1-stone', 'ch2-lightning', 'ch3-magnetism', 'ch4-architect', 'ch5-capstone1', 'ch6-capstone2'];
    const currentIndex = chapterOrder.indexOf(this.lessonId);
    const nextIndex = (currentIndex + 1) % chapterOrder.length;
    return `../${chapterOrder[nextIndex]}/`;
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
    console.log('📊 loadProgress called, checking auth...');
    
    // Wait for auth to be ready
    if (!window.AuthService) {
      console.log('📊 AuthService not ready, retrying in 500ms...');
      setTimeout(() => this.loadProgress(), 500);
      return;
    }
    
    // Check if user is logged in
    let user = window.AuthService.getUser();
    if (!user) {
      console.log('📊 User not signed in yet, waiting for auth state...');
      // Try waiting for auth state
      try {
        user = await window.AuthService.waitForAuthState();
        console.log('📊 Auth state resolved, user:', user?.email);
      } catch (e) {
        console.log('📊 waitForAuthState failed, retrying in 1 second...');
        setTimeout(() => this.loadProgress(), 1000);
        return;
      }
    }
    
    if (!user) {
      console.log('📊 Still no user after waiting, retrying in 1 second...');
      setTimeout(() => this.loadProgress(), 1000);
      return;
    }
    
    if (!window.DataService) {
      console.log('📊 DataService not ready, retrying in 500ms...');
      setTimeout(() => this.loadProgress(), 500);
      return;
    }
    
    try {
      console.log('📊 Loading progress for:', this.courseId, this.lessonId);
      const progress = await window.DataService.getLessonProgress(this.courseId, this.lessonId);
      
      if (progress && progress.sections) {
        console.log('📊 Loaded saved progress:', progress.sections.length, 'sections,', 
                   progress.sections.filter(s => s.viewed).length, 'viewed');
        
        // Restore section states
        let restoredCount = 0;
        progress.sections.forEach(savedSection => {
          const section = this.sections.find(s => s.id === savedSection.id);
          if (section) {
            section.viewed = savedSection.viewed || false;
            section.completed = savedSection.completed || false;
            section.timeSpent = savedSection.timeSpent || 0;
            if (savedSection.viewed) restoredCount++;
          }
        });
        
        console.log('📊 Restored', restoredCount, 'viewed sections to UI');
        
        // If already complete, don't show toast again
        if (restoredCount === this.sections.length) {
          this.completionShown = true;
          console.log('📊 Lesson was already complete');
        }
        
        this.updateTrackerUI();
        
        // Scroll to last viewed section after a short delay
        if (progress.lastSection) {
          setTimeout(() => {
            this.scrollToLastSection(progress.lastSection);
          }, 500);
        }
      } else {
        console.log('📊 No saved progress found for this lesson');
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
      console.log('📊 Progress saved:', viewedCount + '/' + this.sections.length, 'sections viewed, progressPercent:', progressPercent);
      
      if (progressPercent >= 100) {
        console.log('📊 Lesson 100% complete, course progress should be updated');
      }
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

