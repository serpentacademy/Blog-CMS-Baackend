import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

// 1. Initialize Firebase (Standard Boilerplate)
const serviceAccount = require('../serviceAccount.json') as ServiceAccount;

// Prevent re-initialization error if running multiple scripts in one runtime
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// 2. Define Interfaces

// Update Post interface to include the categories field
interface PostDocument {
  title: string;
  labels?: string[]; // mark as optional in case old posts don't have it
}

// The Target label Object Model
interface LabelDocument {
  Labels: string[];
  updatedAt: admin.firestore.Timestamp;
  createdAt?: admin.firestore.Timestamp; // Optional here because we might strictly update
}

async function syncLabels() {
  console.log('🔄 Starting label Sync...');

  try {
    // A. Fetch all posts
    // Note: If you have thousands of posts, you might need pagination here.
    const postsSnapshot = await db.collection('posts').get();

    if (postsSnapshot.empty) {
      console.log('⚠️ No posts found.');
      return;
    }

    // B. Extract and Flatten Categories
    // We use a Set to automatically handle uniqueness (no duplicates)
    const uniqueLabels = new Set<string>();

    postsSnapshot.forEach((doc) => {
      const data = doc.data() as PostDocument;
      
      // Check if categories exist and is an array
      if (data.labels && Array.isArray(data.labels)) {
        data.labels.forEach((lab) => {
          // Add to set (trims whitespace to avoid "Tech" vs "Tech ")
          uniqueLabels.add(lab.trim());
        });
      }
    });

    const labelsList = Array.from(uniqueLabels);
    console.log(`📊 Found ${labelsList.length} unique categories:`, labelsList);

    // C. Save to /categories/all
    const labelRef = db.collection('labels').doc('all');
    const labelDoc = await labelRef.get();

    const timestamp = admin.firestore.Timestamp.now();

    // Prepare payload
    let payload: LabelDocument = {
      Labels: labelsList,
      updatedAt: timestamp,
    };

    // Logic: If doc doesn't exist, add createdAt. 
    // If it exists, we preserve the original createdAt.
    if (!labelDoc.exists) {
      payload.createdAt = timestamp;
      await labelRef.set(payload);
      console.log('✅ Created new Labels document at /labels/all');
    } else {
      // We use set with { merge: true } to update fields without deleting createdAt if it exists
      await labelRef.set(payload, { merge: true });
      console.log('✅ Updated existing Categories document at /labels/all');
    }

  } catch (error) {
    console.error('❌ Error syncing categories:', error);
  }
}

// Execute
syncLabels()
  .then(() => console.log('Done.'))
  .catch(console.error);