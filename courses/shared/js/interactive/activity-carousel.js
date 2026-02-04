/**
 * ActivityCarousel - Carousel component for lesson activities
 * 
 * Manages a collection of activities within a carousel UI, handling:
 *   - Navigation between activities (prev/next, dots)
 *   - Progress tracking (X/Y complete)
 *   - Activity instantiation via ActivityRegistry
 *   - Integration with ActivityTracker for data collection
 * 
 * Usage:
 *   const carousel = new ActivityCarousel('my-carousel', {
 *     type: 'application',
 *     sectionId: 'variables',
 *     activities: [
 *       { type: 'sequence', id: 'seq-1', ... },
 *       { type: 'connect-edges', id: 'ce-1', ... }
 *     ]
 *   });
 *   carousel.init();
 * 
 * HTML Structure (auto-generated):
 *   <div class="activity-carousel" id="my-carousel">
 *     <div class="carousel-header">
 *       <h4 class="carousel-title">⚡ Apply What You Learned</h4>
 *       <div class="carousel-progress">0/3 complete</div>
 *     </div>
 *     <div class="carousel-content">
 *       <div class="carousel-slide active" data-index="0">...</div>
 *       <div class="carousel-slide" data-index="1">...</div>
 *     </div>
 *     <div class="carousel-nav">
 *       <button class="carousel-btn prev">← Prev</button>
 *       <div class="carousel-dots">...</div>
 *       <button class="carousel-btn next">Next →</button>
 *     </div>
 *   </div>
 */

class ActivityCarousel {
  constructor(containerId, config, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.config = config;
    this.options = options;
    
    // Carousel metadata
    this.type = config.type || 'general'; // comprehension | application | synthesis
    this.sectionId = config.sectionId || null;
    this.title = config.title || this.getDefaultTitle();
    
    // Activity configurations
    this.activityConfigs = config.activities || [];
    
    // State
    this.currentIndex = 0;
    this.activityInstances = []; // Holds instantiated activity objects
    this.completedCount = 0;
    
    // Context (passed to activities)
    this.courseId = options.courseId || this.extractCourseId();
    this.lessonId = options.lessonId || this.extractLessonId();
    
    // Validate container
    if (!this.container) {
      console.error(`ActivityCarousel: Container '${containerId}' not found`);
      return;
    }
  }
  
  // ============================================
  // INITIALIZATION
  // ============================================
  
  /**
   * Initialize the carousel
   */
  init() {
    this.render();
    this.createActivities();
    this.bindEvents();
    this.updateProgress();
    this.showSlide(0);

    // Listen for ActivityTracker data loaded event to refresh progress
    this.setupDataLoadedListener();

    // If data is already loaded, refresh immediately
    if (window.ActivityTracker?.isDataLoaded()) {
      this.refreshFromLoadedData();
    }

    console.log(`🎠 ActivityCarousel initialized: ${this.containerId}`, {
      type: this.type,
      activities: this.activityConfigs.length
    });

    return this;
  }

  /**
   * Listen for ActivityTracker data loaded event
   */
  setupDataLoadedListener() {
    this._dataLoadedHandler = (event) => {
      console.log(`🎠 ActivityCarousel received dataLoaded event: ${this.containerId}`);
      this.refreshFromLoadedData();
    };
    window.addEventListener('activityTrackerDataLoaded', this._dataLoadedHandler);
  }

  /**
   * Refresh carousel state from loaded ActivityTracker data
   */
  refreshFromLoadedData() {
    if (!window.ActivityTracker) return;

    // Update each activity's completion state and dot status
    this.activityInstances.forEach((activity, index) => {
      if (!activity) return;

      const bestAttempt = window.ActivityTracker.getBestAttempt(activity.id);
      const mostRecentAttempt = window.ActivityTracker.getMostRecentAttempt(activity.id);

      if (bestAttempt) {
        // Update activity completion state
        activity.attemptNumber = window.ActivityTracker.getAttemptCount(activity.id);

        if (bestAttempt.correct || bestAttempt.score >= 1.0) {
          activity.isComplete = true;
          activity.container?.classList.add('activity-completed');
        }

        // Update dot status based on best attempt
        const dot = this.container.querySelector(`.carousel-dot[data-index="${index}"]`);
        if (dot) {
          dot.classList.remove('correct', 'incorrect', 'partial');
          if (bestAttempt.correct || bestAttempt.score >= 1.0) {
            dot.classList.add('correct');
          } else if (bestAttempt.score >= 0.5) {
            dot.classList.add('partial');
          } else {
            dot.classList.add('incorrect');
          }
        }

        // Notify activity to show previous attempt (for wrong answer display)
        if (activity.showPreviousAttempt && mostRecentAttempt) {
          activity.showPreviousAttempt(mostRecentAttempt);
        }
      }
    });

    // Update progress counter
    this.updateProgress();

    console.log(`🎠 Carousel refreshed from loaded data: ${this.containerId}`, {
      completed: this.completedCount,
      total: this.activityConfigs.length
    });
  }
  
