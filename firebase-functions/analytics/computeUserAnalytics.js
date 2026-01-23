/**
 * computeUserAnalytics - Cloud Function to compute user learning analytics
 * 
 * This function queries a user's activity attempts from the last 30 days
 * and computes learning style, strength areas, growth areas, engagement
 * patterns, and persistence metrics.
 * 
 * @module firebase-functions/analytics/computeUserAnalytics
 */

// Dynamic import to support both Cloud Functions and standalone testing
let firestoreModule = null;
async function getFirestoreModule() {
  if (!firestoreModule) {
    firestoreModule = await import('firebase-admin/firestore');
  }
  return firestoreModule;
}

const COMPUTE_VERSION = '1.0.0';
const DAYS_TO_ANALYZE = 30;
const MIN_ACTIVITIES_FOR_ANALYSIS = 10;
const STRENGTH_THRESHOLD = 0.80;
const GROWTH_THRESHOLD = 0.60;
const MIN_ATTEMPTS_FOR_STRENGTH = 3;
const MIN_ATTEMPTS_FOR_GROWTH = 2;

/**
 * Activity type to learning style mapping
 */
const ACTIVITY_TYPE_LEARNING_STYLE = {
  'drag-drop': 'visual',
  'matching': 'visual',
  'code-completion': 'kinesthetic',
  'free-response': 'kinesthetic',
  'multiple-choice': 'reading',
  'fill-blank': 'reading',
  'audio': 'auditory',
};

/**
 * Compute comprehensive analytics for a user based on their activity attempts
 * 
 * @param {string} userId - The Firebase Auth UID of the user
 * @param {Object} options - Optional configuration
 * @param {number} options.daysToAnalyze - Number of days to analyze (default: 30)
 * @param {FirebaseFirestore.Firestore} options.db - Firestore instance (for testing)
 * @returns {Promise<Object>} The computed analytics document
 * @throws {Error} If userId is not provided
 */
export async function computeUserAnalytics(userId, options = {}) {
  if (!userId) {
    throw new Error('userId is required');
  }

  // Use provided db instance or get from firebase-admin
  let db = options.db;
  let Timestamp = options.Timestamp;
  let FieldValue = options.FieldValue;
  
  if (!db) {
    const fsModule = await getFirestoreModule();
    db = fsModule.getFirestore();
    Timestamp = fsModule.Timestamp;
    FieldValue = fsModule.FieldValue;
  }
  
  const daysToAnalyze = options.daysToAnalyze || DAYS_TO_ANALYZE;
  
  console.log(`[computeUserAnalytics] Starting computation for user: ${userId}`);
  
  // Calculate date range
  const now = new Date();
  const periodEnd = Timestamp ? Timestamp.fromDate(now) : now;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysToAnalyze);
  const periodStart = Timestamp ? Timestamp.fromDate(startDate) : startDate;
  
  // Query activity attempts from the last N days
  const attemptsRef = db.collection('users').doc(userId).collection('activityAttempts');
  const attemptsSnapshot = await attemptsRef
    .where('createdAt', '>=', periodStart)
    .orderBy('createdAt', 'asc')
    .get();
  
  const attempts = attemptsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
  
  console.log(`[computeUserAnalytics] Found ${attempts.length} activity attempts in last ${daysToAnalyze} days`);
  
  // Check if we have enough data
  const hasEnoughData = attempts.length >= MIN_ACTIVITIES_FOR_ANALYSIS;
  
  // Compute all analytics components
  const learningStyle = computeLearningStyle(attempts);
  const { strengthAreas, growthAreas } = computeTopicAreas(attempts);
  const engagementPatterns = computeEngagementPatterns(attempts);
  const persistenceMetrics = computePersistenceMetrics(attempts);
  const summaryStats = computeSummaryStats(attempts, periodStart, periodEnd);
  
  // Build the analytics document
  const analytics = {
    userId,
    learningStyle,
    strengthAreas,
    growthAreas,
    engagementPatterns,
    persistenceMetrics,
    summaryStats,
    lastComputed: FieldValue ? FieldValue.serverTimestamp() : new Date(),
    computeVersion: COMPUTE_VERSION,
    dataQuality: {
      hasEnoughData,
      activityCount: attempts.length,
      daysCovered: daysToAnalyze,
    },
  };
  
  // Write to Firestore
  await db.collection('userAnalytics').doc(userId).set(analytics, { merge: true });
  
  console.log(`[computeUserAnalytics] Successfully computed and saved analytics for user: ${userId}`);
  
  return analytics;
}

