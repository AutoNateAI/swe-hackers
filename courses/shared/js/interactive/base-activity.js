/**
 * BaseActivity - Abstract base class for all activity types
 * 
 * All activity types (quiz, sequence, connect-edges, etc.) extend this class
 * to ensure consistent API for the ActivityCarousel and ActivityTracker.
 * 
 * Subclasses MUST implement:
 *   - render()     - Draw the activity UI
 *   - getResult()  - Return { correct, score, response }
 *   - validate()   - Check if current state is submittable
 * 
 * Subclasses MAY override:
 *   - showFeedback(result) - Custom feedback display
 *   - reset()              - Reset to initial state
 *   - destroy()            - Cleanup when removed
 * 
 * Usage:
 *   class SequenceActivity extends BaseActivity {
 *     render() { ... }
 *     getResult() { return { correct: true, score: 1.0, response: {...} }; }
 *     validate() { return this.allItemsPlaced; }
 *   }
 *   ActivityRegistry.register('sequence', SequenceActivity);
 */

class BaseActivity {
  constructor(containerId, activityData, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.activityData = activityData;
    this.options = options;
    
    // Activity metadata
    this.id = activityData.id;
    this.type = activityData.type;
    this.points = activityData.points || 10;
    
    // State
    this.startTime = null;
    this.endTime = null;
    this.result = null;
    this.isComplete = false;
    this.attemptNumber = 0;
    
    // Context (from options or extracted from page)
    this.courseId = options.courseId || this.extractCourseId();
    this.lessonId = options.lessonId || this.extractLessonId();
    this.sectionId = options.sectionId || null;
    this.carouselType = options.carouselType || null; // comprehension | application | synthesis
    
    // Callbacks
    this.onComplete = options.onComplete || (() => {});
    this.onProgress = options.onProgress || (() => {});
    
    // Validate container exists
    if (!this.container) {
      console.error(`BaseActivity: Container '${containerId}' not found`);
      return;
    }
    
    // Add data attributes for ActivityTracker discovery
    this.container.setAttribute('data-activity', this.id);
    this.container.setAttribute('data-type', this.type);
    if (this.carouselType) {
      this.container.setAttribute('data-carousel', this.carouselType);
    }
    if (this.points) {
      this.container.setAttribute('data-points', this.points);
    }
  }
  
  // ============================================
  // ABSTRACT METHODS (must be implemented)
  // ============================================
  
  /**
   * Render the activity UI into the container
   * @abstract
   */
  render() {
    throw new Error('BaseActivity: render() must be implemented by subclass');
  }
  
  /**
   * Get the result of the activity
   * @abstract
   * @returns {{ correct: boolean, score: number, response: object, message?: string }}
   */
  getResult() {
    throw new Error('BaseActivity: getResult() must be implemented by subclass');
  }
  
  /**
   * Check if the activity is in a submittable state
   * @abstract
   * @returns {boolean}
   */
  validate() {
    throw new Error('BaseActivity: validate() must be implemented by subclass');
  }
  
  // ============================================
  // LIFECYCLE METHODS
  // ============================================
  
  /**
   * Initialize the activity (call after construction)
   */
  init() {
    this.render();
    this.bindEvents();
    this.loadPreviousAttempt();
    
    // Register with ActivityTracker for progress tracking
    if (window.ActivityTracker && window.ActivityTracker.registerActivity) {
      window.ActivityTracker.registerActivity(this);
    }
    
    return this;
  }
  
  /**
   * Start the activity (begin timing)
   */
  start() {
    if (this.startTime) return; // Already started
    
    this.startTime = Date.now();
    this.container.classList.add('activity-started');
    
    // Notify ActivityTracker
    if (window.ActivityTracker) {
      window.ActivityTracker.startActivity(this.id);
    }
    
    console.log(`🎯 Activity started: ${this.id}`);
  }
  
