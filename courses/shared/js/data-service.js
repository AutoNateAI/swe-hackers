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

      // Notify user in-app
      const meta = this.getLessonMeta(courseId, lessonId);
      await this.createNotification({
        type: 'lesson_complete',
        title: 'Lesson complete',
        body: `${meta?.name || lessonId} is now complete.`,
        source: 'progress',
        relatedId: lessonId,
        link: meta?.link || `../${courseId}/${lessonId}/`
      });
      
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
      const courseName = data.courseName || courseId;
      const notificationMilestones = data.notificationMilestones || {};
      
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

      const milestonePercents = [25, 50, 75, 100];
      for (const milestone of milestonePercents) {
        if (progressPercent >= milestone && !notificationMilestones[milestone]) {
          await this.createNotification({
            type: 'course_progress',
            title: 'Course progress',
            body: `${courseName} is now ${milestone}% complete.`,
            source: 'progress',
            relatedId: courseId,
            link: `../dashboard/course.html?id=${courseId}`,
            metadata: { progressPercent: milestone }
          });
          notificationMilestones[milestone] = true;
        }
      }
      
      console.log('📊 Recalculating course progress:', {
        courseId,
        completedLessons,
        progressPercent,
        lessonsData: Object.keys(lessons).length
      });
      
      await progressRef.set({
        progressPercent,
        completedLessons,
        totalLessons: 7, // Fixed for our 7-chapter courses (includes ch0-origins)
        notificationMilestones
      }, { merge: true });
      
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
      const doc = await progressRef.get();
      const progressData = doc.exists ? doc.data() : {};
      const previousTotal = progressData.totalTimeSpent || 0;
      const newTotal = previousTotal + seconds;
      const timeMilestonesNotified = progressData.timeMilestonesNotified || {};
      const courseName = progressData.courseName || courseId;

      const timeMilestones = [
        { hours: 1, seconds: 3600 },
        { hours: 5, seconds: 5 * 3600 },
        { hours: 10, seconds: 10 * 3600 }
      ];

      for (const milestone of timeMilestones) {
        if (newTotal >= milestone.seconds && !timeMilestonesNotified[milestone.seconds]) {
          await this.createNotification({
            type: 'time_milestone',
            title: 'Time milestone',
            body: `You've spent ${milestone.hours} hour${milestone.hours === 1 ? '' : 's'} learning in ${courseName}.`,
            source: 'progress',
            relatedId: courseId,
            link: `../dashboard/course.html?id=${courseId}`,
            metadata: { hours: milestone.hours }
          });
          timeMilestonesNotified[milestone.seconds] = true;
        }
      }

      const updateData = {
        [`lessons.${lessonId}.timeSpent`]: firebase.firestore.FieldValue.increment(seconds),
        totalTimeSpent: firebase.firestore.FieldValue.increment(seconds)
      };

      if (Object.keys(timeMilestonesNotified).length) {
        updateData.timeMilestonesNotified = timeMilestonesNotified;
      }

      await progressRef.set(updateData, { merge: true });
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
   * Uses Promise.allSettled for resilience - partial failures won't break the entire load
   */
  async getEnrolledCourses() {
    const user = window.AuthService.getUser();
    if (!user) return [];

    const db = window.FirebaseApp.getDb();
    const progressCollection = db.collection('users').doc(user.uid)
                                .collection('courseProgress');

    // Helper: wrap a promise with a timeout
    const withTimeout = (promise, timeoutMs = 10000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
        )
      ]);
    };

    try {
      // Get course list with timeout
      const snapshot = await withTimeout(progressCollection.get(), 15000);

      // Process each course with individual error handling
      const coursePromises = snapshot.docs.map(async doc => {
        try {
          const courseData = { id: doc.id, ...doc.data() };

          // If lessons field is empty, fetch from subcollection (with timeout)
          if (!courseData.lessons || Object.keys(courseData.lessons).length === 0) {
            console.log('📊 Fetching lessons from subcollection for:', doc.id);

            try {
              const lessonsSnapshot = await withTimeout(
                db.collection('users').doc(user.uid)
                  .collection('courseProgress').doc(doc.id)
                  .collection('lessonProgress').get(),
                8000
              );

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
            } catch (lessonError) {
              // Lessons subcollection failed, but we can still show the course
              console.warn('📊 Failed to load lessons for course:', doc.id, lessonError.message);
              courseData.lessons = courseData.lessons || {};
              courseData._lessonsLoadFailed = true;
            }
          }

          return { success: true, course: courseData };
        } catch (courseError) {
          console.error('📊 Failed to process course:', doc.id, courseError.message);
          return { success: false, courseId: doc.id, error: courseError.message };
        }
      });

      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled(coursePromises);

      // Extract successfully loaded courses
      const courses = [];
      let failedCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          courses.push(result.value.course);
        } else {
          failedCount++;
          console.warn('📊 Course load failed:', result.status === 'fulfilled'
            ? result.value.error
            : result.reason?.message);
        }
      });

      if (failedCount > 0) {
        console.warn(`📊 ${failedCount} course(s) failed to load, showing ${courses.length} courses`);
      }

      return courses;
    } catch (error) {
      console.error('Error getting enrolled courses:', error);
      // Return empty array on total failure, but log the specific error
      if (error.message === 'Query timeout') {
        console.error('📊 Course list query timed out - check network connection');
      }
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
      await this.createNotification({
        type: 'course_enrolled',
        title: 'Course enrolled',
        body: `You're enrolled in ${courseData.name}.`,
        source: 'progress',
        relatedId: courseId,
        link: `../dashboard/course.html?id=${courseId}`
      });
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

      await this.createNotification({
        type: 'daily_challenge_complete',
        title: 'Daily challenge complete',
        body: 'You completed today\'s challenge. Keep the streak alive.',
        source: 'challenge',
        relatedId: challengeId,
        link: '../challenges.html'
      });
      
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
      const prevStreak = currentStreak;
      
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
          if (prevStreak >= 3) {
            await this.createNotification({
              type: 'streak_broken',
              title: 'Streak reset',
              body: `Your ${prevStreak}-day streak ended. Start a new one today.`,
              source: 'progress',
              relatedId: String(prevStreak),
              link: '../dashboard/index.html'
            });
          }
        }
      } else {
        currentStreak = 1;
      }
      
      await userRef.update({
        currentStreak,
        longestStreak: Math.max(currentStreak, userData.longestStreak || 0),
        lastStreakDate: firebase.firestore.Timestamp.now()
      });

      const milestones = new Set([3, 7, 14, 30, 100]);
      if (currentStreak !== prevStreak && milestones.has(currentStreak)) {
        await this.createNotification({
          type: 'streak',
          title: 'Streak milestone',
          body: `You reached a ${currentStreak}-day streak.`,
          source: 'progress',
          relatedId: String(currentStreak),
          link: '../dashboard/index.html'
        });
      }
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
    let wasCompleted = false;
    let wasHalfwayNotified = false;
    try {
      const existing = await lessonRef.get();
      wasCompleted = existing.exists && existing.data().completed === true;
      wasHalfwayNotified = existing.exists && existing.data().notifiedHalfway === true;
    } catch (error) {
      console.warn('Unable to read existing lesson progress:', error);
    }
    
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

      if (!wasHalfwayNotified && progressData.progressPercent >= 50 && progressData.progressPercent < 100) {
        const meta = this.getLessonMeta(courseId, lessonId);
        await this.createNotification({
          type: 'lesson_halfway',
          title: 'Lesson halfway',
          body: `${meta?.name || lessonId} is halfway complete.`,
          source: 'progress',
          relatedId: lessonId,
          link: meta?.link || `../${courseId}/${lessonId}/`,
          metadata: { progressPercent: 50 }
        });
        data.notifiedHalfway = true;
      }
      
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

        if (!wasCompleted) {
          const meta = this.getLessonMeta(courseId, lessonId);
          await this.createNotification({
            type: 'lesson_complete',
            title: 'Lesson complete',
            body: `${meta?.name || lessonId} is now complete.`,
            source: 'progress',
            relatedId: lessonId,
            link: meta?.link || `../${courseId}/${lessonId}/`
          });
        }
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

      // Notify on first-try quiz mastery
      if (attemptData.activityType === 'quiz' && attemptData.attemptNumber === 1 && attemptData.correct) {
        await this.createNotification({
          type: 'quiz_mastery',
          title: 'Quiz mastery',
          body: `Perfect first try on ${attemptData.activityId}.`,
          source: 'activity',
          relatedId: attemptData.activityId,
          metadata: { score: attemptData.score || 1 },
          link: `../${attemptData.courseId}/${attemptData.lessonId}/`
        });
      }
      
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
      const prevTotalAttempts = currentStats.totalAttempts || 0;
      
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

      const byActivity = currentStats.byActivity || {};
      const activityStats = byActivity[attemptData.activityId] || { attempts: 0, bestScore: 0 };
      const prevActivityAttempts = activityStats.attempts || 0;
      const prevBestScore = activityStats.bestScore || 0;
      const normalizedScore = typeof attemptData.score === 'number'
        ? attemptData.score
        : (attemptData.correct ? 1 : 0);

      activityStats.attempts = prevActivityAttempts + 1;
      activityStats.bestScore = Math.max(prevBestScore, normalizedScore);
      byActivity[attemptData.activityId] = activityStats;
      newStats.byActivity = byActivity;

      const flags = currentStats.flags || {};
      const lowMasteryNotified = flags.lowMasteryNotified || {};
      const highMasteryNotified = flags.highMasteryNotified || {};
      newStats.flags = flags;
      
      // Calculate overall avg score
      newStats.avgScore = newStats.totalCorrect / newStats.totalAttempts;

      if (prevTotalAttempts === 0) {
        await this.createNotification({
          type: 'first_activity',
          title: 'First activity',
          body: 'Nice start! Your first activity is complete.',
          source: 'activity',
          relatedId: attemptData.activityId,
          link: `../${attemptData.courseId}/${attemptData.lessonId}/`
        });
      }

      if (activityStats.attempts === 3 && !activityStats.retryNotified) {
        await this.createNotification({
          type: 'activity_retry',
          title: 'Keep pushing',
          body: `Three attempts on ${attemptData.activityId}. Want a hint?`,
          source: 'activity',
          relatedId: attemptData.activityId,
          link: `../${attemptData.courseId}/${attemptData.lessonId}/`
        });
        activityStats.retryNotified = true;
      }

      if (typeStats.attempts >= 5 && typeStats.avgScore < 0.6 && !lowMasteryNotified[attemptData.activityType]) {
        await this.createNotification({
          type: 'low_mastery',
          title: 'Need a boost?',
          body: `Your recent ${attemptData.activityType} average is below 60%.`,
          source: 'activity',
          relatedId: attemptData.activityType,
          link: `../${attemptData.courseId}/${attemptData.lessonId}/`,
          metadata: { avgScore: typeStats.avgScore }
        });
        lowMasteryNotified[attemptData.activityType] = true;
      }

      if (typeStats.attempts >= 5 && typeStats.avgScore >= 0.9 && !highMasteryNotified[attemptData.activityType]) {
        await this.createNotification({
          type: 'high_mastery',
          title: 'Strong mastery',
          body: `You\'re averaging 90%+ on ${attemptData.activityType} activities.`,
          source: 'activity',
          relatedId: attemptData.activityType,
          link: `../${attemptData.courseId}/${attemptData.lessonId}/`,
          metadata: { avgScore: typeStats.avgScore }
        });
        highMasteryNotified[attemptData.activityType] = true;
      }

      flags.lowMasteryNotified = lowMasteryNotified;
      flags.highMasteryNotified = highMasteryNotified;
      
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
    
    try {
      // Simple query - get all attempts then filter client-side
      // This avoids needing composite indexes in Firestore
      const snapshot = await db.collection('users').doc(user.uid)
                               .collection('activityAttempts').get();
      
      let results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📊 Fetched all attempts:', results.length);
      
      // Apply filters client-side
      if (filters.courseId) {
        results = results.filter(a => a.courseId === filters.courseId);
      }
      if (filters.lessonId) {
        results = results.filter(a => a.lessonId === filters.lessonId);
      }
      if (filters.activityType) {
        results = results.filter(a => a.activityType === filters.activityType);
      }
      if (filters.activityId) {
        results = results.filter(a => a.activityId === filters.activityId);
      }
      
      // Sort by creation time (newest first)
      results.sort((a, b) => {
        const aTime = a.createdAt?._seconds || 0;
        const bTime = b.createdAt?._seconds || 0;
        return bTime - aTime;
      });
      
      // Apply limit
      if (filters.limit) {
        results = results.slice(0, filters.limit);
      }
      
      console.log('📊 Filtered attempts:', results.length);
      return results;
      
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
  },

  /**
   * Get next lesson to continue for a course
   * Returns the next incomplete lesson based on progress data
   * @param {object} courseProgress - The course progress object with lessons data
   * @param {string} courseId - The course ID to determine lesson structure
   * @returns {object} { lessonIndex, lessonId, lessonName, lessonDesc, link, allComplete }
   */
  getNextLesson(courseProgress, courseId) {
    const isEndlessOpportunities = courseId === 'endless-opportunities';
    
    // Define lesson structure based on course type
    const lessons = isEndlessOpportunities 
      ? [
          { id: 'week0-intro', name: 'Week 0: Introduction', desc: 'Getting started with your tech journey' },
          { id: 'week1-questions', name: 'Week 1: Asking Questions', desc: 'Learn to ask powerful questions' },
          { id: 'week2-data', name: 'Week 2: Working with Data', desc: 'Understand data and information' },
          { id: 'week3-building', name: 'Week 3: Building Things', desc: 'Create your first projects' },
          { id: 'week4-portfolio', name: 'Week 4: Your Portfolio', desc: 'Showcase your work' }
        ]
      : [
          { id: 'ch0-origins', name: 'The Origins', desc: 'Where it all began' },
          { id: 'ch1-stone', name: 'The Stone', desc: 'Data and memory fundamentals' },
          { id: 'ch2-lightning', name: 'The Lightning', desc: 'Control flow and logic' },
          { id: 'ch3-magnetism', name: 'The Magnetism', desc: 'Functions and connections' },
          { id: 'ch4-architect', name: 'The Architect', desc: 'Thinking in systems' },
          { id: 'ch5-capstone1', name: 'Capstone I', desc: 'Your first project' },
          { id: 'ch6-capstone2', name: 'Capstone II', desc: 'The final challenge' }
        ];
    
    const lessonLabel = isEndlessOpportunities ? 'Week' : 'Chapter';
    let nextIndex = 0;
    let allComplete = false;
    
    console.log('📊 getNextLesson for:', courseId);
    
    if (courseProgress?.lessons) {
      // Find the highest-index completed lesson, then return the one after it
      let highestCompletedIndex = -1;
      
      for (let i = 0; i < lessons.length; i++) {
        const lessonId = lessons[i].id;
        const lessonData = courseProgress.lessons[lessonId];
        
        // Check if this lesson is complete
        const isComplete = lessonData?.completed || 
                          lessonData?.progressPercent >= 100 ||
                          (lessonData?.viewedSections && lessonData?.totalSections && 
                           lessonData.viewedSections >= lessonData.totalSections);
        
        if (isComplete) {
          highestCompletedIndex = i;
          console.log(`📊 Found completed: ${lessonId} (index ${i})`);
        }
      }
      
      if (highestCompletedIndex === -1) {
        // No lessons complete, start at the beginning
        nextIndex = 0;
        console.log('📊 No lessons complete, starting at index 0');
      } else if (highestCompletedIndex >= lessons.length - 1) {
        // All lessons complete (or at least the last one is)
        nextIndex = lessons.length - 1;
        allComplete = true;
        console.log('📊 All lessons complete!');
      } else {
        // Next lesson is the one after the highest completed
        nextIndex = highestCompletedIndex + 1;
        console.log(`📊 Next lesson: index ${nextIndex} (after highest completed: ${highestCompletedIndex})`);
      }
    } else {
      console.log('📊 No lessons data in courseProgress');
    }
    
    const nextLesson = lessons[nextIndex];
    console.log('📊 Returning next lesson:', nextLesson.name);
    
    return {
      lessonIndex: nextIndex,
      lessonId: nextLesson.id,
      lessonName: nextLesson.name,
      lessonDesc: nextLesson.desc,
      lessonLabel: lessonLabel,
      link: `../${courseId}/${nextLesson.id}/`,
      allComplete,
      totalLessons: lessons.length
    };
  },

  /**
   * Get the lessons structure for a course
   * @param {string} courseId - The course ID
   * @returns {object} { lessons, lessonLabel, totalLessons }
   */
  getLessonsStructure(courseId) {
    const isEndlessOpportunities = courseId === 'endless-opportunities';
    
    const lessons = isEndlessOpportunities 
      ? [
          { id: 'week0-intro', name: 'Week 0: Introduction', icon: '👋', desc: 'Getting started with your tech journey' },
          { id: 'week1-questions', name: 'Week 1: Asking Questions', icon: '❓', desc: 'Learn to ask powerful questions' },
          { id: 'week2-data', name: 'Week 2: Working with Data', icon: '📊', desc: 'Understand data and information' },
          { id: 'week3-building', name: 'Week 3: Building Things', icon: '🔨', desc: 'Create your first projects' },
          { id: 'week4-portfolio', name: 'Week 4: Your Portfolio', icon: '🎨', desc: 'Showcase your work' }
        ]
      : [
          { id: 'ch0-origins', name: 'The Origins', icon: '🏛️', desc: 'Where it all began' },
          { id: 'ch1-stone', name: 'The Stone', icon: '🪨', desc: 'Data and memory fundamentals' },
          { id: 'ch2-lightning', name: 'The Lightning', icon: '⚡', desc: 'Control flow and logic' },
          { id: 'ch3-magnetism', name: 'The Magnetism', icon: '🧲', desc: 'Functions and connections' },
          { id: 'ch4-architect', name: 'The Architect', icon: '🏗️', desc: 'Thinking in systems' },
          { id: 'ch5-capstone1', name: 'Capstone I', icon: '🎯', desc: 'Your first project' },
          { id: 'ch6-capstone2', name: 'Capstone II', icon: '🏆', desc: 'The final challenge' }
        ];
    
    return {
      lessons,
      lessonLabel: isEndlessOpportunities ? 'Week' : 'Chapter',
      totalLessons: lessons.length
    };
  },

  /**
   * Calculate completed lessons count from progress data
   * @param {object} courseProgress - The course progress object with lessons data
   * @param {string} courseId - The course ID
   * @returns {number} Number of completed lessons
   */
  getCompletedLessonsCount(courseProgress, courseId) {
    const { lessons } = this.getLessonsStructure(courseId);
    let completedCount = 0;
    
    console.log('📊 getCompletedLessonsCount for:', courseId);
    console.log('📊 Available lesson keys in progress:', courseProgress?.lessons ? Object.keys(courseProgress.lessons) : 'none');
    
    if (courseProgress?.lessons) {
      for (const lesson of lessons) {
        const lessonData = courseProgress.lessons[lesson.id];
        const isComplete = lessonData?.completed || 
                          lessonData?.progressPercent >= 100 ||
                          (lessonData?.viewedSections && lessonData?.totalSections && 
                           lessonData.viewedSections >= lessonData.totalSections);
        
        console.log(`📊 Checking ${lesson.id}:`, {
          found: !!lessonData,
          completed: lessonData?.completed,
          progressPercent: lessonData?.progressPercent,
          viewedSections: lessonData?.viewedSections,
          totalSections: lessonData?.totalSections,
          isComplete
        });
        
        if (isComplete) {
          completedCount++;
        }
      }
    }
    
    console.log('📊 Total completed:', completedCount);
    return completedCount;
  },

  /**
   * Get lesson metadata for a course/lesson id
   */
  getLessonMeta(courseId, lessonId) {
    const { lessons } = this.getLessonsStructure(courseId);
    const lesson = lessons.find(item => item.id === lessonId);
    if (!lesson) return null;
    return {
      id: lesson.id,
      name: lesson.name,
      link: `../${courseId}/${lessonId}/`
    };
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async getNotificationPrefs() {
    const user = window.AuthService.getUser();
    if (!user) return null;

    const db = window.FirebaseApp.getDb();
    const prefsRef = db.collection('users').doc(user.uid).collection('notificationPrefs').doc('default');

    try {
      const doc = await prefsRef.get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Error getting notification prefs:', error);
      return null;
    }
  },

  async updateNotificationPrefs(prefs) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const db = window.FirebaseApp.getDb();
    const prefsRef = db.collection('users').doc(user.uid).collection('notificationPrefs').doc('default');

    try {
      await prefsRef.set({
        ...prefs,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error updating notification prefs:', error);
      return { success: false, error: error.message };
    }
  },

  async createNotification(notification) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const db = window.FirebaseApp.getDb();
    const notificationsRef = db.collection('users').doc(user.uid).collection('notifications').doc();

    const prefs = notification.prefs || await this.getNotificationPrefs();
    const deliveries = {
      inApp: true,
      email: !!prefs?.email,
      push: !!prefs?.push
    };

    const data = {
      id: notificationsRef.id,
      userId: user.uid,
      type: notification.type || 'general',
      title: notification.title || 'Notification',
      body: notification.body || '',
      source: notification.source || 'system',
      relatedId: notification.relatedId || null,
      link: notification.link || null,
      read: false,
      deliveries,
      metadata: notification.metadata || {},
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await notificationsRef.set(data);
      return { success: true, id: notificationsRef.id };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  },

  async markNotificationRead(notificationId) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const db = window.FirebaseApp.getDb();
    const notifRef = db.collection('users').doc(user.uid).collection('notifications').doc(notificationId);

    try {
      await notifRef.update({
        read: true,
        seenAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking notification read:', error);
      return { success: false, error: error.message };
    }
  },

  async markAllNotificationsRead() {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const db = window.FirebaseApp.getDb();
    const snapshot = await db.collection('users').doc(user.uid)
      .collection('notifications')
      .where('read', '==', false)
      .get();

    if (snapshot.empty) return { success: true };

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        seenAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    try {
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications read:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteNotification(notificationId) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const db = window.FirebaseApp.getDb();
    const notifRef = db.collection('users').doc(user.uid).collection('notifications').doc(notificationId);

    try {
      await notifRef.delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteReadNotifications() {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const db = window.FirebaseApp.getDb();
    const snapshot = await db.collection('users').doc(user.uid)
      .collection('notifications')
      .where('read', '==', true)
      .get();

    if (snapshot.empty) return { success: true };

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    try {
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      return { success: false, error: error.message };
    }
  },

  async saveNotificationToken(token, platform = 'web') {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const db = window.FirebaseApp.getDb();
    const tokenRef = db.collection('users').doc(user.uid)
      .collection('notificationTokens').doc(token);

    try {
      await tokenRef.set({
        token,
        platform,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error saving notification token:', error);
      return { success: false, error: error.message };
    }
  },

  async removeNotificationToken(token) {
    const user = window.AuthService.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const db = window.FirebaseApp.getDb();
    const tokenRef = db.collection('users').doc(user.uid)
      .collection('notificationTokens').doc(token);

    try {
      await tokenRef.delete();
      return { success: true };
    } catch (error) {
      console.error('Error removing notification token:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export
window.DataService = DataService;

