#!/usr/bin/env node
/**
 * Seed userAnalytics data for a specific user
 * 
 * This creates realistic analytics data for testing the dashboard
 * without needing Cloud Functions to compute it.
 * 
 * Usage:
 *   node seed-user-analytics.js <userId>
 *   node seed-user-analytics.js bLDCOI8o0dbwLyX5eOYHaNQMmyq1
 * 
 * To find a user's UID, check browser console when they sign in,
 * or use: node query-firestore.js users
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Try to find service account key
const possibleKeyPaths = [
  join(homedir(), 'firebase-admin-key.json'),
  join(homedir(), '.config', 'firebase-admin-key.json'),
  join(process.cwd(), 'firebase-admin-key.json'),
  join(process.cwd(), '..', 'firebase-admin-key.json'),
];

let app;
let keyPath = possibleKeyPaths.find(p => existsSync(p));

if (keyPath) {
  console.log(`🔑 Using service account key: ${keyPath}`);
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: 'autonateai-learning-hub'
  });
} else {
  console.log('🔑 Using Application Default Credentials');
  try {
    app = initializeApp({
      credential: applicationDefault(),
      projectId: 'autonateai-learning-hub'
    });
  } catch (e) {
    console.error('\n❌ No credentials found!');
    console.error('Download service account key and save as: ~/firebase-admin-key.json');
    process.exit(1);
  }
}

const db = getFirestore();

async function main() {
  const args = process.argv.slice(2);
  const userId = args[0];
  
  if (!userId) {
    console.log('\n📊 User Analytics Seed Script');
    console.log('==============================\n');
    console.log('Usage: node seed-user-analytics.js <userId>\n');
    console.log('Example:');
    console.log('  node seed-user-analytics.js bLDCOI8o0dbwLyX5eOYHaNQMmyq1\n');
    console.log('To find the userId, sign in to the app and check browser console for:');
    console.log('  "📊 Loading component analytics for user: <userId>"');
    process.exit(0);
  }
  
  console.log(`\n📊 Seeding analytics for user: ${userId}`);
  
  try {
    
    // Create analytics document
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const analyticsData = {
      userId: userId,
      
      learningStyle: {
        primary: 'kinesthetic',
        secondary: 'visual',
        confidence: 0.78,
        dataPoints: 47,
        breakdown: {
          dragDrop: 0.88,
          multipleChoice: 0.82,
          codeCompletion: 0.91,
          freeResponse: 0.76,
          matching: 0.85
        }
      },
      
      strengthAreas: [
        { 
          topic: 'variables', 
          score: 0.92, 
          attempts: 15, 
          lastActivity: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000))
        },
        { 
          topic: 'loops', 
          score: 0.87, 
          attempts: 12, 
          lastActivity: Timestamp.fromDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000))
        },
        { 
          topic: 'functions', 
          score: 0.84, 
          attempts: 18, 
          lastActivity: Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000))
        }
      ],
      
      growthAreas: [
        {
          topic: 'recursion',
          score: 0.54,
          attempts: 6,
          suggestedResources: [
            { type: 'lesson', id: 'ch3-recursion-basics', title: 'Recursion Fundamentals' },
            { type: 'activity', id: 'act-recursion-visual', title: 'Visualizing Recursive Calls' }
          ]
        },
        {
          topic: 'objects',
          score: 0.58,
          attempts: 4,
          suggestedResources: [
            { type: 'lesson', id: 'ch4-objects-intro', title: 'Introduction to Objects' }
          ]
        }
      ],
      
      engagementPatterns: {
        preferredTimes: ['18:00-21:00', '09:00-11:00'],
        avgSessionLength: 28,
        peakPerformanceDay: 'Wednesday',
        peakPerformanceHour: 19,
        consistencyScore: 0.72,
        streakRecord: 7,
        currentStreak: 4,
        totalSessionCount: 23,
        totalTimeSpentMinutes: 644
      },
      
      persistenceMetrics: {
        avgAttemptsBeforeSuccess: 1.8,
        giveUpRate: 0.12,
        retryAfterFailure: 0.88,
        improvementRate: 0.18,
        totalAttempts: 89,
        totalCorrect: 71,
        overallAccuracy: 0.80
      },
      
      summaryStats: {
        activitiesCompleted: 47,
        averageScore: 0.79,
        overallScore: 79,
        totalTimeMinutes: 644,
        uniqueTopics: 6,
        uniqueCourses: 2,
        periodStart: Timestamp.fromDate(thirtyDaysAgo),
        periodEnd: Timestamp.fromDate(now)
      },
      
      lastComputed: Timestamp.fromDate(now),
      computeVersion: '1.0.0-seed',
      dataQuality: {
        hasEnoughData: true,
        activityCount: 89,
        daysCovered: 30
      }
    };
    
    console.log(`\n📊 Writing analytics to userAnalytics/${userId}...`);
    
    await db.collection('userAnalytics').doc(userId).set(analyticsData);
    
    console.log('✅ Analytics data seeded successfully!\n');
    console.log('Summary:');
    console.log(`   Learning Style: ${analyticsData.learningStyle.primary} (${Math.round(analyticsData.learningStyle.confidence * 100)}% confidence)`);
    console.log(`   Strengths: ${analyticsData.strengthAreas.map(a => a.topic).join(', ')}`);
    console.log(`   Growth Areas: ${analyticsData.growthAreas.map(a => a.topic).join(', ')}`);
    console.log(`   Streak: ${analyticsData.engagementPatterns.currentStreak} days`);
    console.log(`   Overall Score: ${analyticsData.summaryStats.overallScore}%`);
    console.log(`   Activities: ${analyticsData.summaryStats.activitiesCompleted}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
