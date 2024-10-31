import { getFirestore, collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore';
import { app } from './firebaseConfig';

const db = getFirestore(app);

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  date: string;
}

export async function addBlogPost(post: Omit<BlogPost, 'id'>) {
  try {
    const docRef = await addDoc(collection(db, 'blogPosts'), post);
    console.log('Blog post added with ID: ', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding blog post: ', error);
    throw error;
  }
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'blogPosts'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BlogPost));
  } catch (error) {
    console.error('Error getting blog posts: ', error);
    throw error;
  }
}

export async function getBlogPost(id: string): Promise<BlogPost | null> {
  try {
    const docRef = doc(db, 'blogPosts', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as BlogPost;
    } else {
      console.log('No such document!');
      return null;
    }
  } catch (error) {
    console.error('Error getting blog post: ', error);
    throw error;
  }
}
