#!/usr/bin/env node
/**
 * Test script for analytics computation
 * 
 * This script:
 * 1. Creates mock activity data for a test user
 * 2. Runs computeUserAnalytics
 * 3. Verifies the output structure
 * 
 * Usage:
 *   node test-analytics-computation.js
 *   node test-analytics-computation.js --cleanup  # Remove test data after
 *   node test-analytics-computation.js --use-real <userId>  # Test with real user data
 * 
 * @module firebase-scripts/test-analytics-computation
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// ============================================================================
// Configuration
// ============================================================================

const TEST_USER_ID = 'test-analytics-user-' + Date.now();
const MOCK_ACTIVITIES = generateMockActivities();

// ============================================================================
// Firebase Initialization
// ============================================================================

const possibleKeyPaths = [
  join(homedir(), 'firebase-admin-key.json'),
  join(homedir(), '.config', 'firebase-admin-key.json'),
  join(process.cwd(), 'firebase-admin-key.json'),
];

let keyPath = possibleKeyPaths.find(p => existsSync(p));

if (keyPath) {
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'autonateai-learning-hub'
  });
} else {
  try {
    initializeApp({
      credential: applicationDefault(),
      projectId: 'autonateai-learning-hub'
    });
  } catch (e) {
    console.error('❌ No credentials found! Download service account key from Firebase Console');
    console.error('   Save as: ~/firebase-admin-key.json');
    process.exit(1);
  }
}

const db = getFirestore();

// ============================================================================
// Mock Data Generation
// ============================================================================

/**
 * Generate mock activity attempt data that exercises all analytics features
 */
function generateMockActivities() {
  const activities = [];
  const now = new Date();
  
  // Activity types for learning style detection
  const activityTypes = [
    { type: 'drag-drop', avgScore: 0.92 },      // Visual - high
    { type: 'matching', avgScore: 0.88 },       // Visual - high
    { type: 'multiple-choice', avgScore: 0.78 }, // Reading - medium
    { type: 'code-completion', avgScore: 0.85 }, // Kinesthetic - high
    { type: 'free-response', avgScore: 0.71 },   // Kinesthetic - medium
  ];
  
  // Topics for strength/growth detection
  const topics = [
    { id: 'variables', avgScore: 0.94 },  // Strength
    { id: 'loops', avgScore: 0.88 },      // Strength
    { id: 'functions', avgScore: 0.85 },  // Strength
    { id: 'arrays', avgScore: 0.72 },     // Developing
    { id: 'recursion', avgScore: 0.52 },  // Growth area
    { id: 'async', avgScore: 0.45 },      // Growth area
  ];
  
  // Generate activities over the past 30 days
  for (let day = 0; day < 30; day++) {
    // Skip some days to test consistency (leave gaps)
    if ([3, 8, 15, 22].includes(day)) continue;
    
    // Vary activities per day (1-5)
    const activitiesPerDay = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < activitiesPerDay; i++) {
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const topic = topics[Math.floor(Math.random() * topics.length)];
      
      // Calculate score with some variance
      const baseScore = (activityType.avgScore + topic.avgScore) / 2;
      const variance = (Math.random() - 0.5) * 0.2;
      const score = Math.max(0, Math.min(1, baseScore + variance));
      const correct = score >= 0.6;
      
      // Generate timestamp (vary hour for engagement pattern testing)
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - day);
      // Peak hours: 18-20 (evening) and 9-11 (morning)
      const isEveningSession = Math.random() > 0.4;
      timestamp.setHours(isEveningSession ? 18 + Math.floor(Math.random() * 3) : 9 + Math.floor(Math.random() * 3));
      timestamp.setMinutes(Math.floor(Math.random() * 60));
      
      // Determine attempt number (some activities have retries)
      const attemptNumber = correct || Math.random() > 0.7 ? 1 : Math.floor(Math.random() * 3) + 1;
      
      activities.push({
        activityId: `act-${topic.id}-${Math.floor(Math.random() * 10)}`,
        activityType: activityType.type,
        courseId: 'apprentice',
        lessonId: topic.id,
        attemptNumber,
        correct,
        score: Math.round(score * 100) / 100,
        timeSpentMs: Math.floor(Math.random() * 180000) + 30000, // 30s - 3.5min
        response: { selected: correct ? 'correct_answer' : 'wrong_answer' },
        createdAt: Timestamp.fromDate(timestamp),
      });
    }
  }
  
  // Add some retry sequences to test persistence metrics
  const retryActivity = {
    activityId: 'act-recursion-retry-test',
    activityType: 'code-completion',
    courseId: 'apprentice',
    lessonId: 'recursion',
  };
  
  // First attempt - fail
  const retryTime1 = new Date(now);
  retryTime1.setDate(retryTime1.getDate() - 2);
  activities.push({
    ...retryActivity,
    attemptNumber: 1,
    correct: false,
    score: 0.3,
    timeSpentMs: 45000,
    response: { selected: 'wrong_1' },
    createdAt: Timestamp.fromDate(retryTime1),
  });
  
  // Second attempt - fail
  const retryTime2 = new Date(retryTime1);
  retryTime2.setMinutes(retryTime2.getMinutes() + 5);
  activities.push({
    ...retryActivity,
    attemptNumber: 2,
    correct: false,
    score: 0.5,
    timeSpentMs: 60000,
    response: { selected: 'wrong_2' },
    createdAt: Timestamp.fromDate(retryTime2),
  });
  
  // Third attempt - success!
  const retryTime3 = new Date(retryTime2);
  retryTime3.setMinutes(retryTime3.getMinutes() + 5);
  activities.push({
    ...retryActivity,
    attemptNumber: 3,
    correct: true,
    score: 1.0,
    timeSpentMs: 90000,
    response: { selected: 'correct' },
    createdAt: Timestamp.fromDate(retryTime3),
  });
  
  return activities;
}

