import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC9tSMyMJPmFypoTH9JTaY8GO6UF5FTx50",
  authDomain: "uts-oculus.firebaseapp.com",
  projectId: "uts-oculus",
  storageBucket: "uts-oculus.appspot.com",
  messagingSenderId: "905728409505",
  appId: "1:905728409505:web:5f94457d684c156ebf95e0",
  measurementId: "G-MXHZL67Z9C"
};

// Initialize Firebase app if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize auth
const auth = getAuth(app);

// Store the current user in AsyncStorage when auth state changes
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is signed in, store the user data
    AsyncStorage.setItem('user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }));
  } else {
    // User is signed out, remove the stored user data
    AsyncStorage.removeItem('user');
  }
});

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage }; 