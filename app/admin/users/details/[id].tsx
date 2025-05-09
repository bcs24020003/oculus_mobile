import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  uploadString
} from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { PLACEHOLDER_IMAGES } from '../../../utils/imageUtil';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../../../config/firebase';

interface Student {
  id: string;
  fullName: string;
  studentId: string;
  email: string;
  department?: string;
  program?: string;
  createdAt?: any;
  photoUrl?: string;
  qrCodeUrl?: string;
  isVerified?: boolean;
  username?: string;
  barcodeType?: 'barcode' | 'qrcode';
}

export default function StudentDetails() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedStudent, setEditedStudent] = useState<Student | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);

  useEffect(() => {
    if (id) {
      fetchStudentDetails(id as string);
    } else {
      setError('Student ID not provided');
      setLoading(false);
    }
  }, [id]);

  const fetchStudentDetails = async (studentId: string) => {
    try {
      setLoading(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('You must be logged in to view student details');
        setLoading(false);
        return;
      }
      
      const db = getFirestore();
      const studentRef = doc(db, 'students', studentId);
      const studentSnapshot = await getDoc(studentRef);
      
      if (studentSnapshot.exists()) {
        const studentData = studentSnapshot.data();
        const formattedStudent = {
          id: studentSnapshot.id,
          fullName: studentData.fullName || '',
          studentId: studentData.studentId || '',
          email: studentData.email || '',
          department: studentData.department || '',
          program: studentData.program || '',
          username: studentData.username || '',
          isVerified: studentData.isVerified || false,
          createdAt: studentData.createdAt,
          photoUrl: studentData.photoUrl || '',
          qrCodeUrl: studentData.qrCodeUrl || '',
          barcodeType: studentData.barcodeType || 'barcode',
        };
        
        setStudent(formattedStudent);
        setEditedStudent(formattedStudent);
      } else {
        setError('Student not found');
      }
    } catch (err) {
      console.error('Error fetching student details:', err);
      setError('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    try {
      if (timestamp.seconds) {
        // Firestore Timestamp
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
    }
    
    return 'Unknown';
  };

  const handleSaveChanges = async () => {
    if (!editedStudent) return;
    
    try {
      setLoading(true);
      const db = getFirestore();
      const studentRef = doc(db, 'students', editedStudent.id);
      
      // Only update fields that should be editable
      await updateDoc(studentRef, {
        fullName: editedStudent.fullName,
        studentId: editedStudent.studentId,
        department: editedStudent.department || '',
        program: editedStudent.program || '',
        isVerified: editedStudent.isVerified,
        lastUpdated: serverTimestamp()
      });
      
      // Update the local state
      setStudent(editedStudent);
      setIsEditing(false);
      
      Alert.alert('Success', 'Student information updated successfully');
    } catch (err) {
      console.error('Error updating student:', err);
      Alert.alert('Error', 'Failed to update student information');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original data
    setEditedStudent(student);
    setIsEditing(false);
  };

  const pickImage = async (forProfile: boolean) => {
    try {
      // Request permission to access the photo library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload images');
        return;
      }
      
      // Use the correct enum MediaTypeOptions.Images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: forProfile ? [1, 1] : [4, 1], // 横向条形码适合4:1的宽高比
        quality: 0.6, // Lower quality for smaller file size
        allowsMultipleSelection: false,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        
        // Check if file size is too large (over 5MB)
        if (selectedImage.fileSize && selectedImage.fileSize > 5 * 1024 * 1024) {
          Alert.alert('File too large', 'Please select an image smaller than 5MB');
          return;
        }
        
        // Upload the image
        if (forProfile) {
          await uploadProfileImage(selectedImage.uri);
        } else {
          await uploadBarcodeImage(selectedImage.uri);
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to select image');
    }
  };
  
  const uploadProfileImage = async (uri: string) => {
    if (!student) return;
    
    try {
      setUploadingPhoto(true);
      console.log('Starting profile image upload...');
      
      // Prepare file info
      const filename = uri.substring(uri.lastIndexOf('/') + 1);
      const fileType = filename.split('.').pop() || 'jpg';
      const safeFileName = `student-${student.id}-${Date.now()}.${fileType}`;
      
      console.log(`Preparing to upload ${safeFileName} to bucket`);
      
      try {
        // Create storage reference first
        const storageRef = ref(storage, `student-photos/${safeFileName}`);
        console.log('Storage reference created:', storageRef.fullPath);
        
        // Fetch the image
        const response = await fetch(uri);
        console.log('Fetch response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        // Convert to blob
        const blob = await response.blob();
        console.log(`Blob created successfully, size: ${blob.size} bytes, type: ${blob.type}`);
        
        // Simple metadata
        const metadata = {
          contentType: blob.type,
        };
        
        // Upload to Firebase Storage with explicit awaiting
        console.log('Starting upload to Firebase Storage...');
        console.log('Uploading to path:', storageRef.fullPath);
        
        // Debug output for the blob and storage reference
        console.log('Blob valid:', Boolean(blob && blob.size > 0));
        console.log('Storage ref valid:', Boolean(storageRef));
        
        try {
          const snapshot = await uploadBytes(storageRef, blob, metadata);
          console.log('Upload successful!', snapshot);
          
          const downloadUrl = await getDownloadURL(snapshot.ref);
          console.log('Download URL obtained:', downloadUrl);
          
          // Update Firestore with the new photo URL
          const db = getFirestore();
          const studentRef = doc(db, 'students', student.id);
          
          await updateDoc(studentRef, {
            photoUrl: downloadUrl,
            lastUpdated: serverTimestamp()
          });
          console.log('Firestore document updated successfully');
          
          // Update local state
          setStudent({
            ...student,
            photoUrl: downloadUrl
          });
          
          if (editedStudent) {
            setEditedStudent({
              ...editedStudent,
              photoUrl: downloadUrl
            });
          }
          
          Alert.alert('Success', 'Profile picture updated successfully');
        } catch (uploadError: any) {
          console.error('Upload error specific info:', uploadError);
          // If there's an error object with additional info, log it
          if (uploadError.serverResponse) {
            console.error('Server response:', uploadError.serverResponse);
          }
          throw uploadError;
        }
      } catch (error: any) {
        console.error('Error during upload process:', error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        if (error.code) console.error('Error code:', error.code);
        if (error.name) console.error('Error name:', error.name);
        console.error('Full error:', JSON.stringify(error, null, 2));
        
        Alert.alert('Upload Error', 'Could not upload image. Please try again with a smaller image or different format.');
      }
    } catch (err) {
      console.error('Error in overall upload process:', err);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again later.');
    } finally {
      setUploadingPhoto(false);
    }
  };
  
  const uploadBarcodeImage = async (uri: string) => {
    if (!student) return;
    
    try {
      setUploadingQR(true);
      console.log('Starting barcode image upload...');
      
      // 处理图像，优化条形码显示效果
      let processedUri = uri;
      try {
        // 使用ImageManipulator优化图像以便更好地显示
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [
            { resize: { width: 750, height: 200 } }, // 增加宽度以适应更宽的容器
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
      
      // Prepare file info
      const filename = processedUri.substring(processedUri.lastIndexOf('/') + 1);
      const fileType = filename.split('.').pop() || 'jpg';
      const safeFileName = `barcode-${student.id}-${Date.now()}.${fileType}`;
      
      console.log(`Preparing to upload ${safeFileName} to bucket`);
      
      try {
        // Create storage reference first
        const storageRef = ref(storage, `student-barcodes/${safeFileName}`);
        console.log('Storage reference created:', storageRef.fullPath);
        
        // Fetch the image
        const response = await fetch(processedUri);
        console.log('Fetch response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        // Convert to blob
        const blob = await response.blob();
        console.log(`Blob created successfully, size: ${blob.size} bytes, type: ${blob.type}`);
        
        // Simple metadata
        const metadata = {
          contentType: blob.type,
        };
        
        // Upload to Firebase Storage with explicit awaiting
        console.log('Starting upload to Firebase Storage...');
        console.log('Uploading to path:', storageRef.fullPath);
        
        // Debug output for the blob and storage reference
        console.log('Blob valid:', Boolean(blob && blob.size > 0));
        console.log('Storage ref valid:', Boolean(storageRef));
        
        try {
          const snapshot = await uploadBytes(storageRef, blob, metadata);
          console.log('Upload successful!', snapshot);
          
          const downloadUrl = await getDownloadURL(snapshot.ref);
          console.log('Download URL obtained:', downloadUrl);
          
          // Update Firestore with the new barcode URL
          const db = getFirestore();
          const studentRef = doc(db, 'students', student.id);
          
          await updateDoc(studentRef, {
            qrCodeUrl: downloadUrl, // 保持字段名称不变，以保持兼容性
            barcodeType: 'barcode', // 标记为条形码类型
            lastUpdated: serverTimestamp()
          });
          console.log('Firestore document updated successfully');
          
          // Update local state
          setStudent({
            ...student,
            qrCodeUrl: downloadUrl,
            barcodeType: 'barcode'
          });
          
          if (editedStudent) {
            setEditedStudent({
              ...editedStudent,
              qrCodeUrl: downloadUrl,
              barcodeType: 'barcode'
            });
          }
          
          Alert.alert('Success', 'Barcode uploaded successfully');
        } catch (uploadError: any) {
          console.error('Upload error specific info:', uploadError);
          // If there's an error object with additional info, log it
          if (uploadError.serverResponse) {
            console.error('Server response:', uploadError.serverResponse);
          }
          throw uploadError;
        }
      } catch (error: any) {
        console.error('Error during upload process:', error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        if (error.code) console.error('Error code:', error.code);
        if (error.name) console.error('Error name:', error.name);
        console.error('Full error:', JSON.stringify(error, null, 2));
        
        Alert.alert('Upload Failed', 'Cannot upload barcode image. Please try with a smaller image or a different format.');
      }
    } catch (err) {
      console.error('Error in overall upload process:', err);
      Alert.alert('Error', 'Failed to upload barcode. Please try again later.');
    } finally {
      setUploadingQR(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading student details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !student) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-triangle" size={50} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Student not found'}</Text>
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
          <FontAwesome name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Details</Text>
        {!isEditing ? (
          <View style={{flexDirection: 'row'}}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <FontAwesome name="edit" size={20} color="#1E3A8A" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.editButtons}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelEdit}
            >
              <FontAwesome name="times" size={20} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveChanges}
            >
              <FontAwesome name="check" size={20} color="#10B981" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {uploadingPhoto ? (
              <View style={styles.profileImage}>
                <ActivityIndicator size="large" color="#1E3A8A" />
              </View>
            ) : (
              <Image 
                source={
                  student.photoUrl 
                    ? { uri: student.photoUrl } 
                    : { uri: PLACEHOLDER_IMAGES.avatar }
                }
                style={styles.profileImage}
              />
            )}
            <TouchableOpacity 
              style={styles.photoEditButton}
              onPress={() => pickImage(true)}
            >
              <FontAwesome name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.fullName}>{student.fullName}</Text>
          <Text style={styles.email}>{student.email}</Text>
          <View style={styles.verificationBadge}>
            <FontAwesome 
              name={student.isVerified ? "check-circle" : "exclamation-circle"} 
              size={16} 
              color={student.isVerified ? "#10B981" : "#F59E0B"} 
              style={{ marginRight: 5 }}
            />
            <Text style={[
              styles.verificationText, 
              { color: student.isVerified ? "#10B981" : "#F59E0B" }
            ]}>
              {student.isVerified ? "Verified" : "Not Verified"}
            </Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Student ID:</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={editedStudent?.studentId}
                onChangeText={(text) => setEditedStudent({...editedStudent!, studentId: text})}
                placeholder="Enter student ID"
              />
            ) : (
              <Text style={styles.infoValue}>{student.studentId}</Text>
            )}
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name:</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={editedStudent?.fullName}
                onChangeText={(text) => setEditedStudent({...editedStudent!, fullName: text})}
                placeholder="Enter full name"
              />
            ) : (
              <Text style={styles.infoValue}>{student.fullName}</Text>
            )}
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Department:</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={editedStudent?.department}
                onChangeText={(text) => setEditedStudent({...editedStudent!, department: text})}
                placeholder="Enter department"
              />
            ) : (
              <Text style={styles.infoValue}>{student.department || 'Not specified'}</Text>
            )}
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Program:</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={editedStudent?.program}
                onChangeText={(text) => setEditedStudent({...editedStudent!, program: text})}
                placeholder="Enter program"
              />
            ) : (
              <Text style={styles.infoValue}>{student.program || 'Not specified'}</Text>
            )}
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Verification:</Text>
            {isEditing ? (
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  { backgroundColor: editedStudent?.isVerified ? '#10B981' : '#CBD5E1' }
                ]}
                onPress={() => setEditedStudent({
                  ...editedStudent!,
                  isVerified: !editedStudent?.isVerified
                })}
              >
                <Text style={styles.verifyButtonText}>
                  {editedStudent?.isVerified ? 'Verified' : 'Not Verified'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[
                styles.infoValue,
                { color: student.isVerified ? '#10B981' : '#F59E0B' }
              ]}>
                {student.isVerified ? 'Verified' : 'Not Verified'}
              </Text>
            )}
          </View>
          
          {student.createdAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Joined:</Text>
              <Text style={styles.infoValue}>{formatDate(student.createdAt)}</Text>
            </View>
          )}
        </View>

        <View style={styles.idCardSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Student ID Card</Text>
            <View style={styles.idActions}>
              <TouchableOpacity 
                style={styles.idAction}
                onPress={() => pickImage(false)}
              >
                <FontAwesome name="upload" size={18} color="#1E3A8A" />
                <Text style={styles.idActionText}>Upload Barcode</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.idCard}>
            <View style={styles.verticalIdStrip}>
              {student.studentId && student.studentId.split('').map((char, index) => (
                <Text key={`char-${index}`} style={styles.verticalIdChar}>{char}</Text>
              ))}
            </View>
            <View style={styles.idCardContent}>
              <View style={styles.logoSection}>
                <View style={styles.logoContainer}>
                  <Image 
                    source={require('../../../../assets/images/logo.png')} 
                    style={styles.logo} 
                    resizeMode="contain"
                  />
                </View>
              </View>
              
              <View style={styles.photoSection}>
                <View style={styles.photoUploadContainer}>
                  {student.photoUrl ? (
                    <Image 
                      source={{ uri: student.photoUrl }} 
                      style={styles.idPhoto} 
                      resizeMode="cover"
                    />
                  ) : (
                    <Image 
                      source={{ uri: PLACEHOLDER_IMAGES.avatar }} 
                      style={styles.idPhoto} 
                      resizeMode="cover"
                    />
                  )}
                </View>
              </View>
              
              <View style={styles.idBottomSection}>
                <View style={styles.nameContainer}>
                  <Text style={styles.nameText}>{student.fullName.toUpperCase()}</Text>
                </View>
                
                <View style={styles.barcodeContainer}>
                  <View style={styles.barcodeFormatContainer}>
                    {uploadingQR ? (
                      <ActivityIndicator size="small" color="#1E3A8A" />
                    ) : student.qrCodeUrl ? (
                      <Image
                        source={{ uri: student.qrCodeUrl }}
                        style={styles.barcodeFormatImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <FontAwesome name="barcode" size={40} color="#CBD5E1" />
                    )}
                  </View>
                  <Text style={styles.barcodeText}>{student.studentId}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const idCardWidth = width * 0.9;
const idCardHeight = idCardWidth * 0.65; // Aspect ratio of ID card

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    flex: 1,
  },
  editButton: {
    padding: 8,
  },
  editButtons: {
    flexDirection: 'row',
  },
  cancelButton: {
    padding: 8,
    marginRight: 8,
  },
  saveButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  photoEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1E3A8A',
    borderRadius: 20,
    padding: 8,
  },
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#64748B',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    padding: 5,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    width: 120,
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  infoInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  verifyButton: {
    padding: 8,
    borderRadius: 8,
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  idCardSection: {
    padding: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  idActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  idAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  idActionText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#1E3A8A',
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
  photoFrame: {
    width: 140,
    height: 160,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    borderRadius: 4,
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
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 5,
    width: '100%',
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
  barcodeText: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    letterSpacing: 0,
    color: '#000000',
    textAlign: 'center',
    marginTop: 3,
  },
}); 