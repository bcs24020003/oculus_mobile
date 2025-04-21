import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { PLACEHOLDER_IMAGES } from '../utils/imageUtil';

interface StudentProfile {
  id: string;
  fullName: string;
  studentId: string;
  email: string;
  department?: string;
  program?: string;
  photoUrl?: string;
  createdAt?: string;
  username?: string;
  dateOfBirth?: string;
  mailingAddress?: string;
  nric?: string;
}

export default function EditProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [email, setEmail] = useState('');
  const [nric, setNric] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [mailingAddress, setMailingAddress] = useState('');
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
        setError('You must be logged in to edit your profile');
        setLoading(false);
        return;
      }
      
      const db = getFirestore();
      const profileRef = doc(db, 'students', currentUser.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const profileData = {
          id: profileSnap.id,
          ...profileSnap.data() as Omit<StudentProfile, 'id'>
        };
        
        setProfile(profileData);
        setEmail(profileData.email || '');
        setNric(profileData.nric || '');
        setDateOfBirth(profileData.dateOfBirth || '');
        setMailingAddress(profileData.mailingAddress || '');
      } else {
        setError('Profile not found');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Update profile in Firestore
      const db = getFirestore();
      const profileRef = doc(db, 'students', user.uid);
      await updateDoc(profileRef, {
        nric: nric,
        dateOfBirth: dateOfBirth,
        mailingAddress: mailingAddress
      });
      
      // Update local state
      setProfile({
        ...profile,
        nric: nric,
        dateOfBirth: dateOfBirth,
        mailingAddress: mailingAddress
      });
      
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'You need to grant permission to access your photos in order to upload a profile picture.'
        );
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0].uri) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadProfileImage = async (uri: string) => {
    if (!profile) return;
    
    setUploading(true);
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Get the image file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }
      
      // Convert image to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Upload to Firebase Storage
      const storage = getStorage();
      const storageRef = ref(storage, `profile_images/${user.uid}`);
      await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update profile in Firestore
      const db = getFirestore();
      const profileRef = doc(db, 'students', user.uid);
      await updateDoc(profileRef, {
        photoUrl: downloadURL
      });
      
      // Update local state
      setProfile({
        ...profile,
        photoUrl: downloadURL
      });
      
      Alert.alert('Success', 'Profile photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload profile photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={50} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <FontAwesome name="user-times" size={50} color="#64748B" />
          <Text style={styles.errorText}>No profile information available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/uts-logo-new.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.photoSection}>
          <Text style={styles.photoLabel}>Photo :</Text>
          <TouchableOpacity 
            style={styles.addPhotoButton}
            onPress={pickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <FontAwesome name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.photoPreview}>
          <Image
            source={
              profile.photoUrl
                ? { uri: profile.photoUrl }
                : { uri: PLACEHOLDER_IMAGES.avatar }
            }
            style={styles.profileImage}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name :</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{profile.fullName || 'Not set'}</Text>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Student ID :</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{profile.studentId || 'Not set'}</Text>
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email :</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{profile.email || 'Not set'}</Text>
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>NRIC :</Text>
          <TextInput
            style={styles.input}
            value={nric}
            onChangeText={setNric}
            placeholder="Enter your NRIC"
            placeholderTextColor="#A0AEC0"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Date of birth :</Text>
          <TextInput
            style={styles.input}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#A0AEC0"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Mailing Address :</Text>
          <TextInput
            style={styles.input}
            value={mailingAddress}
            onChangeText={setMailingAddress}
            placeholder="Enter your mailing address"
            placeholderTextColor="#A0AEC0"
            multiline
          />
        </View>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerLogo: {
    width: 80,
    height: 80,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  photoLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1E293B',
    marginRight: 20,
  },
  addPhotoButton: {
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addPhotoText: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  photoPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 200,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 20,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#1E293B',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#1E293B',
    fontWeight: 'bold',
    fontSize: 16,
  },
  readOnlyField: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 15,
  },
  readOnlyText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
}); 