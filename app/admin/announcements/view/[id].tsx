import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  Alert,
  Share
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { 
  getFirestore, 
  doc, 
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: any;
  priority: 'high' | 'medium' | 'low';
  createdBy: string;
}

export default function AnnouncementDetails() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncementDetails();
  }, [id]);

  const fetchAnnouncementDetails = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const announcementDoc = await getDoc(doc(db, 'announcements', id as string));
      
      if (announcementDoc.exists()) {
        const data = announcementDoc.data() as Omit<Announcement, 'id'>;
        setAnnouncement({
          id: announcementDoc.id,
          ...data
        });
      } else {
        Alert.alert('Error', 'Announcement not found.');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching announcement details:', error);
      Alert.alert('Error', 'Failed to load announcement details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = () => {
    if (!announcement) return;
    
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete "${announcement.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const db = getFirestore();
              await deleteDoc(doc(db, 'announcements', announcement.id));
              Alert.alert('Success', 'Announcement has been deleted successfully.', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Error deleting announcement:', error);
              setLoading(false);
              Alert.alert('Error', 'Failed to delete announcement.');
            }
          }
        }
      ]
    );
  };

  const handleShareAnnouncement = async () => {
    if (!announcement) return;
    
    try {
      await Share.share({
        title: announcement.title,
        message: `${announcement.title}\n\n${announcement.content}\n\nBy ${announcement.author}`
      });
    } catch (error) {
      console.error('Error sharing announcement:', error);
    }
  };

  const renderPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    let badgeStyle;
    let textColor;
    let title;
    
    switch (priority) {
      case 'high':
        badgeStyle = styles.highPriorityBadge;
        textColor = '#9F1239';
        title = 'High';
        break;
      case 'medium':
        badgeStyle = styles.mediumPriorityBadge;
        textColor = '#92400E';
        title = 'Medium';
        break;
      case 'low':
        badgeStyle = styles.lowPriorityBadge;
        textColor = '#065F46';
        title = 'Low';
        break;
      default:
        badgeStyle = styles.mediumPriorityBadge;
        textColor = '#92400E';
        title = 'Medium';
    }
    
    return (
      <View style={[styles.priorityBadge, badgeStyle]}>
        <Text style={[styles.priorityText, { color: textColor }]}>
          {title}
        </Text>
      </View>
    );
  };

  const formatDate = (timestamp: any) => {
    try {
      if (!timestamp) return 'Unknown date';
      
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
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
          <Text style={styles.headerTitle}>Announcement Details</Text>
          <View style={styles.placeholderRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading announcement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!announcement) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Announcement Details</Text>
          <View style={styles.placeholderRight} />
        </View>
        
        <View style={styles.emptyContainer}>
          <FontAwesome name="exclamation-circle" size={60} color="#94A3B8" />
          <Text style={styles.emptyText}>Announcement Not Found</Text>
          <Text style={styles.emptySubtext}>This announcement may have been deleted or is not accessible</Text>
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
        <Text style={styles.headerTitle}>Announcement Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleShareAnnouncement}
          >
            <FontAwesome name="share-alt" size={18} color="#1E40AF" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.announcementHeader}>
          <Text style={styles.announcementTitle}>{announcement.title}</Text>
          <View style={styles.metadataContainer}>
            {renderPriorityBadge(announcement.priority)}
            <Text style={styles.dateText}>{formatDate(announcement.date)}</Text>
          </View>
          <Text style={styles.authorText}>By: {announcement.author}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <Text style={styles.contentText}>{announcement.content}</Text>
      </ScrollView>
      
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => router.push(`/admin/announcements/edit/${announcement.id}`)}
        >
          <FontAwesome name="pencil" size={18} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDeleteAnnouncement}
        >
          <FontAwesome name="trash" size={18} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
  },
  placeholderRight: {
    width: 36,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  announcementHeader: {
    marginBottom: 20,
  },
  announcementTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorText: {
    fontSize: 14,
    color: '#64748B',
  },
  dateText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 10,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  highPriorityBadge: {
    backgroundColor: '#FEE2E2',
  },
  mediumPriorityBadge: {
    backgroundColor: '#FEF3C7',
  },
  lowPriorityBadge: {
    backgroundColor: '#D1FAE5',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#334155',
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 