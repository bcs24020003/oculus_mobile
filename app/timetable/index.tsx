import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, doc, getDoc, orderBy } from 'firebase/firestore';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

interface ClassSession {
  id: string;
  subjectCode: string;
  subjectName: string;
  roomNumber: string;
  buildingName: string;
  startTime: string;
  endTime: string;
  lecturerName: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  type: 'Lecture' | 'Tutorial' | 'Lab' | 'Workshop';
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetableScreen() {
  const insets = useSafeAreaInsets();
  const [timetable, setTimetable] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay();
    // Map JS day (0 = Sunday) to our day names (0 = Monday)
    const dayIndex = today === 0 ? 4 : today - 1;
    return DAYS_OF_WEEK[dayIndex] || 'Monday';
  });

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    if (refreshing) return;
    setLoading(true);
    setError('');
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('Please login to view your timetable');
        setLoading(false);
        return;
      }
      
      const db = getFirestore();
      
      // First get the current user's student information
      const studentDoc = await getDoc(doc(db, 'students', currentUser.uid));
      if (!studentDoc.exists()) {
        console.log('No student record found for this user');
        setError('Student record not found. Please contact administrator');
        setLoading(false);
        return;
      }
      
      // Get all timetable data - using a simpler query to avoid composite index issues
      const schedulesRef = collection(db, 'schedules');
      // Query all schedules and filter client-side to avoid composite index requirement
      const scheduleQuery = query(schedulesRef);
      const schedulesSnapshot = await getDocs(scheduleQuery);
      
      if (schedulesSnapshot.empty) {
        console.log('No schedules found in the database');
        setError('No class schedule data available at this time');
        setLoading(false);
        return;
      }
      
      // Process timetable data
      const fetchedClasses: ClassSession[] = [];
      schedulesSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Only include courses where the student is enrolled
        if (!data.students || !Array.isArray(data.students) || !data.students.includes(currentUser.uid)) {
          return; // Skip courses where student is not enrolled
        }
        
        // Check completeness of course information
        if (!data.courseCode || !data.courseName || !data.day) {
          console.warn('Incomplete schedule data found for document:', doc.id);
          return; // Skip incomplete data
        }
        
        // Parse room and building information
        let roomNumber = '';
        let buildingName = '';
        
        if (data.room) {
          const roomParts = data.room.split(', Room ');
          if (roomParts.length > 1) {
            buildingName = roomParts[0];
            roomNumber = roomParts[1];
          } else {
            // If format doesn't match, use the entire string as room number
            roomNumber = data.room;
          }
        }
        
        fetchedClasses.push({
          id: doc.id,
          subjectCode: data.courseCode,
          subjectName: data.courseName,
          roomNumber: roomNumber,
          buildingName: buildingName,
          startTime: data.startTime || '00:00',
          endTime: data.endTime || '00:00',
          lecturerName: data.lecturer || 'TBA',
          day: data.day,
          type: determineClassType(data.type || '', data.courseCode)
        });
      });
      
      // Sort the classes by day and then by start time
      fetchedClasses.sort((a, b) => {
        // First sort by day using the order in DAYS_OF_WEEK
        const dayA = DAYS_OF_WEEK.indexOf(a.day);
        const dayB = DAYS_OF_WEEK.indexOf(b.day);
        if (dayA !== dayB) return dayA - dayB;
        
        // Then sort by start time
        return a.startTime.localeCompare(b.startTime);
      });
      
      if (fetchedClasses.length === 0) {
        setError('No courses have been assigned to you. Please contact your administrator');
      } else {
        setTimetable(fetchedClasses);
      }
    } catch (err) {
      console.error('Error fetching timetable:', err);
      setError('Failed to load timetable. Please try again later');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTimetable();
  };

  // Determine class type based on type and code
  const determineClassType = (type: string, courseCode: string): ClassSession['type'] => {
    // First check the type field
    if (type) {
      const normalizedType = type.toLowerCase();
      if (normalizedType.includes('lecture')) return 'Lecture';
      if (normalizedType.includes('tutorial')) return 'Tutorial';
      if (normalizedType.includes('lab')) return 'Lab';
      if (normalizedType.includes('workshop')) return 'Workshop';
    }
    
    // If type field doesn't exist or no match, try to infer from course code
    if (courseCode) {
      const normalizedCode = courseCode.toUpperCase();
      if (normalizedCode.includes('LAB')) return 'Lab';
      if (normalizedCode.includes('TUT')) return 'Tutorial';
      if (normalizedCode.includes('WORK')) return 'Workshop';
      if (normalizedCode.includes('LEC')) return 'Lecture';
    }
    
    // Default to Lecture
    return 'Lecture';
  };

  const getClassTypeColor = (type: ClassSession['type']): string => {
    switch (type) {
      case 'Lecture':
        return '#3B82F6'; // Blue
      case 'Tutorial':
        return '#10B981'; // Green
      case 'Lab':
        return '#F59E0B'; // Amber
      case 'Workshop':
        return '#8B5CF6'; // Purple
      default:
        return '#64748B'; // Gray
    }
  };

  const getClassTypeIcon = (type: ClassSession['type']) => {
    switch (type) {
      case 'Lecture':
        return 'book' as const;
      case 'Tutorial':
        return 'users' as const;
      case 'Lab':
        return 'flask' as const;
      case 'Workshop':
        return 'wrench' as const;
      default:
        return 'calendar' as const;
    }
  };

  const handleClassPress = (classSession: ClassSession) => {
    Alert.alert(
      `${classSession.subjectCode} - ${classSession.type}`,
      `Subject: ${classSession.subjectName}\nLocation: ${classSession.buildingName ? `${classSession.buildingName}, Room ${classSession.roomNumber}` : `Room ${classSession.roomNumber}`}\nTime: ${classSession.startTime} - ${classSession.endTime}\nLecturer: ${classSession.lecturerName}`,
      [{ text: 'OK' }]
    );
  };

  const filteredClasses = timetable.filter(
    (classSession) => classSession.day === selectedDay
  ).sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={22} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/images/uts-logo-new.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.headerTitle}>Timetable</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading timetable...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left', 'bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/uts-logo-new.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.headerTitle}>Timetable</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <FontAwesome name="refresh" size={20} color="#333" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.daySelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DAYS_OF_WEEK.map((day) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                selectedDay === day && styles.selectedDayButton
              ]}
              onPress={() => setSelectedDay(day)}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  selectedDay === day && styles.selectedDayButtonText
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4F8EF7']}
            tintColor="#4F8EF7"
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F8EF7" />
            <Text style={styles.loadingText}>Loading timetable...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchTimetable}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredClasses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="calendar-o" size={50} color="#64748B" />
            <Text style={styles.emptyText}>No classes scheduled for {selectedDay}</Text>
          </View>
        ) : (
          <View style={styles.classesContainer}>
            {filteredClasses.map((classSession) => (
              <TouchableOpacity
                key={classSession.id}
                style={styles.classCard}
                onPress={() => handleClassPress(classSession)}
              >
                <View 
                  style={[
                    styles.classTypeIndicator, 
                    { backgroundColor: getClassTypeColor(classSession.type) }
                  ]} 
                />
                <View style={styles.classMainInfo}>
                  <View style={styles.classHeaderRow}>
                    <Text style={styles.subjectCode}>{classSession.subjectCode}</Text>
                    <View style={styles.typeContainer}>
                      <FontAwesome 
                        name={getClassTypeIcon(classSession.type)} 
                        size={12} 
                        color={getClassTypeColor(classSession.type)} 
                      />
                      <Text 
                        style={[
                          styles.classType, 
                          { color: getClassTypeColor(classSession.type) }
                        ]}
                      >
                        {classSession.type}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.subjectName} numberOfLines={1}>
                    {classSession.subjectName}
                  </Text>
                  <View style={styles.classDetailsRow}>
                    <View style={styles.detailItem}>
                      <FontAwesome name="clock-o" size={14} color="#64748B" />
                      <Text style={styles.detailText}>
                        {classSession.startTime} - {classSession.endTime}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <FontAwesome name="map-marker" size={14} color="#64748B" />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {classSession.buildingName ? `${classSession.buildingName}, Room ${classSession.roomNumber}` : `Room ${classSession.roomNumber}`}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 10,
    padding: 8,
  },
  logoContainer: {
    marginRight: 15,
  },
  logo: {
    width: 80,
    height: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  refreshButton: {
    padding: 8,
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
  daySelector: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedDayButton: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  selectedDayButtonText: {
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  errorText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 16,
    marginBottom: 16,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  classesContainer: {
    padding: 16,
    paddingBottom: 20, // Reduced padding since we removed the footer
  },
  classCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  classTypeIndicator: {
    width: 6,
  },
  classMainInfo: {
    flex: 1,
    padding: 16,
  },
  classHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subjectCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classType: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  subjectName: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  classDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
}); 