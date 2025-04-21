import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { PLACEHOLDER_IMAGES } from '../utils/imageUtil';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('You must be logged in to view your profile');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const db = getFirestore();
      
      // First check if user is an admin
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists() && userDoc.data().isAdmin) {
        const userData = userDoc.data();
        setIsAdmin(true);
        setProfile({
          id: userDoc.id,
          fullName: userData.fullName || userData.displayName || 'Admin User',
          studentId: 'ADMIN',
          email: userData.email || currentUser.email || '',
          department: 'Administration',
          program: 'System Administration',
          photoUrl: userData.photoUrl || null,
          username: userData.username || '',
        });
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // If not an admin, fetch the student profile
      const profileRef = doc(db, 'students', currentUser.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const profileData = {
          id: profileSnap.id,
          ...profileSnap.data() as Omit<StudentProfile, 'id'>
        };
        
        setProfile(profileData);
        setIsAdmin(false);
      } else {
        // For demo purposes, use mock data if profile doesn't exist
        const mockProfile: StudentProfile = {
          id: currentUser.uid,
          fullName: currentUser.displayName || 'Steven Ling Chung Lian',
          studentId: 'BCS24020003',
          email: currentUser.email || 'student@example.com',
          department: 'Faculty of Engineering and IT',
          program: 'Bachelor of Science in IT',
          photoUrl: currentUser.photoURL || '',
          createdAt: new Date().toISOString(),
          dateOfBirth: '1995-05-15',
          mailingAddress: '123 University Street, Sydney NSW 2000',
          nric: 'S1234567A'
        };
        
        // Create the profile in Firestore
        await setDoc(profileRef, {
          fullName: mockProfile.fullName,
          studentId: mockProfile.studentId,
          email: mockProfile.email,
          department: mockProfile.department,
          program: mockProfile.program,
          photoUrl: mockProfile.photoUrl,
          createdAt: mockProfile.createdAt,
          dateOfBirth: mockProfile.dateOfBirth,
          mailingAddress: mockProfile.mailingAddress,
          nric: mockProfile.nric
        });
        
        setProfile(mockProfile);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const takePhoto = async () => {
    try {
      // Request camera permissions
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'You need to grant permission to use your camera in order to take a profile picture.'
        );
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0].uri) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
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
      
      // 根据用户角色选择正确的集合
      if (isAdmin) {
        // 管理员数据应该更新到 users 集合
        const profileRef = doc(db, 'users', user.uid);
        await updateDoc(profileRef, {
          photoUrl: downloadURL
        });
        console.log('Updated admin profile photo in users collection');
      } else {
        // 普通用户/学生数据应该更新到 students 集合
        const profileRef = doc(db, 'students', user.uid);
        await updateDoc(profileRef, {
          photoUrl: downloadURL
        });
        console.log('Updated student profile photo in students collection');
      }
      
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

  const showPhotoOptions = () => {
    Alert.alert(
      'Update Profile Photo',
      'Choose how you want to update your profile photo',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto
        },
        {
          text: 'Choose from Gallery',
          onPress: pickImage
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const exportID = () => {
    Alert.alert('ID Card', 'Your ID card has been exported successfully.');
  };

  const navigateToEditProfile = () => {
    if (isAdmin) {
      router.push('/admin/edit-profile');
    } else {
      router.push('/profile/edit');
    }
  };

  const navigateToChangePassword = () => {
    if (isAdmin) {
      router.push('/admin/change-password');
    } else {
      router.push('/profile/change-password');
    }
  };

  const navigateToViewID = () => {
    router.push('/profile/id-card' as any);
  };

  const navigateToScanner = () => {
    router.push('/profile/scanner' as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={50} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <FontAwesome name="user-times" size={50} color="#64748B" />
          <Text style={styles.errorText}>No profile information available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <Image 
          source={require('../../assets/images/uts-logo-new.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Text style={styles.profileName}>{profile?.fullName || 'Loading...'}</Text>
        {isAdmin && (
          <>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
            <Text style={styles.adminNote}>Admin functions available</Text>
          </>
        )}
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1E3A8A']}
            tintColor="#1E3A8A"
          />
        }
      >
        <View style={styles.profileCardContainer}>
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
              <Image
                source={
                  profile?.photoUrl
                    ? { uri: profile.photoUrl }
                    : { uri: PLACEHOLDER_IMAGES.avatar }
                }
                style={styles.profileImage}
              />
              <View style={styles.editIconContainer}>
                <FontAwesome name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>{profile?.fullName}</Text>
            {isAdmin ? (
              <>
                <View style={[styles.departmentTag, styles.adminTag]}>
                  <Text style={styles.departmentText}>Administrator</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.userID}>{profile?.studentId}</Text>
                <View style={styles.departmentTag}>
                  <Text style={styles.departmentText}>{profile?.department}</Text>
                </View>
              </>
            )}
          </View>
          
          <View style={styles.profileInfoContainer}>
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>{isAdmin ? 'Admin Information' : 'Personal Information'}</Text>
              
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <FontAwesome name="envelope" size={18} color="#1E3A8A" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{profile?.email}</Text>
                </View>
              </View>
              
              {!isAdmin && (
                <>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <FontAwesome name="id-card" size={18} color="#1E3A8A" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>NRIC</Text>
                      <Text style={styles.infoValue}>{profile?.nric || 'Not provided'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <FontAwesome name="calendar" size={18} color="#1E3A8A" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Date of Birth</Text>
                      <Text style={styles.infoValue}>{profile?.dateOfBirth || 'Not provided'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <FontAwesome name="home" size={18} color="#1E3A8A" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Address</Text>
                      <Text style={styles.infoValue}>{profile?.mailingAddress || 'Not provided'}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {!isAdmin && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Academic Information</Text>
                
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <FontAwesome name="graduation-cap" size={18} color="#1E3A8A" />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Program</Text>
                    <Text style={styles.infoValue}>{profile?.program || 'Not provided'}</Text>
                  </View>
                </View>
              </View>
            )}
            
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={navigateToEditProfile}
              >
                <FontAwesome name="edit" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Edit Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.passwordButton]}
                onPress={navigateToChangePassword}
              >
                <FontAwesome name="lock" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Change Password</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLogo: {
    width: 120,
    height: 50,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
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
  profileCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    padding: 0,
    overflow: 'hidden',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 25,
    backgroundColor: '#1E3A8A',
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(30, 58, 138, 0.8)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  userID: {
    fontSize: 16,
    color: '#CBD5E1',
    marginBottom: 10,
  },
  departmentTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },
  departmentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  profileInfoContainer: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  actionsContainer: {
    padding: 20,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    padding: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  passwordButton: {
    backgroundColor: '#2563EB',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  adminTag: {
    backgroundColor: '#7C3AED',
  },
  adminBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 5,
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  adminNote: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  scrollView: {
    flex: 1,
  },
}); 