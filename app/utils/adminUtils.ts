import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { db } from '../config/firebase';

export const checkAdminAccess = async () => {
  try {
    const auth = getAuth();
    
    if (!auth.currentUser) {
      router.replace('/(auth)/login');
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
      router.replace('/(tabs)/home');
      return;
    }
  } catch (error) {
    console.error('Error checking admin access:', error);
    router.replace('/(tabs)/home');
  }
}; 