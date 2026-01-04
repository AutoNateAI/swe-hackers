#!/usr/bin/env node
/**
 * Query Firestore data from AutoNateAI Learning Hub
 * 
 * Usage:
 *   node query-firestore.js <collection> [documentId]
 *   node query-firestore.js users/{uid}/activityAttempts
 *   node query-firestore.js users/{uid}/courseProgress/apprentice
 * 
 * Examples:
 *   node query-firestore.js users                              # List all users
 *   node query-firestore.js users/abc123                       # Get specific user
 *   node query-firestore.js users/abc123/activityAttempts      # List activity attempts
 *   node query-firestore.js users/abc123/courseProgress        # List course progress
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
  console.log('   (Run "gcloud auth application-default login" if this fails)');
  try {
    app = initializeApp({
      credential: applicationDefault(),
      projectId: 'autonateai-learning-hub'
    });
  } catch (e) {
    console.error('\n❌ No credentials found!');
    console.error('\nTo fix this, either:');
    console.error('1. Download service account key from Firebase Console:');
    console.error('   Project Settings → Service Accounts → Generate New Private Key');
    console.error('   Save as: ~/firebase-admin-key.json');
    console.error('\n2. Or run: gcloud auth application-default login');
    process.exit(1);
  }
}

const db = getFirestore();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('\n📊 Firestore Query Tool');
    console.log('========================\n');
    console.log('Usage: node query-firestore.js <path>\n');
    console.log('Examples:');
    console.log('  node query-firestore.js users');
    console.log('  node query-firestore.js users/{uid}');
    console.log('  node query-firestore.js users/{uid}/activityAttempts');
    console.log('  node query-firestore.js users/{uid}/courseProgress/apprentice');
    console.log('  node query-firestore.js activities');
    console.log('\nTip: Use --limit=N to limit results');
    process.exit(0);
  }

  const path = args[0];
  const limit = args.find(a => a.startsWith('--limit='))?.split('=')[1] || 10;
  
  // Parse path into collection/document segments
  const segments = path.split('/').filter(Boolean);
  
  console.log(`\n🔍 Querying: ${path}`);
  console.log('─'.repeat(50));
  
  try {
    if (segments.length % 2 === 0) {
      // Even segments = document path
      const docRef = db.doc(path);
      const doc = await docRef.get();
      
      if (doc.exists) {
        console.log(`\n📄 Document: ${path}\n`);
        console.log(JSON.stringify(doc.data(), null, 2));
      } else {
        console.log(`\n❌ Document not found: ${path}`);
      }
    } else {
      // Odd segments = collection path
      const collRef = db.collection(path);
      const snapshot = await collRef.limit(parseInt(limit)).get();
      
      console.log(`\n📁 Collection: ${path} (${snapshot.size} documents, limit ${limit})\n`);
      
      if (snapshot.empty) {
        console.log('   (empty collection)');
      } else {
        snapshot.forEach(doc => {
          console.log(`\n📄 ${doc.id}:`);
          const data = doc.data();
          // Truncate large fields for display
          const display = {};
          for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string' && value.length > 100) {
              display[key] = value.substring(0, 100) + '...';
            } else if (Array.isArray(value) && value.length > 5) {
              display[key] = `[Array with ${value.length} items]`;
            } else {
              display[key] = value;
            }
          }
          console.log(JSON.stringify(display, null, 2));
        });
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
  
  process.exit(0);
}

main();

