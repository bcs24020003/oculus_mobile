import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { PLACEHOLDER_IMAGES } from '../utils/imageUtil';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
  qrCodeUrl?: string;
  barcodeType?: 'barcode' | 'qrcode';
}

export default function IDCardScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check immediately if user is admin, and prevent access
    const checkUserAccess = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          setError('You must be logged in to view your student ID card');
          return;
        }
        
        // First try to get admin data
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        // If this document exists AND is an admin, block access
        if (userDoc.exists() && userDoc.data().isAdmin === true) {
          console.log('ADMIN DETECTED - BLOCKING ACCESS TO ID CARD');
          Alert.alert(
            'Access Restricted',
            'Admin users cannot access the student ID card page',
            [{ 
              text: 'Return to Profile', 
              onPress: () => router.replace('/(tabs)/profile')
            }],
            { cancelable: false }
          );
          return; // Don't continue loading
        }
        
        // Only fetch profile if not an admin
        fetchProfile();
      } catch (error) {
        console.error('Error checking access:', error);
        setError('Error checking access permissions');
      }
    };
    
    checkUserAccess();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('You must be logged in to view your student ID card');
        setLoading(false);
        return;
      }
      
      const db = getFirestore();
      const profileRef = doc(db, 'students', currentUser.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        setProfile({
          id: profileSnap.id,
          ...profileSnap.data() as Omit<StudentProfile, 'id'>
        });
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

  const uploadQrCode = async () => {
    if (!profile) return;
    
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'You need to grant permission to access photo library to upload barcode.'
        );
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 1], // 条形码宽高比
        quality: 0.5, // Reduce quality to decrease file size
      });
      
      if (!result.canceled && result.assets[0].uri) {
        setUploading(true);
        
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          
          if (!user) {
            throw new Error('User not logged in');
          }
          
          // Get file info
          const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
          
          if (!fileInfo.exists) {
            throw new Error('File does not exist');
          }
          
          console.log('File info:', JSON.stringify(fileInfo, null, 2));
          
          // Check file size
          if (fileInfo.size && fileInfo.size > 5 * 1024 * 1024) {
            console.log('Warning: File size exceeds 5MB');
          }
          
          try {
            // 处理图像，优化条形码显示效果
            let processedUri = result.assets[0].uri;
            try {
              // 使用ImageManipulator优化图像以便更好地显示
              const manipResult = await ImageManipulator.manipulateAsync(
                result.assets[0].uri,
                [
                  { resize: { width: 750, height: 200 } }, // 调整尺寸为适合条形码的宽高比
                  { crop: { originX: 0, originY: 0, width: 750, height: 200 } } // 裁剪为适合条形码的区域
                ],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
              );
              processedUri = manipResult.uri;
              console.log('Image processed for barcode display');
            } catch (manipError) {
              console.error('Error processing image:', manipError);
              // 如果处理失败，继续使用原始图像
            }
            
            // Use timeout controller
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            // Convert directly to blob, don't use ImageManipulator
            const response = await fetch(processedUri, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`Fetch failed, status code: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            if (!blob || blob.size === 0) {
              throw new Error('Invalid blob: empty or size is 0');
            }
            
            console.log('Uploading file:');
            console.log('- Blob size:', blob.size);
            console.log('- Blob type:', blob.type);
            
            // Initialize storage
            const storage = getStorage();
            
            // Use timestamp to name file, avoid caching issues
            const timestamp = new Date().getTime();
            const storageRef = ref(storage, `student_barcodes/${user.uid}_${timestamp}.jpg`);
            
            // Add metadata to ensure correct content type
            const metadata = {
              contentType: 'image/jpeg',
              cacheControl: 'no-cache',
            };
            
            console.log('Starting upload...');
            await uploadBytes(storageRef, blob, metadata);
            console.log('Upload complete');
            
            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);
            console.log('Got download URL:', downloadURL);
            
            // Update profile
            const db = getFirestore();
            const profileRef = doc(db, 'students', user.uid);
            await updateDoc(profileRef, {
              qrCodeUrl: downloadURL,
              barcodeType: 'barcode'
            });
            
            // Update local state
            setProfile({
              ...profile,
              qrCodeUrl: downloadURL,
              barcodeType: 'barcode'
            });
            
            Alert.alert('Success', '条形码上传成功');
          } catch (error: any) {
            console.error('Blob conversion/upload error details:', error);
            
            if (error.name === 'AbortError') {
              throw new Error('Upload timeout - please retry');
            }
            
            // Log detailed Firebase errors
            if (error.code && error.code.includes('storage/')) {
              console.error('Firebase storage error code:', error.code);
            }
            
            throw new Error(`Image processing failed: ${error.message || 'Unknown error'}`);
          }
        } catch (error: any) {
          console.error('Barcode upload error:', error);
          Alert.alert('Error', `Upload failed: ${error.message || 'Please try again'}`);
        } finally {
          setUploading(false);
        }
      }
    } catch (error: any) {
      console.error('Image selection error:', error);
      Alert.alert('Error', `Failed to select image: ${error.message || 'Please try again'}`);
    }
  };

  const uploadProfileImage = async () => {
    if (!profile) return;
    
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'You need to grant permission to access photo library to upload ID photo.'
        );
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.5, // Reduce quality to decrease file size
      });
      
      if (!result.canceled && result.assets[0].uri) {
        setUploadingPhoto(true);
        
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          
          if (!user) {
            throw new Error('User not logged in');
          }
          
          // Get file info
          const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
          
          if (!fileInfo.exists) {
            throw new Error('File does not exist');
          }
          
          console.log('File info:', JSON.stringify(fileInfo, null, 2));
          
          // Check file size
          if (fileInfo.size && fileInfo.size > 5 * 1024 * 1024) {
            console.log('Warning: File size exceeds 5MB');
          }
          
          try {
            // Use timeout controller
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            // Convert directly to blob, don't use ImageManipulator
            const response = await fetch(result.assets[0].uri, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`Fetch failed, status code: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            if (!blob || blob.size === 0) {
              throw new Error('Invalid blob: empty or size is 0');
            }
            
            console.log('Uploading photo:');
            console.log('- Blob size:', blob.size);
            console.log('- Blob type:', blob.type);
            
            // Initialize storage
            const storage = getStorage();
            
            // Use timestamp to name file, avoid caching issues
            const timestamp = new Date().getTime();
            const storageRef = ref(storage, `student_photos/${user.uid}_${timestamp}.jpg`);
            
            // Add metadata to ensure correct content type
            const metadata = {
              contentType: 'image/jpeg',
              cacheControl: 'no-cache',
            };
            
            console.log('Starting upload...');
            await uploadBytes(storageRef, blob, metadata);
            console.log('Upload complete');
            
            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);
            console.log('Got download URL:', downloadURL);
            
            // Update profile
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
            
            Alert.alert('Success', 'ID photo uploaded successfully');
          } catch (error: any) {
            console.error('Blob conversion/upload error details:', error);
            
            if (error.name === 'AbortError') {
              throw new Error('Upload timeout - please retry');
            }
            
            // Log detailed Firebase errors
            if (error.code && error.code.includes('storage/')) {
              console.error('Firebase storage error code:', error.code);
            }
            
            throw new Error(`Image processing failed: ${error.message || 'Unknown error'}`);
          }
        } catch (error: any) {
          console.error('ID photo upload error:', error);
          Alert.alert('Error', `Upload failed: ${error.message || 'Please try again'}`);
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (error: any) {
      console.error('Image selection error:', error);
      Alert.alert('Error', `Failed to select image: ${error.message || 'Please try again'}`);
    }
  };

  const exportID = () => {
    Alert.alert('Student ID', 'Your student ID has been successfully exported.');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student ID Card</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading student ID card...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student ID Card</Text>
        </View>
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
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student ID Card</Text>
        </View>
        <View style={styles.errorContainer}>
          <FontAwesome name="user-times" size={50} color="#64748B" />
          <Text style={styles.errorText}>No available personal information</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student ID Card</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.instructionText}>
          <Text style={styles.instructionLine}>Your electronic student ID can be used on campus</Text>
        </View>
        
        <View style={styles.idCardContainer}>
          <View style={styles.idCard}>
            <View style={styles.verticalIdStrip}>
              {profile.studentId && profile.studentId.split('').map((char, index) => (
                <Text key={`char-${index}`} style={styles.verticalIdChar}>{char}</Text>
              ))}
            </View>
            <View style={styles.idCardContent}>
              <View style={styles.logoSection}>
                <View style={styles.logoContainer}>
                  <Image 
                    source={require('../../assets/images/logo.png')} 
                    style={styles.logo} 
                    resizeMode="contain"
                  />
                </View>
              </View>
              
              <View style={styles.photoSection}>
                <TouchableOpacity 
                  style={styles.photoUploadContainer}
                  onPress={uploadProfileImage}
                  disabled={uploadingPhoto}
                >
                  {profile.photoUrl ? (
                    <Image 
                      source={{ uri: profile.photoUrl }} 
                      style={styles.idPhoto} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <FontAwesome name="user" size={60} color="#CBD5E1" />
                      <Text style={styles.uploadPhotoText}>Tap to upload photo</Text>
                    </View>
                  )}
                  {uploadingPhoto && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color="#FFFFFF" size="large" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              
              <View style={styles.idBottomSection}>
                <View style={styles.nameContainer}>
                  <Text style={styles.nameText}>{profile.fullName.toUpperCase()}</Text>
                </View>
                
                <View style={styles.barcodeContainer}>
                  <View style={styles.barcodeFormatContainer}>
                    {profile.qrCodeUrl ? (
                      <Image 
                        source={{ uri: profile.qrCodeUrl }} 
                        style={styles.barcodeFormatImage} 
                        resizeMode="cover"
                      />
                    ) : (
                      <>
                        <FontAwesome name="barcode" size={40} color="#CBD5E1" />
                        <Text style={styles.uploadText}>Barcode not available</Text>
                      </>
                    )}
                  </View>
                  <Text style={styles.barcodeText}>{profile.studentId}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={exportID}
          >
            <FontAwesome name="download" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Export ID Card</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.shareButton]}
            onPress={() => Alert.alert('Share', 'ID card sharing feature coming soon.')}
          >
            <FontAwesome name="share-alt" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Share ID Card</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
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
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  instructionText: {
    marginBottom: 20,
    alignItems: 'center',
  },
  instructionLine: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 5,
  },
  idCardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 10,
  },
  idCard: {
    width: '95%',
    maxWidth: 340,
    aspectRatio: 0.625,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  verticalIdStrip: {
    width: '15%',
    height: '100%',
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  verticalIdChar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
    fontFamily: 'serif',
  },
  idCardContent: {
    flex: 1,
    padding: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  photoSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
    paddingBottom: 5,
  },
  idBottomSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  logoContainer: {
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 100,
  },
  photoUploadContainer: {
    width: 130,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    overflow: 'hidden',
  },
  idPhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  uploadPhotoText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 5,
    width: '90%',
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
    textAlign: 'center',
    width: '100%',
    flexWrap: 'wrap',
    fontFamily: 'serif',
  },
  departmentText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    paddingHorizontal: 5,
    width: '100%',
    fontFamily: 'serif',
  },
  barcodeContainer: {
    alignItems: 'center',
    width: '80%',
    marginTop: 5,
  },
  barcodeFormatContainer: {
    width: 200,
    height: 55,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 5,
    overflow: 'hidden',
  },
  barcodeFormatImage: {
    width: '100%',
    height: '100%',
  },
  uploadText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 5,
    textAlign: 'center',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeText: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    letterSpacing: 0,
    color: '#000000',
    textAlign: 'center',
    marginTop: 3,
  },
  actionsContainer: {
    flexDirection: 'column',
    marginTop: 25,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    padding: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  shareButton: {
    backgroundColor: '#2563EB',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
}); 