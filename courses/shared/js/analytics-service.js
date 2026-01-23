/**
 * Analytics Service for AutoNateAI Learning Hub
 * 
 * Calculates learning metrics and cognitive progress indicators:
 * - Learning Velocity: How fast the student is progressing
 * - Quiz Mastery: First-try accuracy on quizzes
 * - Active Streak: Consecutive days with learning activity
 * - Cognitive Score: Composite metric of overall learning health
 * - Chapter Analytics: Per-lesson breakdown of performance
 */

const AnalyticsService = {
  
  // Cache to avoid redundant calculations
  cache: {},
  cacheExpiry: 5 * 60 * 1000, // 5 minutes
  
  /**
   * Clear the analytics cache
   */
  clearCache() {
    this.cache = {};
  },
  
  /**
   * Get cached value or null if expired
   */
  getCached(key) {
    const cached = this.cache[key];
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.value;
    }
    return null;
  },
  
  /**
   * Set cached value
   */
  setCache(key, value) {
    this.cache[key] = { value, timestamp: Date.now() };
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARNING VELOCITY
  // How fast is the student progressing through lessons?
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Calculate learning velocity (lessons completed per week)
   * 
   * @param {string} courseId - Optional: filter to specific course
   * @returns {Object} { velocity, trend, lessonsCompleted, weeksActive, comparison }
   */
  async calculateLearningVelocity(courseId = null) {
    const cacheKey = `velocity_${courseId || 'all'}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      const courses = await window.DataService.getEnrolledCourses();
      if (!courses || courses.length === 0) {
        return { velocity: 0, trend: 'neutral', lessonsCompleted: 0, weeksActive: 0 };
      }
      
      let totalCompleted = 0;
      let earliestEnrollment = Date.now();
      let recentCompleted = 0; // Last 7 days
      let priorCompleted = 0;  // 8-14 days ago
      
      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
      
      for (const course of courses) {
        // Filter by courseId if specified
        if (courseId && course.id !== courseId) continue;
        
        // Track enrollment date
        const enrolledAt = course.enrolledAt?._seconds 
          ? course.enrolledAt._seconds * 1000 
          : (course.enrolledAt?.toMillis?.() || now);
        if (enrolledAt < earliestEnrollment) {
          earliestEnrollment = enrolledAt;
        }
        
        // Get lesson progress for this course
        const lessons = await window.DataService.getAllLessonsProgress(course.id);
        
        for (const lesson of lessons) {
          if (lesson.completed) {
            totalCompleted++;
            
            // Check when it was completed for trend calculation
            const completedAt = lesson.completedAt?._seconds
              ? lesson.completedAt._seconds * 1000
              : (lesson.completedAt?.toMillis?.() || 0);
            
            if (completedAt > oneWeekAgo) {
              recentCompleted++;
            } else if (completedAt > twoWeeksAgo) {
              priorCompleted++;
            }
          }
        }
      }
      
      // Calculate weeks since first enrollment
      const msActive = now - earliestEnrollment;
      const weeksActive = Math.max(1, msActive / (7 * 24 * 60 * 60 * 1000));
      
      // Calculate velocity
      const velocity = totalCompleted / weeksActive;
      
      // Calculate trend
      let trend = 'neutral';
      let trendPercent = 0;
      if (priorCompleted > 0) {
        trendPercent = ((recentCompleted - priorCompleted) / priorCompleted) * 100;
        if (trendPercent > 10) trend = 'up';
        else if (trendPercent < -10) trend = 'down';
      } else if (recentCompleted > 0) {
        trend = 'up';
        trendPercent = 100;
      }
      
      // Target comparison (target: 2 lessons/week)
      const target = 2;
      const comparison = velocity >= target ? 'on_track' : 'behind';
      
      const result = {
        velocity: Math.round(velocity * 10) / 10, // Round to 1 decimal
        trend,
        trendPercent: Math.round(trendPercent),
        lessonsCompleted: totalCompleted,
        weeksActive: Math.round(weeksActive * 10) / 10,
        recentWeekCompleted: recentCompleted,
        comparison,
        target
      };
      
      this.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error('Error calculating learning velocity:', error);
      return { velocity: 0, trend: 'neutral', lessonsCompleted: 0, weeksActive: 0 };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // QUIZ MASTERY
  // How well does the student perform on first attempts?
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Calculate quiz mastery (first-try accuracy)
   * 
   * @param {string} courseId - Optional: filter to specific course
   * @returns {Object} { mastery, totalQuizzes, correctFirstTry, avgScore, byTopic }
   */
  async calculateQuizMastery(courseId = null) {
    const cacheKey = `mastery_${courseId || 'all'}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      const filters = { activityType: 'quiz' };
      if (courseId) filters.courseId = courseId;
      
      const attempts = await window.DataService.getActivityAttempts(filters);
      
      if (!attempts || attempts.length === 0) {
        return { mastery: 0, totalQuizzes: 0, correctFirstTry: 0, avgScore: 0, byTopic: {} };
      }
      
      // Group attempts by activityId to find first attempts
      const byActivity = {};
      for (const attempt of attempts) {
        const key = attempt.activityId;
        if (!byActivity[key]) {
          byActivity[key] = [];
        }
        byActivity[key].push(attempt);
      }
      
      let totalQuizzes = 0;
      let correctFirstTry = 0;
      let totalScore = 0;
      const byTopic = {};
      
      for (const [activityId, activityAttempts] of Object.entries(byActivity)) {
        // Sort by attemptNumber to find first attempt
        activityAttempts.sort((a, b) => (a.attemptNumber || 1) - (b.attemptNumber || 1));
        const firstAttempt = activityAttempts[0];
        
        totalQuizzes++;
        totalScore += firstAttempt.score || 0;
        
        if (firstAttempt.correct) {
          correctFirstTry++;
        }
        
        // Extract topic from activityId (e.g., "quiz-ch1-datatypes" -> "datatypes")
        const parts = activityId.split('-');
        const topic = parts[parts.length - 1] || 'general';
        
        if (!byTopic[topic]) {
          byTopic[topic] = { total: 0, correct: 0 };
        }
        byTopic[topic].total++;
        if (firstAttempt.correct) {
          byTopic[topic].correct++;
        }
      }
      
      const mastery = totalQuizzes > 0 ? (correctFirstTry / totalQuizzes) * 100 : 0;
      const avgScore = totalQuizzes > 0 ? (totalScore / totalQuizzes) * 100 : 0;
      
      // Calculate mastery per topic
      for (const topic of Object.keys(byTopic)) {
        byTopic[topic].mastery = byTopic[topic].total > 0
          ? Math.round((byTopic[topic].correct / byTopic[topic].total) * 100)
          : 0;
      }
      
      const result = {
        mastery: Math.round(mastery),
        totalQuizzes,
        correctFirstTry,
        avgScore: Math.round(avgScore),
        byTopic,
        // Identify strongest and weakest
        strongestTopic: this.findStrongestTopic(byTopic),
        weakestTopic: this.findWeakestTopic(byTopic)
      };
      
      this.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error('Error calculating quiz mastery:', error);
      return { mastery: 0, totalQuizzes: 0, correctFirstTry: 0, avgScore: 0, byTopic: {} };
    }
  },
  
  /**
   * Find the topic with highest mastery
   */
  findStrongestTopic(byTopic) {
    let strongest = null;
    let highestMastery = -1;
    
    for (const [topic, data] of Object.entries(byTopic)) {
      if (data.total >= 1 && data.mastery > highestMastery) {
        highestMastery = data.mastery;
        strongest = topic;
      }
    }
    
    return strongest;
  },
  
  /**
   * Find the topic with lowest mastery (that has attempts)
   */
  findWeakestTopic(byTopic) {
    let weakest = null;
    let lowestMastery = 101;
    
    for (const [topic, data] of Object.entries(byTopic)) {
      if (data.total >= 1 && data.mastery < lowestMastery) {
        lowestMastery = data.mastery;
        weakest = topic;
      }
    }
    
    return weakest;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVE STREAK
  // How many consecutive days has the student been learning?
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Calculate active streak (consecutive days with activity)
   * 
   * Activity = lesson progress OR activity completion
   * 
   * @returns {Object} { streak, longestStreak, lastActiveDate, isActiveToday }
   */
  async calculateStreak() {
    const cacheKey = 'streak';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      // Collect all activity dates
      const activeDates = new Set();
      
      // Get lesson progress dates
      const courses = await window.DataService.getEnrolledCourses();
      for (const course of courses) {
        const lessons = await window.DataService.getAllLessonsProgress(course.id);
        for (const lesson of lessons) {
          // Add started date
          if (lesson.startedAt) {
            const date = this.extractDate(lesson.startedAt);
            if (date) activeDates.add(date);
          }
          // Add last updated date
          if (lesson.lastUpdated) {
            const date = this.extractDate(lesson.lastUpdated);
            if (date) activeDates.add(date);
          }
          // Add completed date
          if (lesson.completedAt) {
            const date = this.extractDate(lesson.completedAt);
            if (date) activeDates.add(date);
          }
        }
      }
      
      // Get activity attempt dates
      const attempts = await window.DataService.getActivityAttempts({});
      for (const attempt of attempts) {
        if (attempt.createdAt) {
          const date = this.extractDate(attempt.createdAt);
          if (date) activeDates.add(date);
        }
      }
      
      if (activeDates.size === 0) {
        return { streak: 0, longestStreak: 0, lastActiveDate: null, isActiveToday: false };
      }
      
      // Sort dates in descending order (most recent first)
      const sortedDates = Array.from(activeDates).sort().reverse();
      
      // Check if active today
      const today = this.getTodayDateString();
      const yesterday = this.getDateString(Date.now() - 24 * 60 * 60 * 1000);
      const isActiveToday = sortedDates[0] === today;
      
      // Calculate current streak
      let streak = 0;
      let checkDate = isActiveToday ? today : yesterday;
      
      // Only count streak if active today or yesterday
      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        for (const date of sortedDates) {
          if (date === checkDate) {
            streak++;
            // Move to previous day
            checkDate = this.getPreviousDateString(checkDate);
          } else if (date < checkDate) {
            // Gap found, streak ends
            break;
          }
        }
      }
      
      // Calculate longest streak (all time)
      const longestStreak = this.calculateLongestStreak(sortedDates);
      
      const result = {
        streak,
        longestStreak,
        lastActiveDate: sortedDates[0],
        isActiveToday,
        totalActiveDays: activeDates.size
      };
      
      this.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error('Error calculating streak:', error);
      return { streak: 0, longestStreak: 0, lastActiveDate: null, isActiveToday: false };
    }
  },
  
  /**
   * Calculate the longest streak from a sorted array of dates
   */
  calculateLongestStreak(sortedDates) {
    if (sortedDates.length === 0) return 0;
    
    let longest = 1;
    let current = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.round((prevDate - currDate) / (24 * 60 * 60 * 1000));
      
      if (diffDays === 1) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }
    
    return longest;
  },
  
  /**
   * Extract YYYY-MM-DD date string from various timestamp formats
   */
  extractDate(timestamp) {
    try {
      let ms;
      if (timestamp._seconds) {
        ms = timestamp._seconds * 1000;
      } else if (timestamp.toMillis) {
        ms = timestamp.toMillis();
      } else if (typeof timestamp === 'string') {
        ms = new Date(timestamp).getTime();
      } else if (typeof timestamp === 'number') {
        ms = timestamp;
      } else {
        return null;
      }
      return this.getDateString(ms);
    } catch (e) {
      return null;
    }
  },
  
  /**
   * Get today's date as YYYY-MM-DD string
   */
  getTodayDateString() {
    return this.getDateString(Date.now());
  },
  
  /**
   * Get date string from timestamp
   */
  getDateString(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
  
  /**
   * Get previous day's date string
   */
  getPreviousDateString(dateStr) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return this.getDateString(d.getTime());
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COGNITIVE PROGRESS SCORE
  // Composite metric combining velocity, mastery, streak, and completion
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Calculate cognitive progress score (0-100)
   * 
   * Weights:
   * - Quiz Mastery: 40% (understanding)
   * - Learning Velocity: 30% (momentum)
   * - Active Streak: 20% (consistency)
   * - Completion Rate: 10% (progress)
   * 
   * @param {string} courseId - Optional: filter to specific course
   * @returns {Object} { score, breakdown, level, message }
   */
  async calculateCognitiveScore(courseId = null) {
    const cacheKey = `cognitive_${courseId || 'all'}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      // Gather all metrics
      const [velocity, mastery, streak, completion] = await Promise.all([
        this.calculateLearningVelocity(courseId),
        this.calculateQuizMastery(courseId),
        this.calculateStreak(),
        this.calculateCompletionRate(courseId)
      ]);
      
      // Normalize each metric to 0-100 scale
      const velocityNorm = Math.min(100, (velocity.velocity / 3) * 100); // Target: 3 lessons/week = 100
      const masteryNorm = mastery.mastery; // Already 0-100
      const streakNorm = Math.min(100, (streak.streak / 7) * 100); // Target: 7-day streak = 100
      const completionNorm = completion.percent; // Already 0-100
      
      // Apply weights
      const weights = {
        mastery: 0.40,
        velocity: 0.30,
        streak: 0.20,
        completion: 0.10
      };
      
      const score = Math.round(
        (masteryNorm * weights.mastery) +
        (velocityNorm * weights.velocity) +
        (streakNorm * weights.streak) +
        (completionNorm * weights.completion)
      );
      
      // Determine level and message
      const { level, message } = this.getCognitiveLevel(score, mastery, velocity, streak);
      
      const result = {
        score,
        breakdown: {
          mastery: { raw: mastery.mastery, normalized: Math.round(masteryNorm), weighted: Math.round(masteryNorm * weights.mastery), weight: '40%' },
          velocity: { raw: velocity.velocity, normalized: Math.round(velocityNorm), weighted: Math.round(velocityNorm * weights.velocity), weight: '30%' },
          streak: { raw: streak.streak, normalized: Math.round(streakNorm), weighted: Math.round(streakNorm * weights.streak), weight: '20%' },
          completion: { raw: completion.percent, normalized: Math.round(completionNorm), weighted: Math.round(completionNorm * weights.completion), weight: '10%' }
        },
        level,
        message,
        // Include raw metrics for display
        metrics: { velocity, mastery, streak, completion }
      };
      
      this.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error('Error calculating cognitive score:', error);
      return { score: 0, breakdown: {}, level: 'beginner', message: 'Start learning to see your progress!' };
    }
  },
  
  /**
   * Get level and personalized message based on score
   */
  getCognitiveLevel(score, mastery, velocity, streak) {
    // Determine level
    let level;
    if (score >= 80) level = 'expert';
    else if (score >= 60) level = 'proficient';
    else if (score >= 40) level = 'developing';
    else if (score >= 20) level = 'beginner';
    else level = 'starting';
    
    // Generate personalized message
    let message;
    
    if (score >= 80) {
      message = "Outstanding! You're mastering content efficiently and consistently. 🌟";
    } else if (score >= 60) {
      message = "Great progress! You're building solid understanding. Keep it up! 💪";
    } else if (score >= 40) {
      // Identify what needs improvement
      if (mastery.mastery < 50) {
        message = "Focus on understanding - review quiz answers carefully. 🎯";
      } else if (velocity.velocity < 1) {
        message = "Try to complete at least 1-2 lessons per week to build momentum. 🚀";
      } else if (streak.streak < 2) {
        message = "Build consistency - even 10 minutes daily helps! 📅";
      } else {
        message = "Good foundation! Keep learning regularly. 📚";
      }
    } else if (score >= 20) {
      message = "You're getting started! Set a goal to learn a little each day. 🌱";
    } else {
      message = "Begin your learning journey - every expert was once a beginner! ✨";
    }
    
    return { level, message };
  },
  
  /**
   * Calculate overall completion rate
   */
  async calculateCompletionRate(courseId = null) {
    try {
      const courses = await window.DataService.getEnrolledCourses();
      if (!courses || courses.length === 0) {
        return { percent: 0, completed: 0, total: 0 };
      }
      
      let totalLessons = 0;
      let completedLessons = 0;
      
      for (const course of courses) {
        if (courseId && course.id !== courseId) continue;
        
        const lessons = await window.DataService.getAllLessonsProgress(course.id);
        totalLessons += 7; // Each course has 7 lessons
        
        for (const lesson of lessons) {
          if (lesson.completed) completedLessons++;
        }
      }
      
      const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      
      return { percent, completed: completedLessons, total: totalLessons };
      
    } catch (error) {
      console.error('Error calculating completion rate:', error);
      return { percent: 0, completed: 0, total: 0 };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAPTER ANALYTICS
  // Per-lesson breakdown for course dashboard
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get detailed analytics for all chapters in a course
   * 
   * @param {string} courseId - The course to analyze
   * @returns {Object} { chapters: [...], totals: {...}, timeline: [...] }
   */
  async getChapterAnalytics(courseId) {
    const cacheKey = `chapters_${courseId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      // Get all lesson progress
      const lessons = await window.DataService.getAllLessonsProgress(courseId);
      
      // Get activity attempts for this course
      const attempts = await window.DataService.getActivityAttempts({ courseId });
      
      // Group attempts by lesson
      const attemptsByLesson = {};
      for (const attempt of attempts) {
        const lessonId = attempt.lessonId;
        if (!attemptsByLesson[lessonId]) {
          attemptsByLesson[lessonId] = [];
        }
        attemptsByLesson[lessonId].push(attempt);
      }
      
      // Build chapter analytics
      const chapterNames = {
        'ch0-origins': { name: 'Chapter 0: Origins', icon: '🏛️' },
        'ch1-stone': { name: 'Chapter 1: Stone', icon: '🪨' },
        'ch2-lightning': { name: 'Chapter 2: Lightning', icon: '⚡' },
        'ch3-magnetism': { name: 'Chapter 3: Magnetism', icon: '🧲' },
        'ch4-architect': { name: 'Chapter 4: Architect', icon: '🏗️' },
        'ch5-capstone1': { name: 'Chapter 5: Capstone I', icon: '🎯' },
        'ch6-capstone2': { name: 'Chapter 6: Capstone II', icon: '🏆' }
      };
      
      const chapters = [];
      const timeline = [];
      let totalTimeMs = 0;
      let totalActivities = 0;
      let totalQuizScore = 0;
      let quizCount = 0;
      
      // Process each chapter
      for (const [lessonId, meta] of Object.entries(chapterNames)) {
        const lessonProgress = lessons.find(l => l.id === lessonId) || {};
        const lessonAttempts = attemptsByLesson[lessonId] || [];
        
        // Calculate quiz score for this chapter
        const quizAttempts = lessonAttempts.filter(a => a.activityType === 'quiz');
        let chapterQuizScore = null;
        if (quizAttempts.length > 0) {
          // Get first attempt score
          const firstAttempt = quizAttempts.reduce((min, a) => 
            (a.attemptNumber || 1) < (min.attemptNumber || 1) ? a : min, quizAttempts[0]);
          chapterQuizScore = Math.round((firstAttempt.score || 0) * 100);
          totalQuizScore += chapterQuizScore;
          quizCount++;
        }
        
        // Calculate time spent
        const timeSpentMs = lessonProgress.totalTimeSpent || lessonProgress.timeSpent || 0;
        totalTimeMs += timeSpentMs;
        
        // Count activities
        const activitiesCompleted = lessonAttempts.length;
        totalActivities += activitiesCompleted;
        
        const chapter = {
          id: lessonId,
          name: meta.name,
          icon: meta.icon,
          status: lessonProgress.completed ? 'completed' : 
                  (lessonProgress.progressPercent > 0 ? 'in_progress' : 'not_started'),
          progressPercent: lessonProgress.progressPercent || 0,
          timeSpentMs,
          timeSpentFormatted: this.formatDuration(timeSpentMs),
          quizScore: chapterQuizScore,
          activitiesCompleted,
          totalActivities: lessonAttempts.length,
          startedAt: lessonProgress.startedAt,
          completedAt: lessonProgress.completedAt
        };
        
        chapters.push(chapter);
        
        // Add to timeline if completed
        if (lessonProgress.completedAt) {
          timeline.push({
            lessonId,
            name: meta.name,
            icon: meta.icon,
            completedAt: lessonProgress.completedAt,
            quizScore: chapterQuizScore
          });
        }
      }
      
      // Sort timeline by completion date
      timeline.sort((a, b) => {
        const aTime = a.completedAt?._seconds || 0;
        const bTime = b.completedAt?._seconds || 0;
        return aTime - bTime;
      });
      
      const result = {
        chapters,
        totals: {
          completed: chapters.filter(c => c.status === 'completed').length,
          inProgress: chapters.filter(c => c.status === 'in_progress').length,
          notStarted: chapters.filter(c => c.status === 'not_started').length,
          totalTimeMs,
          totalTimeFormatted: this.formatDuration(totalTimeMs),
          avgQuizScore: quizCount > 0 ? Math.round(totalQuizScore / quizCount) : null,
          totalActivities
        },
        timeline
      };
      
      this.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error('Error getting chapter analytics:', error);
      return { chapters: [], totals: {}, timeline: [] };
    }
  },
  
  /**
   * Format milliseconds to human-readable duration
   */
  formatDuration(ms) {
    if (!ms || ms < 1000) return '0m';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD SUMMARY
  // All-in-one method for loading dashboard analytics
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get complete analytics summary for dashboard display
   * 
   * @returns {Object} Complete analytics object
   */
  async getDashboardSummary() {
    const cacheKey = 'dashboard_summary';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      // Fetch all metrics in parallel
      const [cognitive, velocity, mastery, streak] = await Promise.all([
        this.calculateCognitiveScore(),
        this.calculateLearningVelocity(),
        this.calculateQuizMastery(),
        this.calculateStreak()
      ]);
      
      const result = {
        cognitiveScore: cognitive.score,
        cognitiveLevel: cognitive.level,
        cognitiveMessage: cognitive.message,
        
        velocity: velocity.velocity,
        velocityTrend: velocity.trend,
        velocityTrendPercent: velocity.trendPercent,
        lessonsCompleted: velocity.lessonsCompleted,
        
        quizMastery: mastery.mastery,
        quizzesCompleted: mastery.totalQuizzes,
        strongestTopic: mastery.strongestTopic,
        weakestTopic: mastery.weakestTopic,
        
        streak: streak.streak,
        longestStreak: streak.longestStreak,
        isActiveToday: streak.isActiveToday,
        
        // Full data for detailed views
        fullData: { cognitive, velocity, mastery, streak }
      };
      
      this.setCache(cacheKey, result);
      return result;
      
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      return {
        cognitiveScore: 0,
        cognitiveLevel: 'starting',
        cognitiveMessage: 'Start learning to see your progress!',
        velocity: 0,
        quizMastery: 0,
        streak: 0
      };
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
  // USER ANALYTICS (from Firestore userAnalytics collection)
  // Server-computed analytics with learning style, persistence metrics, etc.
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Fetch the user's computed analytics from Firestore
   * This data is computed by Cloud Functions and includes:
   * - Learning style (visual, auditory, kinesthetic, reading)
   * - Strength and growth areas
   * - Engagement patterns
   * - Persistence metrics
   * 
   * @returns {Object|null} User analytics document or null if not computed yet
   */
  async getUserAnalytics() {
    const cacheKey = 'user_analytics';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      const user = firebase.auth().currentUser;
      if (!user) return null;
      
      const doc = await firebase.firestore()
        .collection('userAnalytics')
        .doc(user.uid)
        .get();
      
      if (!doc.exists) {
        console.log('📊 No computed analytics yet - user needs more activity');
        return null;
      }
      
      const data = doc.data();
      console.log('📊 Loaded user analytics:', data);
      
      this.setCache(cacheKey, data);
      return data;
      
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return null;
    }
  },
  
  /**
   * Get learning insights combining client-calculated and server-computed analytics
   * 
   * @returns {Object} Combined learning insights
   */
  async getLearningInsights() {
    const cacheKey = 'learning_insights';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      // Fetch both client-side and server-computed analytics
      const [dashboardSummary, userAnalytics] = await Promise.all([
        this.getDashboardSummary(),
        this.getUserAnalytics()
      ]);
      
      // Start with dashboard summary as base
      const insights = {
        ...dashboardSummary,
        
        // Add server-computed analytics if available
        hasServerAnalytics: !!userAnalytics,
        
        // Learning style
        learningStyle: userAnalytics?.learningStyle || null,
        
        // Strength areas (server) or fallback to client mastery
        strengthAreas: userAnalytics?.strengthAreas || [],
        
        // Growth areas with suggestions
        growthAreas: userAnalytics?.growthAreas || [],
        
        // Enhanced engagement patterns
        engagementPatterns: userAnalytics?.engagementPatterns || {
          preferredTimes: [],
          avgSessionLength: 0,
          peakPerformanceDay: null,
          peakPerformanceHour: null,
          consistencyScore: 0,
          streakRecord: dashboardSummary.longestStreak || 0,
          currentStreak: dashboardSummary.streak || 0
        },
        
        // Persistence metrics (server-only)
        persistenceMetrics: userAnalytics?.persistenceMetrics || null,
        
        // Summary stats
        summaryStats: userAnalytics?.summaryStats || null,
        
        // Data quality indicator
        dataQuality: userAnalytics?.dataQuality || {
          hasEnoughData: false,
          activityCount: 0,
          daysCovered: 0
        },
        
        // Last computed timestamp
        lastComputed: userAnalytics?.lastComputed || null
      };
      
      this.setCache(cacheKey, insights);
      return insights;
      
    } catch (error) {
      console.error('Error getting learning insights:', error);
      return this.getDashboardSummary();
    }
  },
  
  /**
   * Format learning style for display
   * 
   * @param {Object} learningStyle - The learning style object
   * @returns {Object} Formatted learning style with icon and description
   */
  formatLearningStyle(learningStyle) {
    if (!learningStyle || !learningStyle.primary) {
      return {
        primary: { name: 'Unknown', icon: '❓', description: 'Complete more activities to determine your learning style' },
        secondary: null,
        confidence: 0
      };
    }
    
    const styleInfo = {
      visual: {
        name: 'Visual',
        icon: '👁️',
        description: 'You learn best through diagrams, charts, and visual representations'
      },
      auditory: {
        name: 'Auditory',
        icon: '👂',
        description: 'You learn best through listening, discussions, and verbal explanations'
      },
      kinesthetic: {
        name: 'Kinesthetic',
        icon: '✋',
        description: 'You learn best through hands-on practice and interactive activities'
      },
      reading: {
        name: 'Reading/Writing',
        icon: '📖',
        description: 'You learn best through reading text and writing notes'
      }
    };
    
    return {
      primary: styleInfo[learningStyle.primary] || styleInfo.reading,
      secondary: learningStyle.secondary ? styleInfo[learningStyle.secondary] : null,
      confidence: learningStyle.confidence || 0,
      dataPoints: learningStyle.dataPoints || 0,
      breakdown: learningStyle.breakdown || {}
    };
  },
  
  /**
   * Get personalized recommendations based on analytics
   * 
   * @returns {Array} Array of recommendation objects
   */
  async getRecommendations() {
    const insights = await this.getLearningInsights();
    const recommendations = [];
    
    // Recommend based on growth areas
    if (insights.growthAreas && insights.growthAreas.length > 0) {
      const topGrowthArea = insights.growthAreas[0];
      recommendations.push({
        type: 'growth',
        priority: 'high',
        icon: '🎯',
        title: `Focus on ${this.formatTopicName(topGrowthArea.topic)}`,
        description: `Your score in this area is ${Math.round(topGrowthArea.score * 100)}%. Practice more to improve!`,
        action: topGrowthArea.suggestedResources?.[0] || null
      });
    }
    
    // Recommend based on streak
    if (insights.streak === 0 && insights.longestStreak > 0) {
      recommendations.push({
        type: 'consistency',
        priority: 'medium',
        icon: '🔥',
        title: 'Restart Your Streak',
        description: `You've had a ${insights.longestStreak}-day streak before. Complete an activity today!`,
        action: null
      });
    }
    
    // Recommend based on learning style
    if (insights.learningStyle?.primary) {
      const style = this.formatLearningStyle(insights.learningStyle);
      recommendations.push({
        type: 'style',
        priority: 'low',
        icon: style.primary.icon,
        title: `You're a ${style.primary.name} Learner`,
        description: style.primary.description,
        action: null
      });
    }
    
    // Recommend based on engagement patterns
    if (insights.engagementPatterns?.peakPerformanceDay) {
      const patterns = insights.engagementPatterns;
      recommendations.push({
        type: 'timing',
        priority: 'low',
        icon: '⏰',
        title: 'Optimal Study Time',
        description: `You perform best on ${patterns.peakPerformanceDay}s around ${patterns.peakPerformanceHour}:00. Schedule your learning then!`,
        action: null
      });
    }
    
    return recommendations;
  },
  
  /**
   * Format topic ID to human-readable name
   */
  formatTopicName(topic) {
    if (!topic) return 'Unknown';
    return topic
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
};

// Export for global access
window.AnalyticsService = AnalyticsService;

