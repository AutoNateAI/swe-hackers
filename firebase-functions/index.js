/**
 * Firebase Cloud Functions for SWE Hackers Analytics
 * 
 * This module exports all Cloud Functions for the analytics system.
 * 
 * @module firebase-functions
 */

import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
initializeApp();

// Export analytics functions
export { onActivityComplete } from './analytics/onActivityComplete.js';
export { computeUserAnalytics } from './analytics/computeUserAnalytics.js';