/**
 * Compute learning style based on performance across activity types
 * 
 * @param {Array} attempts - Array of activity attempt documents
 * @returns {Object} Learning style analysis
 */
function computeLearningStyle(attempts) {
  if (attempts.length === 0) {
    return {
      primary: null,
      secondary: null,
      confidence: 0,
      dataPoints: 0,
      breakdown: {},
    };
  }

  // Group attempts by activity type and compute average scores
  const typeScores = {};
  const typeCounts = {};
  
  for (const attempt of attempts) {
    const type = normalizeActivityType(attempt.activityType);
    if (!type) continue;
    
    if (!typeScores[type]) {
      typeScores[type] = 0;
      typeCounts[type] = 0;
    }
    
    typeScores[type] += attempt.score || (attempt.correct ? 1 : 0);
    typeCounts[type]++;
  }
  
  // Calculate averages
  const breakdown = {};
  for (const type of Object.keys(typeScores)) {
    breakdown[type] = typeCounts[type] > 0 
      ? Math.round((typeScores[type] / typeCounts[type]) * 100) / 100
      : 0;
  }
  
  // Map to learning styles and find primary/secondary
  const styleScores = {};
  const styleCounts = {};
  
  for (const [type, avgScore] of Object.entries(breakdown)) {
    const style = ACTIVITY_TYPE_LEARNING_STYLE[type] || 'reading';
    if (!styleScores[style]) {
      styleScores[style] = 0;
      styleCounts[style] = 0;
    }
    styleScores[style] += avgScore * typeCounts[type];
    styleCounts[style] += typeCounts[type];
  }
  
  // Calculate weighted average for each style
  const styleAverages = {};
  for (const style of Object.keys(styleScores)) {
    styleAverages[style] = styleCounts[style] > 0
      ? styleScores[style] / styleCounts[style]
      : 0;
  }
  
  // Sort to find primary and secondary
  const sortedStyles = Object.entries(styleAverages)
    .sort((a, b) => b[1] - a[1]);
  
  const primary = sortedStyles[0]?.[0] || null;
  const secondary = sortedStyles[1]?.[0] || null;
  
  // Calculate confidence based on data points and score variance
  const totalDataPoints = attempts.length;
  const confidence = Math.min(
    0.5 + (totalDataPoints / 200) * 0.5, // More data = higher confidence
    0.95
  );
  
  return {
    primary,
    secondary,
    confidence: Math.round(confidence * 100) / 100,
    dataPoints: totalDataPoints,
    breakdown,
  };
}

/**
 * Compute strength and growth areas based on topic performance
 * 
 * @param {Array} attempts - Array of activity attempt documents
 * @returns {Object} Object containing strengthAreas and growthAreas arrays
 */
function computeTopicAreas(attempts) {
  if (attempts.length === 0) {
    return { strengthAreas: [], growthAreas: [] };
  }

  // Group by topic (using lessonId as proxy for topic)
  const topicStats = {};
  
  for (const attempt of attempts) {
    const topic = extractTopic(attempt);
    if (!topic) continue;
    
    if (!topicStats[topic]) {
      topicStats[topic] = {
        scores: [],
        attempts: 0,
        lastActivity: null,
      };
    }
    
    const score = attempt.score ?? (attempt.correct ? 1 : 0);
    topicStats[topic].scores.push(score);
    topicStats[topic].attempts++;
    
    const activityTime = attempt.createdAt?.toDate?.() || attempt.createdAt;
    if (!topicStats[topic].lastActivity || activityTime > topicStats[topic].lastActivity) {
      topicStats[topic].lastActivity = activityTime;
    }
  }
  
  // Compute averages and categorize
  const strengthAreas = [];
  const growthAreas = [];
  
  for (const [topic, stats] of Object.entries(topicStats)) {
    const avgScore = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
    const roundedScore = Math.round(avgScore * 100) / 100;
    
    const topicData = {
      topic,
      score: roundedScore,
      attempts: stats.attempts,
      // Keep as Date or original Timestamp - Firestore handles both
      lastActivity: stats.lastActivity,
    };
    
    if (avgScore >= STRENGTH_THRESHOLD && stats.attempts >= MIN_ATTEMPTS_FOR_STRENGTH) {
      strengthAreas.push(topicData);
    } else if (avgScore < GROWTH_THRESHOLD && stats.attempts >= MIN_ATTEMPTS_FOR_GROWTH) {
      growthAreas.push({
        ...topicData,
        suggestedResources: generateSuggestedResources(topic),
      });
    }
  }
  
  // Sort by score (descending for strengths, ascending for growth)
  strengthAreas.sort((a, b) => b.score - a.score);
  growthAreas.sort((a, b) => a.score - b.score);
  
  return { strengthAreas, growthAreas };
}

