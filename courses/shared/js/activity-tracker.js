/**
 * Activity Tracker for AutoNateAI Learning Hub
 * Tracks user engagement with lesson activities (quizzes, drag-drop, code challenges)
 * Supports offline caching with sync when back online
 */

const ActivityTracker = {
  // State
  courseId: null,
  lessonId: null,
  activities: [],
  activityTimers: {},
  correctAnswers: {}, // Cached from Firestore
  attemptCounts: {},
  isInitialized: false,
  
  // localStorage keys
  QUEUE_KEY: 'activityTracker_queue',
  CACHE_KEY: 'activityTracker_answerCache',
  
  /**
   * Initialize the Activity Tracker
   * @param {string} courseId - Course identifier (e.g., 'apprentice', 'daily')
   * @param {string} lessonId - Lesson identifier (e.g., 'ch1-stone', '2024-01-15')
   */
  async init(courseId, lessonId) {
    this.courseId = courseId;
    this.lessonId = lessonId;
    this.activities = [];
    this.activityTimers = {};
    this.attemptCounts = {};
    
    console.log('🎯 ActivityTracker initializing:', { courseId, lessonId });
    
    // Discover activities on the page
    this.discoverActivities();
    
    // Load cached correct answers
    this.loadAnswerCache();
    
    // Load attempt counts from Firestore
    await this.loadAttemptCounts();
    
    // Set up online/offline listeners
    this.setupConnectivityListeners();
    
    // Try to sync any queued attempts
    this.syncQueuedAttempts();
    
    this.isInitialized = true;
    console.log('🎯 ActivityTracker initialized:', {
      activities: this.activities.length,
      cachedAnswers: Object.keys(this.correctAnswers).length
    });
  },
  
  /**
   * Discover activities on the page via data attributes
   */
  discoverActivities() {
    const activityElements = document.querySelectorAll('[data-activity]');
    
    activityElements.forEach(el => {
      const activity = {
        id: el.dataset.activity,
        type: el.dataset.type || 'quiz',
        points: parseInt(el.dataset.points) || 10,
        timeLimit: el.dataset.timeLimit ? parseInt(el.dataset.timeLimit) : null,
        element: el
      };
      
      this.activities.push(activity);
      console.log('🎯 Discovered activity:', activity.id, activity.type);
      
      // Attach event listeners based on type
      this.attachActivityListeners(activity);
    });
    
    console.log('🎯 Total activities discovered:', this.activities.length);
  },
  
  /**
   * Attach event listeners to an activity element
   */
  attachActivityListeners(activity) {
    const el = activity.element;
    
    // Listen for activity start (focus, click on container)
    el.addEventListener('click', () => {
      if (!this.activityTimers[activity.id]) {
        this.startActivity(activity.id);
      }
    });
    
    // Listen for quiz option selection
    if (activity.type === 'quiz') {
      const options = el.querySelectorAll('.quiz-option');
      options.forEach(option => {
        option.addEventListener('click', () => {
          // Highlight selected option
          options.forEach(o => o.classList.remove('selected'));
          option.classList.add('selected');
          
          // Enable submit button
          const submitBtn = el.querySelector('.quiz-btn');
          if (submitBtn) submitBtn.disabled = false;
        });
      });
      
      // Listen for submit
      const submitBtn = el.querySelector('.quiz-btn');
      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          const selected = el.querySelector('.quiz-option.selected');
          if (selected) {
            const answer = selected.dataset.value;
            this.submitQuizAnswer(activity.id, answer);
          }
        });
      }
    }
  },
  
  /**
   * Start timing an activity
   */
  startActivity(activityId) {
    if (this.activityTimers[activityId]) return;
    
    this.activityTimers[activityId] = {
      startTime: Date.now(),
      activityId
    };
    
    console.log('🎯 Activity started:', activityId);
    
    // Check for time limit (daily challenges)
    const activity = this.activities.find(a => a.id === activityId);
    if (activity?.timeLimit && this.courseId === 'daily') {
      this.startTimer(activityId, activity.timeLimit);
    }
  },
  
  /**
   * Start a countdown timer (for daily challenges)
   */
  startTimer(activityId, seconds) {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return;
    
    let remaining = seconds;
    
    // Create/update timer display
    let timerEl = activity.element.querySelector('.activity-timer');
    if (!timerEl) {
      timerEl = document.createElement('div');
      timerEl.className = 'activity-timer';
      activity.element.prepend(timerEl);
    }
    
    const updateTimer = () => {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerEl.textContent = `⏱️ ${mins}:${secs.toString().padStart(2, '0')}`;
      
      if (remaining <= 10) {
        timerEl.classList.add('warning');
      }
    };
    
    updateTimer();
    
    const interval = setInterval(() => {
      remaining--;
      updateTimer();
      
      if (remaining <= 0) {
        clearInterval(interval);
        this.handleTimerExpired(activityId);
      }
    }, 1000);
    
    this.activityTimers[activityId].interval = interval;
  },
  
  /**
   * Handle timer expiration
   */
  handleTimerExpired(activityId) {
    console.log('🎯 Timer expired:', activityId);
    
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return;
    
    // Auto-submit with current state
    if (activity.type === 'quiz') {
      const selected = activity.element.querySelector('.quiz-option.selected');
      const answer = selected ? selected.dataset.value : null;
      this.submitQuizAnswer(activityId, answer, true);
    }
  },
  
  /**
   * Submit a quiz answer
   */
  async submitQuizAnswer(activityId, selectedAnswer, timedOut = false) {
    const timer = this.activityTimers[activityId];
    const timeSpentMs = timer ? Date.now() - timer.startTime : 0;
    
    // Clear any running timer
    if (timer?.interval) {
      clearInterval(timer.interval);
    }
    
    // Get correct answer (from cache or Firestore)
    const correctAnswer = await this.getCorrectAnswer(activityId);
    
    // Calculate score
    const correct = selectedAnswer === correctAnswer;
    const score = correct ? 1.0 : 0.0;
    
    // Build attempt data
    const attemptData = {
      activityId,
      activityType: 'quiz',
      courseId: this.courseId,
      lessonId: this.lessonId,
      attemptNumber: (this.attemptCounts[activityId] || 0) + 1,
      correct,
      score,
      timeSpentMs,
      timedOut,
      response: {
        selected: selectedAnswer
      },
      startedAt: timer?.startTime ? new Date(timer.startTime).toISOString() : null,
      completedAt: new Date().toISOString()
    };
    
    console.log('🎯 Submitting quiz answer:', attemptData);
    
    // Update attempt count
    this.attemptCounts[activityId] = attemptData.attemptNumber;
    
    // Save (with offline support)
    await this.saveAttemptWithCache(attemptData);
    
    // Show feedback
    this.showQuizFeedback(activityId, correct, correctAnswer);
    
    // Clean up timer
    delete this.activityTimers[activityId];
    
    return { correct, score, attemptNumber: attemptData.attemptNumber };
  },
  
  /**
   * Show quiz feedback UI
   */
  showQuizFeedback(activityId, correct, correctAnswer) {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return;
    
    const el = activity.element;
    const feedbackEl = el.querySelector('.quiz-feedback');
    const options = el.querySelectorAll('.quiz-option');
    
    // Mark correct/incorrect options
    options.forEach(option => {
      const value = option.dataset.value;
      if (value === correctAnswer) {
        option.classList.add('correct');
      } else if (option.classList.contains('selected') && !correct) {
        option.classList.add('incorrect');
      }
      option.style.pointerEvents = 'none'; // Disable further clicks
    });
    
    // Show feedback message
    if (feedbackEl) {
      const msg = correct 
        ? feedbackEl.dataset.correctMsg || '✅ Correct!'
        : feedbackEl.dataset.incorrectMsg || '❌ Not quite. Try again next time!';
      feedbackEl.textContent = msg;
      feedbackEl.classList.add('visible', correct ? 'correct' : 'incorrect');
    }
    
    // Update button
    const submitBtn = el.querySelector('.quiz-btn');
    if (submitBtn) {
      submitBtn.textContent = correct ? '✅ Correct!' : '❌ Incorrect';
      submitBtn.disabled = true;
      submitBtn.classList.add(correct ? 'correct' : 'incorrect');
    }
  },
  
  /**
   * Get correct answer (from cache or Firestore)
   */
  async getCorrectAnswer(activityId) {
    // Check cache first
    if (this.correctAnswers[activityId]) {
      return this.correctAnswers[activityId];
    }
    
    // Fetch from Firestore
    try {
      if (window.DataService) {
        const activityData = await window.DataService.getActivityDefinition(activityId);
        if (activityData?.correctAnswer) {
          this.correctAnswers[activityId] = activityData.correctAnswer;
          this.saveAnswerCache();
          return activityData.correctAnswer;
        }
      }
    } catch (error) {
      console.error('🎯 Error fetching correct answer:', error);
    }
    
    // Fallback: check data-answer attribute (legacy support)
    const activity = this.activities.find(a => a.id === activityId);
    if (activity?.element) {
      const legacyAnswer = activity.element.closest('[data-answer]')?.dataset.answer ||
                          activity.element.dataset.answer;
      if (legacyAnswer) {
        console.log('🎯 Using legacy data-answer attribute');
        return legacyAnswer;
      }
    }
    
    console.warn('🎯 No correct answer found for:', activityId);
    return null;
  },
  
  /**
   * Save attempt with offline caching support
   */
  async saveAttemptWithCache(attemptData) {
    // Generate local ID for tracking
    const localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    attemptData.localId = localId;
    
    // Always cache first (instant)
    this.cacheAttempt(attemptData);
    
    try {
      // Try to save to Firestore
      if (window.DataService) {
        await window.DataService.saveActivityAttempt(attemptData);
        console.log('🎯 Attempt saved to Firestore:', attemptData.activityId);
        
        // Success! Remove from cache
        this.removeCachedAttempt(localId);
      }
    } catch (error) {
      if (this.isOfflineError(error)) {
        // Queue for later sync
        this.queueForSync(attemptData);
        this.showToast('📴 Saved offline - will sync when connected');
        console.log('🎯 Attempt queued for sync:', attemptData.activityId);
      } else {
        console.error('🎯 Error saving attempt:', error);
        throw error;
      }
    }
  },
  
  /**
   * Check if error is due to being offline
   */
  isOfflineError(error) {
    return !navigator.onLine || 
           error.code === 'unavailable' ||
           error.message?.includes('network') ||
           error.message?.includes('offline');
  },
  
  /**
   * Cache attempt to localStorage
   */
  cacheAttempt(attemptData) {
    const queue = this.getQueue();
    queue.push({
      localId: attemptData.localId,
      attemptData,
      queuedAt: new Date().toISOString()
    });
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
  },
  
  /**
   * Remove cached attempt by localId
   */
  removeCachedAttempt(localId) {
    const queue = this.getQueue().filter(item => item.localId !== localId);
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
  },
  
  /**
   * Queue attempt for later sync
   */
  queueForSync(attemptData) {
    // Already in cache, just leave it there
    console.log('🎯 Attempt queued for sync:', attemptData.localId);
  },
  
  /**
   * Get queue from localStorage
   */
  getQueue() {
    try {
      return JSON.parse(localStorage.getItem(this.QUEUE_KEY)) || [];
    } catch {
      return [];
    }
  },
  
  /**
   * Sync queued attempts when back online
   */
  async syncQueuedAttempts() {
    const queue = this.getQueue();
    if (queue.length === 0) return;
    
    if (!navigator.onLine) {
      console.log('🎯 Still offline, cannot sync');
      return;
    }
    
    console.log(`🎯 Syncing ${queue.length} queued attempts...`);
    
    let synced = 0;
    for (const item of queue) {
      try {
        if (window.DataService) {
          await window.DataService.saveActivityAttempt(item.attemptData);
          this.removeCachedAttempt(item.localId);
          synced++;
          console.log(`🎯 Synced: ${item.attemptData.activityId}`);
        }
      } catch (error) {
        console.error(`🎯 Failed to sync: ${item.localId}`, error);
        // Keep in queue, try again later
      }
    }
    
    if (synced > 0) {
      // Recalculate stats after batch sync
      const courseIds = [...new Set(queue.map(q => q.attemptData.courseId))];
      for (const courseId of courseIds) {
        if (window.DataService) {
          await window.DataService.recalculateActivityStats(courseId);
        }
      }
      
      this.showToast(`✅ Synced ${synced} activities!`);
    }
  },
  
  /**
   * Set up online/offline listeners
   */
  setupConnectivityListeners() {
    window.addEventListener('online', () => {
      console.log('🎯 Back online, syncing...');
      this.syncQueuedAttempts();
    });
    
    window.addEventListener('offline', () => {
      console.log('🎯 Gone offline');
    });
  },
  
  /**
   * Load attempt counts from Firestore
   */
  async loadAttemptCounts() {
    if (!window.DataService || !window.AuthService?.getUser()) return;
    
    try {
      const attempts = await window.DataService.getActivityAttempts({
        courseId: this.courseId,
        lessonId: this.lessonId
      });
      
      // Count attempts per activity
      attempts.forEach(attempt => {
        const current = this.attemptCounts[attempt.activityId] || 0;
        this.attemptCounts[attempt.activityId] = Math.max(current, attempt.attemptNumber || 1);
      });
      
      console.log('🎯 Loaded attempt counts:', this.attemptCounts);
    } catch (error) {
      console.error('🎯 Error loading attempt counts:', error);
    }
  },
  
  /**
   * Save answer cache to localStorage
   */
  saveAnswerCache() {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.correctAnswers));
  },
  
  /**
   * Load answer cache from localStorage
   */
  loadAnswerCache() {
    try {
      this.correctAnswers = JSON.parse(localStorage.getItem(this.CACHE_KEY)) || {};
    } catch {
      this.correctAnswers = {};
    }
  },
  
  /**
   * Show toast notification
   */
  showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.activity-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'activity-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Add styles if not present
    if (!document.getElementById('activity-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'activity-toast-styles';
      style.textContent = `
        .activity-toast {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-secondary, #1a1a2e);
          color: var(--text-primary, #fff);
          padding: 1rem 2rem;
          border-radius: 8px;
          border: 1px solid var(--border-color, #333);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          animation: toastIn 0.3s ease, toastOut 0.3s ease 3s forwards;
          z-index: 9999;
        }
        @keyframes toastIn {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes toastOut {
          to { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        }
        .activity-timer {
          text-align: center;
          font-size: 1.25rem;
          font-weight: 600;
          padding: 0.5rem;
          background: var(--bg-tertiary, #252538);
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .activity-timer.warning {
          color: #ff6b6b;
          animation: pulse 0.5s ease infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `;
      document.head.appendChild(style);
    }
    
    setTimeout(() => toast.remove(), 4000);
  },
  
  /**
   * Get attempt count for an activity
   */
  getAttemptCount(activityId) {
    return this.attemptCounts[activityId] || 0;
  },
  
  /**
   * Check if activity has been completed (any attempt)
   */
  hasCompleted(activityId) {
    return this.getAttemptCount(activityId) > 0;
  }
};

// Make available globally
window.ActivityTracker = ActivityTracker;

