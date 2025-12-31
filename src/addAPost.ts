import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

// 1. Initialize Firebase Admin SDK
// REPLACE this with the path to your actual service account file
const serviceAccount = require('../serviceAccount.json') as ServiceAccount;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. Define Data Models
// Types for content units based on your request
type ContentType = 'string' | 'html' | 'image' | 'video';

interface ContentUnit {
  typeO: ContentType; // Using 'typeO' as requested
  title: string;
  content: string; // URL for media, or text for string/html
}

// Input interface (what we pass to the function)
interface PostInput {
  title: string;
  slug: string;
  image: string; // Featured image URL
  description: string;
  contentUnits: ContentUnit[];
}

// Database interface (what actually gets saved)
interface PostDocument extends PostInput {
  views: number;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Adds a new post to the 'posts' collection in Firestore
 */
async function addPost(data: PostInput): Promise<string> {
  try {
    // Construct the final object with system fields
    const newPost: PostDocument = {
      ...data,
      views: 0, // Initialize views at 0
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Use the slug as the Document ID for cleaner URLs and easy lookup
    // OR use .add(newPost) if you want an auto-generated ID
    await db.collection('posts').doc(data.slug).set(newPost);

    console.log(`✅ Post created successfully! ID: ${data.slug}`);
    return data.slug;

  } catch (error) {
    console.error('❌ Error adding post:', error);
    throw error;
  }
}

// --- USAGE EXAMPLE ---
// You can run this file directly via: npx ts-node src/addPost.ts

const examplePost: PostInput = {
  title: "The Future of Blog CMS",
  slug: "future-of-blog-cms",
  description: "A deep dive into headless CMS architectures.",
  image: "https://example.com/featured-image.jpg",
  contentUnits: [
    {
      typeO: "html",
      title: "Introduction",
      content: "<p>Welcome to the new era of blogging...</p>"
    },
    {
      typeO: "image",
      title: "Architecture Diagram",
      content: "https://example.com/diagram.png"
    }
  ]
};

// Execute
addPost(examplePost)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));