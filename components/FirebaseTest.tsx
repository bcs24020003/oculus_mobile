import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { FirebaseApp } from 'firebase/app';
import { auth, db } from '../src/config/firebase';

export default function FirebaseTest() {
  const [status, setStatus] = useState<string>('Checking Firebase connection...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkFirebase = async () => {
      try {
        // Check Auth
        const authUnsubscribe = onAuthStateChanged(auth, (user) => {
          console.log('Auth state changed:', user ? 'User is signed in' : 'No user signed in');
        });

        // Check Firestore
        try {
          const testCollection = collection(db, 'test');
          await getDocs(testCollection);
          setStatus('Firebase connection successful! 🎉');
        } catch (firestoreError: any) {
          console.error('Firestore error:', firestoreError);
          setStatus('Firebase initialized but Firestore has an error');
          setError(firestoreError.message || 'Unknown Firestore error');
        }

        return () => {
          authUnsubscribe();
        };
      } catch (e: any) {
        console.error('Firebase initialization error:', e);
        setStatus('Firebase connection failed');
        setError(e.message || 'Unknown error');
      }
    };

    checkFirebase();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Connection Test</Text>
      <Text style={styles.status}>{status}</Text>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
  },
  error: {
    fontSize: 14,
    color: 'red',
    marginTop: 10,
  },
}); 