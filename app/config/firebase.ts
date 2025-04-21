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
let app;
try {
  app = getApp();
} catch {
  app = initializeApp(firebaseConfig);
}

// Initialize auth
const auth = getAuth(app);

// 注意: React Native 不支持浏览器持久化
// React Native 使用 AsyncStorage 实现持久化
// 不需要使用 setPersistence，因为我们已经实现了自定义持久化

// Store the current user in AsyncStorage when auth state changes
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is signed in, store the user data
    AsyncStorage.setItem('user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    })).catch(error => console.error('Error storing user data:', error));
    console.log('User signed in:', user.email);
  } else {
    // User is signed out, remove the stored user data
    AsyncStorage.removeItem('user')
      .catch(error => console.error('Error removing user data:', error));
    console.log('User signed out');
  }
});

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage }; 