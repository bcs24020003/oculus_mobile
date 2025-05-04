import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, RefreshControl, Image } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, getDoc, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pushNotificationEnabled, setPushNotificationEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const { logout } = useAuth();

  useEffect(() => {
    checkUserInfo();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    checkUserInfo();
  }, []);

  const checkUserInfo = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsAdmin(userData.isAdmin || false);
          setUserName(userData.username || userData.fullName || '');
          setPushNotificationEnabled(userData.pushNotificationEnabled || false);
        }
      }
    } catch (error) {
      console.error('Error checking user info:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePushNotificationToggle = async (value: boolean) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        const db = getFirestore();
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          // If document exists, update it directly
          await updateDoc(userDocRef, {
            pushNotificationEnabled: value
          });
        } else {
          // If document doesn't exist, create a new one
          await setDoc(userDocRef, {
            pushNotificationEnabled: value,
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        
        setPushNotificationEnabled(value);
        
        if (value) {
          Alert.alert('Success', 'Push notifications enabled');
        } else {
          Alert.alert('Success', 'Push notifications disabled');
        }
      }
    } catch (error) {
      console.error('Error updating push notification settings:', error);
      Alert.alert('Error', 'Failed to update push notification settings');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout', 
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth/sign-in');
            } catch (error) {
              console.error('Error signing out: ', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <Image 
          source={require('../../assets/images/uts-logo-new.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Text style={styles.profileName}>{userName}</Text>
        {isAdmin && (
          <>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
            <Text style={styles.adminNote}>Admin functions available on home page</Text>
          </>
        )}
      </View>
      
      <ScrollView 
        style={styles.menuContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1E3A8A']}
            tintColor="#1E3A8A"
          />
        }
      >
        <View style={styles.menuItem}>
          <Text style={styles.menuText}>Push Notification</Text>
          <Switch
            value={pushNotificationEnabled}
            onValueChange={handlePushNotificationToggle}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
            thumbColor={pushNotificationEnabled ? '#1E3A8A' : '#F1F5F9'}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleLogout}
        >
          <Text style={styles.menuText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerLogo: {
    width: 120,
    height: 50,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  adminBadge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  adminNote: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  menuContainer: {
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
  },
  menuText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
}); 