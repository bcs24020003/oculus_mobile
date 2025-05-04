import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  where,
  serverTimestamp,
  addDoc,
  FieldValue,
  Timestamp
} from 'firebase/firestore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  department: string | null;
  credits: number;
  description: string;
  semester: string | null;
  enrollment: number;
  courseCategory?: string;
  createdAt: Timestamp | FieldValue | Date;
  updatedAt: Timestamp | FieldValue | Date;
}

// Function to log admin actions for auditing purposes
const logAdminAction = async (action: string, details: any) => {
  try {
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('No authenticated user found when logging admin action');
      return;
    }
    
    const adminLogData = {
      userId: user.uid,
      userEmail: user.email,
      action,
      details,
      timestamp: serverTimestamp(),
    };
    
    await addDoc(collection(db, 'admin_logs'), adminLogData);
    console.log(`Admin action logged: ${action}`);
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Non-critical error, so we don't alert the user
  }
};

export default function CourseManagement() {
  const insets = useSafeAreaInsets();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Form state
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [department, setDepartment] = useState('');
  const [credits, setCredits] = useState('3');
  const [description, setDescription] = useState('');
  const [semester, setSemester] = useState('');
  const [courseCategory, setCourseCategory] = useState('core');
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    fetchCourses();
  }, []);
  
  useEffect(() => {
    filterCourses();
  }, [searchQuery, courses, activeCategory]);
  
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const coursesCollection = collection(db, 'courses');
      const q = query(coursesCollection, orderBy('courseCode'));
      const coursesSnapshot = await getDocs(q);
      
      const coursesList: Course[] = [];
      coursesSnapshot.forEach((doc) => {
        const courseData = doc.data() as Omit<Course, 'id'>;
        coursesList.push({
          id: doc.id,
          ...courseData,
          enrollment: courseData.enrollment || 0
        });
      });
      
      setCourses(coursesList);
      setFilteredCourses(coursesList);
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Error', 'Failed to load courses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const filterCourses = () => {
    let filtered = [...courses];
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        course => 
          course.courseCode.toLowerCase().includes(query) || 
          course.courseName.toLowerCase().includes(query) || 
          course.description.toLowerCase().includes(query) ||
          course.department?.toLowerCase().includes(query) ||
          course.semester?.toLowerCase().includes(query)
      );
    }
    
    // Apply course category filter
    if (activeCategory) {
      filtered = filtered.filter(course => course.courseCategory === activeCategory);
    }
    
    setFilteredCourses(filtered);
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchCourses();
  };
  
  const openAddModal = () => {
    // Reset form
    setCourseCode('');
    setCourseName('');
    setDepartment('');
    setCredits('3');
    setDescription('');
    setSemester('');
    setCourseCategory('core');
    setEditingCourse(null);
    setModalVisible(true);
  };
  
  const openEditModal = (course: Course) => {
    // Set form values
    setCourseCode(course.courseCode);
    setCourseName(course.courseName);
    setDepartment(course.department || '');
    setCredits(course.credits.toString());
    setDescription(course.description);
    setSemester(course.semester || '');
    setCourseCategory(course.courseCategory || 'core');
    setEditingCourse(course);
    setModalVisible(true);
  };
  
  const resetForm = () => {
    setCourseCode('');
    setCourseName('');
    setDepartment('');
    setCredits('3');
    setDescription('');
    setSemester('');
    setCourseCategory('core');
    setEditingCourse(null);
  };
  
  const validateForm = () => {
    setModalError('');
    
    if (!courseCode.trim()) {
      setModalError('Please enter a course code');
      Alert.alert('Validation Error', 'Please enter a course code');
      return false;
    }
    
    if (!courseName.trim()) {
      setModalError('Please enter a course name');
      Alert.alert('Validation Error', 'Please enter a course name');
      return false;
    }
    
    const creditsValue = parseInt(credits);
    if (isNaN(creditsValue) || creditsValue <= 0) {
      setModalError('Please enter a valid number of credits');
      Alert.alert('Validation Error', 'Please enter a valid number of credits');
      return false;
    }
    
    return true;
  };
  
  const handleSaveCourse = async () => {
    try {
      if (isSaving) return; // 防止重复提交
      setIsSaving(true);
      
      if (!validateForm()) {
        setIsSaving(false);
        return;
      }

      const courseData = {
        courseCode: courseCode.trim(),
        courseName: courseName.trim(),
        department: department.trim() || null,
        credits: parseInt(credits),
        description: description.trim(),
        semester: semester.trim() || null,
        enrollment: editingCourse ? editingCourse.enrollment : 0,
        courseCategory: courseCategory,
        createdAt: editingCourse ? editingCourse.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const db = getFirestore();
      
      if (editingCourse) {
        // Update existing course
        console.log(`Updating course: ${editingCourse.id}`);
        const courseRef = doc(db, 'courses', editingCourse.id);
        await updateDoc(courseRef, courseData);
        console.log(`Course document updated successfully`);
        
        // Log the admin action
        await logAdminAction('update_course', {
          courseId: editingCourse.id,
          courseCode: courseData.courseCode,
          courseName: courseData.courseName
        });
        
        // Update local state with properly typed values
        setCourses(courses.map(course => 
          course.id === editingCourse.id 
            ? { ...course, ...courseData, updatedAt: new Date() } 
            : course
        ));
        
        Alert.alert('Success', 'Course updated successfully');
        console.log(`Course updated: ${editingCourse.id} - ${courseData.courseCode}`);
        
        // Close modal and reset form
        setModalVisible(false);
        resetForm();
      } else {
        // Create new course
        console.log(`Creating new course: ${courseData.courseCode}`);
        const coursesCollection = collection(db, 'courses');
        const newCourseRef = doc(coursesCollection);
        console.log(`New course reference created: ${newCourseRef.id}`);
        
        try {
          await setDoc(newCourseRef, courseData);
          console.log(`New course document created successfully`);
          
          // Log the admin action
          await logAdminAction('create_course', {
            courseId: newCourseRef.id,
            courseCode: courseData.courseCode,
            courseName: courseData.courseName
          });
          
          // Update local state with properly typed values for UI
          const newCourse: Course = {
            id: newCourseRef.id,
            ...courseData,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          setCourses([...courses, newCourse].sort((a, b) => 
            a.courseCode.localeCompare(b.courseCode)
          ));
          
          console.log(`New course created: ${newCourseRef.id} - ${courseData.courseCode}`);
          Alert.alert('Success', `Course "${courseData.courseCode}" successfully created and uploaded to Firebase.`);
          
          // Close modal and reset form
          setModalVisible(false);
          resetForm();
        } catch (innerError) {
          console.error('Error creating course document:', innerError);
          Alert.alert('Error', `Failed to create course document: ${innerError instanceof Error ? innerError.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error saving course:', error);
      Alert.alert('Error', `Failed to save course: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteCourse = (courseId: string, courseName: string) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete ${courseName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const db = getFirestore();
              await deleteDoc(doc(db, 'courses', courseId));
              
              // Log the admin action
              await logAdminAction('delete_course', {
                courseId,
                courseName
              });
              
              // Update local state
              setCourses(prev => prev.filter(course => course.id !== courseId));
              Alert.alert('Success', `Course "${courseName}" successfully deleted.`);
              console.log(`Course deleted: ${courseId} - ${courseName}`);
            } catch (error) {
              console.error('Error deleting course:', error);
              Alert.alert('Error', `Failed to delete course: ${error instanceof Error ? error.message : 'Unknown error'}.`);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const renderCourseItem = ({ item }: { item: Course }) => (
    <View style={styles.courseItem}>
      <View style={styles.courseHeader}>
        <View style={styles.courseHeaderInfo}>
          <Text style={styles.courseCode}>{item.courseCode}</Text>
        </View>
        <Text style={styles.courseName}>{item.courseName}</Text>
      </View>
      
      <View style={styles.courseDetails}>
        <Text style={styles.courseDescription} numberOfLines={2}>
          {item.description || 'No description available'}
        </Text>
        
        <View style={styles.divider} />
        
        <View style={styles.courseInfo}>
          <View style={styles.infoItem}>
            <FontAwesome name="graduation-cap" size={14} color="#64748B" />
            <Text style={styles.infoText}>{item.credits} credits</Text>
          </View>
          
          {item.department && (
            <View style={styles.infoItem}>
              <FontAwesome name="building" size={14} color="#64748B" />
              <Text style={styles.infoText}>{item.department}</Text>
            </View>
          )}
          
          <View style={styles.infoItem}>
            <FontAwesome name="users" size={14} color="#64748B" />
            <Text style={styles.infoText}>{item.enrollment} students</Text>
          </View>
        </View>

        <View style={styles.tagContainer}>
          {item.semester && (
            <View style={styles.semesterBadge}>
              <Text style={styles.semesterText}>{item.semester}</Text>
            </View>
          )}
          
          {item.courseCategory && (
            <View style={[styles.categoryBadge, getCategoryBadgeStyle(item.courseCategory)]}>
              <Text style={styles.categoryText}>
                {getCategoryDisplayName(item.courseCategory)}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <FontAwesome name="pencil" size={16} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteCourse(item.id, item.courseName)}
        >
          <FontAwesome name="trash" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Get display name based on course category
  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'core': return 'Core';
      case 'common-core': return 'Common Core';
      case 'mpu': return 'MPU';
      case 'ucs': return 'UCS';
      case 'elective': return 'Elective';
      default: return category;
    }
  };
  
  // Get badge style based on course category
  const getCategoryBadgeStyle = (category: string) => {
    switch (category) {
      case 'core': return styles.coreBadge;
      case 'common-core': return styles.commonCoreBadge;
      case 'mpu': return styles.mpuBadge;
      case 'ucs': return styles.ucsBadge;
      case 'elective': return styles.electiveBadge;
      default: return {};
    }
  };
  
  // Calculate the number of courses in each category
  const getCategoryCounts = () => {
    const counts = {
      core: 0,
      'common-core': 0,
      mpu: 0,
      ucs: 0,
      elective: 0,
      total: courses.length
    };
    
    courses.forEach(course => {
      if (course.courseCategory) {
        counts[course.courseCategory as keyof typeof counts] = 
          (counts[course.courseCategory as keyof typeof counts] || 0) + 1;
      }
    });
    
    return counts;
  };
  
  const categoryCounts = getCategoryCounts();
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Course Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
        >
          <FontAwesome name="plus" size={20} color="#1E40AF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={() => setSearchQuery('')}
          >
            <FontAwesome name="times-circle" size={16} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.categoryFilter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.categoryButton,
              activeCategory === null && styles.activeCategoryButton
            ]}
            onPress={() => setActiveCategory(null)}
          >
            <Text style={[
              styles.categoryButtonText,
              activeCategory === null && styles.activeCategoryButtonText
            ]}>
              All ({categoryCounts.total})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.categoryButton,
              activeCategory === 'core' && styles.activeCategoryButton,
              styles.coreBorder
            ]}
            onPress={() => setActiveCategory('core')}
          >
            <Text style={[
              styles.categoryButtonText,
              activeCategory === 'core' && styles.activeCategoryButtonText
            ]}>
              Core ({categoryCounts.core})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.categoryButton,
              activeCategory === 'common-core' && styles.activeCategoryButton,
              styles.commonCoreBorder
            ]}
            onPress={() => setActiveCategory('common-core')}
          >
            <Text style={[
              styles.categoryButtonText,
              activeCategory === 'common-core' && styles.activeCategoryButtonText
            ]}>
              Common Core ({categoryCounts['common-core']})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.categoryButton,
              activeCategory === 'mpu' && styles.activeCategoryButton,
              styles.mpuBorder
            ]}
            onPress={() => setActiveCategory('mpu')}
          >
            <Text style={[
              styles.categoryButtonText,
              activeCategory === 'mpu' && styles.activeCategoryButtonText
            ]}>
              MPU ({categoryCounts.mpu})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.categoryButton,
              activeCategory === 'ucs' && styles.activeCategoryButton,
              styles.ucsBorder
            ]}
            onPress={() => setActiveCategory('ucs')}
          >
            <Text style={[
              styles.categoryButtonText,
              activeCategory === 'ucs' && styles.activeCategoryButtonText
            ]}>
              UCS ({categoryCounts.ucs})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.categoryButton,
              activeCategory === 'elective' && styles.activeCategoryButton,
              styles.electiveBorder
            ]}
            onPress={() => setActiveCategory('elective')}
          >
            <Text style={[
              styles.categoryButtonText,
              activeCategory === 'elective' && styles.activeCategoryButtonText
            ]}>
              Elective ({categoryCounts.elective})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      ) : (
        <>
          <View style={styles.filterStatContainer}>
            <View style={styles.filterStatContent}>
              <Text style={styles.filterStatText}>
                {activeCategory 
                  ? `${getCategoryDisplayName(activeCategory)} Courses: ${filteredCourses.length}` 
                  : `All Courses: ${filteredCourses.length}`
                }
              </Text>
              
              {activeCategory && (
                <TouchableOpacity
                  style={styles.clearFilterButton}
                  onPress={() => setActiveCategory(null)}
                >
                  <Text style={styles.clearFilterText}>Clear Filter</Text>
                  <FontAwesome name="times" size={14} color="#1E40AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <FlatList
            data={filteredCourses}
            renderItem={renderCourseItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesome name="book" size={60} color="#94A3B8" />
                <Text style={styles.emptyText}>No courses found</Text>
                {searchQuery && (
                  <Text style={styles.emptySubtext}>
                    Try adjusting your search criteria or filters
                  </Text>
                )}
                {activeCategory && !searchQuery && (
                  <Text style={styles.emptySubtext}>
                    No {getCategoryDisplayName(activeCategory)} courses available
                  </Text>
                )}
                {!searchQuery && !activeCategory && (
                  <Text style={styles.emptySubtext}>
                    Click the "+" button to add courses
                  </Text>
                )}
              </View>
            }
          />
        </>
      )}
      
      {/* Add/Edit Course Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <FontAwesome name="times" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            {modalError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{modalError}</Text>
              </View>
            ) : null}
            
            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Course Code</Text>
                <TextInput
                  style={styles.input}
                  value={courseCode}
                  onChangeText={setCourseCode}
                  placeholder="e.g., CS101"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Course Name</Text>
                <TextInput
                  style={styles.input}
                  value={courseName}
                  onChangeText={setCourseName}
                  placeholder="e.g., Introduction to Computer Science"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Department</Text>
                <TextInput
                  style={styles.input}
                  value={department}
                  onChangeText={setDepartment}
                  placeholder="e.g., Computer Science (Optional)"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Credits</Text>
                <TextInput
                  style={styles.input}
                  value={credits}
                  onChangeText={setCredits}
                  placeholder="e.g., 3"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Semester</Text>
                <TextInput
                  style={styles.input}
                  value={semester}
                  onChangeText={setSemester}
                  placeholder="e.g., Fall 2023 (Optional)"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Course Category</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={courseCategory}
                    onValueChange={(itemValue: string) => setCourseCategory(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Core Course" value="core" />
                    <Picker.Item label="Common Core Course" value="common-core" />
                    <Picker.Item label="MPU" value="mpu" />
                    <Picker.Item label="UCS Course" value="ucs" />
                    <Picker.Item label="Elective Course" value="elective" />
                  </Picker>
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter course description"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => {
                  if (!isSaving) {
                    setModalVisible(false);
                    resetForm();
                    setModalError('');
                  }
                }}
                disabled={isSaving}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton, isSaving && styles.disabledButton]} 
                onPress={handleSaveCourse}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  backButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1E293B',
  },
  clearButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  courseItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  courseHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  courseHeaderInfo: {
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  courseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 4,
  },
  courseDetails: {
    padding: 16,
  },
  courseDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  courseInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    maxHeight: 500,
  },
  formGroup: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1E293B',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1E40AF',
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  saveButton: {
    backgroundColor: '#1E40AF',
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
  },
  tagContainer: {
    flexDirection: 'row',
    marginTop: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  semesterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#2563EB',
  },
  semesterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  coreBadge: {
    backgroundColor: '#0891B2', // 青色
  },
  commonCoreBadge: {
    backgroundColor: '#9333EA', // 紫色
  },
  mpuBadge: {
    backgroundColor: '#16A34A', // 绿色
  },
  ucsBadge: {
    backgroundColor: '#D97706', // 橙色
  },
  electiveBadge: {
    backgroundColor: '#DC2626', // 红色
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#F8FAFC',
  },
  picker: {
    height: 50,
    width: '100%',
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
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  categoryFilter: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeCategoryButton: {
    backgroundColor: '#1E40AF',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeCategoryButtonText: {
    color: '#FFFFFF',
  },
  coreBorder: {
    borderColor: '#0891B2',
  },
  commonCoreBorder: {
    borderColor: '#9333EA',
  },
  mpuBorder: {
    borderColor: '#16A34A',
  },
  ucsBorder: {
    borderColor: '#D97706',
  },
  electiveBorder: {
    borderColor: '#DC2626',
  },
  filterStatContainer: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterStatContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterStatText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E40AF',
    marginRight: 4,
  },
}); 