  /**
   * Render the carousel structure
   */
  render() {
    const icon = this.getTypeIcon();
    
    this.container.innerHTML = `
      <div class="carousel-header">
        <h4 class="carousel-title">${icon} ${this.title}</h4>
        <div class="carousel-progress">
          <span class="progress-completed">0</span>/<span class="progress-total">${this.activityConfigs.length}</span> complete
        </div>
      </div>
      
      <div class="carousel-content">
        ${this.activityConfigs.map((_, i) => `
          <div class="carousel-slide" data-index="${i}">
            <div class="activity-container" id="${this.containerId}-activity-${i}"></div>
          </div>
        `).join('')}
      </div>
      
      <div class="carousel-nav">
        <button class="carousel-btn prev" ${this.currentIndex === 0 ? 'disabled' : ''}>
          ← Prev
        </button>
        <div class="carousel-dots">
          ${this.activityConfigs.map((_, i) => `
            <div class="carousel-dot" data-index="${i}" title="Activity ${i + 1}"></div>
          `).join('')}
        </div>
        <button class="carousel-btn next" ${this.currentIndex >= this.activityConfigs.length - 1 ? 'disabled' : ''}>
          Next →
        </button>
      </div>
    `;
    
    // Add carousel type class
    this.container.classList.add('activity-carousel', `carousel-${this.type}`);
  }
  
  /**
   * Create activity instances for each slide
   */
  createActivities() {
    this.activityConfigs.forEach((activityConfig, index) => {
      const containerId = `${this.containerId}-activity-${index}`;
      const activityType = activityConfig.type;
      
      // Check if activity type is registered
      if (!window.ActivityRegistry?.has(activityType)) {
        console.warn(`ActivityCarousel: Activity type '${activityType}' not registered, using placeholder`);
        this.createPlaceholder(containerId, activityConfig);
        this.activityInstances.push(null);
        return;
      }
      
      // Create activity instance via registry
      const activity = window.ActivityRegistry.create(
        activityType,
        containerId,
        activityConfig,
        {
          courseId: this.courseId,
          lessonId: this.lessonId,
          sectionId: this.sectionId,
          carouselType: this.type,
          onComplete: (result) => this.handleActivityComplete(index, result),
          onProgress: (progress) => this.handleActivityProgress(index, progress)
        }
      );
      
      if (activity) {
        activity.init();
        this.activityInstances.push(activity);
      } else {
        this.activityInstances.push(null);
      }
    });
  }
  