/**
 * Compute engagement patterns from activity timing data
 * 
 * @param {Array} attempts - Array of activity attempt documents
 * @returns {Object} Engagement pattern analysis
 */
function computeEngagementPatterns(attempts) {
  if (attempts.length === 0) {
    return {
      preferredTimes: [],
      avgSessionLength: 0,
      peakPerformanceDay: null,
      peakPerformanceHour: null,
      consistencyScore: 0,
      streakRecord: 0,
      currentStreak: 0,
      totalSessionCount: 0,
      totalTimeSpentMinutes: 0,
    };
  }

  // Extract timestamps and scores
  const activityData = attempts.map(a => ({
    timestamp: a.createdAt?.toDate?.() || new Date(a.createdAt),
    score: a.score ?? (a.correct ? 1 : 0),
    timeSpentMs: a.timeSpentMs || 0,
  }));
  
  // Compute time-based patterns
  const hourCounts = new Array(24).fill(0);
  const hourScores = new Array(24).fill(0);
  const dayCounts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
  const dayScores = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  let totalTimeMs = 0;
  
  for (const data of activityData) {
    const hour = data.timestamp.getHours();
    const day = dayNames[data.timestamp.getDay()];
    
    hourCounts[hour]++;
    hourScores[hour] += data.score;
    dayCounts[day]++;
    dayScores[day] += data.score;
    totalTimeMs += data.timeSpentMs;
  }
  
  // Find peak performance hour
  let peakHour = 0;
  let peakHourAvg = 0;
  for (let i = 0; i < 24; i++) {
    if (hourCounts[i] > 0) {
      const avg = hourScores[i] / hourCounts[i];
      if (avg > peakHourAvg || (avg === peakHourAvg && hourCounts[i] > hourCounts[peakHour])) {
        peakHourAvg = avg;
        peakHour = i;
      }
    }
  }
  
  // Find peak performance day
  let peakDay = 'Mon';
  let peakDayAvg = 0;
  for (const [day, count] of Object.entries(dayCounts)) {
    if (count > 0) {
      const avg = dayScores[day] / count;
      if (avg > peakDayAvg || (avg === peakDayAvg && count > dayCounts[peakDay])) {
        peakDayAvg = avg;
        peakDay = day;
      }
    }
  }
  
  // Compute preferred time windows (2-hour blocks with most activity)
  const timeBlocks = [];
  for (let i = 0; i < 24; i += 2) {
    const count = hourCounts[i] + hourCounts[i + 1];
    if (count > 0) {
      timeBlocks.push({ start: i, end: i + 2, count });
    }
  }
  timeBlocks.sort((a, b) => b.count - a.count);
  const preferredTimes = timeBlocks.slice(0, 2).map(
    b => `${String(b.start).padStart(2, '0')}:00-${String(b.end).padStart(2, '0')}:00`
  );
  
  // Compute streaks
  const { currentStreak, streakRecord } = computeStreaks(activityData);
  
  // Compute consistency score
  const consistencyScore = computeConsistencyScore(activityData);
  
  // Estimate session count (new session if gap > 30 min)
  const totalSessionCount = estimateSessionCount(activityData);
  
  return {
    preferredTimes,
    avgSessionLength: Math.round(totalTimeMs / (totalSessionCount || 1) / 60000),
    peakPerformanceDay: peakDay,
    peakPerformanceHour: peakHour,
    consistencyScore: Math.round(consistencyScore * 100) / 100,
    streakRecord,
    currentStreak,
    totalSessionCount,
    totalTimeSpentMinutes: Math.round(totalTimeMs / 60000),
  };
}

