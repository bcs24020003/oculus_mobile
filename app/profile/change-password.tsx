import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

export default function ChangePasswordScreen() {
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
        <Image 
          source={require('../../assets/images/uts-logo-new.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.iconContainer}>
              <FontAwesome name="lock" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.formTitle}>Change Password</Text>
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
              style={styles.backButton}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
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
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    overflow: 'hidden',
  },
  formHeader: {
    backgroundColor: '#1E3A8A',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  formBody: {
    padding: 24,
  },
  formDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  inputFilled: {
    borderColor: '#94A3B8',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    padding: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  eyeIcon: {
    padding: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  passwordStrength: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  strengthText: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 10,
  },
  strengthBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    flex: 1,
    marginRight: 10,
    overflow: 'hidden',
  },
  strengthIndicator: {
    height: '100%',
    borderRadius: 3,
  },
  strengthEmpty: {
    width: '0%',
    backgroundColor: '#E2E8F0',
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
    fontSize: 13,
    width: 60,
    color: '#64748B',
  },
  buttonsContainer: {
    flexDirection: 'column',
    padding: 20,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#1E3A8A',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
}); 