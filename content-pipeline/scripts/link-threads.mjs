import { getDb } from '../lib/firebase-admin-init.mjs';

const db = getDb();

const [feedSnap, threadSnap] = await Promise.all([
  db.collection('feedPosts').get(),
  db.collection('commentThreads').get(),
]);

// Build question -> feedPost id map
const questionToPostId = {};
feedSnap.forEach(doc => {
  const d = doc.data();
  if (d.question) questionToPostId[d.question] = doc.id;
});

const batch = db.batch();
let linked = 0;

threadSnap.forEach(doc => {
  const d = doc.data();
  const postId = questionToPostId[d.question];
  if (postId) {
    batch.update(doc.ref, { postId });
    linked++;
  } else {
    console.log('No match for thread:', doc.id, d.question?.substring(0, 50));
  }
});

if (linked > 0) {
  await batch.commit();
}
console.log(`Linked ${linked}/${threadSnap.size} threads to feedPosts`);
process.exit(0);
