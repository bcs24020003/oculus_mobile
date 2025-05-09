const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function to create a new user account without signing out the admin user
 * This function creates a user with Firebase Admin SDK which doesn't affect the client auth state
 */
exports.createUserAccount = functions.https.onCall(async (data, context) => {
  try {
    // Extract data for the new user
    const {
      email,
      password,
      fullName,
      isAdmin,
      studentId,
      department,
      program
    } = data;

    // Validate required fields
    if (!email || !password || !fullName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Email, password, and full name are required.'
      );
    }

    // Create user with Firebase Auth Admin SDK
    // This won't affect the client's auth state
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName
    });
    
    const newUserUid = userRecord.uid;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // Store user data based on role
    if (isAdmin) {
      // Store to users collection for admin
      await admin.firestore().collection('users').doc(newUserUid).set({
        email,
        fullName,
        role: 'admin',
        createdAt: timestamp,
        lastUpdated: timestamp
      });
    } else {
      // Store to students collection for student
      await admin.firestore().collection('students').doc(newUserUid).set({
        email,
        fullName,
        studentId: studentId || '',
        department: department || '',
        program: program || '',
        role: 'student',
        isVerified: false,
        createdAt: timestamp,
        lastUpdated: timestamp
      });
    }

    return { success: true, uid: newUserUid };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to create user account.'
    );
  }
}); 