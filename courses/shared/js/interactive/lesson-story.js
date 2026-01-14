/**
 * LessonStoryIntegration - Bridge between platform services and interactive storytelling engines
 * 
 * Connects StorytellingDiagram and Quiz components with:
 *   - ProgressTracker (for story step progress)
 *   - ActivityTracker (for quiz completion)
 *   - DataService (for Firestore persistence)
 * 
 * Usage:
 *   <body data-course="apprentice" data-lesson="ch1-stone">
 *   
 *   The integration auto-initializes on DOMContentLoaded when data attributes are present.
 *   It loads story.json from the lesson folder and initializes all diagrams/quizzes.
 */

class LessonStoryIntegration {
  constructor(courseId, lessonId) {
    this.courseId = courseId;
    this.lessonId = lessonId;
    this.audioEngine = null;
    this.stories = new Map();
    this.quizzes = new Map();
    this.pageData = null;
    this.initialized = false;
  }

  /**
   * Initialize the integration - load story data and create components
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // Load story JSON from the lesson folder
      const response = await fetch('story.json');
      if (!response.ok) {
        console.log('No story.json found - lesson not converted to interactive format yet');
        return;
      }
      
      this.pageData = await response.json();
      console.log(`[LessonStory] Loaded story data for ${this.courseId}/${this.lessonId}`);
      
      // Create shared audio engine
      // Audio files are expected at: ../../audio/stories/{courseId}/{lessonId}/
      const audioBasePath = `../../audio/stories/${this.courseId}/${this.lessonId}`;
      this.audioEngine = new AudioNarrationEngine(audioBasePath);
      
      // Wait for diagram elements to be available
      if (window.diagramElements) {
        await this.initializeStories();
        await this.initializeQuizzes();
        this.initialized = true;
        console.log(`[LessonStory] Initialized ${this.stories.size} stories and ${this.quizzes.size} quizzes`);
      } else {
        console.warn('[LessonStory] diagramElements not found - ensure diagrams.js is loaded');
      }
      
    } catch (error) {
      console.warn('[LessonStory] Failed to initialize:', error);
    }
  }

  /**
   * Initialize all storytelling diagrams from pageData
   */
  async initializeStories() {
    if (!this.pageData?.stories) return;
    
    for (const story of this.pageData.stories) {
      const containerId = `${story.diagramId}-story`;
      const container = document.getElementById(containerId);
      
      if (!container) {
        console.warn(`[LessonStory] Container not found: ${containerId}`);
        continue;
      }
      
      const elements = window.diagramElements?.[story.diagramId];
      if (!elements) {
        console.warn(`[LessonStory] No diagram elements for: ${story.diagramId}`);
        continue;
      }
      
      // Create the storytelling diagram
      const storyDiagram = new StorytellingDiagram(
        containerId,
        elements,
        story.steps,
        { 
          audioEngine: this.audioEngine, 
          storyId: story.id 
        }
      );
      
      // Hook into story completion for progress tracking
      this.hookStoryProgress(storyDiagram, story);
      
      this.stories.set(story.id, storyDiagram);
    }
  }

  /**
   * Hook story step completion into ProgressTracker
   */
  hookStoryProgress(storyDiagram, storyConfig) {
    const originalPlayStep = storyDiagram.playStep?.bind(storyDiagram);
    
    // Override playStep to track progress
    if (originalPlayStep) {
      storyDiagram.playStep = async (step) => {
        await originalPlayStep(step);
        
        // Save progress after each step
        this.saveStoryProgress(storyConfig.id, storyDiagram.currentStep);
      };
    }
    
    // Also track when story completes
    storyDiagram.onStoryComplete = () => {
      this.saveStoryProgress(storyConfig.id, storyConfig.steps.length - 1, true);
    };
  }

  /**
   * Save story progress to Firestore via DataService
   */
  async saveStoryProgress(storyId, stepIndex, completed = false) {
    // Check if user is authenticated
    const user = window.AuthService?.getUser?.() || window.firebase?.auth?.()?.currentUser;
    if (!user) {
      // Store in localStorage for anonymous users
      this.saveLocalProgress(storyId, stepIndex, completed);
      return;
    }
    
    const storyProgress = {
      storyId,
      stepsCompleted: stepIndex + 1,
      totalSteps: this.pageData.stories.find(s => s.id === storyId)?.steps.length || 0,
      lastStepIndex: stepIndex,
      completed,
      updatedAt: new Date().toISOString()
    };
    
    try {
      // Try to use DataService if available
      if (window.DataService?.updateStoryProgress) {
        await window.DataService.updateStoryProgress(
          this.courseId, 
          this.lessonId, 
          storyProgress
        );
      } else {
        // Fallback: use Firebase directly
        const db = window.firebase?.firestore?.();
        if (db) {
          const progressRef = db
            .collection('users')
            .doc(user.uid)
            .collection('courseProgress')
            .doc(this.courseId)
            .collection('lessonProgress')
            .doc(this.lessonId);
          
          await progressRef.set({
            [`stories.${storyId}`]: storyProgress
          }, { merge: true });
        }
      }
    } catch (error) {
      console.warn('[LessonStory] Failed to save story progress:', error);
      // Fall back to localStorage
      this.saveLocalProgress(storyId, stepIndex, completed);
    }
  }

