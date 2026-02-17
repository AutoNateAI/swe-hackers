import { getDb } from '../lib/firebase-admin-init.mjs';

const db = getDb();
const snap = await db.collection('feedPosts').get();
console.log('Total feedPosts:', snap.size);

const byQuestion = {};
snap.forEach(doc => {
  const d = doc.data();
  const q = d.question || d.title || '';
  if (!byQuestion[q]) byQuestion[q] = [];
  const hasStorageImages = (d.slides || []).some(s => s.imageUrl && s.imageUrl.startsWith('https://'));
  byQuestion[q].push({ id: doc.id, hasStorageImages });
});

let deleted = 0;
const batch = db.batch();
for (const [q, docs] of Object.entries(byQuestion)) {
  if (docs.length > 1) {
    const keep = docs.find(d => d.hasStorageImages) || docs[0];
    for (const doc of docs) {
      if (doc.id !== keep.id) {
        batch.delete(db.collection('feedPosts').doc(doc.id));
        deleted++;
      }
    }
  }
}

if (deleted > 0) {
  await batch.commit();
}
console.log('Deleted', deleted, 'duplicates');
process.exit(0);