/**
 * Compute persistence metrics from attempt patterns
 * 
 * @param {Array} attempts - Array of activity attempt documents
 * @returns {Object} Persistence metrics
 */
function computePersistenceMetrics(attempts) {
  if (attempts.length === 0) {
    return {
      avgAttemptsBeforeSuccess: 0,
      giveUpRate: 0,
      retryAfterFailure: 0,
      improvementRate: 0,
      totalAttempts: 0,
      totalCorrect: 0,
      overallAccuracy: 0,
    };
  }

  // Group attempts by activity
  const activityAttempts = {};
  for (const attempt of attempts) {
    const activityId = attempt.activityId;
    if (!activityId) continue;
    
    if (!activityAttempts[activityId]) {
      activityAttempts[activityId] = [];
    }
    activityAttempts[activityId].push(attempt);
  }
  
  let totalAttemptsBeforeSuccess = 0;
  let successfulActivities = 0;
  let giveUps = 0;
  let failures = 0;
  let retries = 0;
  let totalImprovement = 0;
  let improvementCount = 0;
  
  for (const [activityId, actAttempts] of Object.entries(activityAttempts)) {
    // Sort by attempt number
    actAttempts.sort((a, b) => (a.attemptNumber || 1) - (b.attemptNumber || 1));
    
    const firstAttempt = actAttempts[0];
    const lastAttempt = actAttempts[actAttempts.length - 1];
    const hasSuccess = actAttempts.some(a => a.correct);
    
    if (hasSuccess) {
      // Count attempts before first success
      let attemptsToSuccess = 0;
      for (const a of actAttempts) {
        attemptsToSuccess++;
        if (a.correct) break;
      }
      totalAttemptsBeforeSuccess += attemptsToSuccess;
      successfulActivities++;
    }
    
    // Check for give-ups (single failed attempt with no retry)
    if (actAttempts.length === 1 && !firstAttempt.correct) {
      giveUps++;
    }
    
    // Check for retries after failure
    if (!firstAttempt.correct) {
      failures++;
      if (actAttempts.length > 1) {
        retries++;
      }
    }
    
    // Calculate improvement
    if (actAttempts.length > 1) {
      const firstScore = firstAttempt.score ?? (firstAttempt.correct ? 1 : 0);
      const lastScore = lastAttempt.score ?? (lastAttempt.correct ? 1 : 0);
      totalImprovement += lastScore - firstScore;
      improvementCount++;
    }
  }
  
  const totalAttempts = attempts.length;
  const totalCorrect = attempts.filter(a => a.correct).length;
  
  return {
    avgAttemptsBeforeSuccess: successfulActivities > 0 
      ? Math.round((totalAttemptsBeforeSuccess / successfulActivities) * 10) / 10
      : 0,
    giveUpRate: totalAttempts > 0 
      ? Math.round((giveUps / Object.keys(activityAttempts).length) * 100) / 100
      : 0,
    retryAfterFailure: failures > 0 
      ? Math.round((retries / failures) * 100) / 100
      : 0,
    improvementRate: improvementCount > 0 
      ? Math.round((totalImprovement / improvementCount) * 100) / 100
      : 0,
    totalAttempts,
    totalCorrect,
    overallAccuracy: totalAttempts > 0 
      ? Math.round((totalCorrect / totalAttempts) * 100) / 100
      : 0,
  };
}

/**
 * Compute summary statistics for the analysis period
 * 
 * @param {Array} attempts - Array of activity attempt documents
 * @param {Timestamp} periodStart - Start of analysis period
 * @param {Timestamp} periodEnd - End of analysis period
 * @returns {Object} Summary statistics
 */
