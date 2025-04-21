import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  postedBy: string;
  priority: 'high' | 'medium' | 'low';
  imageUrl?: string;
  author?: string;
}

export default function NewsDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnnouncementDetail();
  }, [id]);

  const fetchAnnouncementDetail = async () => {
    if (!id) {
      setError('Announcement ID not provided');
      setLoading(false);
      return;
    }

    try {
      const db = getFirestore();
      const docRef = doc(db, 'announcements', id as string);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setAnnouncement({
          id: docSnap.id,
          ...docSnap.data() as Omit<Announcement, 'id'>
        });
      } else {
        // For demo purposes, use mock data
        const mockAnnouncement = getMockAnnouncement(id as string);
        if (mockAnnouncement) {
          setAnnouncement(mockAnnouncement);
        } else {
          setError('Announcement not found');
        }
      }
    } catch (err) {
      console.error('Error fetching announcement:', err);
      setError('Failed to load announcement');
    } finally {
      setLoading(false);
    }
  };

  const getMockAnnouncement = (announcementId: string): Announcement | null => {
    const mockAnnouncements: Announcement[] = [
      {
        id: '1',
        title: 'Semester Registration Open',
        content: 'Registration for the new semester is now open for all continuing students. All students must register before the deadline on September 1st.\n\nRegistration can be completed through the Student Portal. Please ensure that you have cleared any outstanding balances and have met all academic requirements before attempting to register.\n\nPlease check your eligibility status in the student portal and contact your academic advisor if you encounter any issues during the registration process.\n\nNote that late registration will incur additional fees, so we encourage everyone to complete this process well before the deadline.',
        date: '2023-08-10T09:00:00Z',
        postedBy: 'Academic Office',
        priority: 'high',
        imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2000'
      },
      {
        id: '2',
        title: 'Library Hours Extended',
        content: 'The university library will have extended hours during the exam period to support student studies and research needs.\n\nStarting from October 15th through November 10th, the library will remain open until midnight on weekdays and until 10 PM on weekends.\n\nStudy rooms can be reserved up to one week in advance through the library\'s online booking system.\n\nPlease remember to bring your student ID card for access during extended hours and maintain a quiet environment for the benefit of all students.',
        date: '2023-08-08T11:30:00Z',
        postedBy: 'Library Services',
        priority: 'medium'
      },
      {
        id: '3',
        title: 'Campus Wi-Fi Upgrade',
        content: 'IT Services will be upgrading the campus Wi-Fi network this weekend to improve connectivity and network speed across all university buildings.\n\nDuring the upgrade, expect intermittent connectivity issues between 10 PM Saturday and 6 AM Sunday.\n\nThis upgrade will double the network capacity and provide better coverage in previously problematic areas such as the basement of the Science Building and the outdoor areas near the Student Center.\n\nAfter the upgrade, you will need to reconnect to the network using your existing credentials. If you experience any issues after the upgrade, please contact the IT Help Desk.',
        date: '2023-08-05T16:45:00Z',
        postedBy: 'IT Department',
        priority: 'low'
      },
      {
        id: '4',
        title: 'Student Achievement Awards',
        content: 'Nominations for the annual Student Achievement Awards are now open. These awards recognize outstanding academic and extracurricular achievements by students in all faculties.\n\nCategories include:\n- Academic Excellence\n- Research Innovation\n- Community Service\n- Leadership\n- Arts and Culture\n- Sports Achievement\n\nSubmit your nominations by September 15th through the Awards Portal. Each nomination should include a brief statement (max 500 words) explaining why the nominee deserves recognition.\n\nThe awards ceremony will be held on October 20th in the University Grand Hall.',
        date: '2023-08-01T08:15:00Z',
        postedBy: 'Student Affairs',
        priority: 'medium',
        imageUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=2000'
      }
    ];
    
    return mockAnnouncements.find(a => a.id === announcementId) || null;
  };

  const formatDate = (dateString: any): string => {
    try {
      // 处理Firestore Timestamp类型
      if (dateString && dateString.toDate && typeof dateString.toDate === 'function') {
        const date = dateString.toDate();
        return date.toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        });
      }
      
      // 处理日期字符串或时间戳
      if (dateString) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          });
        }
      }
      
      return 'Unknown date';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown date';
    }
  };

  const getPriorityLabel = (priority: Announcement['priority']): string => {
    switch (priority) {
      case 'high':
        return 'Urgent';
      case 'medium':
        return 'Important';
      case 'low':
        return 'Info';
      default:
        return 'Info';
    }
  };

  const getPriorityColor = (priority: Announcement['priority']): string => {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#64748B';
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
          <Text style={styles.headerTitle}>Announcement</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading announcement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !announcement) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Announcement</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={50} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Announcement not found'}</Text>
          <TouchableOpacity 
            style={styles.backToNewsButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToNewsText}>Back to News</Text>
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
        <Text style={styles.headerTitle}>Announcement</Text>
        <View style={styles.headerPlaceholder} />
      </View>
      
      <ScrollView style={styles.content}>
        {announcement.imageUrl && (
          <Image 
            source={{ uri: announcement.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{announcement.title}</Text>
          
          <View style={styles.metaContainer}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(announcement.priority) }]}>
              <Text style={styles.priorityText}>{getPriorityLabel(announcement.priority)}</Text>
            </View>
            
            <Text style={styles.dateText}>
              {formatDate(announcement.date)}
            </Text>
          </View>
          
          <Text style={styles.authorText}>
            Posted by: {announcement.postedBy || announcement.author || 'Admin'}
          </Text>
          
          <Text style={styles.contentText}>{announcement.content}</Text>
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
  backToNewsButton: {
    backgroundColor: '#1E40AF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backToNewsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  contentContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 14,
    color: '#64748B',
  },
  authorText: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#334155',
  },
}); 