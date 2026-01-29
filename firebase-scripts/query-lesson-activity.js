#!/usr/bin/env node
/**
 * Query which users have been actively answering questions for a specific lesson
 *
 * Usage:
 *   node query-lesson-activity.js <courseId> <lessonId>
 *   node query-lesson-activity.js <courseId> --list-lessons
 *
 * Examples:
 *   node query-lesson-activity.js endless-opportunities week0-intro
 *   node query-lesson-activity.js endless-opportunities week1-questions
 *   node query-lesson-activity.js endless-opportunities --list-lessons
 *   node query-lesson-activity.js apprentice ch1-prompts
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

async function listLessons(courseId) {
  console.log(`\n📚 Lessons with activity in course: ${courseId}\n`);

  const usersSnap = await db.collection('users').get();
  const lessonSet = new Map(); // lessonId -> count of users

  for (const userDoc of usersSnap.docs) {
    const attemptsSnap = await userDoc.ref
      .collection('activityAttempts')
      .where('courseId', '==', courseId)
      .get();

    const userLessons = new Set();
    for (const attemptDoc of attemptsSnap.docs) {
      const lessonId = attemptDoc.data().lessonId;
      if (lessonId) userLessons.add(lessonId);
    }

    for (const lessonId of userLessons) {
      lessonSet.set(lessonId, (lessonSet.get(lessonId) || 0) + 1);
    }
  }

  if (lessonSet.size === 0) {
    console.log('   No activity found for this course.');
  } else {
    const sorted = [...lessonSet.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [lessonId, userCount] of sorted) {
      console.log(`  📖 ${lessonId} — ${userCount} active user(s)`);
    }
  }
}

async function queryLessonActivity(courseId, lessonId) {
  console.log(`\n📊 Users active on: ${courseId} / ${lessonId}`);
  console.log('─'.repeat(60));

  const usersSnap = await db.collection('users').get();
  const activeUsers = [];

  for (const userDoc of usersSnap.docs) {
    const attemptsSnap = await userDoc.ref
      .collection('activityAttempts')
      .where('courseId', '==', courseId)
      .get();

    if (attemptsSnap.empty) continue;

    const userData = userDoc.data();
    const attempts = attemptsSnap.docs
      .map(d => d.data())
      .filter(a => a.lessonId === lessonId);

    if (attempts.length === 0) continue;

    // Sort by createdAt descending
    attempts.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });
    const totalAttempts = attempts.length;
    const correctCount = attempts.filter(a => a.correct).length;
    const firstAttempt = attempts[attempts.length - 1];
    const lastAttempt = attempts[0];
    const uniqueActivities = new Set(attempts.map(a => a.activityId));

    activeUsers.push({
      email: userData.email || 'no-email',
      displayName: userData.displayName || 'N/A',
      uid: userDoc.id,
      totalAttempts,
      correctCount,
      uniqueActivities: uniqueActivities.size,
      firstActivity: firstAttempt.createdAt?.toDate?.(),
      lastActivity: lastAttempt.createdAt?.toDate?.(),
    });
  }

  if (activeUsers.length === 0) {
    console.log(`\n   No users have answered questions for this lesson.`);
    return;
  }

  // Sort by most recent activity
  activeUsers.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));

  console.log(`\n👥 ${activeUsers.length} active user(s):\n`);

  for (const u of activeUsers) {
    const accuracy = u.totalAttempts > 0 ? Math.round((u.correctCount / u.totalAttempts) * 100) : 0;
    const last = u.lastActivity?.toLocaleString('en-US', { timeZone: 'America/New_York' }) || 'N/A';
    const first = u.firstActivity?.toLocaleString('en-US', { timeZone: 'America/New_York' }) || 'N/A';

    console.log(`📧 ${u.email} (${u.displayName})`);
    console.log(`   UID: ${u.uid}`);
    console.log(`   Attempts: ${u.totalAttempts} | Correct: ${u.correctCount} (${accuracy}%) | Activities: ${u.uniqueActivities}`);
    console.log(`   First: ${first} EST | Last: ${last} EST`);
    console.log('');
  }

  console.log('─'.repeat(60));
  console.log(`📈 Summary: ${activeUsers.length} users | ${activeUsers.reduce((s, u) => s + u.totalAttempts, 0)} total attempts`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log('\n📊 Lesson Activity Query Tool');
    console.log('==============================\n');
    console.log('Usage:');
    console.log('  node query-lesson-activity.js <courseId> <lessonId>');
    console.log('  node query-lesson-activity.js <courseId> --list-lessons\n');
    console.log('Examples:');
    console.log('  node query-lesson-activity.js endless-opportunities week0-intro');
    console.log('  node query-lesson-activity.js endless-opportunities --list-lessons');
    console.log('  node query-lesson-activity.js apprentice ch1-prompts');
    process.exit(0);
  }

  const courseId = args[0];

  if (args[1] === '--list-lessons') {
    await listLessons(courseId);
  } else if (args[1]) {
    await queryLessonActivity(courseId, args[1]);
  } else {
    console.error('❌ Please provide a lessonId or use --list-lessons');
    process.exit(1);
  }

  process.exit(0);
}

main();
