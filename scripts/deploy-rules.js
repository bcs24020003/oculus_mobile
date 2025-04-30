/**
 * This script deploys Firestore security rules to Firebase
 * Run: node deploy-rules.js
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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

// Admin credentials
const email = "admin@uts-oculus.com";
const password = "Admin@123456";

// Path to the rules file
const rulesFilePath = path.join(__dirname, '..', 'firebase.rules');

// Function to authenticate with Firebase
async function authenticate() {
  try {
    const auth = getAuth(app);
    console.log(`Signing in as admin: ${email}`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Signed in successfully!');
    
    // Get the ID token
    const idToken = await userCredential.user.getIdToken();
    return idToken;
  } catch (error) {
    console.error('Error signing in:', error);
    process.exit(1);
  }
}

// Function to deploy rules using Firebase CLI
async function deployRules() {
  try {
    // Check if the rules file exists
    if (!fs.existsSync(rulesFilePath)) {
      console.error('Rules file not found:', rulesFilePath);
      process.exit(1);
    }
    
    console.log('Rules file found:', rulesFilePath);
    
    // Read the rules file content
    const rulesContent = fs.readFileSync(rulesFilePath, 'utf8');
    console.log('Rules content:');
    console.log('=============');
    console.log(rulesContent);
    console.log('=============');
    
    console.log('\nTo deploy these rules, follow these steps:');
    console.log('1. Login to Firebase Console: https://console.firebase.google.com/');
    console.log('2. Select the "uts-oculus" project');
    console.log('3. Navigate to Firestore Database > Rules');
    console.log('4. Replace the existing rules with the rules from the firebase.rules file');
    console.log('5. Click "Publish"');
    
    console.log('\nNote: To deploy using Firebase CLI, you would need to use:');
    console.log('firebase deploy --only firestore:rules');
    console.log('But this requires Firebase CLI to be installed and configured.\n');
    
  } catch (error) {
    console.error('Error deploying rules:', error);
    process.exit(1);
  }
}

// Main function
async function main() {
  console.log('Starting deployment of Firestore security rules...');
  
  try {
    // 1. Authenticate
    // const idToken = await authenticate();
    
    // 2. Deploy rules
    await deployRules();
    
    console.log('Deployment process completed!');
  } catch (error) {
    console.error('Error in deployment process:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 