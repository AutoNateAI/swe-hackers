#!/usr/bin/env node
/**
 * Set admin role for a user
 * 
 * Usage:
 *   node set-admin.js <uid>
 *   node set-admin.js <uid1> <uid2> ...
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
  app = initializeApp({
    credential: applicationDefault(),
    projectId: 'autonateai-learning-hub'
  });
}

const db = getFirestore();

async function main() {
  const uids = process.argv.slice(2);
  
  if (uids.length === 0) {
    console.log('\n👑 Set Admin Role Tool');
    console.log('========================\n');
    console.log('Usage: node set-admin.js <uid> [uid2] [uid3] ...\n');
    process.exit(0);
  }

  for (const uid of uids) {
    try {
      const userRef = db.collection('users').doc(uid);
      const doc = await userRef.get();
      
      if (!doc.exists) {
        console.log(`❌ User not found: ${uid}`);
        continue;
      }
      
      const userData = doc.data();
      await userRef.update({
        role: 'admin',
        updatedAt: new Date()
      });
      
      console.log(`✅ Granted admin to: ${userData.displayName || userData.email} (${uid})`);
    } catch (error) {
      console.error(`❌ Error updating ${uid}:`, error.message);
    }
  }
  
  process.exit(0);
}

main();
