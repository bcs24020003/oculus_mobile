import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Image
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  faculty: string;
  level: string;
  instructor: string;
  term: string;
  status: 'Active' | 'Completed' | 'Upcoming';
  objectives?: string[];
  prerequisites?: string[];
  assessments?: {
    type: string;
    weight: number;
    description: string;
  }[];
  imageUrl?: string;
}

export default function CourseDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCourseDetail();
  }, [id]);

  const fetchCourseDetail = async () => {
    if (!id) {
      setError('Course ID not provided');
      setLoading(false);
      return;
    }

    try {
      const db = getFirestore();
      const docRef = doc(db, 'courses', id as string);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const courseData = docSnap.data();
        setCourse({
          id: docSnap.id,
          code: courseData.courseCode || courseData.code || "",
          name: courseData.courseName || courseData.name || "",
          description: courseData.description || "",
          credits: courseData.credits || 0,
          faculty: courseData.department || courseData.faculty || "",
          level: courseData.level || "",
          instructor: courseData.instructor || "",
          term: courseData.semester || courseData.term || "",
          status: mapCourseStatus(courseData.status || "open"),
          objectives: courseData.objectives || [],
          prerequisites: courseData.prerequisites || [],
          assessments: courseData.assessments || [],
          imageUrl: courseData.imageUrl || undefined
        });
      } else {
        // For demo purposes, use mock data
        const mockCourse = getMockCourse(id as string);
        if (mockCourse) {
          setCourse(mockCourse);
        } else {
          setError('Course not found');
        }
      }
    } catch (err) {
      console.error('Error fetching course:', err);
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to map admin course status to user interface status
  const mapCourseStatus = (status: string): 'Active' | 'Completed' | 'Upcoming' => {
    switch (status) {
      case 'open':
        return 'Active';
      case 'closed':
        return 'Completed';
      case 'full':
        return 'Upcoming';
      default:
        return 'Active';
    }
  };

  const getMockCourse = (courseId: string): Course | null => {
    const mockCourses: Course[] = [
      {
        id: '1',
        code: 'COMP1511',
        name: 'Introduction to Programming',
        description: 'This course introduces the fundamental concepts of procedural programming. Topics include data types, control structures, functions, arrays, pointers, and an introduction to the principles of object-oriented programming.',
        credits: 6,
        faculty: 'Science',
        level: 'Year 1',
        instructor: 'Dr. Smith',
        term: 'Term 1 2023',
        status: 'Active',
        objectives: [
          'Understand fundamental programming constructs',
          'Design and implement algorithms to solve problems',
          'Write and debug programs in C',
          'Apply structured programming principles'
        ],
        prerequisites: [
          'HSC Mathematics Extension 1',
          'No prior programming experience required'
        ],
        assessments: [
          {
            type: 'Lab Exercises',
            weight: 20,
            description: 'Weekly programming assignments to be completed in lab sessions'
          },
          {
            type: 'Mid-term Test',
            weight: 30,
            description: 'Written examination covering basic programming concepts'
          },
          {
            type: 'Final Project',
            weight: 20,
            description: 'Individual programming project demonstrating mastery of course content'
          },
          {
            type: 'Final Exam',
            weight: 30,
            description: 'Comprehensive exam covering all course material'
          }
        ],
        imageUrl: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=2670&auto=format&fit=crop'
      },
      {
        id: '2',
        code: 'MATH1131',
        name: 'Mathematics 1A',
        description: 'This course covers several topics in single variable calculus and linear algebra. Topics include functions, limits, continuity, differentiation, optimization, integration, sequences, series, vectors, matrices, and linear transformations.',
        credits: 6,
        faculty: 'Science',
        level: 'Year 1',
        instructor: 'Prof. Williams',
        term: 'Term 1 2023',
        status: 'Active',
        objectives: [
          'Understand and apply concepts of limits and continuity',
          'Master differential calculus techniques',
          'Apply integration techniques to solve problems',
          'Understand basic linear algebra concepts'
        ],
        prerequisites: [
          'HSC Mathematics Extension 1',
          'HSC Mathematics Extension 2 (Recommended)'
        ],
        assessments: [
          {
            type: 'Online Quizzes',
            weight: 15,
            description: 'Weekly online assessments covering recent material'
          },
          {
            type: 'Class Tests',
            weight: 25,
            description: 'Two in-class tests throughout the term'
          },
          {
            type: 'Assignments',
            weight: 20,
            description: 'Two written assignments requiring detailed mathematical analysis'
          },
          {
            type: 'Final Exam',
            weight: 40,
            description: 'Comprehensive examination covering all course topics'
          }
        ],
        imageUrl: 'https://images.unsplash.com/photo-1635372722656-389f87a941b7?q=80&w=2670&auto=format&fit=crop'
      },
      {
        id: '3',
        code: 'PHYS1121',
        name: 'Physics 1A',
        description: 'This course introduces the foundational principles of physics, including mechanics, waves, and thermodynamics. Laboratory exercises reinforce theoretical concepts through practical experimentation.',
        credits: 6,
        faculty: 'Science',
        level: 'Year 1',
        instructor: 'Dr. Brown',
        term: 'Term 1 2023',
        status: 'Active',
        objectives: [
          'Understand Newtonian mechanics and applications',
          'Analyze wave phenomena and behavior',
          'Apply principles of thermodynamics',
          'Develop experimental skills through laboratory work'
        ],
        prerequisites: [
          'HSC Physics',
          'HSC Mathematics Extension 1'
        ],
        assessments: [
          {
            type: 'Laboratory Work',
            weight: 25,
            description: 'Weekly experiments with written reports'
          },
          {
            type: 'Mid-term Exam',
            weight: 25,
            description: 'Covers mechanics and basic wave theory'
          },
          {
            type: 'Assignments',
            weight: 15,
            description: 'Problem sets throughout the term'
          },
          {
            type: 'Final Exam',
            weight: 35,
            description: 'Comprehensive examination of all course material'
          }
        ],
        imageUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=2574&auto=format&fit=crop'
      }
    ];
    
    return mockCourses.find(c => c.id === courseId) || null;
  };

  const getStatusColor = (status: Course['status']): string => {
    switch (status) {
      case 'Active':
        return '#3B82F6'; // Blue
      case 'Completed':
        return '#10B981'; // Green
      case 'Upcoming':
        return '#F59E0B'; // Amber
      default:
        return '#64748B'; // Gray
    }
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
          <Text style={styles.headerTitle}>Course Details</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading course details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !course) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Course Details</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={50} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Course not found'}</Text>
          <TouchableOpacity 
            style={styles.backToCoursesButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToCoursesText}>Back to Courses</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Course Details</Text>
        <View style={styles.headerPlaceholder} />
      </View>
      
      <ScrollView style={styles.scrollContainer}>
        {course.imageUrl && (
          <Image
            source={{ uri: course.imageUrl }}
            style={styles.courseImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.contentContainer}>
          <View style={styles.courseHeader}>
            <View style={styles.courseCodeContainer}>
              <Text style={styles.courseCode}>{course.code}</Text>
              <View 
                style={[
                  styles.statusBadge, 
                  { backgroundColor: getStatusColor(course.status) }
                ]}
              >
                <Text style={styles.statusText}>{course.status}</Text>
              </View>
            </View>
            <Text style={styles.courseName}>{course.name}</Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <FontAwesome name="user" size={16} color="#3B82F6" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Instructor</Text>
                  <Text style={styles.infoValue}>{course.instructor}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <FontAwesome name="graduation-cap" size={16} color="#3B82F6" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Level</Text>
                  <Text style={styles.infoValue}>{course.level}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <FontAwesome name="calendar" size={16} color="#3B82F6" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Term</Text>
                  <Text style={styles.infoValue}>{course.term}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <FontAwesome name="building" size={16} color="#3B82F6" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Faculty</Text>
                  <Text style={styles.infoValue}>{course.faculty}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <FontAwesome name="star" size={16} color="#3B82F6" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Credits</Text>
                  <Text style={styles.infoValue}>{course.credits}</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{course.description}</Text>
          </View>
          
          {course.objectives && course.objectives.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Learning Objectives</Text>
              {course.objectives.map((objective, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.listItemText}>{objective}</Text>
                </View>
              ))}
            </View>
          )}
          
          {course.prerequisites && course.prerequisites.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Prerequisites</Text>
              {course.prerequisites.map((prerequisite, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.listItemText}>{prerequisite}</Text>
                </View>
              ))}
            </View>
          )}
          
          {course.assessments && course.assessments.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Assessment</Text>
              {course.assessments.map((assessment, index) => (
                <View key={index} style={styles.assessmentItem}>
                  <View style={styles.assessmentHeader}>
                    <Text style={styles.assessmentType}>{assessment.type}</Text>
                    <Text style={styles.assessmentWeight}>{assessment.weight}%</Text>
                  </View>
                  <Text style={styles.assessmentDescription}>{assessment.description}</Text>
                </View>
              ))}
            </View>
          )}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerPlaceholder: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
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
    marginBottom: 20,
  },
  backToCoursesButton: {
    backgroundColor: '#1E40AF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backToCoursesText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  courseImage: {
    width: '100%',
    height: 200,
  },
  contentContainer: {
    padding: 16,
  },
  courseHeader: {
    marginBottom: 16,
  },
  courseCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  courseName: {
    fontSize: 16,
    color: '#475569',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoTextContainer: {
    marginLeft: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginRight: 8,
    width: 10,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  assessmentItem: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
  },
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assessmentType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  assessmentWeight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  assessmentDescription: {
    fontSize: 13,
    color: '#64748B',
  },
}); 