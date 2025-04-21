import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { FontAwesome } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

interface ProfileData {
  fullName: string;
  studentId: string;
  email: string;
  department: string;
  program: string;
}

export default function UpdateProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<ProfileData>({
    fullName: '',
    studentId: '',
    email: '',
    department: '',
    program: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }
      
      const db = getFirestore();
      const studentRef = doc(db, 'students', currentUser.uid);
      const studentSnap = await getDoc(studentRef);
      
      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        setProfile({
          fullName: studentData.fullName || '',
          studentId: studentData.studentId || '',
          email: studentData.email || currentUser.email || '',
          department: studentData.department || '',
          program: studentData.program || ''
        });
      } else {
        // Create a mock profile if none exists
        const mockProfile = {
          fullName: currentUser.displayName || '',
          studentId: '',
          email: currentUser.email || '',
          department: '',
          program: ''
        };
        setProfile(mockProfile);
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate input
    if (!profile.fullName || !profile.studentId) {
      setError('Full name and student ID are required');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('User not authenticated');
        setSaving(false);
        return;
      }
      
      const db = getFirestore();
      const studentRef = doc(db, 'students', currentUser.uid);
      
      // Update the profile
      await updateDoc(studentRef, {
        fullName: profile.fullName,
        studentId: profile.studentId,
        department: profile.department,
        program: profile.program,
        updatedAt: new Date().toISOString()
      });
      
      Alert.alert(
        'Success',
        'Your profile has been updated successfully!',
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      );
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <FontAwesome name="user-circle" size={60} color="#1E40AF" />
          <Text style={styles.title}>Update Profile</Text>
        </View>
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={profile.fullName}
            onChangeText={(text) => setProfile({...profile, fullName: text})}
            icon="user"
          />
          
          <Input
            label="Student ID"
            placeholder="Enter your student ID"
            value={profile.studentId}
            onChangeText={(text) => setProfile({...profile, studentId: text})}
            icon="id-card"
          />
          
          <Input
            label="Email"
            placeholder="Enter your email"
            value={profile.email}
            onChangeText={(text) => setProfile({...profile, email: text})}
            keyboardType="email-address"
            icon="envelope"
            editable={false}
          />
          
          <Input
            label="Department"
            placeholder="Enter your department"
            value={profile.department}
            onChangeText={(text) => setProfile({...profile, department: text})}
            icon="building"
          />
          
          <Input
            label="Program"
            placeholder="Enter your program"
            value={profile.program}
            onChangeText={(text) => setProfile({...profile, program: text})}
            icon="graduation-cap"
          />
          
          <View style={styles.buttonContainer}>
            <Button 
              label="Save Changes" 
              onPress={handleSave} 
              loading={saving}
            />
            <Button 
              label="Cancel" 
              onPress={() => router.back()}
              style={styles.cancelButton}
              labelStyle={styles.cancelButtonText}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 40,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 8,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 24,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#6B7280',
  },
}); 