import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
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
}

export default function IDCardScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('You must be logged in to view your ID card');
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

  const exportID = () => {
    Alert.alert('ID Card', 'Your ID card has been exported successfully.');
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
          <Text style={styles.loadingText}>Loading ID card...</Text>
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
          <Text style={styles.errorText}>No profile information available</Text>
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
        <View style={styles.idCardContainer}>
          <View style={styles.idCard}>
            <View style={styles.verticalIdStrip}>
              {profile.studentId.split('').map((char, index) => (
                <Text key={index} style={styles.verticalIdChar}>{char}</Text>
              ))}
            </View>
            
            <View style={styles.idCardContent}>
              <View style={styles.idCardHeader}>
                <Image
                  source={require('../../assets/images/uts-logo-new.png')}
                  style={styles.universityLogo}
                  resizeMode="contain"
                />
                <Text style={styles.universityName}>UNIVERSITY OF TECHNOLOGY</Text>
                <Text style={styles.locationName}>SARAWAK</Text>
              </View>
              
              <View style={styles.photoFrame}>
                <Image
                  source={
                    profile.photoUrl
                      ? { uri: profile.photoUrl }
                      : { uri: PLACEHOLDER_IMAGES.avatar }
                  }
                  style={styles.idPhoto}
                />
              </View>
              
              <View style={styles.nameContainer}>
                <Text style={styles.nameText}>{profile.fullName.toUpperCase()}</Text>
              </View>
              
              <View style={styles.barcodeContainer}>
                <Image
                  source={{ uri: PLACEHOLDER_IMAGES.barcode }}
                  style={styles.barcode}
                  resizeMode="contain"
                />
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
            <Text style={styles.actionButtonText}>Export ID</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.shareButton]}
            onPress={() => Alert.alert('Share', 'ID Card sharing functionality will be implemented soon.')}
          >
            <FontAwesome name="share-alt" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Share ID</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
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
  idCardContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  idCard: {
    width: '100%',
    maxWidth: 350,
    aspectRatio: 0.63, // Portrait card ratio
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  verticalIdStrip: {
    width: 40,
    backgroundColor: '#7E22CE', // Purple color matching image
    alignItems: 'center',
    paddingVertical: 15,
  },
  verticalIdChar: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  idCardContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 15,
  },
  idCardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  universityLogo: {
    width: 100,
    height: 100,
  },
  universityName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
    color: '#1E293B',
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1E293B',
  },
  photoFrame: {
    width: 120,
    height: 140,
    alignSelf: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  idPhoto: {
    width: '100%',
    height: '100%',
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  barcodeContainer: {
    alignItems: 'center',
  },
  barcode: {
    width: '100%',
    height: 60,
  },
  barcodeText: {
    fontSize: 14,
    marginTop: 5,
    fontFamily: 'monospace',
    letterSpacing: 2,
    color: '#1E293B',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    width: '100%',
    maxWidth: 350,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    padding: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  shareButton: {
    backgroundColor: '#2563EB',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 16,
    marginLeft: 8,
  },
}); 