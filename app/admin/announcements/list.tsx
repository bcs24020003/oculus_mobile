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
  ScrollView
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
  deleteDoc,
  getDoc,
  where
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

export default function AnnouncementsList() {
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    filterAnnouncements();
  }, [searchQuery, filterPriority, announcements]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const announcementsCollection = collection(db, 'announcements');
      const q = query(announcementsCollection, orderBy('date', 'desc'));
      const announcementsSnapshot = await getDocs(q);

      const announcementsList: Announcement[] = [];
      announcementsSnapshot.forEach((doc) => {
        const announcementData = doc.data() as Omit<Announcement, 'id'>;
        announcementsList.push({
          id: doc.id,
          ...announcementData
        });
      });

      setAnnouncements(announcementsList);
      setFilteredAnnouncements(announcementsList);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      Alert.alert('Error', 'Failed to load announcements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterAnnouncements = () => {
    let filtered = [...announcements];

    // Apply priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(announcement => announcement.priority === filterPriority);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        announcement => 
          announcement.title.toLowerCase().includes(query) || 
          announcement.content.toLowerCase().includes(query) || 
          announcement.author.toLowerCase().includes(query)
      );
    }

    setFilteredAnnouncements(filtered);
  };

  const handleDeleteAnnouncement = (announcementId: string, announcementTitle: string) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete "${announcementTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getFirestore();
              await deleteDoc(doc(db, 'announcements', announcementId));
              
              // Update local state
              setAnnouncements(prev => prev.filter(announcement => announcement.id !== announcementId));
              Alert.alert('Success', 'Announcement deleted successfully.');
            } catch (error) {
              console.error('Error deleting announcement:', error);
              Alert.alert('Error', 'Failed to delete announcement.');
            }
          }
        }
      ]
    );
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

  const renderAnnouncementItem = ({ item }: { item: Announcement }) => (
    <View style={styles.announcementCard}>
      <View style={styles.announcementHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.announcementTitle}>{item.title}</Text>
          {renderPriorityBadge(item.priority)}
        </View>
        
        <Text style={styles.authorText}>By {item.author}</Text>
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
      </View>
      
      <View style={styles.announcementContent}>
        <Text style={styles.contentText} numberOfLines={3}>{item.content}</Text>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => router.push(`/admin/announcements/view/${item.id}` as any)}
        >
          <FontAwesome name="eye" size={16} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => router.push(`/admin/announcements/edit/${item.id}`)}
        >
          <FontAwesome name="pencil" size={16} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteAnnouncement(item.id, item.title)}
        >
          <FontAwesome name="trash" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterButton = (
    title: string, 
    priority: 'all' | 'high' | 'medium' | 'low'
  ) => (
    <TouchableOpacity
      style={[styles.filterButton, filterPriority === priority && styles.activeFilterButton]}
      onPress={() => setFilterPriority(priority)}
    >
      <Text 
        style={[styles.filterButtonText, filterPriority === priority && styles.activeFilterButtonText]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Announcements</Text>
          <View style={styles.placeholderRight} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading announcements...</Text>
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
        <Text style={styles.headerTitle}>Announcements</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/admin/announcements/create')}
        >
          <FontAwesome name="plus" size={20} color="#1E40AF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search announcements..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94A3B8"
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
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderFilterButton('All', 'all')}
          {renderFilterButton('High', 'high')}
          {renderFilterButton('Medium', 'medium')}
          {renderFilterButton('Low', 'low')}
        </ScrollView>
      </View>
      
      {filteredAnnouncements.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="bullhorn" size={60} color="#94A3B8" />
          <Text style={styles.emptyText}>No announcements found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAnnouncements}
          renderItem={renderAnnouncementItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}
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
  addButton: {
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
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#1E40AF',
  },
  filterButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  pinnedCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#1E40AF',
  },
  pinnedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#1E40AF',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  announcementHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    marginRight: 24, // Space for pinned badge
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  generalBadge: {
    backgroundColor: '#DBEAFE',
  },
  academicBadge: {
    backgroundColor: '#D1FAE5',
  },
  eventBadge: {
    backgroundColor: '#FEF3C7',
  },
  emergencyBadge: {
    backgroundColor: '#FEE2E2',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  authorText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  announcementContent: {
    padding: 16,
  },
  contentText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E40AF',
    marginLeft: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    marginLeft: 8,
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
  highPriorityBadge: {
    backgroundColor: '#FEE2E2',
  },
  mediumPriorityBadge: {
    backgroundColor: '#FEF3C7',
  },
  lowPriorityBadge: {
    backgroundColor: '#D1FAE5',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 