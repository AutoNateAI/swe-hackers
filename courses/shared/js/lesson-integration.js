/**
 * Lesson Integration for AutoNateAI Learning Hub
 * Adds dashboard navigation, progress tracking, and route protection to lesson pages
 */

const LessonIntegration = {
  courseId: null,
  lessonId: null,
  startTime: null,
  
  /**
   * Initialize lesson integration
   */
  init(courseId, lessonId) {
    this.courseId = courseId;
    this.lessonId = lessonId;
    this.startTime = Date.now();
    
    // Initialize Firebase
    if (!window.FirebaseApp.init()) {
      console.warn('Firebase not initialized');
      return;
    }
    
    window.AuthService.init();
    
    // Check auth and load user
    window.AuthService.onAuthStateChanged(async (user) => {
      if (!user) {
        // Not logged in - redirect to login
        this.redirectToLogin();
        return;
      }
      
      // User is logged in
      this.createLessonHeader(user);
      await this.markLessonStarted();
      this.setupProgressTracking();
    });
    
    // Track time on unload
    window.addEventListener('beforeunload', () => {
      this.trackTimeSpent();
    });
    
    // Track time periodically
    setInterval(() => {
      this.trackTimeSpent();
    }, 60000); // Every minute
  },
  
  /**
   * Redirect to login page
   */
  redirectToLogin() {
    window.AuthService.setRedirectUrl(window.location.href);
    
    // Calculate relative path to auth
    const path = window.location.pathname;
    const depth = (path.match(/\//g) || []).length - 2; // Adjust based on structure
    const basePath = '../'.repeat(Math.max(0, depth));
    
    window.location.href = basePath + 'auth/login.html';
  },
  
  /**
   * Create lesson header with navigation
   */
  createLessonHeader(user) {
    const displayName = user.displayName || user.email.split('@')[0];
    
    const header = document.createElement('div');
    header.className = 'lesson-header-bar';
    header.innerHTML = `
      <a href="../../dashboard/index.html" class="header-back">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Dashboard
      </a>
      
      <div class="header-progress">
        <span class="progress-label" id="lesson-progress-label">Loading...</span>
        <div class="progress-dots" id="progress-dots"></div>
      </div>
      
      <div class="header-user">
        <span class="user-name">${displayName.split(' ')[0]}</span>
        <div class="user-avatar">${displayName.charAt(0).toUpperCase()}</div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .lesson-header-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 60px;
        background: rgba(10, 10, 15, 0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1.5rem;
        z-index: 1000;
      }
      
      .header-back {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #a0a0b8;
        text-decoration: none;
        font-size: 0.9rem;
        transition: color 0.2s ease;
      }
      
      .header-back:hover {
        color: #e8e8f0;
      }
      
      .header-progress {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      
      .progress-label {
        font-size: 0.85rem;
        color: #6a6a80;
      }
      
      .progress-dots {
        display: flex;
        gap: 0.5rem;
      }
      
      .progress-dot {
        display: block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #1a1a2e;
        border: 2px solid #3f3f5f;
        transition: all 0.3s ease;
        text-decoration: none;
        cursor: pointer;
      }
      
      .progress-dot:hover {
        transform: scale(1.2);
        border-color: #7986cb;
      }
      
      .progress-dot.completed {
        background: #66bb6a;
        border-color: #66bb6a;
      }
      
      .progress-dot.current {
        background: #7986cb;
        border-color: #7986cb;
        animation: pulse 2s ease-in-out infinite;
      }
      
      .progress-dot.current:hover {
        animation: none;
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(121, 134, 203, 0.4); }
        50% { transform: scale(1.1); box-shadow: 0 0 0 5px rgba(121, 134, 203, 0); }
      }
      
      .header-user {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      
      .user-name {
        font-size: 0.9rem;
        color: #a0a0b8;
      }
      
      .user-avatar {
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #7986cb, #4db6ac);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.9rem;
        color: white;
      }
      
      /* Adjust lesson container for header */
      .lesson-container {
        padding-top: 80px !important;
      }
      
      @media (max-width: 768px) {
        .header-progress {
          display: none;
        }
        
        .user-name {
          display: none;
        }
      }
    `;
    
    document.head.appendChild(style);
    document.body.insertBefore(header, document.body.firstChild);
    
    // Load progress dots
    this.updateProgressDots();
  },
  
  /**
   * Chapter definitions for navigation
   */
  getChapters() {
    return [
      { id: 'ch0-origins', name: 'Origins', folder: 'ch0-origins', num: 0 },
      { id: 'ch1-stone', name: 'Stone', folder: 'ch1-stone', num: 1 },
      { id: 'ch2-lightning', name: 'Lightning', folder: 'ch2-lightning', num: 2 },
      { id: 'ch3-magnetism', name: 'Magnetism', folder: 'ch3-magnetism', num: 3 },
      { id: 'ch4-architect', name: 'Architect', folder: 'ch4-architect', num: 4 },
      { id: 'ch5-capstone1', name: 'Capstone I', folder: 'ch5-capstone1', num: 5 },
      { id: 'ch6-capstone2', name: 'Capstone II', folder: 'ch6-capstone2', num: 6 }
    ];
  },
  
  /**
   * Update progress dots
   */
  async updateProgressDots() {
    try {
      const progress = await window.DataService.getCourseProgress(this.courseId);
      const dotsContainer = document.getElementById('progress-dots');
      const label = document.getElementById('lesson-progress-label');
      
      if (!dotsContainer) return;
      
      const chapters = this.getChapters();
      const currentLessonId = this.lessonId;
      
      let completedCount = 0;
      let dots = '';
      
      chapters.forEach((ch) => {
        const isCompleted = progress?.lessons?.[ch.id]?.completed || progress?.lessons?.[ch.folder]?.completed;
        const isCurrent = ch.id === currentLessonId || ch.folder === currentLessonId;
        
        if (isCompleted) completedCount++;
        
        // Create clickable dot that navigates to the chapter
        dots += `<a href="../${ch.folder}/" class="progress-dot ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}" title="${ch.num === 0 ? 'Pre-Quest' : 'Chapter ' + ch.num}: ${ch.name}"></a>`;
      });
      
      dotsContainer.innerHTML = dots;
      label.textContent = `${completedCount}/${chapters.length} Complete`;
      
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  },
  
  /**
   * Mark lesson as started
   */
  async markLessonStarted() {
    try {
      await window.DataService.updateLessonProgress(this.courseId, this.lessonId, {
        started: true,
        startedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error marking lesson started:', error);
    }
  },
  
  /**
   * Track time spent on lesson
   */
  async trackTimeSpent() {
    if (!this.startTime) return;
    
    const seconds = Math.floor((Date.now() - this.startTime) / 1000);
    this.startTime = Date.now(); // Reset for next interval
    
    if (seconds > 0 && seconds < 300) { // Max 5 minutes per interval
      try {
        await window.DataService.trackTimeSpent(this.courseId, this.lessonId, seconds);
      } catch (error) {
        console.error('Error tracking time:', error);
      }
    }
  },
  
  /**
   * Setup progress tracking for quizzes and activities
   */
  setupProgressTracking() {
    // Listen for quiz completions
    document.addEventListener('quiz-complete', async (e) => {
      const { quizId, answer, isCorrect } = e.detail;
      await window.DataService.saveQuizAnswer(this.courseId, this.lessonId, quizId, answer, isCorrect);
    });
    
    // Listen for activity completions
    document.addEventListener('activity-complete', async (e) => {
      const { activityId, performance } = e.detail;
      await window.DataService.saveActivityPerformance(this.courseId, this.lessonId, activityId, performance);
    });
    
    // Listen for lesson completion
    document.addEventListener('lesson-complete', async () => {
      await this.completeLesson();
    });
    
    // Auto-complete when user reaches bottom of page
    this.setupAutoComplete();
  },
  
  /**
   * Setup automatic lesson completion when user scrolls to bottom
   */
  setupAutoComplete() {
    // Track if user has scrolled at all
    let hasScrolled = false;
    let scrollHandler = () => {
      hasScrolled = true;
      window.removeEventListener('scroll', scrollHandler);
    };
    window.addEventListener('scroll', scrollHandler);
    
    // Delay observer setup to prevent firing on page load
    setTimeout(() => {
      // Find the element to observe (bottom navigation or last section)
      const navElement = document.querySelector('.lesson-nav, .chapter-nav');
      const sections = document.querySelectorAll('section.section, section[data-section], .lesson-section, .continue-section');
      
      let targetElement = navElement;
      if (!targetElement && sections.length > 0) {
        targetElement = sections[sections.length - 1];
      }
      
      if (!targetElement) {
        console.log('📊 No target element for auto-complete');
        return;
      }
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // Only trigger if user has scrolled AND element is in view
            if (entry.isIntersecting && hasScrolled) {
              console.log('📊 User reached end of lesson, marking complete');
              this.finishLesson();
              observer.disconnect();
            }
          });
        },
        { threshold: 0.5, rootMargin: '0px' }
      );
      
      observer.observe(targetElement);
      console.log('📊 Auto-complete observer set on:', targetElement.className || targetElement.tagName);
    }, 2000); // Wait 2 seconds before setting up observer
  },
  
  /**
   * Complete the current lesson
   */
  async completeLesson() {
    try {
      await window.DataService.completeLesson(this.courseId, this.lessonId);
      this.updateProgressDots();
      
      // Show completion message
      this.showCompletionMessage();
    } catch (error) {
      console.error('Error completing lesson:', error);
    }
  },
  
  /**
   * Show lesson completion message
   */
  showCompletionMessage() {
    const message = document.createElement('div');
    message.className = 'lesson-complete-toast';
    message.innerHTML = `
      <div class="toast-icon">🎉</div>
      <div class="toast-content">
        <strong>Lesson Complete!</strong>
        <span>Great job, keep going!</span>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      .lesson-complete-toast {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: linear-gradient(135deg, #7986cb, #4db6ac);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 1rem;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.5s ease, fadeOut 0.5s ease 3s forwards;
        z-index: 2000;
      }
      
      .toast-icon {
        font-size: 2rem;
      }
      
      .toast-content {
        display: flex;
        flex-direction: column;
      }
      
      .toast-content strong {
        font-size: 1rem;
      }
      
      .toast-content span {
        font-size: 0.85rem;
        opacity: 0.9;
      }
      
      @keyframes slideUp {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes fadeOut {
        to { opacity: 0; transform: translateY(-20px); }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(message);
    
    setTimeout(() => message.remove(), 4000);
  },
  
  /**
   * Dispatch quiz complete event (call from lesson pages)
   */
  completeQuiz(quizId, answer, isCorrect) {
    document.dispatchEvent(new CustomEvent('quiz-complete', {
      detail: { quizId, answer, isCorrect }
    }));
  },
  
  /**
   * Dispatch activity complete event (call from lesson pages)
   */
  completeActivity(activityId, performance) {
    document.dispatchEvent(new CustomEvent('activity-complete', {
      detail: { activityId, performance }
    }));
  },
  
  /**
   * Dispatch lesson complete event (call from lesson pages)
   */
  finishLesson() {
    document.dispatchEvent(new CustomEvent('lesson-complete'));
  }
};

// Export
window.LessonIntegration = LessonIntegration;

