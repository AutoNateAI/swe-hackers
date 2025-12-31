/**
 * Firebase Configuration for AutoNateAI Learning Hub
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to Firebase Console: https://console.firebase.google.com/
 * 2. Create a new project or use existing one
 * 3. Enable Authentication (Email/Password + Google Sign-In)
 * 4. Enable Firestore Database
 * 5. Copy your config values below
 * 6. Add your domain to authorized domains in Firebase Auth settings
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDiojaiBrj0nRNIGMVHCFr4zMxEMEkv8S0",
  authDomain: "autonateai-learning-hub.firebaseapp.com",
  projectId: "autonateai-learning-hub",
  storageBucket: "autonateai-learning-hub.firebasestorage.app",
  messagingSenderId: "650162209338",
  appId: "1:650162209338:web:cb9626f2e6f9ac3eff6b03",
  measurementId: "G-D7553DEM0Y"
};

// Initialize Firebase
let app, auth, db;

function initFirebase() {
  if (typeof firebase !== 'undefined') {
    // Check if already initialized
    if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.app();
    }
    auth = firebase.auth();
    db = firebase.firestore();
    
    console.log('🔥 Firebase initialized');
    return true;
  } else {
    console.warn('Firebase SDK not loaded');
    return false;
  }
}

// Export for use in other modules
window.FirebaseApp = {
  init: initFirebase,
  getAuth: () => auth,
  getDb: () => db,
  getApp: () => app
};

