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
          '您需要授予权限才能访问照片库上传二维码。'
        );
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // 降低质量以减小文件大小
      });
      
      if (!result.canceled && result.assets[0].uri) {
        setUploading(true);
        
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          
          if (!user) {
            throw new Error('用户未登录');
          }
          
          // 获取图片信息
          const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
          
          if (!fileInfo.exists) {
            throw new Error('文件不存在');
          }
          
          console.log('文件信息:', JSON.stringify(fileInfo, null, 2));
          
          // 检查文件大小
          if (fileInfo.size && fileInfo.size > 5 * 1024 * 1024) {
            console.log('警告: 文件大小超过5MB');
          }
          
          try {
            // 使用超时控制器
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            // 直接转换为blob，不使用ImageManipulator
            const response = await fetch(result.assets[0].uri, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`获取失败，状态码: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            if (!blob || blob.size === 0) {
              throw new Error('无效的blob: 为空或大小为0');
            }
            
            console.log('上传文件:');
            console.log('- Blob大小:', blob.size);
            console.log('- Blob类型:', blob.type);
            
            // 初始化存储
            const storage = getStorage();
            
            // 使用时间戳命名文件，避免缓存问题
            const timestamp = new Date().getTime();
            const storageRef = ref(storage, `student_qrcodes/${user.uid}_${timestamp}.jpg`);
            
            // 添加元数据确保正确的内容类型
            const metadata = {
              contentType: 'image/jpeg',
              cacheControl: 'no-cache',
            };
            
            console.log('开始上传...');
            await uploadBytes(storageRef, blob, metadata);
            console.log('上传完成');
            
            // 获取下载URL
            const downloadURL = await getDownloadURL(storageRef);
            console.log('获取到下载URL:', downloadURL);
            
            // 更新个人资料
            const db = getFirestore();
            const profileRef = doc(db, 'students', user.uid);
            await updateDoc(profileRef, {
              qrCodeUrl: downloadURL
            });
            
            // 更新本地状态
            setProfile({
              ...profile,
              qrCodeUrl: downloadURL
            });
            
            Alert.alert('成功', '二维码上传成功');
          } catch (error: any) {
            console.error('Blob转换/上传错误详情:', error);
            
            if (error.name === 'AbortError') {
              throw new Error('上传超时 - 请重试');
            }
            
            // 详细记录Firebase错误
            if (error.code && error.code.includes('storage/')) {
              console.error('Firebase存储错误代码:', error.code);
            }
            
            throw new Error(`处理图片失败: ${error.message || '未知错误'}`);
          }
        } catch (error: any) {
          console.error('上传二维码错误:', error);
          Alert.alert('错误', `上传失败: ${error.message || '请重试'}`);
        } finally {
          setUploading(false);
        }
      }
    } catch (error: any) {
      console.error('选择图片错误:', error);
      Alert.alert('错误', `选择图片失败: ${error.message || '请重试'}`);
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
          '您需要授予权限才能访问照片库上传证件照。'
        );
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.5, // 降低质量以减小文件大小
      });
      
      if (!result.canceled && result.assets[0].uri) {
        setUploadingPhoto(true);
        
        try {
          const auth = getAuth();
          const user = auth.currentUser;
          
          if (!user) {
            throw new Error('用户未登录');
          }
          
          // 获取图片信息
          const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
          
          if (!fileInfo.exists) {
            throw new Error('文件不存在');
          }
          
          console.log('文件信息:', JSON.stringify(fileInfo, null, 2));
          
          // 检查文件大小
          if (fileInfo.size && fileInfo.size > 5 * 1024 * 1024) {
            console.log('警告: 文件大小超过5MB');
          }
          
          try {
            // 使用超时控制器
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            // 直接转换为blob，不使用ImageManipulator
            const response = await fetch(result.assets[0].uri, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`获取失败，状态码: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            if (!blob || blob.size === 0) {
              throw new Error('无效的blob: 为空或大小为0');
            }
            
            console.log('上传照片:');
            console.log('- Blob大小:', blob.size);
            console.log('- Blob类型:', blob.type);
            
            // 初始化存储
            const storage = getStorage();
            
            // 使用时间戳命名文件，避免缓存问题
            const timestamp = new Date().getTime();
            const storageRef = ref(storage, `student_photos/${user.uid}_${timestamp}.jpg`);
            
            // 添加元数据确保正确的内容类型
            const metadata = {
              contentType: 'image/jpeg',
              cacheControl: 'no-cache',
            };
            
            console.log('开始上传...');
            await uploadBytes(storageRef, blob, metadata);
            console.log('上传完成');
            
            // 获取下载URL
            const downloadURL = await getDownloadURL(storageRef);
            console.log('获取到下载URL:', downloadURL);
            
            // 更新个人资料
            const db = getFirestore();
            const profileRef = doc(db, 'students', user.uid);
            await updateDoc(profileRef, {
              photoUrl: downloadURL
            });
            
            // 更新本地状态
            setProfile({
              ...profile,
              photoUrl: downloadURL
            });
            
            Alert.alert('成功', '证件照上传成功');
          } catch (error: any) {
            console.error('Blob转换/上传错误详情:', error);
            
            if (error.name === 'AbortError') {
              throw new Error('上传超时 - 请重试');
            }
            
            // 详细记录Firebase错误
            if (error.code && error.code.includes('storage/')) {
              console.error('Firebase存储错误代码:', error.code);
            }
            
            throw new Error(`处理图片失败: ${error.message || '未知错误'}`);
          }
        } catch (error: any) {
          console.error('上传照片错误:', error);
          Alert.alert('错误', `上传失败: ${error.message || '请重试'}`);
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (error: any) {
      console.error('选择图片错误:', error);
      Alert.alert('错误', `选择图片失败: ${error.message || '请重试'}`);
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
          <Text style={styles.headerTitle}>学生证</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>正在加载学生证...</Text>
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
          <Text style={styles.headerTitle}>学生证</Text>
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
          <Text style={styles.headerTitle}>学生证</Text>
        </View>
        <View style={styles.errorContainer}>
          <FontAwesome name="user-times" size={50} color="#64748B" />
          <Text style={styles.errorText}>无可用个人资料信息</Text>
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
        <Text style={styles.headerTitle}>学生证</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.instructionText}>
          <Text style={styles.instructionLine}>Your electronic student ID can be used on campus</Text>
        </View>
        
        <View style={styles.idCardContainer}>
          <View style={styles.idCard}>
            <View style={styles.verticalIdStrip}>
              {profile.studentId && profile.studentId.slice(0, 3).split('').map((char, index) => (
                <Text key={`prefix-${index}`} style={styles.verticalIdChar}>{char}</Text>
              ))}
              <View style={styles.idNumberSpacer} />
              {profile.studentId && profile.studentId.slice(3).split('').map((char, index) => (
                <Text key={`suffix-${index}`} style={styles.verticalIdChar}>{char}</Text>
              ))}
            </View>
            <View style={styles.idCardContent}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../../assets/images/logo.png')} 
                  style={styles.logo} 
                  resizeMode="contain"
                />
              </View>
              
              <View style={styles.photoFrame}>
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
              
              <View style={styles.nameContainer}>
                <Text style={styles.nameText} numberOfLines={1}>{profile.fullName.toUpperCase()}</Text>
              </View>
              
              <View style={styles.barcodeContainer}>
                <TouchableOpacity 
                  style={styles.qrCodeContainer}
                  onPress={uploadQrCode}
                  disabled={uploading}
                >
                  {profile.qrCodeUrl ? (
                    <Image 
                      source={{ uri: profile.qrCodeUrl }} 
                      style={styles.qrCode} 
                      resizeMode="contain"
                    />
                  ) : (
                    <>
                      <FontAwesome name="qrcode" size={40} color="#CBD5E1" />
                      <Text style={styles.uploadText}>Tap to upload QR code</Text>
                    </>
                  )}
                  {uploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color="#FFFFFF" size="large" />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.barcodeText}>{profile.studentId}</Text>
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  verticalIdChar: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  idNumberSpacer: {
    height: 20,
  },
  idCardContent: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 90,
    height: 90,
  },
  photoFrame: {
    width: 140,
    height: 160,
    borderWidth: 0,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginBottom: 15,
    borderRadius: 4,
  },
  photoUploadContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 10,
    width: '100%',
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
    textAlign: 'center',
    paddingHorizontal: 5,
    width: '100%',
  },
  departmentText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    paddingHorizontal: 5,
    width: '100%',
  },
  barcodeContainer: {
    alignItems: 'center',
    width: '100%',
    marginTop: 5,
  },
  qrCodeContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 8,
    overflow: 'hidden',
  },
  qrCode: {
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
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#000000',
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