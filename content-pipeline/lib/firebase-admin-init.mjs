import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  || resolve(homedir(), 'firebase-admin-key.json');

let db;

export function getDb() {
  if (db) return db;

  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: 'autonateai-learning-hub'
    });
  }

  db = getFirestore();
  return db;
}
