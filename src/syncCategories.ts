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
  categories?: string[]; // mark as optional in case old posts don't have it
}

// The Target Category Object Model
interface CategoryDocument {
  Categories: string[];
  updatedAt: admin.firestore.Timestamp;
  createdAt?: admin.firestore.Timestamp; // Optional here because we might strictly update
}

async function syncCategories() {
  console.log('🔄 Starting Category Sync...');

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
    const uniqueCategories = new Set<string>();

    postsSnapshot.forEach((doc) => {
      const data = doc.data() as PostDocument;
      
      // Check if categories exist and is an array
      if (data.categories && Array.isArray(data.categories)) {
        data.categories.forEach((cat) => {
          // Add to set (trims whitespace to avoid "Tech" vs "Tech ")
          uniqueCategories.add(cat.trim());
        });
      }
    });

    const categoryList = Array.from(uniqueCategories);
    console.log(`📊 Found ${categoryList.length} unique categories:`, categoryList);

    // C. Save to /categories/all
    const categoryRef = db.collection('categories').doc('all');
    const categoryDoc = await categoryRef.get();

    const timestamp = admin.firestore.Timestamp.now();

    // Prepare payload
    let payload: CategoryDocument = {
      Categories: categoryList,
      updatedAt: timestamp,
    };

    // Logic: If doc doesn't exist, add createdAt. 
    // If it exists, we preserve the original createdAt.
    if (!categoryDoc.exists) {
      payload.createdAt = timestamp;
      await categoryRef.set(payload);
      console.log('✅ Created new Categories document at /categories/all');
    } else {
      // We use set with { merge: true } to update fields without deleting createdAt if it exists
      await categoryRef.set(payload, { merge: true });
      console.log('✅ Updated existing Categories document at /categories/all');
    }

  } catch (error) {
    console.error('❌ Error syncing categories:', error);
  }
}

// Execute
syncCategories()
  .then(() => console.log('Done.'))
  .catch(console.error);