  /**
   * Submit the activity
   * @returns {Promise<{ correct: boolean, score: number, response: object }>}
   */
  async submit() {
    if (this.isComplete) {
      console.log(`🎯 Activity already complete: ${this.id}`);
      return this.result;
    }
    
    // Validate before submitting
    if (!this.validate()) {
      console.log(`🎯 Activity not valid for submission: ${this.id}`);
      this.showValidationError();
      return null;
    }
    
    // Get result from subclass
    this.endTime = Date.now();
    this.result = this.getResult();
    this.attemptNumber++;
    
    // Add timing data
    this.result.timeSpentMs = this.endTime - (this.startTime || this.endTime);
    this.result.attemptNumber = this.attemptNumber;
    
    console.log(`🎯 Activity submitted: ${this.id}`, this.result);
    
    // Save via ActivityTracker (handles offline caching)
    if (window.ActivityTracker) {
      try {
        await window.ActivityTracker.completeActivity(this.id, this.result);
      } catch (error) {
        console.error(`🎯 Error saving activity: ${this.id}`, error);
      }
    }
    
    // Mark complete and show feedback
    this.isComplete = this.result.correct || this.result.score >= 1.0;
    this.showFeedback(this.result);
    
    // Update container state
    this.container.classList.add('activity-submitted');
    if (this.isComplete) {
      this.container.classList.add('activity-completed');
    }
    
    // Callbacks
    this.onComplete(this.result);
    
    return this.result;
  }
  
  /**
   * Reset activity to initial state
   */
  reset() {
    this.startTime = null;
    this.endTime = null;
    this.result = null;
    this.isComplete = false;

    this.container.classList.remove(
      'activity-started',
      'activity-submitted',
      'activity-completed',
      'activity-error'
    );

    // Clear feedback
    const feedbackEl = this.container.querySelector('.activity-feedback');
    if (feedbackEl) {
      feedbackEl.innerHTML = '';
      feedbackEl.classList.remove('visible', 'correct', 'incorrect', 'partial');
    }

    // Clear previous attempt banner (but keep the data for reference)
    this.clearPreviousAttempt();

    // Re-render
    this.render();

    // Re-show previous attempt if we had one (so user still sees their previous answer)
    if (this.previousAttempt) {
      this.showPreviousAttempt(this.previousAttempt);
    }
  }
  
  /**
   * Cleanup when activity is removed
   */
  destroy() {
    // Override in subclass for cleanup (e.g., Cytoscape instances)
    this.container.innerHTML = '';
  }
  
  // ============================================
  // EVENT HANDLING
  // ============================================
  
  /**
   * Bind common event handlers
   */
  bindEvents() {
    // Start activity on first interaction
    this.container.addEventListener('click', () => this.start(), { once: true });
    this.container.addEventListener('focus', () => this.start(), { once: true, capture: true });
    
    // Submit button handler
    const submitBtn = this.container.querySelector('.activity-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submit());
    }
  }
  
  /**
   * Update submit button state based on validation
   */
  updateSubmitButton() {
    const submitBtn = this.container.querySelector('.activity-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = !this.validate();
    }
  }
  
  // ============================================
  // FEEDBACK & UI
  // ============================================
  
  /**
   * Show feedback after submission
   * @param {{ correct: boolean, score: number, message?: string }} result
   */
  showFeedback(result) {
    const feedbackEl = this.container.querySelector('.activity-feedback');
    if (!feedbackEl) return;
    
    // Determine feedback type
    let feedbackClass = 'incorrect';
    let icon = '💡';
    let defaultMessage = 'Not quite. Review and try again!';
    
    if (result.correct || result.score >= 1.0) {
      feedbackClass = 'correct';
      icon = '🎉';
      defaultMessage = 'Perfect!';
    } else if (result.score >= 0.5) {
      feedbackClass = 'partial';
      icon = '👍';
      defaultMessage = `Good effort! ${Math.round(result.score * 100)}% correct.`;
    }
    
    // Build feedback HTML
    const message = result.message || defaultMessage;
    const explanation = this.activityData.explanation || '';
    const pointsEarned = Math.round(this.points * result.score);
    
    feedbackEl.innerHTML = `
      <div class="feedback-content ${feedbackClass}">
        <span class="feedback-icon">${icon}</span>
        <span class="feedback-message">${message}</span>
        ${pointsEarned > 0 ? `<span class="feedback-points">+${pointsEarned} pts</span>` : ''}
      </div>
      ${explanation ? `<div class="feedback-explanation">${explanation}</div>` : ''}
    `;
    
    feedbackEl.classList.add('visible', feedbackClass);
    
    // Animate in
    if (typeof anime !== 'undefined') {
      anime({
        targets: feedbackEl,
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 300,
        easing: 'easeOutCubic'
      });
    }
  }
  
