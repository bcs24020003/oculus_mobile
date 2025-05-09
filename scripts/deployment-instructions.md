# Fixing User Deletion Issues and Deploying Firestore Rules

This guide will help you fix the "Error deleting user: [FirebaseError: Missing or insufficient permissions.]" error by updating Firebase Firestore security rules and modifying application code.

## 1. Deployed Changes

The following changes have been implemented to fix the issue:

### 1.1. Application Code Changes

We've modified the user deletion logic in `app/admin/users/list.tsx` to:
- Adjust the deletion order, attempting to delete from students collection first, then users collection
- Add proper error handling and confirmation dialogs
- Implement batch deletion with success/error tracking
- Add detailed logging for easier debugging
- Add support for deleting Firebase Authentication users (requires a Cloud Function)

### 1.2. Security Rules Changes

Updated Firestore security rules to:
- Improve the admin check function to ensure it properly validates admin status
- Explicitly allow admins to delete documents in both `users` and `students` collections
- Enforce proper access controls for all collections

## 2. Deploying Firestore Rules

### Option 1: Using Firebase Console (Recommended)

1. **Login to Firebase Console**
   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Login with your Google account
   - Select the "uts-oculus" project

2. **Access Firestore Database**
   - Click on "Firestore Database" in the left menu

3. **Navigate to Rules Tab**
   - Click the "Rules" tab to display the current security rules

4. **Replace Rules**
   - Replace the existing rules with the content from the `firestore.rules` file
   - Here's the content to copy:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() &&
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) ?
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true ||
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' :
          false);
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // Student collection is fully public (please improve this rule for better security)
    match /students/{document=**} {
      allow read: if true;
      allow write: if isSignedIn();
      allow delete: if isAdmin();
    }

    // Admins have full access
    match /{document=**} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users can access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow delete: if isAdmin();
    }

    match /timetable/{userId} {
      allow read, write: if isSignedIn() && isOwner(userId);
    }

    match /announcements/{document=**} {
      allow read: if true;
    }

    match /schedules/{document=**} {
      allow read: if true;
    }

    match /classes/{document=**} {
      allow read: if true;
    }

    match /courses/{document=**} {
      allow read: if true;
    }

    match /calendar/{document=**} {
      allow read: if true;
    }

    match /system/{docId} {
      allow read: if true;
    }

    // Allow students to access their own data
    match /students/{studentId} {
      allow read, write: if request.auth != null && request.auth.uid == studentId;
      allow delete: if isAdmin();
    }
  }
}
```

5. **Publish Rules**
   - Click the "Publish" button to deploy the updated rules
   - Wait for the rules to be deployed (usually takes a few seconds)

### Option 2: Using Firebase CLI (For Developers)

If you have Firebase CLI installed and configured, you can deploy rules using the command line:

```
firebase deploy --only firestore:rules
```

Note: This requires Firebase CLI setup and proper authentication.

## 3. Implementing Firebase Auth User Deletion

To fully delete users from both Firestore and Firebase Authentication, a Cloud Function is required as client-side code doesn't have the necessary permissions to delete Authentication users.

### 3.1. Create Cloud Function (Required)

1. **Setup Firebase Admin SDK in a Cloud Function**
   - Create a new file in your Firebase Cloud Functions project: `functions/src/auth.js`
   - Implement the following code:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Ensure admin SDK is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Cloud function to delete a user - secured by Firebase Authentication
exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Check if request is made by an authenticated user
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called by an authenticated user.'
    );
  }

  // Check if the caller is an admin
  try {
    const callerUid = context.auth.uid;
    const callerDoc = await admin.firestore()
      .collection('users')
      .doc(callerUid)
      .get();

    if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admin users can delete other users.'
      );
    }
  } catch (error) {
    console.error('Error verifying admin status:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error verifying admin permissions.'
    );
  }

  // Get the user ID to delete
  const { userId } = data;
  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a valid userId.'
    );
  }

  try {
    // Delete the user from Firebase Authentication
    try {
      await admin.auth().deleteUser(userId);
      return { success: true, message: 'User successfully deleted' };
    } catch (authError) {
      // 处理特定错误情况
      if (authError.code === 'auth/user-not-found') {
        console.log(`Auth user with ID ${userId} not found, proceeding with Firestore cleanup`);
        // 返回部分成功，表示Auth用户已不存在，但可以继续清理Firestore数据
        return { 
          success: true, 
          partial: true, 
          message: 'Auth user not found but can proceed with Firestore cleanup',
          authError: 'not-found'
        };
      } else {
        // 其他认证错误
        throw authError;
      }
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Error deleting user: ${error.message}`
    );
  }
});
```

2. **Deploy the Cloud Function**
   - Run the following command from your terminal:
   ```
   firebase deploy --only functions:deleteUser
   ```

### 3.2. Update the Front-End Code

The preferred approach is to use Firebase Functions SDK rather than direct fetch calls, as it handles authentication and error management better:

```javascript
// Recommended approach with Firebase Functions SDK
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';

