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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
} from 'firebase/firestore';
import { PLACEHOLDER_IMAGES } from '../../../utils/imageUtil';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Student {
  id: string;
  fullName: string;
  studentId: string;
  email: string;
  department?: string;
  program?: string;
  createdAt?: any;
  photoUrl?: string;
  username?: string;
}

export default function StudentDetails() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        setStudent({
          id: studentSnapshot.id,
          fullName: studentData.fullName || '',
          studentId: studentData.studentId || '',
          email: studentData.email || '',
          department: studentData.department,
          program: studentData.program,
          username: studentData.username,
          createdAt: studentData.createdAt,
          photoUrl: studentData.photoUrl,
        });
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
          <Text style={styles.errorText}>Student not found</Text>
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
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.profileSection}>
          <Image 
            source={
              student.photoUrl 
                ? { uri: student.photoUrl } 
                : { uri: PLACEHOLDER_IMAGES.avatar }
            }
            style={styles.profileImage}
          />
          <Text style={styles.fullName}>{student.fullName}</Text>
          <Text style={styles.email}>{student.email}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Student ID:</Text>
            <Text style={styles.infoValue}>{student.studentId}</Text>
          </View>
          {student.username && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username:</Text>
              <Text style={styles.infoValue}>{student.username}</Text>
            </View>
          )}
          {student.department && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Department:</Text>
              <Text style={styles.infoValue}>{student.department}</Text>
            </View>
          )}
          {student.program && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Program:</Text>
              <Text style={styles.infoValue}>{student.program}</Text>
            </View>
          )}
          {student.createdAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Joined:</Text>
              <Text style={styles.infoValue}>{formatDate(student.createdAt)}</Text>
            </View>
          )}
        </View>

        <View style={styles.idCardSection}>
          <Text style={styles.sectionTitle}>Student ID Card</Text>
          
          <View style={styles.idCard}>
            <View style={styles.idCardHeader}>
              <Text style={styles.utsText}>
                <Text style={styles.utsLogo}>UTS</Text> University of Technology Sydney
              </Text>
            </View>
            
            <View style={styles.idCardContent}>
              <View style={styles.idVerticalStrip}>
                <Text style={styles.verticalText}>{student.studentId}</Text>
              </View>
              
              <View style={styles.idCardDetails}>
                <Image 
                  source={
                    student.photoUrl 
                      ? { uri: student.photoUrl } 
                      : { uri: PLACEHOLDER_IMAGES.avatar }
                  }
                  style={styles.idCardImage}
                />
                
                <View style={styles.idCardInfo}>
                  <Text style={styles.idCardName}>{student.fullName}</Text>
                  <Text style={styles.idCardId}>{student.studentId}</Text>
                  {student.department && (
                    <Text style={styles.idCardDept}>{student.department}</Text>
                  )}
                  {student.program && (
                    <Text style={styles.idCardProgram}>{student.program}</Text>
                  )}
                </View>
              </View>
            </View>
            
            <View style={styles.idCardFooter}>
              <View style={styles.barcodeArea}>
                <Image
                  source={{ uri: PLACEHOLDER_IMAGES.barcode }}
                  style={styles.barcode}
                  resizeMode="contain"
                />
                <Text style={styles.barcodeText}>*{student.studentId}*</Text>
              </View>
              <Text style={styles.idCardFooterText}>Valid until: Dec 31, 2024</Text>
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
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
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
  idCardSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  idCard: {
    width: idCardWidth,
    height: idCardHeight,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignSelf: 'center',
  },
  idCardHeader: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  utsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  utsLogo: {
    fontFamily: 'InknutAntiqua_400Regular',
    fontSize: 20,
    fontWeight: 'bold',
  },
  idCardContent: {
    flex: 1,
    flexDirection: 'row',
  },
  idVerticalStrip: {
    width: 30,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalText: {
    color: '#FFFFFF',
    transform: [{ rotate: '-90deg' }],
    fontSize: 16,
    fontWeight: 'bold',
    width: 120,
    textAlign: 'center',
  },
  idCardDetails: {
    flex: 1,
    flexDirection: 'row',
    padding: 15,
  },
  idCardImage: {
    width: 70,
    height: 90,
    borderRadius: 3,
    marginRight: 15,
  },
  idCardInfo: {
    justifyContent: 'center',
    flex: 1,
  },
  idCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  idCardId: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  idCardDept: {
    fontSize: 12,
    color: '#334155',
  },
  idCardProgram: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
  },
  idCardFooter: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  barcodeArea: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    alignItems: 'center',
    marginBottom: 5,
    borderRadius: 3,
  },
  barcode: {
    width: '100%',
    height: 40,
  },
  barcodeText: {
    fontFamily: 'monospace',
    fontSize: 14,
    letterSpacing: 2,
  },
  idCardFooterText: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },
}); 