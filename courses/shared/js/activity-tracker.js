/**
 * Activity Tracker for AutoNateAI Learning Hub
 * Tracks user engagement with lesson activities (quizzes, drag-drop, code challenges)
 * Supports offline caching with sync when back online
 */

const ActivityTracker = {
  // State
  courseId: null,
  lessonId: null,
  activities: [],              // Legacy discovered activities
  registeredActivities: {},    // BaseActivity instances by ID
  completedActivities: {},     // Track completed activity IDs
  activityTimers: {},
  correctAnswers: {},          // Cached from Firestore
  attemptCounts: {},
  isInitialized: false,
  lessonProgressThreshold: 0.9, // 90% to mark lesson complete

  // Attempt tracking (populated by loadAttemptCounts)
  allAttempts: [],             // All attempts from Firestore
  bestAttempts: {},            // Best attempt per activity
  mostRecentAttempts: {},      // Most recent attempt per activity
  _dataLoaded: false,          // Flag for data loaded state

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

    // Reset attempt tracking state
    this.allAttempts = [];
    this.bestAttempts = {};
    this.mostRecentAttempts = {};
    this._dataLoaded = false;

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
  
  // ============================================
  // PROGRESS TRACKING (BaseActivity Integration)
  // ============================================
  
  /**
   * Register a BaseActivity instance for progress tracking
   * @param {BaseActivity} activity - The activity instance
   */
  registerActivity(activity) {
    if (!activity || !activity.id) {
      console.warn('🎯 Cannot register activity without ID');
      return;
    }
    
    this.registeredActivities[activity.id] = {
      id: activity.id,
      type: activity.type,
      carouselType: activity.carouselType,
      instance: activity,
      completed: false,
      attempts: 0,
      bestScore: 0
    };
    
    // Check if already completed (from previous session)
    if (this.attemptCounts[activity.id] > 0) {
      this.registeredActivities[activity.id].completed = true;
      this.registeredActivities[activity.id].attempts = this.attemptCounts[activity.id];
      this.completedActivities[activity.id] = true;
    }
    
    console.log('🎯 Activity registered:', activity.id, `(${Object.keys(this.registeredActivities).length} total)`);
  },
  
  /**
   * Mark an activity as completed and update progress
   * @param {string} activityId - The activity ID
   * @param {number} score - The score achieved
   */
  markActivityCompleted(activityId, score) {
    if (this.registeredActivities[activityId]) {
      const reg = this.registeredActivities[activityId];
      reg.completed = true;
      reg.attempts++;
      reg.bestScore = Math.max(reg.bestScore, score);
      this.completedActivities[activityId] = true;
    }
    
    // Check lesson progress
    this.checkLessonProgress();
  },
  
  /**
   * Get current lesson progress
   * @returns {{ completed: number, total: number, percent: number, isComplete: boolean }}
   */
  getProgress() {
    const total = Object.keys(this.registeredActivities).length;
    const completed = Object.keys(this.completedActivities).length;
    const percent = total > 0 ? completed / total : 0;
    const isComplete = percent >= this.lessonProgressThreshold;
    
    return { completed, total, percent, isComplete };
  },
  
  /**
   * Check if lesson should be marked complete and update Firestore
   */
  async checkLessonProgress() {
    const progress = this.getProgress();
    
    console.log('🎯 Lesson progress:', `${progress.completed}/${progress.total}`, `(${Math.round(progress.percent * 100)}%)`);
    
    if (progress.isComplete && window.DataService) {
      console.log('🎉 Lesson complete! Updating progress...');
      await this.updateLessonProgress(progress);
    }
  },
  
  /**
   * Update lesson progress in Firestore
   * @param {object} progress - Progress data
   */
  async updateLessonProgress(progress) {
    if (!window.DataService) return;
    
    try {
      await window.DataService.updateLessonProgress(this.courseId, this.lessonId, {
        activitiesCompleted: progress.completed,
        activitiesTotal: progress.total,
        percentComplete: progress.percent,
        completedAt: progress.isComplete ? new Date().toISOString() : null,
        lastActivityAt: new Date().toISOString()
      });
      console.log('🎯 Lesson progress saved to Firestore');
    } catch (error) {
      console.error('🎯 Error saving lesson progress:', error);
    }
  },
  
  /**
   * Get all registered activities
   * @returns {object} Map of activity ID to registration data
   */
  getRegisteredActivities() {
    return this.registeredActivities;
  },
  
  /**
   * Reset an activity for re-attempt
   * @param {string} activityId - The activity ID to reset
   */
  resetActivity(activityId) {
    const reg = this.registeredActivities[activityId];
    if (reg && reg.instance && typeof reg.instance.reset === 'function') {
      reg.instance.reset();
      console.log('🎯 Activity reset for re-attempt:', activityId);
    }
  },
  
  /**
   * Generic method to complete any activity (called by BaseActivity)
   * @param {string} activityId - Unique activity identifier
   * @param {object} result - Result from BaseActivity.getResult()
   */
  async completeActivity(activityId, result) {
    if (!this.isInitialized) {
      console.warn('🎯 ActivityTracker not initialized, cannot save activity');
      return;
    }
    
    const timer = this.activityTimers[activityId];
    const timeSpentMs = result.timeSpentMs || (timer ? Date.now() - timer.startTime : 0);
    
    const attemptData = {
      activityId,
      activityType: result.activityType || 'activity',
      courseId: this.courseId,
      lessonId: this.lessonId,
      attemptNumber: (this.attemptCounts[activityId] || 0) + 1,
      correct: result.correct || false,
      score: result.score || 0,
      timeSpentMs,
      response: result.response || {},
      startedAt: timer?.startTime ? new Date(timer.startTime).toISOString() : null,
      completedAt: new Date().toISOString()
    };
    
    console.log('🎯 Completing activity:', attemptData);
    
    // Update attempt count
    this.attemptCounts[activityId] = attemptData.attemptNumber;
    
    // Save (with offline support)
    await this.saveAttemptWithCache(attemptData);
    
    // Update progress tracking
    this.markActivityCompleted(activityId, attemptData.score);
    
    // Clean up timer
    delete this.activityTimers[activityId];
    
    return { correct: attemptData.correct, score: attemptData.score, attemptNumber: attemptData.attemptNumber };
  },
  
  /**
   * Start tracking time for an activity
   * @param {string} activityId - Unique activity identifier
   */
  startActivity(activityId) {
    this.activityTimers[activityId] = {
      startTime: Date.now()
    };
    console.log('🎯 Started activity timer:', activityId);
  },
  
  /**
   * Check if an activity has been completed
   * @param {string} activityId - Unique activity identifier
   */
  hasCompleted(activityId) {
    return (this.attemptCounts[activityId] || 0) > 0;
  },
  
  /**
   * Get attempt count for an activity
   * @param {string} activityId - Unique activity identifier
   */
  getAttemptCount(activityId) {
    return this.attemptCounts[activityId] || 0;
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
    
    // Type-specific listeners
    switch (activity.type) {
      case 'quiz':
        this.setupQuizListeners(activity);
        break;
      case 'dragdrop':
        this.setupDragDropListeners(activity);
        break;
      case 'code':
        this.setupCodeChallengeListeners(activity);
        break;
      case 'demo':
        this.setupDemoListeners(activity);
        break;
      case 'challenge':
        this.setupChallengeListeners(activity);
        break;
    }
  },
  
  /**
   * Setup quiz listeners
   */
  setupQuizListeners(activity) {
    const el = activity.element;
    const options = el.querySelectorAll('.quiz-option');
    
    options.forEach(option => {
      option.addEventListener('click', () => {
        options.forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        
        const submitBtn = el.querySelector('.quiz-btn, .activity-btn');
        if (submitBtn) submitBtn.disabled = false;
      });
    });
    
    const submitBtn = el.querySelector('.quiz-btn, .activity-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const selected = el.querySelector('.quiz-option.selected');
        if (selected) {
          this.submitQuizAnswer(activity.id, selected.dataset.value);
        }
      });
    }
  },
  
  /**
   * Setup drag and drop listeners
   */
  setupDragDropListeners(activity) {
    const el = activity.element;
    const draggables = el.querySelectorAll('[data-draggable]');
    const dropzones = el.querySelectorAll('[data-dropzone]');
    
    // Track placements
    activity.placements = {};
    
    draggables.forEach(draggable => {
      draggable.setAttribute('draggable', 'true');
      
      draggable.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', draggable.dataset.draggable);
        draggable.classList.add('dragging');
      });
      
      draggable.addEventListener('dragend', () => {
        draggable.classList.remove('dragging');
      });
    });
    
    dropzones.forEach(dropzone => {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
      
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
      });
      
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        
        const draggedId = e.dataTransfer.getData('text/plain');
        const draggedEl = el.querySelector(`[data-draggable="${draggedId}"]`);
        
        if (draggedEl) {
          // Remove from previous dropzone
          const prevZone = Object.entries(activity.placements)
            .find(([zone, item]) => item === draggedId);
          if (prevZone) {
            delete activity.placements[prevZone[0]];
          }
          
          // Place in new dropzone
          const zoneId = dropzone.dataset.dropzone;
          activity.placements[zoneId] = draggedId;
          
          // Visual feedback
          dropzone.classList.add('filled');
          dropzone.innerHTML = '';
          dropzone.appendChild(draggedEl.cloneNode(true));
          draggedEl.classList.add('placed');
          
          // Check if all zones are filled
          this.checkDragDropComplete(activity);
        }
      });
    });
    
    // Submit button
    const submitBtn = el.querySelector('.activity-btn, .dragdrop-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.submitDragDropAnswer(activity.id, activity.placements);
      });
    }
  },
  
  /**
   * Check if drag and drop is complete
   */
  checkDragDropComplete(activity) {
    const el = activity.element;
    const dropzones = el.querySelectorAll('[data-dropzone]');
    const allFilled = Array.from(dropzones).every(zone => 
      activity.placements[zone.dataset.dropzone]
    );
    
    const submitBtn = el.querySelector('.activity-btn, .dragdrop-btn');
    if (submitBtn) {
      submitBtn.disabled = !allFilled;
    }
  },
  
  /**
   * Submit drag and drop answer
   */
  async submitDragDropAnswer(activityId, placements) {
    const timer = this.activityTimers[activityId];
    const timeSpentMs = timer ? Date.now() - timer.startTime : 0;
    
    // Get correct answer
    const correctAnswer = await this.getCorrectAnswer(activityId);
    
    // Calculate score (partial credit)
    let correctCount = 0;
    let totalZones = 0;
    
    if (correctAnswer && correctAnswer.placements) {
      totalZones = Object.keys(correctAnswer.placements).length;
      for (const [zone, correctItem] of Object.entries(correctAnswer.placements)) {
        if (placements[zone] === correctItem) {
          correctCount++;
        }
      }
    } else {
      // Fallback: check data-correct attributes
      const activity = this.activities.find(a => a.id === activityId);
      if (activity) {
        const dropzones = activity.element.querySelectorAll('[data-dropzone]');
        totalZones = dropzones.length;
        dropzones.forEach(zone => {
          const zoneId = zone.dataset.dropzone;
          const correctItem = zone.dataset.correct;
          if (placements[zoneId] === correctItem) {
            correctCount++;
          }
        });
      }
    }
    
    const score = totalZones > 0 ? correctCount / totalZones : 0;
    const correct = score === 1.0;
    
    const attemptData = {
      activityId,
      activityType: 'dragdrop',
      courseId: this.courseId,
      lessonId: this.lessonId,
      attemptNumber: (this.attemptCounts[activityId] || 0) + 1,
      correct,
      score,
      timeSpentMs,
      response: { placements, correctCount, totalZones },
      startedAt: timer?.startTime ? new Date(timer.startTime).toISOString() : null,
      completedAt: new Date().toISOString()
    };
    
    console.log('🎯 Submitting drag & drop answer:', attemptData);
    
    this.attemptCounts[activityId] = attemptData.attemptNumber;
    await this.saveAttemptWithCache(attemptData);
    this.showDragDropFeedback(activityId, score, correctCount, totalZones);
    delete this.activityTimers[activityId];
    
    return { correct, score, attemptNumber: attemptData.attemptNumber };
  },
  
  /**
   * Show drag and drop feedback
   */
  showDragDropFeedback(activityId, score, correctCount, totalZones) {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return;
    
    const el = activity.element;
    const feedbackEl = el.querySelector('.activity-feedback, .dragdrop-feedback');
    
    // Visual feedback on dropzones
    const dropzones = el.querySelectorAll('[data-dropzone]');
    dropzones.forEach(zone => {
      const zoneId = zone.dataset.dropzone;
      const correctItem = zone.dataset.correct;
      const placedItem = activity.placements[zoneId];
      
      if (placedItem === correctItem) {
        zone.classList.add('correct');
      } else {
        zone.classList.add('incorrect');
      }
    });
    
    // Feedback message
    if (feedbackEl) {
      const msg = score === 1 
        ? '🎉 Perfect! All matches correct!'
        : `You got ${correctCount}/${totalZones} correct. ${score >= 0.5 ? 'Good effort!' : 'Try again!'}`;
      feedbackEl.textContent = msg;
      feedbackEl.classList.add('visible', score === 1 ? 'correct' : 'partial');
    }
    
    // Update button
    const submitBtn = el.querySelector('.activity-btn, .dragdrop-btn');
    if (submitBtn) {
      submitBtn.textContent = score === 1 ? '✅ Perfect!' : `${Math.round(score * 100)}% Correct`;
      submitBtn.disabled = true;
      submitBtn.classList.add(score === 1 ? 'correct' : 'partial');
    }
  },
  
  /**
   * Setup code challenge listeners
   */
  setupCodeChallengeListeners(activity) {
    const el = activity.element;
    const codeInput = el.querySelector('textarea, .code-input, [contenteditable]');
    const runBtn = el.querySelector('.run-btn, .activity-btn');
    
    if (codeInput) {
      codeInput.addEventListener('input', () => {
        if (runBtn) {
          runBtn.disabled = codeInput.value?.trim().length === 0 && 
                           codeInput.textContent?.trim().length === 0;
        }
      });
    }
    
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        const code = codeInput?.value || codeInput?.textContent || '';
        this.submitCodeChallenge(activity.id, code);
      });
    }
  },
  
  /**
   * Submit code challenge
   */
  async submitCodeChallenge(activityId, code) {
    const timer = this.activityTimers[activityId];
    const timeSpentMs = timer ? Date.now() - timer.startTime : 0;
    
    // Get expected output/tests
    const activity = this.activities.find(a => a.id === activityId);
    const testCases = await this.getCodeTestCases(activityId);
    
    // Run tests (simulated - in real app, would use a sandbox)
    const results = this.runCodeTests(code, testCases, activity);
    
    const score = results.totalTests > 0 ? results.passed / results.totalTests : 0;
    const correct = score === 1.0;
    
    const attemptData = {
      activityId,
      activityType: 'code',
      courseId: this.courseId,
      lessonId: this.lessonId,
      attemptNumber: (this.attemptCounts[activityId] || 0) + 1,
      correct,
      score,
      timeSpentMs,
      response: { 
        code, 
        testsPassed: results.passed, 
        totalTests: results.totalTests,
        testResults: results.details
      },
      startedAt: timer?.startTime ? new Date(timer.startTime).toISOString() : null,
      completedAt: new Date().toISOString()
    };
    
    console.log('🎯 Submitting code challenge:', attemptData);
    
    this.attemptCounts[activityId] = attemptData.attemptNumber;
    await this.saveAttemptWithCache(attemptData);
    this.showCodeFeedback(activityId, results);
    delete this.activityTimers[activityId];
    
    return { correct, score, attemptNumber: attemptData.attemptNumber };
  },
  
  /**
   * Get code test cases from Firestore or data attributes
   */
  async getCodeTestCases(activityId) {
    // Try Firestore first
    const activityData = await this.getCorrectAnswer(activityId);
    if (activityData?.testCases) {
      return activityData.testCases;
    }
    
    // Fallback to data attributes
    const activity = this.activities.find(a => a.id === activityId);
    if (activity?.element) {
      const testData = activity.element.dataset.tests;
      if (testData) {
        try {
          return JSON.parse(testData);
        } catch (e) {
          console.error('Failed to parse test cases:', e);
        }
      }
      
      // Check for keywords to match
      const keywords = activity.element.dataset.keywords;
      if (keywords) {
        return { type: 'keywords', keywords: keywords.split(',').map(k => k.trim()) };
      }
    }
    
    return null;
  },
  
  /**
   * Run code tests (simulated)
   */
  runCodeTests(code, testCases, activity) {
    const results = { passed: 0, totalTests: 0, details: [] };
    
    if (!testCases) {
      // No tests defined - check if code is non-empty
      results.totalTests = 1;
      results.passed = code.trim().length > 10 ? 1 : 0;
      results.details.push({
        test: 'Code submitted',
        passed: results.passed === 1
      });
      return results;
    }
    
    if (testCases.type === 'keywords') {
      // Simple keyword matching
      const lowerCode = code.toLowerCase();
      testCases.keywords.forEach(keyword => {
        results.totalTests++;
        const passed = lowerCode.includes(keyword.toLowerCase());
        results.details.push({ test: `Contains "${keyword}"`, passed });
        if (passed) results.passed++;
      });
    } else if (Array.isArray(testCases)) {
      // Array of test cases with expected output
      testCases.forEach((test, i) => {
        results.totalTests++;
        // Simplified check - in production would use actual execution
        const passed = code.includes(test.expected) || 
                      (test.contains && code.includes(test.contains));
        results.details.push({ 
          test: test.name || `Test ${i + 1}`, 
          passed,
          expected: test.expected
        });
        if (passed) results.passed++;
      });
    }
    
    return results;
  },
  
  /**
   * Show code challenge feedback
   */
  showCodeFeedback(activityId, results) {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return;
    
    const el = activity.element;
    const feedbackEl = el.querySelector('.activity-feedback, .code-feedback');
    const outputEl = el.querySelector('.code-output');
    
    // Show test results
    if (outputEl) {
      let html = '<div class="test-results">';
      results.details.forEach(test => {
        const icon = test.passed ? '✅' : '❌';
        html += `<div class="test-result ${test.passed ? 'passed' : 'failed'}">${icon} ${test.test}</div>`;
      });
      html += '</div>';
      outputEl.innerHTML = html;
      outputEl.classList.add('visible');
    }
    
    const score = results.totalTests > 0 ? results.passed / results.totalTests : 0;
    
    // Feedback message
    if (feedbackEl) {
      const msg = score === 1 
        ? '🎉 All tests passed!'
        : `${results.passed}/${results.totalTests} tests passed`;
      feedbackEl.textContent = msg;
      feedbackEl.classList.add('visible', score === 1 ? 'correct' : 'partial');
    }
    
    // Update button
    const runBtn = el.querySelector('.run-btn, .activity-btn');
    if (runBtn) {
      runBtn.textContent = score === 1 ? '✅ All Passed!' : `${results.passed}/${results.totalTests} Passed`;
      runBtn.classList.add(score === 1 ? 'correct' : 'partial');
    }
  },
  
  /**
   * Setup interactive demo listeners
   */
  setupDemoListeners(activity) {
    const el = activity.element;
    
    // Track interactions
    activity.interactions = {
      clicks: 0,
      hovers: 0,
      timeSpent: 0,
      completed: false,
      interacted: new Set()
    };
    
    // Track clicks on interactive elements
    const interactiveEls = el.querySelectorAll('[data-interact], button:not(.complete-demo-btn), .interactive');
    const progressDots = el.querySelectorAll('.demo-progress-dot');
    
    interactiveEls.forEach((intEl, index) => {
      intEl.addEventListener('click', () => {
        const interactId = intEl.dataset.interact || `el-${index}`;
        
        // Track unique interactions
        if (!activity.interactions.interacted.has(interactId)) {
          activity.interactions.interacted.add(interactId);
          activity.interactions.clicks++;
          intEl.classList.add('interacted');
          
          // Visual feedback - highlight the element
          const valueEl = intEl.querySelector('.value');
          if (valueEl) {
            valueEl.style.background = 'var(--accent-stone)';
            valueEl.style.transition = 'background 0.3s ease';
          }
          
          // Update progress dots
          if (progressDots[activity.interactions.clicks - 1]) {
            progressDots[activity.interactions.clicks - 1].classList.add('active');
          }
          
          this.checkDemoProgress(activity);
        }
      });
    });
    
    // Track hovers
    el.addEventListener('mouseover', () => {
      activity.interactions.hovers++;
    });
    
    // Check for completion trigger
    const completeBtn = el.querySelector('.complete-demo-btn, [data-complete]');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        activity.interactions.completed = true;
        this.submitDemoInteraction(activity.id);
      });
    }
    
    // Auto-complete after enough interactions
    const autoCompleteThreshold = parseInt(el.dataset.interactions) || 3;
    activity.autoCompleteThreshold = autoCompleteThreshold;
  },
  
  /**
   * Check demo progress and auto-complete if threshold met
   */
  checkDemoProgress(activity) {
    if (activity.interactions.clicks >= activity.autoCompleteThreshold && 
        !activity.interactions.completed) {
      activity.interactions.completed = true;
      this.submitDemoInteraction(activity.id);
    }
  },
  
  /**
   * Submit demo interaction
   */
  async submitDemoInteraction(activityId) {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return;
    
    const timer = this.activityTimers[activityId];
    const timeSpentMs = timer ? Date.now() - timer.startTime : 0;
    
    // Score based on engagement (0.5 for minimal, 1.0 for good engagement)
    const interactions = activity.interactions;
    const engagementScore = Math.min(1.0, 
      0.5 + (interactions.clicks / (activity.autoCompleteThreshold * 2)) * 0.5
    );
    
    const attemptData = {
      activityId,
      activityType: 'demo',
      courseId: this.courseId,
      lessonId: this.lessonId,
      attemptNumber: (this.attemptCounts[activityId] || 0) + 1,
      correct: true, // Demos are always "correct" if completed
      score: engagementScore,
      timeSpentMs,
      response: {
        clicks: interactions.clicks,
        hovers: interactions.hovers,
        completed: interactions.completed
      },
      startedAt: timer?.startTime ? new Date(timer.startTime).toISOString() : null,
      completedAt: new Date().toISOString()
    };
    
    console.log('🎯 Submitting demo interaction:', attemptData);
    
    this.attemptCounts[activityId] = attemptData.attemptNumber;
    await this.saveAttemptWithCache(attemptData);
    this.showDemoFeedback(activityId, engagementScore);
    delete this.activityTimers[activityId];
    
    return { correct: true, score: engagementScore, attemptNumber: attemptData.attemptNumber };
  },
  
  /**
   * Show demo feedback
   */
  showDemoFeedback(activityId, score) {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return;
    
    const el = activity.element;
    el.classList.add('demo-complete');
    
    // Show completion toast
    this.showToast(`🎯 Demo complete! Engagement: ${Math.round(score * 100)}%`);
    
    // Update any completion indicator
    const indicator = el.querySelector('.demo-status, .activity-status');
    if (indicator) {
      indicator.textContent = '✅ Completed';
      indicator.classList.add('complete');
    }
  },

  // ============================================
  // CHALLENGE ACTIVITIES
  // ============================================

  /**
   * Setup challenge listeners (daily challenges, prompt craft, etc.)
   */
  setupChallengeListeners(activity) {
    const el = activity.element;
    const submitBtn = el.querySelector('.challenge-submit');
    const input = el.querySelector('.challenge-input, textarea');
    
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const response = input?.value || input?.textContent || '';
        if (response.trim().length > 0) {
          this.submitChallengeAnswer(activity.id, response);
        }
      });
    }
    
    // Enable submit when input has content
    if (input && submitBtn) {
      const checkInput = () => {
        const value = input.value || input.textContent || '';
        submitBtn.disabled = value.trim().length === 0;
      };
      input.addEventListener('input', checkInput);
      checkInput();
    }
  },

  /**
   * Submit challenge answer
   */
  async submitChallengeAnswer(activityId, response) {
    const timer = this.activityTimers[activityId];
    const timeSpentMs = timer ? Date.now() - timer.startTime : 0;
    const activity = this.activities.find(a => a.id === activityId);
    
    if (!activity) {
      console.error('🎯 Challenge activity not found:', activityId);
      return;
    }
    
    // Clear any running timer
    if (timer?.interval) {
      clearInterval(timer.interval);
    }
    
    // Evaluate the response
    const evaluation = await this.evaluateChallengeResponse(activityId, response, activity);
    
    const attemptData = {
      activityId,
      activityType: 'challenge',
      courseId: this.courseId,
      lessonId: this.lessonId,
      attemptNumber: (this.attemptCounts[activityId] || 0) + 1,
      correct: evaluation.passed,
      score: evaluation.score,
      timeSpentMs,
      response: {
        text: response,
        evaluation: evaluation.feedback,
        category: activity.element.dataset.category || 'general'
      },
      startedAt: timer?.startTime ? new Date(timer.startTime).toISOString() : null,
      completedAt: new Date().toISOString()
    };
    
    console.log('🎯 Submitting challenge answer:', attemptData);
    
    this.attemptCounts[activityId] = attemptData.attemptNumber;
    await this.saveAttemptWithCache(attemptData);
    this.showChallengeFeedback(activityId, evaluation);
    delete this.activityTimers[activityId];
    
    // Update streak tracking if this is a daily challenge
    if (this.courseId === 'daily') {
      this.updateChallengeStreak(activityId, evaluation.passed);
    }
    
    return { correct: evaluation.passed, score: evaluation.score, attemptNumber: attemptData.attemptNumber };
  },

  /**
   * Evaluate challenge response
   * Supports: keyword-match, length-check, ai-review (future)
   */
  async evaluateChallengeResponse(activityId, response, activity) {
    const el = activity.element;
    const evalType = el.dataset.evaluationType || 'length-check';
    
    let evaluation = { passed: false, score: 0, feedback: '' };
    
    switch (evalType) {
      case 'keyword-match': {
        const keywords = (el.dataset.keywords || '').split(',').map(k => k.trim().toLowerCase());
        const lowerResponse = response.toLowerCase();
        const matchedKeywords = keywords.filter(k => k && lowerResponse.includes(k));
        const matchRatio = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;
        
        evaluation.score = matchRatio;
        evaluation.passed = matchRatio >= 0.5;
        evaluation.feedback = matchRatio === 1 
          ? 'All key concepts covered!'
          : matchRatio >= 0.5 
            ? `Good effort! Covered ${matchedKeywords.length}/${keywords.length} key concepts.`
            : `Try to include more key concepts. Found ${matchedKeywords.length}/${keywords.length}.`;
        break;
      }
      
      case 'length-check': {
        const minLength = parseInt(el.dataset.minLength) || 50;
        const wordCount = response.trim().split(/\s+/).length;
        const charCount = response.trim().length;
        
        evaluation.score = Math.min(1, charCount / (minLength * 2));
        evaluation.passed = charCount >= minLength && wordCount >= 5;
        evaluation.feedback = evaluation.passed
          ? `Great response! ${wordCount} words submitted.`
          : `Please provide a more detailed response (at least ${minLength} characters).`;
        break;
      }
      
      case 'ai-review': {
        // Future: AI evaluation endpoint
        // For now, use length-check as fallback
        const wordCount = response.trim().split(/\s+/).length;
        evaluation.score = Math.min(1, wordCount / 50);
        evaluation.passed = wordCount >= 10;
        evaluation.feedback = evaluation.passed
          ? 'Response submitted for review!'
          : 'Please provide more detail in your response.';
        break;
      }
      
      case 'peer-review': {
        // Peer review always passes initially, score determined later
        evaluation.score = 0.5;
        evaluation.passed = true;
        evaluation.feedback = 'Submitted for peer review. Check back later for feedback!';
        break;
      }
      
      default:
        evaluation.score = response.trim().length > 0 ? 1 : 0;
        evaluation.passed = response.trim().length > 0;
        evaluation.feedback = 'Response submitted!';
    }
    
    return evaluation;
  },

  /**
   * Show challenge feedback UI
   */
  showChallengeFeedback(activityId, evaluation) {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) return;
    
    const el = activity.element;
    const feedbackEl = el.querySelector('.challenge-feedback');
    const submitBtn = el.querySelector('.challenge-submit');
    const input = el.querySelector('.challenge-input, textarea');
    
    // Update feedback area
    if (feedbackEl) {
      feedbackEl.innerHTML = `
        <div class="feedback-result ${evaluation.passed ? 'success' : 'partial'}">
          <span class="feedback-icon">${evaluation.passed ? '🎉' : '💡'}</span>
          <span class="feedback-text">${evaluation.feedback}</span>
          ${activity.points ? `<span class="feedback-xp">+${Math.round(activity.points * evaluation.score)} XP</span>` : ''}
        </div>
      `;
      feedbackEl.classList.add('visible');
    }
    
    // Update button state
    if (submitBtn) {
      submitBtn.textContent = evaluation.passed ? '✅ Submitted!' : '🔄 Try Again';
      submitBtn.classList.add(evaluation.passed ? 'success' : 'partial');
      if (evaluation.passed) {
        submitBtn.disabled = true;
      }
    }
    
    // Mark input as submitted
    if (input && evaluation.passed) {
      input.readOnly = true;
      input.classList.add('submitted');
    }
    
    // Mark container as complete
    if (evaluation.passed) {
      el.classList.add('challenge-complete');
    }
    
    // Show toast
    const xpEarned = activity.points ? Math.round(activity.points * evaluation.score) : 0;
    this.showToast(
      evaluation.passed 
        ? `🎯 Challenge complete! +${xpEarned} XP`
        : `💡 ${evaluation.feedback}`
    );
  },

  /**
   * Update daily challenge streak
   */
  async updateChallengeStreak(activityId, passed) {
    if (!passed || !window.DataService) return;
    
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Track this challenge completion
      await window.DataService.trackChallengeCompletion({
        challengeId: activityId,
        date: today,
        completedAt: new Date().toISOString()
      });
      
      // Check if all daily challenges are complete
      const todaysChallenges = document.querySelectorAll('[data-activity^="challenge-"][data-date="' + today + '"]');
      const completedToday = document.querySelectorAll('[data-activity^="challenge-"].challenge-complete[data-date="' + today + '"]');
      
      if (todaysChallenges.length > 0 && completedToday.length >= todaysChallenges.length) {
        // All challenges complete! Update streak
        await window.DataService.updateChallengeStreak(today);
        this.showToast('🔥 Daily challenges complete! Streak continued!');
      }
    } catch (error) {
      console.error('🎯 Error updating streak:', error);
    }
  },

  /**
   * Restore challenge visual state
   */
  restoreChallengeState(activity, attempt) {
    const el = activity.element;
    
    if (!attempt.correct) return; // Only restore if completed successfully
    
    // Show the submitted response
    const input = el.querySelector('.challenge-input, textarea');
    if (input && attempt.response?.text) {
      input.value = attempt.response.text;
      input.readOnly = true;
      input.classList.add('submitted');
    }
    
    // Update feedback
    const feedbackEl = el.querySelector('.challenge-feedback');
    if (feedbackEl) {
      feedbackEl.innerHTML = `
        <div class="feedback-result success">
          <span class="feedback-icon">✅</span>
          <span class="feedback-text">Already completed!</span>
        </div>
      `;
      feedbackEl.classList.add('visible');
    }
    
    // Update button
    const submitBtn = el.querySelector('.challenge-submit');
    if (submitBtn) {
      submitBtn.textContent = '✅ Completed';
      submitBtn.disabled = true;
      submitBtn.classList.add('success');
    }
    
    // Mark container
    el.classList.add('challenge-complete', 'activity-completed');
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
   * Save attempt with offline caching support and timeout handling
   */
  async saveAttemptWithCache(attemptData) {
    // Generate local ID for tracking
    const localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    attemptData.localId = localId;

    // Always cache first (instant) - ensures data is never lost
    this.cacheAttempt(attemptData);

    // Show saving indicator
    this.showSavingIndicator(true);

    try {
      // Try to save to Firestore with timeout
      if (window.DataService) {
        await this.withTimeout(
          window.DataService.saveActivityAttempt(attemptData),
          10000, // 10 second timeout
          'Save timeout'
        );
        console.log('🎯 Attempt saved to Firestore:', attemptData.activityId);

        // Success! Remove from cache
        this.removeCachedAttempt(localId);
        this.showSavingIndicator(false);
      }
    } catch (error) {
      this.showSavingIndicator(false);

      if (this.isOfflineOrTimeoutError(error)) {
        // Queue for later sync
        this.queueForSync(attemptData);
        const isTimeout = error.message?.includes('timeout') || error.message?.includes('Timeout');
        this.showToast(isTimeout
          ? '⏱️ Save timed out - will retry when connection improves'
          : '📴 Saved offline - will sync when connected'
        );
        console.log('🎯 Attempt queued for sync:', attemptData.activityId, error.message);
      } else {
        console.error('🎯 Error saving attempt:', error);
        // Still keep in cache for retry, but notify user
        this.showToast('⚠️ Save failed - will retry automatically');
      }
    }
  },

  /**
   * Wrap a promise with a timeout
   * @param {Promise} promise - The promise to wrap
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} errorMessage - Error message on timeout
   */
  withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      )
    ]);
  },

  /**
   * Check if error is due to being offline or timeout
   */
  isOfflineOrTimeoutError(error) {
    if (!navigator.onLine) return true;

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    return (
      errorCode === 'unavailable' ||
      errorCode === 'deadline-exceeded' ||
      errorMessage.includes('network') ||
      errorMessage.includes('offline') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out') ||
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('network request failed')
    );
  },

  /**
   * Legacy alias for backward compatibility
   */
  isOfflineError(error) {
    return this.isOfflineOrTimeoutError(error);
  },

  /**
   * Show/hide saving indicator
   */
  showSavingIndicator(show) {
    let indicator = document.querySelector('.activity-saving-indicator');

    if (show) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'activity-saving-indicator';
        indicator.innerHTML = '<span class="saving-spinner"></span> Saving...';
        document.body.appendChild(indicator);

        // Add styles if not present
        if (!document.getElementById('saving-indicator-styles')) {
          const style = document.createElement('style');
          style.id = 'saving-indicator-styles';
          style.textContent = `
            .activity-saving-indicator {
              position: fixed;
              bottom: 1rem;
              right: 1rem;
              background: var(--bg-secondary, #1a1a2e);
              color: var(--text-secondary, #a8a8b8);
              padding: 0.75rem 1.25rem;
              border-radius: 8px;
              border: 1px solid var(--border-color, #333);
              font-size: 0.875rem;
              display: flex;
              align-items: center;
              gap: 0.5rem;
              z-index: 9998;
              animation: fadeIn 0.2s ease;
            }
            .saving-spinner {
              width: 14px;
              height: 14px;
              border: 2px solid var(--text-secondary, #a8a8b8);
              border-top-color: transparent;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `;
          document.head.appendChild(style);
        }
      }
    } else if (indicator) {
      indicator.remove();
    }
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
    if (!window.DataService) {
      console.log('🎯 DataService not available, skipping load');
      this._dataLoaded = true;
      this.emitDataLoaded();
      return;
    }

    // Wait for auth state to be ready
    if (window.AuthService?.waitForAuthState) {
      console.log('🎯 Waiting for auth state...');
      await window.AuthService.waitForAuthState();
    }

    const user = window.AuthService?.getUser();
    if (!user) {
      console.log('🎯 User not authenticated, skipping load');
      this._dataLoaded = true;
      this.emitDataLoaded();
      return;
    }

    console.log('🎯 Loading attempts for user:', user.email);

    try {
      const attempts = await window.DataService.getActivityAttempts({
        courseId: this.courseId,
        lessonId: this.lessonId
      });

      console.log('🎯 Fetched attempts from Firestore:', attempts.length);

      // Store all attempts for later access (for showing previous wrong answers)
      this.allAttempts = attempts;

      // Track best attempts AND most recent attempts per activity
      const bestAttempts = {};
      const mostRecentAttempts = {};

      // Count attempts per activity and track best/recent scores
      attempts.forEach(attempt => {
        const current = this.attemptCounts[attempt.activityId] || 0;
        this.attemptCounts[attempt.activityId] = Math.max(current, attempt.attemptNumber || 1);

        // Track best attempt (highest score or correct)
        if (!bestAttempts[attempt.activityId] ||
            attempt.score > bestAttempts[attempt.activityId].score ||
            (attempt.correct && !bestAttempts[attempt.activityId].correct)) {
          bestAttempts[attempt.activityId] = attempt;
        }

        // Track most recent attempt (by createdAt timestamp)
        const attemptTime = attempt.createdAt?._seconds || 0;
        const currentRecentTime = mostRecentAttempts[attempt.activityId]?.createdAt?._seconds || 0;
        if (attemptTime >= currentRecentTime) {
          mostRecentAttempts[attempt.activityId] = attempt;
        }
      });

      // Store for access by activities
      this.bestAttempts = bestAttempts;
      this.mostRecentAttempts = mostRecentAttempts;

      console.log('🎯 Loaded attempt counts:', this.attemptCounts);
      console.log('🎯 Best attempts to restore:', Object.keys(bestAttempts));

      // Restore completed activities visual state
      this.restoreCompletedActivities(bestAttempts);

      // Mark data as loaded and notify listeners
      this._dataLoaded = true;
      this.emitDataLoaded();

    } catch (error) {
      console.error('🎯 Error loading attempt counts:', error);
      this._dataLoaded = true;
      this.emitDataLoaded();
    }
  },

  /**
   * Emit event when data is loaded (for carousels to refresh)
   */
  emitDataLoaded() {
    console.log('🎯 Emitting dataLoaded event');
    window.dispatchEvent(new CustomEvent('activityTrackerDataLoaded', {
      detail: {
        courseId: this.courseId,
        lessonId: this.lessonId,
        attemptCounts: this.attemptCounts,
        bestAttempts: this.bestAttempts || {},
        mostRecentAttempts: this.mostRecentAttempts || {}
      }
    }));
  },

  /**
   * Check if data has been loaded
   */
  isDataLoaded() {
    return this._dataLoaded === true;
  },

  /**
   * Wait for data to be loaded (returns immediately if already loaded)
   */
  waitForDataLoaded() {
    if (this._dataLoaded) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      const handler = () => {
        window.removeEventListener('activityTrackerDataLoaded', handler);
        resolve();
      };
      window.addEventListener('activityTrackerDataLoaded', handler);
    });
  },

  /**
   * Get the most recent attempt for an activity (includes wrong answers)
   */
  getMostRecentAttempt(activityId) {
    return this.mostRecentAttempts?.[activityId] || null;
  },

  /**
   * Get the best attempt for an activity
   */
  getBestAttempt(activityId) {
    return this.bestAttempts?.[activityId] || null;
  },

  /**
   * Get all attempts for an activity
   */
  getAttemptsForActivity(activityId) {
    if (!this.allAttempts) return [];
    return this.allAttempts.filter(a => a.activityId === activityId);
  },
  
  /**
   * Restore visual state for completed activities
   */
  restoreCompletedActivities(bestAttempts) {
    Object.entries(bestAttempts).forEach(([activityId, attempt]) => {
      const activity = this.activities.find(a => a.id === activityId);
      if (!activity) return;
      
      const el = activity.element;
      const type = activity.type;
      
      console.log('🎯 Restoring activity:', activityId, { correct: attempt.correct, score: attempt.score });
      
      // Mark as completed based on type
      switch (type) {
        case 'quiz':
          this.restoreQuizState(activity, attempt);
          break;
        case 'dragdrop':
          this.restoreDragDropState(activity, attempt);
          break;
        case 'code':
          this.restoreCodeState(activity, attempt);
          break;
        case 'demo':
          this.restoreDemoState(activity, attempt);
          break;
        case 'challenge':
          this.restoreChallengeState(activity, attempt);
          break;
      }
    });
  },
  
  /**
   * Restore quiz visual state
   */
  restoreQuizState(activity, attempt) {
    const el = activity.element;
    if (!attempt.correct && attempt.score < 1) return; // Only restore if completed correctly
    
    // Mark the selected option
    if (attempt.response?.selected) {
      const option = el.querySelector(`[data-value="${attempt.response.selected}"]`);
      if (option) {
        option.classList.add('selected', 'correct');
      }
    }
    
    // Update feedback
    const feedback = el.querySelector('.quiz-feedback');
    if (feedback) {
      feedback.textContent = feedback.dataset.correctMsg || '✅ Already completed!';
      feedback.classList.add('visible', 'correct');
    }
    
    // Update button
    const btn = el.querySelector('.quiz-btn');
    if (btn) {
      btn.textContent = '✅ Completed';
      btn.disabled = true;
      btn.classList.add('correct');
    }
    
    // Mark container
    el.classList.add('activity-completed');
  },
  
  /**
   * Restore drag & drop visual state
   */
  restoreDragDropState(activity, attempt) {
    const el = activity.element;
    if (attempt.score < 1) return; // Only restore if fully correct
    
    // Mark all dropzones as correct
    const dropzones = el.querySelectorAll('[data-dropzone]');
    dropzones.forEach(zone => {
      zone.classList.add('correct', 'filled');
    });
    
    // Update feedback
    const feedback = el.querySelector('.dragdrop-feedback');
    if (feedback) {
      feedback.textContent = '🎉 Already completed!';
      feedback.classList.add('visible', 'correct');
    }
    
    // Update button
    const btn = el.querySelector('.dragdrop-btn, .activity-btn');
    if (btn) {
      btn.textContent = '✅ Completed';
      btn.disabled = true;
      btn.classList.add('correct');
    }
    
    // Mark container
    el.classList.add('activity-completed');
  },
  
  /**
   * Restore code challenge visual state
   */
  restoreCodeState(activity, attempt) {
    const el = activity.element;
    if (attempt.score < 1) return; // Only restore if all tests passed
    
    // Show the submitted code
    const codeInput = el.querySelector('.code-input');
    if (codeInput && attempt.response?.code) {
      codeInput.value = attempt.response.code;
      codeInput.disabled = true;
    }
    
    // Update feedback
    const feedback = el.querySelector('.code-feedback');
    if (feedback) {
      feedback.textContent = '🎉 All tests passed!';
      feedback.classList.add('visible', 'correct');
    }
    
    // Update button
    const btn = el.querySelector('.run-btn');
    if (btn) {
      btn.textContent = '✅ Completed';
      btn.disabled = true;
      btn.classList.add('correct');
    }
    
    // Mark container
    el.classList.add('activity-completed');
  },
  
  /**
   * Restore demo visual state
   */
  restoreDemoState(activity, attempt) {
    const el = activity.element;
    
    // Mark as completed
    el.classList.add('demo-complete', 'activity-completed');
    
    // Update status
    const status = el.querySelector('.demo-status');
    if (status) {
      status.textContent = '✅ Completed';
      status.classList.add('complete');
    }
    
    // Fill all progress dots
    const dots = el.querySelectorAll('.demo-progress-dot');
    dots.forEach(dot => dot.classList.add('active'));
    
    // Mark all interactive elements as interacted
    const interactives = el.querySelectorAll('[data-interact]');
    interactives.forEach(intEl => {
      intEl.classList.add('interacted');
      const valueEl = intEl.querySelector('.value');
      if (valueEl) {
        valueEl.style.background = 'var(--accent-stone)';
      }
    });
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