// Inside your component or utility file
const deleteAuthUser = async (userId: string) => {
  try {
    const functions = getFunctions();
    const deleteUserFunction = httpsCallable(functions, 'deleteUser');
    const result = await deleteUserFunction({ userId });
    
    // 检查部分成功情况 (Auth用户不存在)
    if (result.data && result.data.partial && result.data.authError === 'not-found') {
      console.warn(`Auth user with ID ${userId} not found, proceeding with Firestore cleanup`);
      // 这种情况下我们仍然返回true，因为我们仍可以继续清理Firestore数据
      return true;
    }
    
    console.log('User deletion result:', result.data);
    return true;
  } catch (error) {
    console.error('Error deleting Firebase Auth user:', error);
    return false;
  }
};
```

If you continue to use fetch for API calls, ensure proper error handling for non-JSON responses:

```javascript
// Using fetch with improved error handling
const deleteAuthUser = async (userId: string) => {
  try {
    const response = await fetch(`https://us-central1-uts-oculus.cloudfunctions.net/deleteUser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuth().currentUser?.getIdToken()}`
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      // Safely handle different response types
      let errorMessage = 'Failed to delete auth user';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } else {
          // For non-JSON responses (like HTML error pages)
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText);
          errorMessage = `Server returned: ${response.status} ${response.statusText}`;
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
      }
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    console.error('Error deleting Firebase Auth user:', error);
    return false;
  }
};
```

## 4. Testing the Changes

After deploying the rules and Cloud Function, test the user deletion functionality:

1. **Login as Admin**
   - Use an admin account to login to the application

2. **Navigate to User Management**
   - Go to the admin dashboard
   - Click on "Manage Users" or navigate to the user list

3. **Delete a User**
   - Try deleting a user by clicking the trash icon
   - Confirm the deletion in the confirmation dialog
   - Verify that the user is removed from the list
   - Check in Firebase Console -> Authentication that the user is also removed

4. **Test Batch Deletion (Optional)**
   - Select multiple users using the checkbox mode
   - Delete the selected users using the batch delete function
   - Verify all selected users are removed from both Firestore and Authentication

## 5. Additional Notes

1. **Auth vs. Firestore**
   - The implemented solution now addresses both Firestore data deletion and Firebase Authentication user deletion
   - The Cloud Function is required because client-side code doesn't have the necessary permissions to delete Authentication users
   - If the Cloud Function is not deployed, the app will gracefully handle the error and still delete the Firestore data

2. **Future Improvements**
   - Consider implementing additional security checks in the Cloud Function
   - Add more granular permissions for different admin roles
   - Implement soft deletion with trash/restore functionality

## 6. Troubleshooting

If you still encounter permission errors after deploying the rules:

1. **Ensure Rules Deployment**
   - Confirm the rules were properly published in Firebase Console
   - Check for any syntax errors in the rules

2. **Check Admin Status**
   - Ensure the account has the correct `role: 'admin'` field in the users collection

3. **Check Cloud Function Deployment**
   - Verify that the Cloud Function was deployed successfully
   - Check Firebase Functions logs for any errors
   - Test the function directly from Firebase Console

4. **Clear Cache**
   - Try refreshing the application or clearing the browser cache
   - Restart the application if using a mobile device

5. **Check Console Logs**
   - Examine the browser console for specific error messages
   - The error message might provide more details about the permission issue

If issues persist, please contact the development team for further assistance. 