  /**
   * Save progress to localStorage for anonymous users
   */
  saveLocalProgress(storyId, stepIndex, completed) {
    const key = `story_progress_${this.courseId}_${this.lessonId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    
    existing[storyId] = {
      stepsCompleted: stepIndex + 1,
      lastStepIndex: stepIndex,
      completed,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(key, JSON.stringify(existing));
  }

  /**
   * Initialize all quizzes from pageData
   */
  async initializeQuizzes() {
    if (!this.pageData?.quizzes) return;
    
    for (const quiz of this.pageData.quizzes) {
      // Quiz container ID is based on storyId: {concept}-quiz
      const containerId = quiz.storyId.replace('-story', '-quiz');
      const container = document.getElementById(containerId);
      
      if (!container) {
        console.warn(`[LessonStory] Quiz container not found: ${containerId}`);
        continue;
      }
      
      // Create the quiz
      const quizInstance = new Quiz(containerId, quiz.questions);
      
      // Hook quiz completion into ActivityTracker
      this.hookQuizCompletion(quizInstance, quiz);
      
      this.quizzes.set(quiz.storyId, quizInstance);
    }
  }

  /**
   * Hook quiz completion into ActivityTracker
   */
  hookQuizCompletion(quizInstance, quizConfig) {
    // Quiz system fires onComplete when all questions answered
    quizInstance.onComplete = (score, answers, correctCount, totalCount) => {
      this.saveQuizCompletion(quizConfig.storyId, {
        score,
        correctCount,
        totalCount,
        answers,
        completedAt: new Date().toISOString()
      });
    };
  }

  /**
   * Save quiz completion to Firestore via ActivityTracker
   */
  async saveQuizCompletion(storyId, results) {
    const activityId = `quiz-${storyId}`;
    
    // Check if user is authenticated
    const user = window.AuthService?.getUser?.() || window.firebase?.auth?.()?.currentUser;
    if (!user) {
      // Store in localStorage for anonymous users
      this.saveLocalQuizResult(storyId, results);
      return;
    }
    
    try {
      // Try to use ActivityTracker if available
      if (window.ActivityTracker?.recordAttempt) {
        await window.ActivityTracker.recordAttempt(activityId, 'quiz', results);
      } else if (window.DataService?.saveActivityAttempt) {
        await window.DataService.saveActivityAttempt(
          this.courseId,
          this.lessonId,
          activityId,
          'quiz',
          results
        );
      } else {
        // Fallback: use Firebase directly
        const db = window.firebase?.firestore?.();
        if (db) {
          const attemptRef = db
            .collection('users')
            .doc(user.uid)
            .collection('courseProgress')
            .doc(this.courseId)
            .collection('activityAttempts')
            .doc();
          
          await attemptRef.set({
            lessonId: this.lessonId,
            activityId,
            type: 'quiz',
            ...results
          });
        }
      }
    } catch (error) {
      console.warn('[LessonStory] Failed to save quiz completion:', error);
      this.saveLocalQuizResult(storyId, results);
    }
  }

  /**
   * Save quiz result to localStorage for anonymous users
   */
  saveLocalQuizResult(storyId, results) {
    const key = `quiz_results_${this.courseId}_${this.lessonId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    
    existing[storyId] = results;
    localStorage.setItem(key, JSON.stringify(existing));
  }

  /**
   * Get a story instance by ID
   */
  getStory(storyId) {
    return this.stories.get(storyId);
  }

  /**
   * Get a quiz instance by story ID
   */
  getQuiz(storyId) {
    return this.quizzes.get(storyId);
  }

  /**
   * Load saved progress and restore state
   */
  async loadSavedProgress() {
    const user = window.AuthService?.getUser?.() || window.firebase?.auth?.()?.currentUser;
    
    if (user) {
      // Load from Firestore
      try {
        const db = window.firebase?.firestore?.();
        if (db) {
          const progressDoc = await db
            .collection('users')
            .doc(user.uid)
            .collection('courseProgress')
            .doc(this.courseId)
            .collection('lessonProgress')
            .doc(this.lessonId)
            .get();
          
          if (progressDoc.exists) {
            const data = progressDoc.data();
            if (data.stories) {
              // Could restore story positions here if needed
              console.log('[LessonStory] Loaded saved progress:', Object.keys(data.stories));
            }
          }
        }
      } catch (error) {
        console.warn('[LessonStory] Failed to load progress:', error);
      }
    } else {
      // Load from localStorage
      const key = `story_progress_${this.courseId}_${this.lessonId}`;
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      if (Object.keys(saved).length > 0) {
        console.log('[LessonStory] Loaded local progress:', Object.keys(saved));
      }
    }
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const body = document.body;
  const courseId = body.dataset.course;
  const lessonId = body.dataset.lesson;
  
  if (courseId && lessonId) {
    // Create and expose the integration instance
    window.LessonStoryIntegration = new LessonStoryIntegration(courseId, lessonId);
    
    // Wait a tick for other scripts (like diagrams.js) to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Initialize
    await window.LessonStoryIntegration.init();
    
    // Load any saved progress
    await window.LessonStoryIntegration.loadSavedProgress();
  }
});

// Export for use as module or global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LessonStoryIntegration;
} else if (typeof window !== 'undefined') {
  window.LessonStoryIntegration = LessonStoryIntegration;
}
