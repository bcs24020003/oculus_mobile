import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'announcement' | 'schedule' | 'system';
}

export default function NotificationScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('You must be logged in to view notifications');
        setLoading(false);
        return;
      }
      
      // For demo purposes, use mock data
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Welcome to UTS Oculus',
          message: 'Thank you for joining UTS Oculus. Explore the app to discover its features.',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          read: false,
          type: 'system'
        },
        {
          id: '2',
          title: 'New Announcement: Campus Closure',
          message: 'The campus will be closed on June 15th for maintenance. All classes will be conducted online.',
          date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
          read: true,
          type: 'announcement'
        },
        {
          id: '3',
          title: 'Schedule Update: COMP1511',
          message: 'Your COMP1511 tutorial has been rescheduled to Wednesday at 2:00 PM.',
          date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
          read: true,
          type: 'schedule'
        }
      ];
      
      setNotifications(mockNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const getIconName = () => {
      switch (item.type) {
        case 'announcement': return 'bullhorn';
        case 'schedule': return 'calendar';
        case 'system': return 'bell';
        default: return 'bell';
      }
    };
    
    const getIconColor = () => {
      switch (item.type) {
        case 'announcement': return '#2563EB';
        case 'schedule': return '#059669';
        case 'system': return '#D97706';
        default: return '#64748B';
      }
    };
    
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
      }
    };
    
    return (
      <TouchableOpacity 
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
      >
        <View style={[styles.iconContainer, { backgroundColor: getIconColor() }]}>
          <FontAwesome name={getIconName()} size={18} color="#FFFFFF" />
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          
          <Text style={styles.notificationDate}>
            {formatDate(item.date)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={50} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholderRight} />
      </View>
      
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="bell-slash" size={60} color="#94A3B8" />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            We'll notify you when there are announcements or updates
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  backButton: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: '80%',
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadItem: {
    backgroundColor: '#F1F5F9',
    borderLeftWidth: 3,
    borderLeftColor: '#1E40AF',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E40AF',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
  },
  notificationDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
}); 