import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Function to create a test user for demo purposes
  const createTestUser = async () => {
    try {
      const auth = getAuth();
      const testEmail = "student@example.com";
      const testPassword = "password123";
      const testStudentId = "BCS24020003";

      // Try to create a new user
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
        const user = userCredential.user;
        
        await updateProfile(user, {
          displayName: "Steven Ling Chung Lian"
        });
        
        // Create user document in Firestore
        const db = getFirestore();
        await setDoc(doc(db, 'students', user.uid), {
          fullName: "Steven Ling Chung Lian",
          studentId: testStudentId,
          email: testEmail,
          department: 'Faculty of Engineering and IT',
          program: 'Bachelor of Science in IT',
          photoUrl: '',
          createdAt: new Date().toISOString(),
          dateOfBirth: '1995-05-15',
          mailingAddress: '123 University Street, Sydney NSW 2000',
          nric: 'S1234567A'
        });
        
        console.log("Test user created successfully!");
        return true;
      } catch (error: any) {
        // If the user already exists, just proceed with login
        if (error.code === 'auth/email-already-in-use') {
          return true;
        }
        console.error("Error creating test user:", error);
        return false;
      }
    } catch (error) {
      console.error("Error in createTestUser:", error);
      return false;
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to log in...', { usernameOrId: username });
      
      // Demo test user
      if (username === 'BCS24020003' || username === 'student@example.com') {
        await createTestUser();
        // After creating/ensuring test user exists, login with these credentials
        const auth = getAuth();
        console.log('Logging in with test user credentials:', { email: 'student@example.com' });
        await signInWithEmailAndPassword(auth, 'student@example.com', 'password123');
        
        console.log('Test user login successful, navigating...');
        router.replace('/(tabs)/home');
        return;
      }
      
      // Handle normal login flow
      // Check if input is a student ID
      const isStudentId = /^BCS\d+$/.test(username);
      let email = username;
      
      console.log('Login method:', isStudentId ? 'Student ID' : 'Email');

      // If input is a student ID, look up the corresponding email in Firestore
      if (isStudentId) {
        const db = getFirestore();
        const studentsCollection = collection(db, 'students');
        const q = query(studentsCollection, where('studentId', '==', username));
        
        console.log('Looking up email for student ID...');
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error('Student ID not found, please check and try again.');
        }

        // Get email from the first matching document
        email = querySnapshot.docs[0].data().email;
        console.log('Found student email:', { email });
        
        if (!email) {
          throw new Error('Student record found but no associated email, please contact administrator.');
        }
      }

      // Login with email and password
      const auth = getAuth();
      console.log('Attempting to login to Firebase:', { email });
      await signInWithEmailAndPassword(auth, email, password);
      
      console.log('Login successful, navigating...');
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = error.message;
      // Log detailed error information
      console.error('Login failed:', { 
        code: error.code, 
        message: error.message,
        credentials: { username, passwordLength: password?.length || 0 }
      });
      
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format, please check and try again.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email, please register first.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password, please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many login attempts, please try again later or reset your password.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled, please contact administrator.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error, please check your connection and try again.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid credentials, please check your email and password.';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/images/uts-logo-new.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>UTS Oculus</Text>
      </View>
      
      <View style={styles.formContainer}>
        <Text style={styles.label}>Username or Student ID</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter email or student ID (e.g., BCS24020003)"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.helpText}>
          You can log in with your UTS email or student ID
        </Text>
        
        <Text style={styles.demoText}>
          Demo Login: BCS24020003 / password123
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
  },
  button: {
    backgroundColor: '#1E3A8A',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  demoText: {
    color: '#10B981',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  }
}); 