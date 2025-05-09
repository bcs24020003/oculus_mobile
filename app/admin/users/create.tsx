import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Switch,
  Modal 
} from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, where, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFunctions, httpsCallable } from 'firebase/functions';

// 重要说明：创建新用户后，我们使用以下机制阻止自动跳转到管理员仪表板
// 当admin用户创建新账户后，我们设置一个临时标志，防止在重新登录admin账户时
// 触发自动跳转到dashboard的行为，使用户能够继续留在创建账户页面
// 此机制通过全局标志和admin布局中的检查实现

// 添加防止重定向的标志（在全局范围内可访问）
if (typeof window !== 'undefined') {
  window.preventRedirectFromUserCreation = { value: false };
}

// 获取或创建防止重定向标志
const getPreventRedirectFlag = () => {
  if (typeof window !== 'undefined') {
    if (!window.preventRedirectFromUserCreation) {
      window.preventRedirectFromUserCreation = { value: false };
    }
    return window.preventRedirectFromUserCreation;
  }
  return { value: false };
};

export default function CreateUserAccount() {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [program, setProgram] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // State for admin re-login
  const [adminPassword, setAdminPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const currentUserEmail = useRef('');
  const newUserData = useRef<{
    fullName: string;
    email: string;
    password: string;
    studentId: string;
    department: string;
    program: string;
    isAdmin: boolean;
  } | null>(null);
  
  const validateInputs = (): boolean => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter a full name');
      return false;
    }
    
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return false;
    }
    
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    
    if (!isAdmin && !studentId.trim()) {
      Alert.alert('Error', 'Please enter a student ID for student accounts');
      return false;
    }
    
    return true;
  };
  
  const checkDuplicateStudentId = async (): Promise<boolean> => {
    if (!studentId.trim() || isAdmin) return true;
    
    try {
      const db = getFirestore();
      const q = query(collection(db, 'students'), where('studentId', '==', studentId.trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        Alert.alert('Error', `Student ID ${studentId} is already in use`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking duplicate student ID:', error);
      Alert.alert('Error', 'Failed to verify student ID uniqueness. Please try again.');
      return false;
    }
  };
  
  // 添加防止自动导航跳转的函数
  const preventAutomaticNavigation = () => {
    const preventRedirect = getPreventRedirectFlag();
    preventRedirect.value = true;
    
    // 5秒后重置标志，允许后续正常导航
    setTimeout(() => {
      preventRedirect.value = false;
    }, 5000);
  };
  
  const completeAccountCreation = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const auth = getAuth();
      
      // 设置防止跳转标志
      preventAutomaticNavigation();
      
      // Save current admin email
      currentUserEmail.current = auth.currentUser?.email || '';
      
      // Ensure newUserData.current is not null
      if (!newUserData.current) {
        throw new Error('User data does not exist');
      }
      
      // Create user authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUserData.current.email,
        newUserData.current.password
      );
      
      const newUserUid = userCredential.user.uid;

      // Store to different collections based on user role
      if (newUserData.current.isAdmin) {
        // Store to users collection
        await setDoc(doc(db, 'users', newUserUid), {
          email: newUserData.current.email,
          fullName: newUserData.current.fullName || '',
          role: 'admin',
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
      } else {
        // Store to students collection
        await setDoc(doc(db, 'students', newUserUid), {
          email: newUserData.current.email,
          fullName: newUserData.current.fullName || '',
          studentId: newUserData.current.studentId || '',
          department: newUserData.current.department || '',
          program: newUserData.current.program || '',
          role: 'student',
          isVerified: false,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
      }
      
      // Immediately switch back to admin account
      try {
        await signInWithEmailAndPassword(auth, currentUserEmail.current, adminPassword);
        console.log('Admin login status restored');
        
        // 确保设置防止跳转标志
        preventAutomaticNavigation();
        
        // Show success message
        Alert.alert(
          'Success',
          'Account created successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form without reloading page or redirecting
                resetForm();
                // 确保留在当前页面，不跳转
              }
            }
          ]
        );
        
        // 防止任何可能的自动导航
        setTimeout(() => {
          // 保持在当前创建账户页面
          console.log('Ensuring we stay on create account page');
          // 再次确认防止跳转标志
          const preventRedirect = getPreventRedirectFlag();
          preventRedirect.value = true;
        }, 100);
      } catch (signInError) {
        console.error('Failed to log back in as admin:', signInError);
        Alert.alert(
          'Warning',
          'New account created, but could not restore your admin account. Please manually log out and log back in.',
          [
            {
              text: 'Log Out',
              onPress: async () => {
                await signOut(auth);
                router.replace('/auth/sign-in');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error creating account:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setShowPasswordModal(false);
      setAdminPassword('');
      setLoading(false);
    }
  };
  
  const handleCreateAccount = async () => {
    if (!validateInputs()) return;
    
    const isDuplicateId = await checkDuplicateStudentId();
    if (!isDuplicateId) return;
    
    // Save user data to be created
    newUserData.current = {
      fullName,
      email,
      password,
      studentId,
      department,
      program,
      isAdmin
    };
    
    // Show password confirmation dialog
    setShowPasswordModal(true);
  };

  // Reset form function
  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setStudentId('');
    setDepartment('');
    setProgram('');
    // Keep isAdmin unchanged for continuous account creation of the same type
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Account</Text>
      </View>
      
      <ScrollView style={styles.formContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter full name"
            placeholderTextColor="#94A3B8"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <FontAwesome name={showPassword ? "eye-slash" : "eye"} size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <FontAwesome name={showConfirmPassword ? "eye-slash" : "eye"} size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Admin Account</Text>
          <Switch
            value={isAdmin}
            onValueChange={setIsAdmin}
            trackColor={{ false: '#E2E8F0', true: '#1E3A8A' }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        {!isAdmin && (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Student ID</Text>
              <TextInput
                style={styles.input}
                value={studentId}
                onChangeText={setStudentId}
                placeholder="Enter student ID"
                placeholderTextColor="#94A3B8"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Department</Text>
              <TextInput
                style={styles.input}
                value={department}
                onChangeText={setDepartment}
                placeholder="Enter department (optional)"
                placeholderTextColor="#94A3B8"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Program</Text>
              <TextInput
                style={styles.input}
                value={program}
                onChangeText={setProgram}
                placeholder="Enter program (optional)"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </>
        )}
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleCreateAccount}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <FontAwesome name="user-plus" size={16} color="#FFFFFF" style={styles.submitIcon} />
              <Text style={styles.submitButtonText}>Create Account</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Admin password confirmation dialog */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPasswordModal(false);
          setAdminPassword('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Admin Password Confirmation</Text>
            <Text style={styles.modalSubtitle}>Please enter your admin password to restore your login status after account creation</Text>
            
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={adminPassword}
                onChangeText={setAdminPassword}
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                autoFocus
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <FontAwesome name={showPassword ? "eye-slash" : "eye"} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setAdminPassword('');
                }}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmButton, !adminPassword ? styles.disabledButton : null]}
                onPress={completeAccountCreation}
                disabled={!adminPassword || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
  },
  formContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitIcon: {
    marginRight: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  eyeIcon: {
    padding: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  confirmButton: {
    backgroundColor: '#1E3A8A',
    padding: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#CBD5E1',
  },
}); 