import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 