/**
 * onActivityComplete - Firestore trigger for activity completion
 * 
 * This Cloud Function fires when a new document is created in the
 * activityAttempts subcollection. It triggers analytics recomputation
 * and checks for achievement criteria.
 * 
 * @module firebase-functions/analytics/onActivityComplete
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { computeUserAnalytics } from './computeUserAnalytics.js';

/**
 * Debounce window in milliseconds - prevents rapid recomputation
 * if user completes multiple activities quickly
 */
const DEBOUNCE_WINDOW_MS = 5000;

/**
 * In-memory cache for recent computations to implement debouncing
 * In production, consider using a distributed cache like Redis
 */
const recentComputations = new Map();

/**
 * Firestore trigger that fires when a new activity attempt is created
 * 
 * Document path: users/{userId}/activityAttempts/{attemptId}
 * 
 * This trigger:
 * 1. Extracts the userId from the document path
 * 2. Debounces rapid consecutive activity completions
 * 3. Calls computeUserAnalytics to update the user's analytics
 * 4. Delegates to achievement checking (placeholder for future implementation)
 */
export const onActivityComplete = onDocumentCreated(
  'users/{userId}/activityAttempts/{attemptId}',
  async (event) => {
    const { userId, attemptId } = event.params;
    const attemptData = event.data?.data();
    
    if (!attemptData) {
      logger.warn(`[onActivityComplete] No data in new document: ${attemptId}`);
      return null;
    }
    
    logger.info(`[onActivityComplete] Activity completed`, {
      userId,
      attemptId,
      activityId: attemptData.activityId,
      correct: attemptData.correct,
      score: attemptData.score,
    });
    
    // Debounce check - skip if we recently computed for this user
    const lastComputation = recentComputations.get(userId);
    const now = Date.now();
    
    if (lastComputation && (now - lastComputation) < DEBOUNCE_WINDOW_MS) {
      logger.info(`[onActivityComplete] Debouncing analytics computation for user: ${userId}`);
      return null;
    }
    
    // Mark computation as in progress
    recentComputations.set(userId, now);
    
    try {
      // Compute user analytics
      logger.info(`[onActivityComplete] Computing analytics for user: ${userId}`);
      const analytics = await computeUserAnalytics(userId);
      
      logger.info(`[onActivityComplete] Analytics computed successfully`, {
        userId,
        hasEnoughData: analytics.dataQuality?.hasEnoughData,
        activityCount: analytics.dataQuality?.activityCount,
        strengthAreas: analytics.strengthAreas?.length || 0,
        growthAreas: analytics.growthAreas?.length || 0,
      });
      
      // Check achievement criteria
      // This is delegated to the achievement system - placeholder for now
      await checkAchievementCriteria(userId, attemptData, analytics);
      
      return { success: true, userId };
      
    } catch (error) {
      logger.error(`[onActivityComplete] Error computing analytics`, {
        userId,
        attemptId,
        error: error.message,
        stack: error.stack,
      });
      
      // Don't throw - we don't want to retry failed analytics computations
      // as they're not critical to the user's immediate experience
      return { success: false, error: error.message };
      
    } finally {
      // Clean up old entries from debounce cache
      cleanupDebounceCache();
    }
  }
);

/**
 * Check if the user has earned any achievements based on this activity
 * 
 * This is a placeholder that will be replaced by the achievement system.
 * For now, it logs potential achievement triggers.
 * 
 * @param {string} userId - The user's Firebase Auth UID
 * @param {Object} attemptData - The activity attempt data
 * @param {Object} analytics - The computed analytics
 */
async function checkAchievementCriteria(userId, attemptData, analytics) {
  const potentialAchievements = [];
  
  // Check streak achievements
  const currentStreak = analytics.engagementPatterns?.currentStreak || 0;
  const streakMilestones = [3, 7, 14, 30, 60, 100];
  for (const milestone of streakMilestones) {
    if (currentStreak === milestone) {
      potentialAchievements.push({
        type: 'streak',
        milestone,
        title: `${milestone}-Day Streak`,
      });
    }
  }
  
  // Check activity count achievements
  const totalAttempts = analytics.persistenceMetrics?.totalAttempts || 0;
  const attemptMilestones = [10, 50, 100, 250, 500, 1000];
  for (const milestone of attemptMilestones) {
    if (totalAttempts === milestone) {
      potentialAchievements.push({
        type: 'activity_count',
        milestone,
        title: `${milestone} Activities Completed`,
      });
    }
  }
  
  // Check accuracy achievements
  const accuracy = analytics.persistenceMetrics?.overallAccuracy || 0;
  if (accuracy >= 0.90 && totalAttempts >= 20) {
    potentialAchievements.push({
      type: 'accuracy',
      milestone: 0.90,
      title: 'High Achiever (90%+ Accuracy)',
    });
  }
  
  // Check first perfect score
  if (attemptData.correct && attemptData.attemptNumber === 1) {
    potentialAchievements.push({
      type: 'perfect_first_try',
      activityId: attemptData.activityId,
      title: 'First Try Success',
    });
  }
  
  // Check persistence achievement (retry and succeed)
  if (attemptData.correct && attemptData.attemptNumber > 1) {
    potentialAchievements.push({
      type: 'persistence',
      attempts: attemptData.attemptNumber,
      title: 'Never Give Up',
    });
  }
  
  // Log potential achievements (to be replaced with actual achievement creation)
  if (potentialAchievements.length > 0) {
    logger.info(`[checkAchievementCriteria] Potential achievements unlocked`, {
      userId,
      achievements: potentialAchievements,
    });
    
    // TODO: Create achievement documents in Firestore
    // await createAchievements(userId, potentialAchievements);
    
    // TODO: Send notifications for achievements
    // await notifyAchievements(userId, potentialAchievements);
  }
  
  return potentialAchievements;
}

/**
 * Clean up old entries from the debounce cache to prevent memory leaks
 */
function cleanupDebounceCache() {
  const CACHE_TTL_MS = 60000; // 1 minute
  const now = Date.now();
  
  for (const [userId, timestamp] of recentComputations.entries()) {
    if (now - timestamp > CACHE_TTL_MS) {
      recentComputations.delete(userId);
    }
  }
}

export default onActivityComplete;
