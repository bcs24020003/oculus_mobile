import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

export default function AdminChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }
    
    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }
    
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        throw new Error('User not authenticated');
      }
      
      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      Alert.alert(
        'Success', 
        'Password changed successfully', 
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error changing password:', error);
      
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Current password is incorrect');
      } else {
        Alert.alert('Error', 'Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCurrentPasswordVisibility = () => {
    setCurrentPasswordVisible(!currentPasswordVisible);
  };

  const toggleNewPasswordVisibility = () => {
    setNewPasswordVisible(!newPasswordVisible);
  };

  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(!confirmPasswordVisible);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.iconContainer}>
              <FontAwesome name="lock" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.formTitle}>Admin Password Change</Text>
          </View>
          
          <View style={styles.formBody}>
            <Text style={styles.formDescription}>
              Create a strong password with at least 6 characters including numbers and special characters for better security.
            </Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Password</Text>
              <View style={[styles.inputContainer, currentPassword ? styles.inputFilled : null]}>
                <FontAwesome name="lock" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!currentPasswordVisible}
                  placeholder="Enter current password"
                  placeholderTextColor="#A0AEC0"
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={toggleCurrentPasswordVisibility}
                >
                  <FontAwesome 
                    name={currentPasswordVisible ? "eye" : "eye-slash"} 
                    size={20} 
                    color="#64748B" 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={[styles.inputContainer, newPassword ? styles.inputFilled : null]}>
                <FontAwesome name="lock" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!newPasswordVisible}
                  placeholder="Enter new password"
                  placeholderTextColor="#A0AEC0"
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={toggleNewPasswordVisibility}
                >
                  <FontAwesome 
                    name={newPasswordVisible ? "eye" : "eye-slash"} 
                    size={20} 
                    color="#64748B" 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={[styles.inputContainer, confirmPassword ? styles.inputFilled : null, 
                newPassword && confirmPassword && newPassword !== confirmPassword ? styles.inputError : null]}>
                <FontAwesome name="lock" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!confirmPasswordVisible}
                  placeholder="Confirm new password"
                  placeholderTextColor="#A0AEC0"
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={toggleConfirmPasswordVisibility}
                >
                  <FontAwesome 
                    name={confirmPasswordVisible ? "eye" : "eye-slash"} 
                    size={20} 
                    color="#64748B" 
                  />
                </TouchableOpacity>
              </View>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}
            </View>
            
            <View style={styles.passwordStrength}>
              <Text style={styles.strengthText}>Password Strength:</Text>
              <View style={styles.strengthBar}>
                <View 
                  style={[
                    styles.strengthIndicator, 
                    newPassword.length === 0 ? styles.strengthEmpty : 
                    newPassword.length < 6 ? styles.strengthWeak : 
                    newPassword.length < 8 ? styles.strengthMedium : 
                    styles.strengthStrong
                  ]} 
                />
              </View>
              <Text style={styles.strengthLabel}>
                {newPassword.length === 0 ? 'None' : 
                 newPassword.length < 6 ? 'Weak' : 
                 newPassword.length < 8 ? 'Medium' : 
                 'Strong'}
              </Text>
            </View>
          </View>
          
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome name="check" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.saveButtonText}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <FontAwesome name="arrow-left" size={18} color="#1E3A8A" style={styles.buttonIcon} />
              <Text style={styles.backButtonText}>Cancel</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerBackButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  formHeader: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  formBody: {
    padding: 20,
  },
  formDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputFilled: {
    borderColor: '#93C5FD',
    backgroundColor: '#F8FAFC',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1E293B',
  },
  eyeIcon: {
    padding: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 4,
  },
  passwordStrength: {
    marginBottom: 24,
  },
  strengthText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  strengthBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 4,
  },
  strengthIndicator: {
    height: '100%',
    borderRadius: 3,
  },
  strengthEmpty: {
    width: '0%',
  },
  strengthWeak: {
    width: '33%',
    backgroundColor: '#EF4444',
  },
  strengthMedium: {
    width: '66%',
    backgroundColor: '#F59E0B',
  },
  strengthStrong: {
    width: '100%',
    backgroundColor: '#10B981',
  },
  strengthLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  buttonsContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#7C3AED',
    height: 50,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    height: 50,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
}); 