import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, SafeAreaView, RefreshControl } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

export default function AdminDashboard() {
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setUserName('Admin User');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Just get the user's name - admin verification is done at layout level
      setUserName(user.displayName || 'Admin');
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading user info:', error);
      setUserName('Admin User');
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={22} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Image 
            source={require('../../assets/images/uts-logo-new.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.adminText}>ADMIN DASHBOARD</Text>
        </View>
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
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome, {userName}</Text>
          <Text style={styles.subtitleText}>Manage university operations from one place</Text>
        </View>

        {/* User Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Management</Text>
          
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/admin/users/list')}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#E0E7FF' }]}>
              <FontAwesome name="users" size={24} color="#3730A3" />
            </View>
            <Text style={styles.cardTitle}>Manage Students</Text>
            <Text style={styles.cardDescription}>Create, edit, and delete student accounts</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/admin/users/create')}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#D1FAE5' }]}>
              <FontAwesome name="user-plus" size={24} color="#065F46" />
            </View>
            <Text style={styles.cardTitle}>Create Account</Text>
            <Text style={styles.cardDescription}>Create new student or admin accounts</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/admin/users/verify-id')}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#FEE2E2' }]}>
              <FontAwesome name="id-card-o" size={24} color="#9F1239" />
            </View>
            <Text style={styles.cardTitle}>ID Verification</Text>
            <Text style={styles.cardDescription}>Verify student identification documents</Text>
          </TouchableOpacity>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/admin/courses/manage')}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#FEF3C7' }]}>
              <FontAwesome name="book" size={24} color="#92400E" />
            </View>
            <Text style={styles.cardTitle}>Course Management</Text>
            <Text style={styles.cardDescription}>Add, edit or remove courses from the system</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/admin/timetable')}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#DBEAFE' }]}>
              <FontAwesome name="calendar" size={24} color="#1E40AF" />
            </View>
            <Text style={styles.cardTitle}>Timetable Management</Text>
            <Text style={styles.cardDescription}>Manage class schedules and session times</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/admin/backup')}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#E0E7FF' }]}>
              <FontAwesome name="database" size={24} color="#4338CA" />
            </View>
            <Text style={styles.cardTitle}>Data Backup</Text>
            <Text style={styles.cardDescription}>Backup and restore system data</Text>
          </TouchableOpacity>
        </View>

        {/* Announcements & Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Announcements & Notifications</Text>
          
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/admin/announcements/list')}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#DBEAFE' }]}>
              <FontAwesome name="bullhorn" size={24} color="#1E40AF" />
            </View>
            <Text style={styles.cardTitle}>Manage Announcements</Text>
            <Text style={styles.cardDescription}>Create, edit and delete university announcements</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/admin/announcements/create')}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#D1FAE5' }]}>
              <FontAwesome name="plus-circle" size={24} color="#065F46" />
            </View>
            <Text style={styles.cardTitle}>Create Announcement</Text>
            <Text style={styles.cardDescription}>Post a new announcement to all students</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => Alert.alert('Send Notifications', 'This feature will be available soon')}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#FEE2E2' }]}>
              <FontAwesome name="bell" size={24} color="#9F1239" />
            </View>
            <Text style={styles.cardTitle}>Send Notifications</Text>
            <Text style={styles.cardDescription}>Send push notifications to specific students or all</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System</Text>
          
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/admin/settings')}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#E0E7FF' }]}>
              <FontAwesome name="cog" size={24} color="#4338CA" />
            </View>
            <Text style={styles.cardTitle}>System Settings</Text>
            <Text style={styles.cardDescription}>Configure system-wide settings and preferences</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => {
              Alert.alert(
                'Confirm Logout',
                'Are you sure you want to logout?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Logout', 
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await getAuth().signOut();
                        router.replace('/auth/sign-in');
                      } catch (error) {
                        console.error('Error signing out:', error);
                        Alert.alert('Error', 'Failed to sign out. Please try again.');
                      }
                    }
                  }
                ]
              );
            }}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#FEE2E2' }]}>
              <FontAwesome name="sign-out" size={24} color="#9F1239" />
            </View>
            <Text style={styles.cardTitle}>Logout</Text>
            <Text style={styles.cardDescription}>Sign out from your admin account</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 15,
    padding: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 40,
    marginRight: 12,
  },
  adminText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
    color: '#64748B',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748B',
  },
}); 