#!/usr/bin/env node
/**
 * Query activity attempts and stats from Firestore
 * 
 * Usage:
 *   node query-activities.js <userId> [courseId]
 *   node query-activities.js --list-users
 * 
 * Examples:
 *   node query-activities.js --list-users
 *   node query-activities.js abc123xyz
 *   node query-activities.js abc123xyz apprentice
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Initialize Firebase Admin
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

async function listUsers() {
  console.log('\n👥 Users with course progress:\n');
  const usersSnap = await db.collection('users').get();
  
  for (const userDoc of usersSnap.docs) {
    const courseProgress = await db.collection('users').doc(userDoc.id)
      .collection('courseProgress').get();
    
    const activityAttempts = await db.collection('users').doc(userDoc.id)
      .collection('activityAttempts').get();
    
    console.log(`📧 User ID: ${userDoc.id}`);
    console.log(`   Courses enrolled: ${courseProgress.size}`);
    console.log(`   Activity attempts: ${activityAttempts.size}`);
    
    const userData = userDoc.data();
    if (userData?.email) console.log(`   Email: ${userData.email}`);
    console.log('');
  }
}

async function queryActivities(userId, courseId) {
  console.log(`\n🎯 Activity data for user: ${userId}`);
  if (courseId) console.log(`   Filtering by course: ${courseId}`);
  console.log('─'.repeat(60));
  
  // Get activity attempts
  let attemptsRef = db.collection('users').doc(userId).collection('activityAttempts');
  if (courseId) {
    attemptsRef = attemptsRef.where('courseId', '==', courseId);
  }
  
  const attemptsSnap = await attemptsRef.orderBy('createdAt', 'desc').limit(20).get();
  
  console.log(`\n📊 Activity Attempts (${attemptsSnap.size} found):\n`);
  
  if (attemptsSnap.empty) {
    console.log('   No activity attempts found.');
  } else {
    attemptsSnap.forEach(doc => {
      const data = doc.data();
      const emoji = data.correct ? '✅' : '❌';
      const time = data.createdAt?.toDate?.()?.toLocaleString() || 'N/A';
      
      console.log(`${emoji} ${data.activityId}`);
      console.log(`   Course: ${data.courseId} / ${data.lessonId}`);
      console.log(`   Type: ${data.activityType}`);
      console.log(`   Attempt #${data.attemptNumber} | Score: ${data.score} | Time: ${data.timeSpentMs}ms`);
      console.log(`   Response: ${JSON.stringify(data.response)}`);
      console.log(`   Created: ${time}`);
      console.log('');
    });
  }
  
  // Get activity stats from course progress
  if (courseId) {
    const courseDoc = await db.collection('users').doc(userId)
      .collection('courseProgress').doc(courseId).get();
    
    if (courseDoc.exists) {
      const stats = courseDoc.data()?.activityStats;
      if (stats) {
        console.log('\n📈 Activity Stats:\n');
        console.log(JSON.stringify(stats, null, 2));
      }
    }
  } else {
    // Get all course progress
    const coursesSnap = await db.collection('users').doc(userId)
      .collection('courseProgress').get();
    
    console.log('\n📈 Activity Stats by Course:\n');
    coursesSnap.forEach(doc => {
      const stats = doc.data()?.activityStats;
      if (stats) {
        console.log(`Course: ${doc.id}`);
        console.log(JSON.stringify(stats, null, 2));
        console.log('');
      }
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log('\n🎯 Activity Query Tool');
    console.log('======================\n');
    console.log('Usage:');
    console.log('  node query-activities.js --list-users');
    console.log('  node query-activities.js <userId> [courseId]');
    console.log('\nExamples:');
    console.log('  node query-activities.js --list-users');
    console.log('  node query-activities.js abc123xyz');
    console.log('  node query-activities.js abc123xyz apprentice');
    process.exit(0);
  }
  
  if (args[0] === '--list-users') {
    await listUsers();
  } else {
    const userId = args[0];
    const courseId = args[1];
    await queryActivities(userId, courseId);
  }
  
  process.exit(0);
}

main();

