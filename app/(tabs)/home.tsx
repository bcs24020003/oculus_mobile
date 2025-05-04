import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          console.log('Current user:', user.uid, user.displayName, user.email);
          const db = getFirestore();
          // Check if user is admin
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User data from users collection:', userData);
            setIsAdmin(userData.role === 'admin');
            // Ensure all possible ways to get the user's name
            setUserName(userData.fullName || userData.displayName || userData.username || user.displayName || user.email?.split('@')[0] || 'User');
          } else {
            // Check student collection if not in users
            const studentDoc = await getDoc(doc(db, 'students', user.uid));
            if (studentDoc.exists()) {
              const studentData = studentDoc.data();
              console.log('User data from students collection:', studentData);
              // Ensure all possible ways to get the student's name
              setUserName(studentData.fullName || studentData.displayName || studentData.username || user.displayName || user.email?.split('@')[0] || 'Student');
              setIsAdmin(false);
            } else {
              console.log('User not found in any collection, using fallback name');
              // If not in either collection, use info from Auth data
              setUserName(user.displayName || user.email?.split('@')[0] || 'User');
              setIsAdmin(false);
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Use fallback solution when error occurs
          setUserName(user.displayName || user.email?.split('@')[0] || 'User');
          setIsAdmin(false);
        }
      } else {
        console.log('No user logged in, setting as Guest');
        setUserName('Guest');
        setIsAdmin(false);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/uts-logo-new.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>
      
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Hello, {userName}</Text>
        {isAdmin && <Text style={styles.adminText}>Admin Access</Text>}
      </View>
      
      <View style={styles.divider} />

      {isAdmin ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
          </View>
        </ScrollView>
      ) : (
        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.navigate('/news')}
          >
            <View style={styles.menuIcon}>
              <FontAwesome name="exclamation-circle" size={32} color="#fff" />
            </View>
            <Text style={styles.menuText}>News &{'\n'}Announcement</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.navigate('/timetable')}
          >
            <View style={styles.menuIcon}>
              <FontAwesome name="calendar" size={32} color="#fff" />
            </View>
            <Text style={styles.menuText}>Current{'\n'}Timetable</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.navigate('/courses')}
          >
            <View style={styles.menuIcon}>
              <FontAwesome name="list" size={32} color="#fff" />
            </View>
            <Text style={styles.menuText}>Course{'\n'}List</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  logoContainer: {
    width: 100,
    height: 50,
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 50,
  },
  greeting: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    backgroundColor: '#f0f8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  greetingText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  adminText: {
    fontSize: 18,
    color: '#1E40AF',
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
  },
  menuContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  menuItem: {
    alignItems: 'center',
    width: 100,
  },
  menuIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  menuText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Admin dashboard styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 20,
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