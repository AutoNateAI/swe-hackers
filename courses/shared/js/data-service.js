/**
 * Data Service for AutoNateAI Learning Hub
 * Handles progress tracking, quiz answers, and performance metrics
 */

const DataService = {
  
  /**
   * Get user's course progress
   */
  async getCourseProgress(courseId) {
    const user = window.AuthService.getUser();
    if (!user) return null;
    
    const db = window.FirebaseApp.getDb();
    const progressRef = db.collection('users').doc(user.uid)
                         .collection('courseProgress').doc(courseId);
    
    try {
      const doc = await progressRef.get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Error getting course progress:', error);
      return null;
    }
  },

  /**
   * Update lesson progress
   */
  async updateLessonProgress(courseId, lessonId, data) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const db = window.FirebaseApp.getDb();
    const progressRef = db.collection('users').doc(user.uid)
                         .collection('courseProgress').doc(courseId);
    
    const updateData = {
      [`lessons.${lessonId}`]: {
        ...data,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      },
      lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
      await progressRef.set(updateData, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error updating lesson progress:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Mark lesson as complete
   */
  async completeLesson(courseId, lessonId) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const db = window.FirebaseApp.getDb();
    const progressRef = db.collection('users').doc(user.uid)
                         .collection('courseProgress').doc(courseId);
    
    try {
      await progressRef.set({
        [`lessons.${lessonId}.completed`]: true,
        [`lessons.${lessonId}.completedAt`]: firebase.firestore.FieldValue.serverTimestamp(),
        lastActivity: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      // Update overall progress
      await this.recalculateCourseProgress(courseId);
      
      return { success: true };
    } catch (error) {
      console.error('Error completing lesson:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Recalculate overall course progress
   */
  async recalculateCourseProgress(courseId) {
    const user = window.AuthService.getUser();
    if (!user) return;
    
    const db = window.FirebaseApp.getDb();
    const progressRef = db.collection('users').doc(user.uid)
                         .collection('courseProgress').doc(courseId);
    
    try {
      const doc = await progressRef.get();
      if (!doc.exists) return;
      
      const data = doc.data();
      const lessons = data.lessons || {};
      
      // Count completed lessons - check both 'completed' flag and 100% viewed
      let completedLessons = 0;
      Object.entries(lessons).forEach(([lessonId, lesson]) => {
        const isComplete = lesson.completed || 
                          lesson.progressPercent >= 100 ||
                          (lesson.viewedSections && lesson.totalSections && 
                           lesson.viewedSections >= lesson.totalSections);
        if (isComplete) {
          completedLessons++;
        }
      });
      
      const progressPercent = Math.round((completedLessons / 7) * 100);
      
      console.log('📊 Recalculating course progress:', {
        courseId,
        completedLessons,
        progressPercent,
        lessonsData: Object.keys(lessons).length
      });
      
      await progressRef.update({
        progressPercent,
        completedLessons,
        totalLessons: 7 // Fixed for our 7-chapter courses (includes ch0-origins)
      });
      
      console.log('📊 Course progress updated:', completedLessons, '/ 7 complete');
    } catch (error) {
      console.error('Error recalculating progress:', error);
    }
  },

  /**
   * Save quiz answer
   */
  async saveQuizAnswer(courseId, lessonId, quizId, answer, isCorrect) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const db = window.FirebaseApp.getDb();
    const answersRef = db.collection('users').doc(user.uid)
                        .collection('quizAnswers').doc();
    
    const answerData = {
      courseId,
      lessonId,
      quizId,
      answer,
      isCorrect,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
      await answersRef.set(answerData);
      
      // Update lesson stats
      await this.updateLessonStats(courseId, lessonId, 'quiz', isCorrect);
      
      return { success: true, id: answersRef.id };
    } catch (error) {
      console.error('Error saving quiz answer:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Save activity performance
   */
  async saveActivityPerformance(courseId, lessonId, activityId, performanceData) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const db = window.FirebaseApp.getDb();
    const activityRef = db.collection('users').doc(user.uid)
                         .collection('activityPerformance').doc();
    
    const data = {
      courseId,
      lessonId,
      activityId,
      ...performanceData,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
      await activityRef.set(data);
      return { success: true, id: activityRef.id };
    } catch (error) {
      console.error('Error saving activity performance:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Track time spent on lesson
   */
  async trackTimeSpent(courseId, lessonId, seconds) {
    const user = window.AuthService.getUser();
    if (!user) return;
    
    const db = window.FirebaseApp.getDb();
    const progressRef = db.collection('users').doc(user.uid)
                         .collection('courseProgress').doc(courseId);
    
    try {
      await progressRef.set({
        [`lessons.${lessonId}.timeSpent`]: firebase.firestore.FieldValue.increment(seconds),
        totalTimeSpent: firebase.firestore.FieldValue.increment(seconds)
      }, { merge: true });
    } catch (error) {
      console.error('Error tracking time:', error);
    }
  },

  /**
   * Update lesson stats (quiz attempts, correct answers, etc.)
   */
  async updateLessonStats(courseId, lessonId, type, isCorrect) {
    const user = window.AuthService.getUser();
    if (!user) return;
    
    const db = window.FirebaseApp.getDb();
    const progressRef = db.collection('users').doc(user.uid)
                         .collection('courseProgress').doc(courseId);
    
    const updates = {
      [`lessons.${lessonId}.stats.${type}Attempts`]: firebase.firestore.FieldValue.increment(1)
    };
    
    if (isCorrect) {
      updates[`lessons.${lessonId}.stats.${type}Correct`] = firebase.firestore.FieldValue.increment(1);
    }
    
    try {
      await progressRef.set(updates, { merge: true });
    } catch (error) {
      console.error('Error updating lesson stats:', error);
    }
  },

  /**
   * Get user's enrolled courses
   */
  async getEnrolledCourses() {
    const user = window.AuthService.getUser();
    if (!user) return [];
    
    const db = window.FirebaseApp.getDb();
    const progressCollection = db.collection('users').doc(user.uid)
                                .collection('courseProgress');
    
    try {
      const snapshot = await progressCollection.get();
      
      // For each course, also fetch lesson progress from subcollection
      const courses = await Promise.all(snapshot.docs.map(async doc => {
        const courseData = { id: doc.id, ...doc.data() };
        
        // If lessons field is empty, fetch from subcollection
        if (!courseData.lessons || Object.keys(courseData.lessons).length === 0) {
          console.log('📊 Fetching lessons from subcollection for:', doc.id);
          const lessonsSnapshot = await db.collection('users').doc(user.uid)
            .collection('courseProgress').doc(doc.id)
            .collection('lessonProgress').get();
          
          // Build lessons object from subcollection
          const lessons = {};
          let completedCount = 0;
          
          lessonsSnapshot.docs.forEach(lessonDoc => {
            const lessonData = lessonDoc.data();
            lessons[lessonDoc.id] = {
              completed: lessonData.completed || lessonData.progressPercent >= 100 || 
                        (lessonData.viewedSections >= lessonData.totalSections),
              progressPercent: lessonData.progressPercent || 0,
              viewedSections: lessonData.viewedSections || 0,
              totalSections: lessonData.totalSections || 0,
              totalTimeSpent: lessonData.totalTimeSpent || 0
            };
            
            if (lessons[lessonDoc.id].completed) {
              completedCount++;
            }
          });
          
          courseData.lessons = lessons;
          courseData.completedLessons = Math.max(courseData.completedLessons || 0, completedCount);
          courseData.progressPercent = Math.round((completedCount / 7) * 100);
          
          console.log('📊 Loaded lessons from subcollection:', {
            courseId: doc.id,
            lessonCount: Object.keys(lessons).length,
            completedCount,
            lessons
          });
        }
        
        return courseData;
      }));
      
      return courses;
    } catch (error) {
      console.error('Error getting enrolled courses:', error);
      return [];
    }
  },

  /**
   * Enroll in a course
   */
  async enrollInCourse(courseId, courseData) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const db = window.FirebaseApp.getDb();
    const progressRef = db.collection('users').doc(user.uid)
                         .collection('courseProgress').doc(courseId);
    
    const enrollmentData = {
      courseId,
      courseName: courseData.name,
      courseIcon: courseData.icon,
      enrolledAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
      progressPercent: 0,
      completedLessons: 0,
      totalLessons: 7, // Includes ch0-origins pre-quest
      lessons: {}
    };
    
    try {
      await progressRef.set(enrollmentData);
      return { success: true };
    } catch (error) {
      console.error('Error enrolling in course:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get daily challenges completed
   */
  async getDailyChallenges() {
    const user = window.AuthService.getUser();
    if (!user) return [];
    
    const db = window.FirebaseApp.getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const challengesRef = db.collection('users').doc(user.uid)
                           .collection('dailyChallenges')
                           .where('date', '>=', today)
                           .orderBy('date', 'desc')
                           .limit(7);
    
    try {
      const snapshot = await challengesRef.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting daily challenges:', error);
      return [];
    }
  },

  /**
   * Complete daily challenge
   */
  async completeDailyChallenge(challengeId, result) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const db = window.FirebaseApp.getDb();
    const challengeRef = db.collection('users').doc(user.uid)
                          .collection('dailyChallenges').doc();
    
    const challengeData = {
      challengeId,
      date: firebase.firestore.Timestamp.now(),
      completed: true,
      result,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
      await challengeRef.set(challengeData);
      
      // Update streak
      await this.updateStreak();
      
      return { success: true };
    } catch (error) {
      console.error('Error completing challenge:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update user's learning streak
   */
  async updateStreak() {
    const user = window.AuthService.getUser();
    if (!user) return;
    
    const db = window.FirebaseApp.getDb();
    const userRef = db.collection('users').doc(user.uid);
    
    try {
      const doc = await userRef.get();
      const userData = doc.data();
      const lastActivity = userData.lastStreakDate?.toDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let currentStreak = userData.currentStreak || 0;
      
      if (lastActivity) {
        const lastDate = new Date(lastActivity);
        lastDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          // Already logged today
          return;
        } else if (diffDays === 1) {
          // Consecutive day
          currentStreak++;
        } else {
          // Streak broken
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      
      await userRef.update({
        currentStreak,
        longestStreak: Math.max(currentStreak, userData.longestStreak || 0),
        lastStreakDate: firebase.firestore.Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  },

  /**
   * Get user stats
   */
  async getUserStats() {
    const user = window.AuthService.getUser();
    if (!user) return null;
    
    const db = window.FirebaseApp.getDb();
    
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      const coursesSnapshot = await db.collection('users').doc(user.uid)
                                     .collection('courseProgress').get();
      
      const userData = userDoc.data();
      let totalTimeSpent = 0;
      let completedLessons = 0;
      
      coursesSnapshot.docs.forEach(doc => {
        const course = doc.data();
        totalTimeSpent += course.totalTimeSpent || 0;
        completedLessons += course.completedLessons || 0;
      });
      
      return {
        currentStreak: userData.currentStreak || 0,
        longestStreak: userData.longestStreak || 0,
        totalTimeSpent,
        completedLessons,
        enrolledCourses: coursesSnapshot.size
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  },

  /**
   * Save detailed lesson progress (sections, time spent per section, etc.)
   */
  async saveLessonProgress(courseId, lessonId, progressData) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const db = window.FirebaseApp.getDb();
    const lessonRef = db.collection('users').doc(user.uid)
                       .collection('courseProgress').doc(courseId)
                       .collection('lessonProgress').doc(lessonId);
    
    const data = {
      ...progressData,
      userId: user.uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
      await lessonRef.set(data, { merge: true });
      
      // Also update the parent course progress with last lesson info
      const courseRef = db.collection('users').doc(user.uid)
                         .collection('courseProgress').doc(courseId);
      
      // Mark lesson as complete if all sections viewed
      const isComplete = progressData.progressPercent >= 100 || 
                        (progressData.viewedSections >= progressData.totalSections);
      
      const lessonData = {
        progressPercent: progressData.progressPercent,
        viewedSections: progressData.viewedSections,
        totalSections: progressData.totalSections,
        totalTimeSpent: progressData.totalTimeSpent,
        lastSection: progressData.lastSection,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Only mark completed if actually complete
      if (isComplete) {
        lessonData.completed = true;
        lessonData.completedAt = firebase.firestore.FieldValue.serverTimestamp();
      }
      
      console.log('📊 Saving lesson progress:', {
        courseId,
        lessonId,
        isComplete,
        progressPercent: progressData.progressPercent,
        viewedSections: progressData.viewedSections,
        totalSections: progressData.totalSections
      });
      
      // Build the update data using Firestore dot notation for nested field updates
      const fieldPath = `lessons.${lessonId}`;
      const updateData = {
        lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
        lastLesson: lessonId,
        lastLessonProgress: progressData.progressPercent,
        [fieldPath]: lessonData
      };
      
      console.log('📊 Updating course document with field path:', fieldPath);
      console.log('📊 Lesson data being saved:', lessonData);
      
      try {
        await courseRef.set(updateData, { merge: true });
        console.log('📊 Course document updated successfully');
      } catch (courseUpdateError) {
        console.error('📊 Failed to update course document:', courseUpdateError);
        throw courseUpdateError;
      }
      
      // Recalculate overall progress if lesson was completed
      if (isComplete) {
        console.log('📊 Lesson complete, recalculating course progress...');
        await this.recalculateCourseProgress(courseId);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error saving lesson progress:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get detailed lesson progress
   */
  async getLessonProgress(courseId, lessonId) {
    const user = window.AuthService.getUser();
    if (!user) return null;
    
    const db = window.FirebaseApp.getDb();
    const lessonRef = db.collection('users').doc(user.uid)
                       .collection('courseProgress').doc(courseId)
                       .collection('lessonProgress').doc(lessonId);
    
    try {
      const doc = await lessonRef.get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Error getting lesson progress:', error);
      return null;
    }
  },

  /**
   * Get all lessons progress for a course
   */
  async getAllLessonsProgress(courseId) {
    const user = window.AuthService.getUser();
    if (!user) return [];
    
    const db = window.FirebaseApp.getDb();
    const lessonsRef = db.collection('users').doc(user.uid)
                        .collection('courseProgress').doc(courseId)
                        .collection('lessonProgress');
    
    try {
      const snapshot = await lessonsRef.orderBy('updatedAt', 'desc').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting lessons progress:', error);
      return [];
    }
  },

  /**
   * Get user's notes for a course
   */
  async getNotes(courseId = null) {
    const user = window.AuthService.getUser();
    if (!user) return [];
    
    const db = window.FirebaseApp.getDb();
    let notesRef = db.collection('users').doc(user.uid).collection('notes');
    
    if (courseId) {
      notesRef = notesRef.where('courseId', '==', courseId);
    }
    
    try {
      const snapshot = await notesRef.orderBy('updatedAt', 'desc').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting notes:', error);
      return [];
    }
  },

  /**
   * Save a note
   */
  async saveNote(noteData) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const db = window.FirebaseApp.getDb();
    const noteId = noteData.id || db.collection('users').doc(user.uid).collection('notes').doc().id;
    const noteRef = db.collection('users').doc(user.uid).collection('notes').doc(noteId);
    
    const data = {
      ...noteData,
      id: noteId,
      userId: user.uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (!noteData.id) {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    
    try {
      await noteRef.set(data, { merge: true });
      return { success: true, id: noteId };
    } catch (error) {
      console.error('Error saving note:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a note
   */
  async deleteNote(noteId) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const db = window.FirebaseApp.getDb();
    const noteRef = db.collection('users').doc(user.uid).collection('notes').doc(noteId);
    
    try {
      await noteRef.delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting note:', error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVITY TRACKING METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save an activity attempt
   */
  async saveActivityAttempt(attemptData) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const db = window.FirebaseApp.getDb();
    const attemptRef = db.collection('users').doc(user.uid)
                        .collection('activityAttempts').doc();
    
    const data = {
      ...attemptData,
      odlActivityId: attemptData.activityId, // Keep original for queries
      userId: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Remove localId before saving to Firestore
    delete data.localId;
    
    try {
      await attemptRef.set(data);
      console.log('📊 Activity attempt saved:', attemptData.activityId);
      
      // Update activity stats on course progress
      await this.updateActivityStats(attemptData.courseId, attemptData);
      
      return { success: true, attemptId: attemptRef.id };
    } catch (error) {
      console.error('Error saving activity attempt:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update aggregated activity stats on course progress
   */
  async updateActivityStats(courseId, attemptData) {
    const user = window.AuthService.getUser();
    if (!user) return;
    
    const db = window.FirebaseApp.getDb();
    const courseRef = db.collection('users').doc(user.uid)
                       .collection('courseProgress').doc(courseId);
    
    try {
      // Get current stats
      const doc = await courseRef.get();
      const currentStats = doc.exists ? (doc.data().activityStats || {}) : {};
      
      // Update stats
      const newStats = {
        totalAttempts: (currentStats.totalAttempts || 0) + 1,
        totalCorrect: (currentStats.totalCorrect || 0) + (attemptData.correct ? 1 : 0),
        lastActivity: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Track first-try success
      if (attemptData.attemptNumber === 1 && attemptData.correct) {
        newStats.correctFirstTry = (currentStats.correctFirstTry || 0) + 1;
      }
      
      // Update by type
      const byType = currentStats.byType || {};
      const typeStats = byType[attemptData.activityType] || { attempts: 0, totalScore: 0 };
      typeStats.attempts += 1;
      typeStats.totalScore += attemptData.score || 0;
      typeStats.avgScore = typeStats.totalScore / typeStats.attempts;
      byType[attemptData.activityType] = typeStats;
      newStats.byType = byType;
      
      // Calculate overall avg score
      newStats.avgScore = newStats.totalCorrect / newStats.totalAttempts;
      
      await courseRef.set({
        activityStats: newStats
      }, { merge: true });
      
      console.log('📊 Activity stats updated for:', courseId);
    } catch (error) {
      console.error('Error updating activity stats:', error);
    }
  },

  /**
   * Get activity attempts with filters
   */
  async getActivityAttempts(filters = {}) {
    const user = window.AuthService.getUser();
    if (!user) return [];
    
    const db = window.FirebaseApp.getDb();
    let query = db.collection('users').doc(user.uid).collection('activityAttempts');
    
    // Apply filters
    if (filters.courseId) {
      query = query.where('courseId', '==', filters.courseId);
    }
    if (filters.lessonId) {
      query = query.where('lessonId', '==', filters.lessonId);
    }
    if (filters.activityType) {
      query = query.where('activityType', '==', filters.activityType);
    }
    if (filters.activityId) {
      query = query.where('activityId', '==', filters.activityId);
    }
    
    // Order by creation time
    query = query.orderBy('createdAt', 'desc');
    
    // Limit results
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    try {
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting activity attempts:', error);
      return [];
    }
  },

  /**
   * Get activity stats for a course
   */
  async getActivityStats(courseId) {
    const user = window.AuthService.getUser();
    if (!user) return null;
    
    const db = window.FirebaseApp.getDb();
    const courseRef = db.collection('users').doc(user.uid)
                       .collection('courseProgress').doc(courseId);
    
    try {
      const doc = await courseRef.get();
      return doc.exists ? doc.data().activityStats : null;
    } catch (error) {
      console.error('Error getting activity stats:', error);
      return null;
    }
  },

  /**
   * Recalculate activity stats from all attempts
   */
  async recalculateActivityStats(courseId) {
    const user = window.AuthService.getUser();
    if (!user) return;
    
    console.log('📊 Recalculating activity stats for:', courseId);
    
    // Get all attempts for this course
    const attempts = await this.getActivityAttempts({ courseId });
    
    if (attempts.length === 0) return;
    
    // Calculate stats
    const stats = {
      totalAttempts: attempts.length,
      totalCorrect: attempts.filter(a => a.correct).length,
      correctFirstTry: attempts.filter(a => a.attemptNumber === 1 && a.correct).length,
      byType: {},
      lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Group by type
    attempts.forEach(attempt => {
      const type = attempt.activityType || 'unknown';
      if (!stats.byType[type]) {
        stats.byType[type] = { attempts: 0, totalScore: 0 };
      }
      stats.byType[type].attempts += 1;
      stats.byType[type].totalScore += attempt.score || 0;
    });
    
    // Calculate averages
    Object.keys(stats.byType).forEach(type => {
      stats.byType[type].avgScore = stats.byType[type].totalScore / stats.byType[type].attempts;
    });
    stats.avgScore = stats.totalCorrect / stats.totalAttempts;
    
    // Save updated stats
    const db = window.FirebaseApp.getDb();
    const courseRef = db.collection('users').doc(user.uid)
                       .collection('courseProgress').doc(courseId);
    
    try {
      await courseRef.set({ activityStats: stats }, { merge: true });
      console.log('📊 Activity stats recalculated:', stats);
    } catch (error) {
      console.error('Error saving recalculated stats:', error);
    }
  },

  /**
   * Get activity definition (correct answer, points, etc.)
   */
  async getActivityDefinition(activityId) {
    const db = window.FirebaseApp.getDb();
    const activityRef = db.collection('activities').doc(activityId);
    
    try {
      const doc = await activityRef.get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Error getting activity definition:', error);
      return null;
    }
  },

  /**
   * Create or update activity definition (admin function)
   */
  async saveActivityDefinition(activityId, data) {
    const db = window.FirebaseApp.getDb();
    const activityRef = db.collection('activities').doc(activityId);
    
    try {
      await activityRef.set({
        ...data,
        activityId,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error saving activity definition:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export
window.DataService = DataService;