// ============================================================================
// Test Execution
// ============================================================================

/**
 * Create mock data in Firestore
 */
async function createMockData(userId) {
  console.log(`\n📝 Creating ${MOCK_ACTIVITIES.length} mock activity attempts for user: ${userId}\n`);
  
  const batch = db.batch();
  const attemptsRef = db.collection('users').doc(userId).collection('activityAttempts');
  
  for (const activity of MOCK_ACTIVITIES) {
    const docRef = attemptsRef.doc();
    batch.set(docRef, activity);
  }
  
  await batch.commit();
  console.log('✅ Mock data created successfully\n');
}

/**
 * Run the analytics computation
 */
async function runAnalyticsComputation(userId) {
  console.log(`\n🔄 Running computeUserAnalytics for user: ${userId}\n`);
  
  // Import the computation function
  // Note: In production, this is called by the Cloud Function
  // Here we import it directly for testing
  const { computeUserAnalytics } = await import('../firebase-functions/analytics/computeUserAnalytics.js');
  
  // Pass db instance and Firestore types for standalone testing
  const analytics = await computeUserAnalytics(userId, { 
    db,
    Timestamp,
    FieldValue,
  });
  
  return analytics;
}

/**
 * Verify the output structure matches the schema
 */
function verifyOutputStructure(analytics) {
  console.log('\n🔍 Verifying output structure...\n');
  
  const errors = [];
  
  // Required top-level fields
  const requiredFields = [
    'userId',
    'learningStyle',
    'strengthAreas',
    'growthAreas',
    'engagementPatterns',
    'persistenceMetrics',
    'summaryStats',
    'dataQuality',
    'computeVersion',
  ];
  
  for (const field of requiredFields) {
    if (!(field in analytics)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Verify learningStyle structure
  if (analytics.learningStyle) {
    const lsFields = ['primary', 'secondary', 'confidence', 'dataPoints', 'breakdown'];
    for (const field of lsFields) {
      if (!(field in analytics.learningStyle)) {
        errors.push(`Missing learningStyle.${field}`);
      }
    }
  }
  
  // Verify engagementPatterns structure
  if (analytics.engagementPatterns) {
    const epFields = [
      'preferredTimes', 'avgSessionLength', 'peakPerformanceDay',
      'peakPerformanceHour', 'consistencyScore', 'streakRecord',
      'currentStreak', 'totalSessionCount', 'totalTimeSpentMinutes'
    ];
    for (const field of epFields) {
      if (!(field in analytics.engagementPatterns)) {
        errors.push(`Missing engagementPatterns.${field}`);
      }
    }
  }
  
  // Verify persistenceMetrics structure
  if (analytics.persistenceMetrics) {
    const pmFields = [
      'avgAttemptsBeforeSuccess', 'giveUpRate', 'retryAfterFailure',
      'improvementRate', 'totalAttempts', 'totalCorrect', 'overallAccuracy'
    ];
    for (const field of pmFields) {
      if (!(field in analytics.persistenceMetrics)) {
        errors.push(`Missing persistenceMetrics.${field}`);
      }
    }
  }
  
  // Verify summaryStats structure
  if (analytics.summaryStats) {
    const ssFields = [
      'activitiesCompleted', 'averageScore', 'totalTimeSpentMinutes',
      'uniqueTopics', 'uniqueCourses', 'periodStart', 'periodEnd'
    ];
    for (const field of ssFields) {
      if (!(field in analytics.summaryStats)) {
        errors.push(`Missing summaryStats.${field}`);
      }
    }
  }
  
  // Verify strengthAreas items
  if (Array.isArray(analytics.strengthAreas) && analytics.strengthAreas.length > 0) {
    const sa = analytics.strengthAreas[0];
    const saFields = ['topic', 'score', 'attempts'];
    for (const field of saFields) {
      if (!(field in sa)) {
        errors.push(`Missing strengthAreas[].${field}`);
      }
    }
  }
  
  // Verify growthAreas items
  if (Array.isArray(analytics.growthAreas) && analytics.growthAreas.length > 0) {
    const ga = analytics.growthAreas[0];
    const gaFields = ['topic', 'score', 'attempts', 'suggestedResources'];
    for (const field of gaFields) {
      if (!(field in ga)) {
        errors.push(`Missing growthAreas[].${field}`);
      }
    }
  }
  
  if (errors.length > 0) {
    console.log('❌ Structure verification failed:\n');
    errors.forEach(e => console.log(`   - ${e}`));
    return false;
  }
  
  console.log('✅ All required fields present\n');
  return true;
}

/**
 * Print formatted analytics results
 */
function printResults(analytics) {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 ANALYTICS RESULTS');
  console.log('═'.repeat(60) + '\n');
  
  // Learning Style
  console.log('🎯 Learning Style:');
  console.log(`   Primary: ${analytics.learningStyle.primary || 'Unknown'}`);
  console.log(`   Secondary: ${analytics.learningStyle.secondary || 'None'}`);
  console.log(`   Confidence: ${(analytics.learningStyle.confidence * 100).toFixed(1)}%`);
  console.log(`   Data Points: ${analytics.learningStyle.dataPoints}`);
  console.log('\n   Activity Type Breakdown:');
  for (const [type, score] of Object.entries(analytics.learningStyle.breakdown || {})) {
    console.log(`     ${type}: ${(score * 100).toFixed(1)}%`);
  }
  
  // Strength Areas
  console.log('\n💪 Strength Areas (>80%):');
  if (analytics.strengthAreas.length === 0) {
    console.log('   None identified yet');
  } else {
    for (const area of analytics.strengthAreas) {
      console.log(`   ✅ ${area.topic}: ${(area.score * 100).toFixed(1)}% (${area.attempts} attempts)`);
    }
  }
  
  // Growth Areas
  console.log('\n🌱 Growth Areas (<60%):');
  if (analytics.growthAreas.length === 0) {
    console.log('   None identified');
  } else {
    for (const area of analytics.growthAreas) {
      console.log(`   📈 ${area.topic}: ${(area.score * 100).toFixed(1)}% (${area.attempts} attempts)`);
      if (area.suggestedResources?.length > 0) {
        console.log(`      Suggested: ${area.suggestedResources[0].title}`);
      }
    }
  }
  
  // Engagement Patterns
  console.log('\n⏰ Engagement Patterns:');
  console.log(`   Preferred Times: ${analytics.engagementPatterns.preferredTimes.join(', ') || 'N/A'}`);
  console.log(`   Peak Performance: ${analytics.engagementPatterns.peakPerformanceDay} at ${analytics.engagementPatterns.peakPerformanceHour}:00`);
  console.log(`   Avg Session Length: ${analytics.engagementPatterns.avgSessionLength} minutes`);
  console.log(`   Consistency Score: ${(analytics.engagementPatterns.consistencyScore * 100).toFixed(1)}%`);
  console.log(`   Current Streak: ${analytics.engagementPatterns.currentStreak} days`);
  console.log(`   Record Streak: ${analytics.engagementPatterns.streakRecord} days`);
  console.log(`   Total Sessions: ${analytics.engagementPatterns.totalSessionCount}`);
  console.log(`   Total Time: ${analytics.engagementPatterns.totalTimeSpentMinutes} minutes`);
  
  // Persistence Metrics
  console.log('\n🔄 Persistence Metrics:');
  console.log(`   Avg Attempts Before Success: ${analytics.persistenceMetrics.avgAttemptsBeforeSuccess}`);
  console.log(`   Retry After Failure: ${(analytics.persistenceMetrics.retryAfterFailure * 100).toFixed(1)}%`);
  console.log(`   Give Up Rate: ${(analytics.persistenceMetrics.giveUpRate * 100).toFixed(1)}%`);
  console.log(`   Improvement Rate: ${(analytics.persistenceMetrics.improvementRate * 100).toFixed(1)}%`);
  console.log(`   Overall Accuracy: ${(analytics.persistenceMetrics.overallAccuracy * 100).toFixed(1)}%`);
  console.log(`   Total Attempts: ${analytics.persistenceMetrics.totalAttempts}`);
  console.log(`   Total Correct: ${analytics.persistenceMetrics.totalCorrect}`);
  
  // Summary Stats
  console.log('\n📈 Summary (Last 30 Days):');
  console.log(`   Activities Completed: ${analytics.summaryStats.activitiesCompleted}`);
  console.log(`   Average Score: ${(analytics.summaryStats.averageScore * 100).toFixed(1)}%`);
  console.log(`   Total Time: ${analytics.summaryStats.totalTimeSpentMinutes} minutes`);
  console.log(`   Unique Topics: ${analytics.summaryStats.uniqueTopics}`);
  console.log(`   Unique Courses: ${analytics.summaryStats.uniqueCourses}`);
  
  // Data Quality
  console.log('\n🔬 Data Quality:');
  console.log(`   Has Enough Data: ${analytics.dataQuality.hasEnoughData ? 'Yes ✅' : 'No ⚠️'}`);
  console.log(`   Activity Count: ${analytics.dataQuality.activityCount}`);
  console.log(`   Days Covered: ${analytics.dataQuality.daysCovered}`);
  console.log(`   Compute Version: ${analytics.computeVersion}`);
  
  console.log('\n' + '═'.repeat(60) + '\n');
}

/**
 * Clean up test data
 */
async function cleanupTestData(userId) {
  console.log(`\n🧹 Cleaning up test data for user: ${userId}\n`);
  
  // Delete activity attempts
  const attemptsRef = db.collection('users').doc(userId).collection('activityAttempts');
  const attemptsSnap = await attemptsRef.get();
  
  const batch = db.batch();
  attemptsSnap.docs.forEach(doc => batch.delete(doc.ref));
  
  // Delete user analytics
  batch.delete(db.collection('userAnalytics').doc(userId));
  
  // Delete user document
  batch.delete(db.collection('users').doc(userId));
  
  await batch.commit();
  console.log('✅ Test data cleaned up\n');
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const shouldCleanup = args.includes('--cleanup');
  const useRealIndex = args.indexOf('--use-real');
  const useRealUser = useRealIndex !== -1 ? args[useRealIndex + 1] : null;
  
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 ANALYTICS COMPUTATION TEST');
  console.log('═'.repeat(60));
  
  const userId = useRealUser || TEST_USER_ID;
  
  try {
    // Step 1: Create mock data (skip if using real user)
    if (!useRealUser) {
      await createMockData(userId);
    } else {
      console.log(`\n📋 Using real user data for: ${userId}\n`);
    }
    
    // Step 2: Run analytics computation
    const analytics = await runAnalyticsComputation(userId);
    
    // Step 3: Verify output structure
    const isValid = verifyOutputStructure(analytics);
    
    // Step 4: Print results
    printResults(analytics);
    
    // Step 5: Clean up (if requested and not using real user)
    if (shouldCleanup && !useRealUser) {
      await cleanupTestData(userId);
    } else if (!useRealUser) {
      console.log(`💡 Test data preserved. Run with --cleanup to remove.`);
      console.log(`   User ID: ${userId}\n`);
    }
    
    // Final status
    if (isValid) {
      console.log('✅ TEST PASSED: Analytics computation working correctly!\n');
      process.exit(0);
    } else {
      console.log('❌ TEST FAILED: Structure validation errors\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED with error:\n');
    console.error(error);
    
    // Attempt cleanup on error
    if (!useRealUser) {
      try {
        await cleanupTestData(userId);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    process.exit(1);
  }
}

main();
