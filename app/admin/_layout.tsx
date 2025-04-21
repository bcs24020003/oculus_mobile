import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function AdminLayout() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const verifyAdminAccess = async () => {
      if (loading) return;
      
      if (!currentUser) {
        // If user is not logged in, redirect to sign-in
        console.log('用户未登录，重定向到登录页面');
        router.replace('/auth/sign-in');
        return;
      }
      
      try {
        // Check if user has admin privileges
        console.log('检查用户管理员权限，UID:', currentUser.uid);
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        console.log('用户数据:', userDoc.exists() ? userDoc.data() : '不存在');
        
        if (!userDoc.exists() || userDoc.data().role !== 'admin') {
          // 如果用户不是管理员，显示一个提示而不是自动重定向
          setIsAdmin(false);
          setIsVerifyingAdmin(false);
          return;
        }
        
        // User is verified as admin
        console.log('用户是管理员，允许访问管理员界面');
        setIsAdmin(true);
        setIsVerifyingAdmin(false);
      } catch (error) {
        console.error('验证管理员状态时出错:', error);
        // 出错时也不自动重定向，让用户自己决定
        setIsAdmin(false);
        setIsVerifyingAdmin(false);
      }
    };
    
    verifyAdminAccess();
  }, [currentUser, loading]);

  // Show loading indicator while verifying admin status
  if (loading || isVerifyingAdmin) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.text}>Verifying admin access...</Text>
      </View>
    );
  }

  // 如果用户不是管理员，显示无权限提示
  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorText}>You don't have administrator privileges.</Text>
        <TouchableOpacity 
          style={styles.buttonContainer}
          onPress={() => router.replace('/(tabs)/home')}
        >
          <Text style={styles.backButton}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="manage-announcements" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="backup" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="change-password" />
      
      {/* User Management */}
      <Stack.Screen name="users/list" />
      <Stack.Screen name="users/create" />
      <Stack.Screen name="users/verify-id" />
      <Stack.Screen name="users/details/[id]" />
      
      {/* Course Management */}
      <Stack.Screen name="courses/manage" />
      <Stack.Screen name="courses/create" />
      <Stack.Screen name="courses/edit/[id]" />
      
      {/* Timetable Management */}
      <Stack.Screen name="timetable" />
      
      {/* Announcements */}
      <Stack.Screen name="announcements/list" />
      <Stack.Screen name="announcements/create" />
      <Stack.Screen name="announcements/edit/[id]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 30,
  },
  buttonContainer: {
    marginTop: 16,
    backgroundColor: '#1E40AF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButton: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
}); 