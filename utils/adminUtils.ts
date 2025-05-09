import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';

export const checkAdminAccess = async () => {
  try {
    const auth = getAuth();
    const db = getFirestore();
    
    if (!auth.currentUser) {
      router.replace('/auth/login');
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
      router.replace('/tabs');
      return;
    }
  } catch (error) {
    console.error('Error checking admin access:', error);
    router.replace('/tabs');
  }
}; 