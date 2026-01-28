const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();

const db = admin.firestore();

function initSendGrid() {
  const apiKey = functions.config().sendgrid?.key;
  if (!apiKey) return false;
  sgMail.setApiKey(apiKey);
  return true;
}

async function getUserPrefs(uid) {
  const doc = await db.collection('users').doc(uid)
    .collection('notificationPrefs').doc('default').get();
  return doc.exists ? doc.data() : null;
}

async function getUserProfile(uid) {
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? doc.data() : null;
}

async function sendEmail(to, subject, html) {
  const from = functions.config().sendgrid?.from;
  if (!from) return;
  await sgMail.send({ to, from, subject, html });
}

exports.onNotificationCreated = functions.firestore
  .document('users/{userId}/notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data) return;

    const userId = context.params.userId;
    const prefs = await getUserPrefs(userId);
    const profile = await getUserProfile(userId);
    const emailEnabled = prefs?.email === true;
    const emailFrequency = prefs?.frequency || 'daily';

    if (emailEnabled && emailFrequency === 'instant') {
      if (initSendGrid() && profile?.email) {
        await sendEmail(
          profile.email,
          data.title || 'AutoNateAI Notification',
          `<div style="font-family: Inter, Arial, sans-serif;">
            <h2>${data.title || 'Notification'}</h2>
            <p>${data.body || ''}</p>
          </div>`
        );
      }
    }

    if (!data.deliveries?.push) return;

    const tokensSnap = await db.collection('users').doc(userId)
      .collection('notificationTokens').get();

    if (tokensSnap.empty) return;

    const tokens = tokensSnap.docs.map(doc => doc.data().token).filter(Boolean);
    if (tokens.length === 0) return;

    const payload = {
      notification: {
        title: data.title || 'AutoNateAI',
        body: data.body || ''
      },
      data: {
        link: data.link || ''
      }
    };

    await admin.messaging().sendToDevice(tokens, payload);
  });

exports.dailyNotificationDigest = functions.pubsub
  .schedule('every day 08:00')
  .timeZone('America/New_York')
  .onRun(async () => {
    if (!initSendGrid()) return null;

    const prefsSnap = await db.collectionGroup('notificationPrefs')
      .where('email', '==', true)
      .where('frequency', '==', 'daily')
      .get();

    for (const prefDoc of prefsSnap.docs) {
      const userId = prefDoc.ref.parent.parent.id;
      const prefs = prefDoc.data();
      const profile = await getUserProfile(userId);

      if (!profile?.email) continue;

      const lastDigestAt = prefs.lastDigestAt || admin.firestore.Timestamp.fromMillis(0);

      const notificationsSnap = await db.collection('users').doc(userId)
        .collection('notifications')
        .where('deliveries.email', '==', true)
        .where('createdAt', '>', lastDigestAt)
        .orderBy('createdAt', 'desc')
        .limit(25)
        .get();

      if (notificationsSnap.empty) {
        await prefDoc.ref.set({
          lastDigestAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        continue;
      }

      const items = notificationsSnap.docs.map(doc => doc.data());
      const list = items.map(item => `
        <li style="margin-bottom: 12px;">
          <strong>${item.title || 'Notification'}</strong><br />
          <span>${item.body || ''}</span>
        </li>
      `).join('');

      await sendEmail(
        profile.email,
        'Your AutoNateAI daily digest',
        `<div style="font-family: Inter, Arial, sans-serif;">
          <h2>Daily Digest</h2>
          <p>Here is what you missed:</p>
          <ul>${list}</ul>
        </div>`
      );

      await prefDoc.ref.set({
        lastDigestAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return null;
  });