  /**
   * Show validation error (activity not ready for submission)
   */
  showValidationError() {
    const feedbackEl = this.container.querySelector('.activity-feedback');
    if (!feedbackEl) return;
    
    feedbackEl.innerHTML = `
      <div class="feedback-content validation-error">
        <span class="feedback-icon">⚠️</span>
        <span class="feedback-message">${this.getValidationMessage()}</span>
      </div>
    `;
    feedbackEl.classList.add('visible');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      feedbackEl.classList.remove('visible');
    }, 3000);
  }
  
  /**
   * Get validation message (override in subclass for specific messages)
   */
  getValidationMessage() {
    return 'Please complete all required fields before submitting.';
  }
  
  // ============================================
  // PERSISTENCE
  // ============================================

  /**
   * Load previous attempt from ActivityTracker (for restoring state)
   */
  async loadPreviousAttempt() {
    if (!window.ActivityTracker) return;

    // Wait for ActivityTracker data to be loaded
    if (window.ActivityTracker.waitForDataLoaded) {
      await window.ActivityTracker.waitForDataLoaded();
    }

    // Check if ActivityTracker has previous attempts for this activity
    const attemptCount = window.ActivityTracker.getAttemptCount(this.id);
    if (attemptCount > 0) {
      this.attemptNumber = attemptCount;

      // Get best and most recent attempts
      const bestAttempt = window.ActivityTracker.getBestAttempt?.(this.id);
      const mostRecentAttempt = window.ActivityTracker.getMostRecentAttempt?.(this.id);

      // If the best attempt was correct, mark as complete
      if (bestAttempt && (bestAttempt.correct || bestAttempt.score >= 1.0)) {
        this.isComplete = true;
        this.container.classList.add('activity-completed');
      }

      // Show the previous attempt (especially if wrong, so user can see what they tried)
      if (mostRecentAttempt) {
        this.previousAttempt = mostRecentAttempt;
        this.showPreviousAttempt(mostRecentAttempt);
      }
    }
  }

  /**
   * Show previous attempt to the user (especially wrong answers)
   * Override in subclasses for specific display logic
   * @param {object} attempt - The previous attempt data from Firestore
   */
  showPreviousAttempt(attempt) {
    if (!attempt) return;

    this.previousAttempt = attempt;

    // Add indicator that user has attempted before
    this.container.classList.add('has-previous-attempt');

    // Create or update previous attempt banner
    let banner = this.container.querySelector('.previous-attempt-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'previous-attempt-banner';
      // Insert at the top of the activity
      this.container.insertBefore(banner, this.container.firstChild);
    }

    // Determine the message based on whether it was correct or not
    const wasCorrect = attempt.correct || attempt.score >= 1.0;
    const wasPartial = !wasCorrect && attempt.score >= 0.5;

    if (wasCorrect) {
      banner.innerHTML = `
        <div class="previous-attempt-content correct">
          <span class="attempt-icon">✅</span>
          <span class="attempt-message">You answered this correctly!</span>
        </div>
      `;
      banner.classList.add('correct');
    } else {
      // Show the wrong answer so user knows what they tried before
      const previousAnswer = this.formatPreviousAnswer(attempt);
      banner.innerHTML = `
        <div class="previous-attempt-content ${wasPartial ? 'partial' : 'incorrect'}">
          <span class="attempt-icon">${wasPartial ? '🔄' : '💡'}</span>
          <span class="attempt-message">
            ${wasPartial ? 'Partially correct before' : 'You tried this before'}
            ${previousAnswer ? ` — <span class="previous-answer">${previousAnswer}</span>` : ''}
          </span>
          <span class="attempt-hint">Try a different answer!</span>
        </div>
      `;
      banner.classList.add(wasPartial ? 'partial' : 'incorrect');
    }

    // Add styles if not already present
    this.addPreviousAttemptStyles();
  }

  /**
   * Format the previous answer for display
   * Override in subclasses for specific formatting
   * @param {object} attempt - The attempt data
   * @returns {string} Formatted answer text
   */
  formatPreviousAnswer(attempt) {
    if (!attempt.response) return '';

    // Handle different response structures
    if (attempt.response.selectedText) {
      return `"${attempt.response.selectedText}"`;
    }
    if (attempt.response.selected !== undefined && attempt.response.selected !== null) {
      return `Option ${attempt.response.selected + 1}`;
    }
    if (attempt.response.userAnswer) {
      return `"${attempt.response.userAnswer}"`;
    }
    if (attempt.response.placements) {
      // For drag-drop, show placement summary
      const placementCount = Object.keys(attempt.response.placements).length;
      const correctCount = attempt.response.correctCount || 0;
      return `${correctCount}/${placementCount} matched`;
    }
    if (attempt.response.text) {
      // Truncate long text responses
      const text = attempt.response.text;
      return text.length > 50 ? `"${text.substring(0, 47)}..."` : `"${text}"`;
    }

    return '';
  }

  /**
   * Add CSS styles for previous attempt banner
   */
  addPreviousAttemptStyles() {
    if (document.getElementById('previous-attempt-styles')) return;

    const style = document.createElement('style');
    style.id = 'previous-attempt-styles';
    style.textContent = `
      .previous-attempt-banner {
        margin-bottom: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        animation: slideIn 0.3s ease;
      }

      .previous-attempt-banner.correct {
        background: rgba(77, 182, 172, 0.15);
        border: 1px solid rgba(77, 182, 172, 0.3);
      }

      .previous-attempt-banner.partial {
        background: rgba(255, 183, 77, 0.15);
        border: 1px solid rgba(255, 183, 77, 0.3);
      }

      .previous-attempt-banner.incorrect {
        background: rgba(121, 134, 203, 0.15);
        border: 1px solid rgba(121, 134, 203, 0.3);
      }

      .previous-attempt-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .previous-attempt-content .attempt-icon {
        font-size: 1rem;
      }

      .previous-attempt-content .attempt-message {
        color: var(--text-primary, #e8e8f0);
      }

      .previous-attempt-content .previous-answer {
        color: var(--accent-stone, #7986cb);
        font-weight: 500;
      }

      .previous-attempt-content .attempt-hint {
        color: var(--text-secondary, #a8a8b8);
        font-size: 0.8rem;
        margin-left: auto;
      }

      .has-previous-attempt .activity-submit-btn {
        /* Subtle indicator that this can be retried */
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Clear the previous attempt banner (e.g., when resetting)
   */
  clearPreviousAttempt() {
    const banner = this.container.querySelector('.previous-attempt-banner');
    if (banner) {
      banner.remove();
    }
    this.container.classList.remove('has-previous-attempt');
    this.previousAttempt = null;
  }
  
  // ============================================
  // UTILITY METHODS
  // ============================================
  
  /**
   * Extract course ID from page
   */
  extractCourseId() {
    const bodyEl = document.querySelector('[data-course]');
    if (bodyEl) return bodyEl.dataset.course;
    
    const pathMatch = window.location.pathname.match(/courses\/([^\/]+)/);
    return pathMatch ? pathMatch[1] : 'unknown';
  }
  
  /**
   * Extract lesson ID from page
   */
  extractLessonId() {
    const bodyEl = document.querySelector('[data-lesson]');
    if (bodyEl) return bodyEl.dataset.lesson;
    
    const pathMatch = window.location.pathname.match(/\/([^\/]+)\/index\.html/);
    return pathMatch ? pathMatch[1] : 'unknown';
  }
  
  /**
   * Helper: Create element with classes
   */
  createElement(tag, className, innerHTML = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
  }
  
  /**
   * Helper: Wait for specified milliseconds
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Helper: Shuffle array (Fisher-Yates)
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// ============================================
// ACTIVITY REGISTRY
// ============================================

/**
 * Registry for activity types
 * Allows dynamic registration and instantiation of activity classes
 */
const ActivityRegistry = {
  _types: {},
  
  /**
   * Register an activity type
   * @param {string} type - Activity type name (e.g., 'quiz', 'sequence')
   * @param {class} ActivityClass - Class extending BaseActivity
   */
  register(type, ActivityClass) {
    if (this._types[type]) {
      console.warn(`ActivityRegistry: Overwriting existing type '${type}'`);
    }
    this._types[type] = ActivityClass;
    console.log(`🎯 Registered activity type: ${type}`);
  },
  
  /**
   * Get an activity class by type
   * @param {string} type - Activity type name
   * @returns {class|null}
   */
  get(type) {
    return this._types[type] || null;
  },
  
  /**
   * Create an activity instance
   * @param {string} type - Activity type name
   * @param {string} containerId - DOM container ID
   * @param {object} activityData - Activity configuration
   * @param {object} options - Additional options
   * @returns {BaseActivity|null}
   */
  create(type, containerId, activityData, options = {}) {
    const ActivityClass = this.get(type);
    if (!ActivityClass) {
      console.error(`ActivityRegistry: Unknown activity type '${type}'`);
      return null;
    }
    
    return new ActivityClass(containerId, activityData, options);
  },
  
  /**
   * Check if a type is registered
   * @param {string} type
   * @returns {boolean}
   */
  has(type) {
    return !!this._types[type];
  },
  
  /**
   * Get all registered types
   * @returns {string[]}
   */
  getTypes() {
    return Object.keys(this._types);
  }
};

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BaseActivity, ActivityRegistry };
} else if (typeof window !== 'undefined') {
  window.BaseActivity = BaseActivity;
  window.ActivityRegistry = ActivityRegistry;
}