  /**
   * Create placeholder for unregistered activity types
   */
  createPlaceholder(containerId, activityConfig) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="activity-placeholder">
        <div class="placeholder-icon">🚧</div>
        <div class="placeholder-title">${activityConfig.type} Activity</div>
        <div class="placeholder-message">
          This activity type is coming soon!
        </div>
        <div class="placeholder-id">ID: ${activityConfig.id}</div>
      </div>
    `;
  }
  
  // ============================================
  // NAVIGATION
  // ============================================
  
  /**
   * Bind navigation event handlers
   */
  bindEvents() {
    // Prev/Next buttons
    const prevBtn = this.container.querySelector('.carousel-btn.prev');
    const nextBtn = this.container.querySelector('.carousel-btn.next');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.prev());
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.next());
    }
    
    // Dot navigation
    const dots = this.container.querySelectorAll('.carousel-dot');
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.index);
        this.showSlide(index);
      });
    });
    
    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.next();
      }
    });
    
    // Make carousel focusable for keyboard nav
    this.container.setAttribute('tabindex', '0');
  }
  
  /**
   * Show specific slide
   */
  showSlide(index) {
    if (index < 0 || index >= this.activityConfigs.length) return;
    
    this.currentIndex = index;
    
    // Update slides
    const slides = this.container.querySelectorAll('.carousel-slide');
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
    
    // Update dots
    const dots = this.container.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    
    // Update nav buttons
    const prevBtn = this.container.querySelector('.carousel-btn.prev');
    const nextBtn = this.container.querySelector('.carousel-btn.next');
    
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index >= this.activityConfigs.length - 1;
    
    // Animate slide transition
    if (typeof anime !== 'undefined') {
      const activeSlide = this.container.querySelector('.carousel-slide.active');
      if (activeSlide) {
        anime({
          targets: activeSlide,
          opacity: [0.5, 1],
          translateX: [20, 0],
          duration: 250,
          easing: 'easeOutCubic'
        });
      }
    }
  }
  
  /**
   * Go to previous slide
   */
  prev() {
    if (this.currentIndex > 0) {
      this.showSlide(this.currentIndex - 1);
    }
  }
  
  /**
   * Go to next slide
   */
  next() {
    if (this.currentIndex < this.activityConfigs.length - 1) {
      this.showSlide(this.currentIndex + 1);
    }
  }
  
  // ============================================
  // PROGRESS TRACKING
  // ============================================
  
  /**
   * Handle activity completion
   */
  handleActivityComplete(index, result) {
    console.log(`🎠 Activity ${index} completed:`, result);
    
    // Update dot status
    const dot = this.container.querySelector(`.carousel-dot[data-index="${index}"]`);
    if (dot) {
      dot.classList.remove('incorrect', 'partial');
      if (result.correct || result.score >= 1.0) {
        dot.classList.add('correct');
      } else if (result.score >= 0.5) {
        dot.classList.add('partial');
      } else {
        dot.classList.add('incorrect');
      }
    }
    
    this.updateProgress();
    
    // Auto-advance after delay if correct
    if (result.correct && this.currentIndex < this.activityConfigs.length - 1) {
      setTimeout(() => this.next(), 1500);
    }
  }
  
  /**
   * Handle activity progress (partial updates)
   */
  handleActivityProgress(index, progress) {
    // Could update dot with progress indicator
    console.log(`🎠 Activity ${index} progress:`, progress);
  }
  
  /**
   * Update progress display
   */
  updateProgress() {
    // Count completed activities
    this.completedCount = this.activityInstances.filter(a => a?.isComplete).length;
    
    // Update progress text
    const completedEl = this.container.querySelector('.progress-completed');
    if (completedEl) {
      completedEl.textContent = this.completedCount;
    }
    
    // Add completion class if all done
    if (this.completedCount === this.activityConfigs.length && this.activityConfigs.length > 0) {
      this.container.classList.add('carousel-complete');
    }
  }
  
  // ============================================
  // PUBLIC API
  // ============================================
  
  /**
   * Get current activity instance
   */
  getCurrentActivity() {
    return this.activityInstances[this.currentIndex] || null;
  }
  
  /**
   * Get all activity instances
   */
  getActivities() {
    return this.activityInstances;
  }
  
  /**
   * Get completion status
   */
  getStatus() {
    return {
      total: this.activityConfigs.length,
      completed: this.completedCount,
      percent: this.activityConfigs.length > 0 
        ? Math.round((this.completedCount / this.activityConfigs.length) * 100)
        : 0,
      isComplete: this.completedCount === this.activityConfigs.length
    };
  }
  
  /**
   * Get all results from completed activities
   */
  getResults() {
    return this.activityInstances
      .filter(a => a?.result)
      .map(a => ({
        id: a.id,
        type: a.type,
        ...a.result
      }));
  }
  
  /**
   * Reset all activities
   */
  reset() {
    this.activityInstances.forEach(activity => {
      if (activity?.reset) {
        activity.reset();
      }
    });
    
    // Reset dots
    this.container.querySelectorAll('.carousel-dot').forEach(dot => {
      dot.classList.remove('correct', 'incorrect', 'partial');
    });
    
    this.completedCount = 0;
    this.container.classList.remove('carousel-complete');
    this.updateProgress();
    this.showSlide(0);
  }
  
  /**
   * Destroy carousel and cleanup
   */
  destroy() {
    // Remove event listener
    if (this._dataLoadedHandler) {
      window.removeEventListener('activityTrackerDataLoaded', this._dataLoadedHandler);
    }

    this.activityInstances.forEach(activity => {
      if (activity?.destroy) {
        activity.destroy();
      }
    });
    this.activityInstances = [];
    this.container.innerHTML = '';
  }
  
  // ============================================
  // UTILITY METHODS
  // ============================================
  
  /**
   * Get default title based on carousel type
   */
  getDefaultTitle() {
    switch (this.type) {
      case 'comprehension':
        return 'Check Your Understanding';
      case 'application':
        return 'Apply What You Learned';
      case 'synthesis':
        return 'Think Deeper';
      default:
        return 'Practice Activities';
    }
  }
  
  /**
   * Get icon based on carousel type
   */
  getTypeIcon() {
    switch (this.type) {
      case 'comprehension':
        return '🧠';
      case 'application':
        return '⚡';
      case 'synthesis':
        return '🔧';
      default:
        return '📝';
    }
  }
  
  extractCourseId() {
    const bodyEl = document.querySelector('[data-course]');
    if (bodyEl) return bodyEl.dataset.course;
    const pathMatch = window.location.pathname.match(/courses\/([^\/]+)/);
    return pathMatch ? pathMatch[1] : 'unknown';
  }
  
  extractLessonId() {
    const bodyEl = document.querySelector('[data-lesson]');
    if (bodyEl) return bodyEl.dataset.lesson;
    const pathMatch = window.location.pathname.match(/\/([^\/]+)\/index\.html/);
    return pathMatch ? pathMatch[1] : 'unknown';
  }
  
  // ============================================
  // STATIC FACTORY
  // ============================================
  
  /**
   * Create carousel from JSON data
   */
  static fromJSON(containerId, jsonConfig, options = {}) {
    return new ActivityCarousel(containerId, jsonConfig, options);
  }
  
  /**
   * Create multiple carousels for a section
   */
  static createForSection(sectionId, sectionData, options = {}) {
    const carousels = {};
    
    ['comprehension', 'application', 'synthesis'].forEach(type => {
      if (sectionData[type] && sectionData[type].length > 0) {
        const containerId = `${sectionId}-${type}-carousel`;
        carousels[type] = new ActivityCarousel(containerId, {
          type,
          sectionId,
          activities: sectionData[type]
        }, options);
      }
    });
    
    return carousels;
  }
}

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ActivityCarousel;
} else if (typeof window !== 'undefined') {
  window.ActivityCarousel = ActivityCarousel;
}
