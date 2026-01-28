/* eslint-disable no-undef */
// Firebase Messaging Service Worker (Web Push)

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDiojaiBrj0nRNIGMVHCFr4zMxEMEkv8S0",
  authDomain: "autonateai-learning-hub.firebaseapp.com",
  projectId: "autonateai-learning-hub",
  storageBucket: "autonateai-learning-hub.firebasestorage.app",
  messagingSenderId: "650162209338",
  appId: "1:650162209338:web:cb9626f2e6f9ac3eff6b03",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || 'AutoNateAI';
  const options = {
    body: notification.body || '',
    icon: notification.icon || '/courses/assets/og-preview.png',
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});