function computeSummaryStats(attempts, periodStart, periodEnd) {
  if (attempts.length === 0) {
    return {
      activitiesCompleted: 0,
      averageScore: 0,
      totalTimeSpentMinutes: 0,
      uniqueTopics: 0,
      uniqueCourses: 0,
      periodStart,
      periodEnd,
    };
  }

  const uniqueActivities = new Set(attempts.map(a => a.activityId));
  const uniqueTopics = new Set(attempts.map(a => extractTopic(a)).filter(Boolean));
  const uniqueCourses = new Set(attempts.map(a => a.courseId).filter(Boolean));
  
  const totalScore = attempts.reduce((sum, a) => {
    return sum + (a.score ?? (a.correct ? 1 : 0));
  }, 0);
  
  const totalTimeMs = attempts.reduce((sum, a) => sum + (a.timeSpentMs || 0), 0);
  
  return {
    activitiesCompleted: uniqueActivities.size,
    averageScore: Math.round((totalScore / attempts.length) * 100) / 100,
    totalTimeSpentMinutes: Math.round(totalTimeMs / 60000),
    uniqueTopics: uniqueTopics.size,
    uniqueCourses: uniqueCourses.size,
    periodStart,
    periodEnd,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize activity type strings to standard format
 */
function normalizeActivityType(type) {
  if (!type) return null;
  return type.toLowerCase().replace(/[_\s]/g, '-');
}

/**
 * Extract topic from attempt (uses lessonId as proxy)
 */
function extractTopic(attempt) {
  // Try to get a meaningful topic identifier
  return attempt.lessonId || attempt.topic || attempt.activityId?.split('-')[0];
}

/**
 * Generate suggested resources for a growth area topic
 */
function generateSuggestedResources(topic) {
  // In a real implementation, this would query available resources
  // For now, return placeholder structure
  return [
    {
      type: 'lesson',
      id: `${topic}-basics`,
      title: `${formatTopicName(topic)} Fundamentals`,
    },
  ];
}

/**
 * Format topic ID into human-readable name
 */
function formatTopicName(topic) {
  return topic
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Compute current and record streaks from activity data
 */
function computeStreaks(activityData) {
  if (activityData.length === 0) {
    return { currentStreak: 0, streakRecord: 0 };
  }

  // Get unique dates
  const dates = [...new Set(
    activityData.map(d => d.timestamp.toDateString())
  )].sort((a, b) => new Date(a) - new Date(b));
  
  if (dates.length === 0) {
    return { currentStreak: 0, streakRecord: 0 };
  }
  
  let currentStreak = 1;
  let streakRecord = 1;
  let tempStreak = 1;
  
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      tempStreak++;
    } else {
      streakRecord = Math.max(streakRecord, tempStreak);
      tempStreak = 1;
    }
  }
  streakRecord = Math.max(streakRecord, tempStreak);
  
  // Check if current streak is still active (last activity within 1 day)
  const lastDate = new Date(dates[dates.length - 1]);
  const today = new Date();
  const daysSinceLast = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLast <= 1) {
    currentStreak = tempStreak;
  } else {
    currentStreak = 0;
  }
  
  return { currentStreak, streakRecord };
}

/**
 * Compute consistency score based on activity distribution
 */
function computeConsistencyScore(activityData) {
  if (activityData.length < 2) return 0;
  
  // Get unique dates
  const dates = [...new Set(
    activityData.map(d => d.timestamp.toDateString())
  )];
  
  // Calculate expected vs actual activity days
  const firstDate = new Date(Math.min(...activityData.map(d => d.timestamp)));
  const lastDate = new Date(Math.max(...activityData.map(d => d.timestamp)));
  const totalDays = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;
  
  // Consistency = percentage of days with activity
  return Math.min(dates.length / totalDays, 1);
}

/**
 * Estimate number of distinct learning sessions
 */
function estimateSessionCount(activityData) {
  if (activityData.length === 0) return 0;
  
  const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes
  const sorted = [...activityData].sort((a, b) => a.timestamp - b.timestamp);
  
  let sessions = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp - sorted[i - 1].timestamp;
    if (gap > SESSION_GAP_MS) {
      sessions++;
    }
  }
  
  return sessions;
}

export default computeUserAnalytics;
