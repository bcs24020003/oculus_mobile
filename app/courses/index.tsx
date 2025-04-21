import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Image,
  FlatList
} from 'react-native';
import { Link, Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { SafeAreaView as SafeAreaViewContext } from 'react-native-safe-area-context';

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
  status: 'open' | 'closed' | 'full';
  imageUrl?: string;
  courseCategory?: 'core' | 'common-core' | 'mpu' | 'ucs' | 'elective';
}

export default function CoursesScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    handleFiltering();
  }, [searchQuery, activeCategoryFilter, courses]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        setError("Please log in to view courses");
        setLoading(false);
        return;
      }

      const db = getFirestore();
      const q = query(collection(db, "courses"), orderBy("courseCode"));
      const querySnapshot = await getDocs(q);
      
      const coursesData: Course[] = [];
      querySnapshot.forEach((doc) => {
        const courseData = doc.data();
        coursesData.push({ 
          id: doc.id, 
          code: courseData.courseCode || courseData.code || "",
          name: courseData.courseName || courseData.name || "", 
          description: courseData.description || "",
          credits: courseData.credits || 0,
          faculty: courseData.department || courseData.faculty || "",
          level: courseData.level || "",
          instructor: courseData.instructor || "",
          term: courseData.semester || courseData.term || "",
          status: courseData.status || "open",
          imageUrl: courseData.imageUrl || undefined,
          courseCategory: courseData.courseCategory || undefined
        });
      });
      
      setCourses(coursesData);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Failed to load courses. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleFiltering = () => {
    let filtered = [...courses];
    
    // Apply category filter if selected
    if (activeCategoryFilter) {
      filtered = filtered.filter(course => course.courseCategory === activeCategoryFilter);
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        course => 
          course.code.toLowerCase().includes(query) ||
          course.name.toLowerCase().includes(query) ||
          course.instructor.toLowerCase().includes(query)
      );
    }
    
    setFilteredCourses(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const getStatusColor = (status: Course['status']): string => {
    switch (status) {
      case 'open':
        return '#10B981'; // Green
      case 'closed':
        return '#EF4444'; // Red
      case 'full':
        return '#F59E0B'; // Amber
      default:
        return '#64748B'; // Slate
    }
  };

  // 获取课程类别显示名称
  const getCategoryDisplayName = (category: string | undefined): string => {
    switch (category) {
      case 'core': return 'Core';
      case 'common-core': return 'Common Core';
      case 'mpu': return 'MPU';
      case 'ucs': return 'UCS';
      case 'elective': return 'Elective';
      default: return 'Other';
    }
  };
  
  // 获取课程类别数量
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
  
  // 获取课程类别徽章样式
  const getCategoryBadgeStyle = (category: string | undefined): any => {
    switch (category) {
      case 'core': return { backgroundColor: '#0891B2' }; // 青色
      case 'common-core': return { backgroundColor: '#9333EA' }; // 紫色
      case 'mpu': return { backgroundColor: '#16A34A' }; // 绿色
      case 'ucs': return { backgroundColor: '#D97706' }; // 橙色
      case 'elective': return { backgroundColor: '#DC2626' }; // 红色
      default: return { backgroundColor: '#64748B' }; // 灰色
    }
  };

  const renderCourseItem = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={() => router.push(`/courses/${item.id}` as any)}
    >
      <View style={styles.courseInfo}>
        <View style={styles.courseInfoTop}>
          <View style={styles.courseCodeContainer}>
            <Text style={styles.courseCode}>{item.code}</Text>
          </View>
          {item.courseCategory && (
            <View style={[styles.categoryBadge, getCategoryBadgeStyle(item.courseCategory)]}>
              <Text style={styles.categoryText} numberOfLines={1}>
                {getCategoryDisplayName(item.courseCategory)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.courseName}>{item.name}</Text>
        <Text style={styles.courseDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.courseDetails}>
          <View style={styles.detailsLeft}>
            <FontAwesome name="user" size={12} color="#64748B" style={styles.instructorIcon} />
            <Text style={styles.instructor}>{item.instructor}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaViewContext style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Header */}
      <View style={styles.header}>
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
        <Text style={styles.headerTitle}>Courses</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.contentTitle}>Available Courses</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#64748B"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
              <FontAwesome name="times-circle" size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Course Category Filter */}
        <View style={styles.filterContainer}>
          <ScrollView 
            contentContainerStyle={styles.filtersRow}
            showsHorizontalScrollIndicator={false}
          >
            <TouchableOpacity
              style={[
                styles.categoryButton,
                activeCategoryFilter === null && styles.categoryButtonActive
              ]}
              onPress={() => setActiveCategoryFilter(null)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  activeCategoryFilter === null && styles.categoryButtonTextActive
                ]}
              >
                All ({categoryCounts.total})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.categoryButton,
                activeCategoryFilter === 'core' && styles.categoryButtonActive,
                styles.coreBorder
              ]}
              onPress={() => setActiveCategoryFilter(activeCategoryFilter === 'core' ? null : 'core')}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  activeCategoryFilter === 'core' && styles.categoryButtonTextActive
                ]}
              >
                Core ({categoryCounts.core})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.categoryButton,
                activeCategoryFilter === 'common-core' && styles.categoryButtonActive,
                styles.commonCoreBorder
              ]}
              onPress={() => setActiveCategoryFilter(activeCategoryFilter === 'common-core' ? null : 'common-core')}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  activeCategoryFilter === 'common-core' && styles.categoryButtonTextActive
                ]}
              >
                Common Core ({categoryCounts['common-core']})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.categoryButton,
                activeCategoryFilter === 'mpu' && styles.categoryButtonActive,
                styles.mpuBorder
              ]}
              onPress={() => setActiveCategoryFilter(activeCategoryFilter === 'mpu' ? null : 'mpu')}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  activeCategoryFilter === 'mpu' && styles.categoryButtonTextActive
                ]}
              >
                MPU ({categoryCounts.mpu})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.categoryButton,
                activeCategoryFilter === 'ucs' && styles.categoryButtonActive,
                styles.ucsBorder
              ]}
              onPress={() => setActiveCategoryFilter(activeCategoryFilter === 'ucs' ? null : 'ucs')}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  activeCategoryFilter === 'ucs' && styles.categoryButtonTextActive
                ]}
              >
                UCS ({categoryCounts.ucs})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.categoryButton,
                activeCategoryFilter === 'elective' && styles.categoryButtonActive,
                styles.electiveBorder
              ]}
              onPress={() => setActiveCategoryFilter(activeCategoryFilter === 'elective' ? null : 'elective')}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  activeCategoryFilter === 'elective' && styles.categoryButtonTextActive
                ]}
              >
                Elective ({categoryCounts.elective})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Filter Stats */}
        {activeCategoryFilter && (
          <View style={styles.filterStatContainer}>
            <View style={styles.filterStatContent}>
              <Text style={styles.filterStatText}>
                {`${getCategoryDisplayName(activeCategoryFilter)} Courses: ${filteredCourses.length}`}
              </Text>
              
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => setActiveCategoryFilter(null)}
              >
                <Text style={styles.clearFilterText}>Clear Filter</Text>
                <FontAwesome name="times" size={14} color="#1E40AF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Courses List */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.loaderText}>Loading courses...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCourses}
            keyExtractor={(item) => item.id}
            renderItem={renderCourseItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesome name="book" size={50} color="#CBD5E1" />
                <Text style={styles.emptyText}>No courses found</Text>
              </View>
            }
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        )}
      </View>
    </SafeAreaViewContext>
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
    paddingHorizontal: 20,
    paddingTop: 20,
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
  contentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  clearButton: {
    padding: 5,
  },
  listContent: {
    paddingBottom: 20,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  courseInfo: {
    padding: 10,
  },
  courseInfoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  courseCodeContainer: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  courseCode: {
    fontWeight: '600',
    color: '#1E40AF',
    fontSize: 12,
  },
  courseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 3,
  },
  courseDescription: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  courseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  detailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructorIcon: {
    marginRight: 5,
  },
  instructor: {
    fontSize: 12,
    color: '#64748B',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 10,
  },
  filterContainer: {
    marginBottom: 10,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 0,
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    maxWidth: 100,
    alignSelf: 'flex-start',
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 70,
  },
  categoryButtonActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 90,
    elevation: 3,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginBottom: 12,
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