import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, FlatList, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, serverTimestamp, query, orderBy, getDoc } from 'firebase/firestore';
import Button from '../../components/ui/Button';

interface Announcement {
  id?: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  date?: any;
  author?: string;
}

export default function ManageAnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('Component mounted, checking admin access and fetching announcements');
    checkAdminAccess();
    fetchAnnouncements();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log('No user logged in');
        Alert.alert('Access Denied', 'You must be logged in to access this page.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }
      
      console.log('Checking admin access for user:', currentUser.uid);
      const db = getFirestore();
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists() || !userSnap.data().isAdmin) {
        console.log('User is not an admin');
        Alert.alert('Access Denied', 'You do not have admin privileges to access this page.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        console.log('User is an admin');
      }
    } catch (err) {
      console.error('Error checking admin access:', err);
    }
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Fetching announcements...');
      const db = getFirestore();
      const announcementsQuery = query(
        collection(db, 'announcements'),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(announcementsQuery);
      console.log('Query snapshot size:', querySnapshot.size);
      
      const announcementsList: Announcement[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Announcement data:', { id: doc.id, ...data });
        announcementsList.push({
          id: doc.id,
          title: data.title || '',
          content: data.content || '',
          priority: data.priority || 'medium',
          date: data.date,
          author: data.author || 'Admin'
        });
      });
      
      console.log('Fetched announcements:', announcementsList);
      setAnnouncements(announcementsList);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!title || !content) {
      setError('Title and content are required');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('You must be logged in to create announcements');
      }
      
      const db = getFirestore();
      
      if (editingId) {
        // Update existing announcement
        await updateDoc(doc(db, 'announcements', editingId), {
          title,
          content,
          priority,
          updatedAt: serverTimestamp()
        });
        
        Alert.alert('Success', 'Announcement updated successfully');
      } else {
        // Create new announcement
        await addDoc(collection(db, 'announcements'), {
          title,
          content,
          priority,
          date: serverTimestamp(),
          createdAt: serverTimestamp(),
          author: currentUser.displayName || 'Admin',
          createdBy: currentUser.uid
        });
        
        Alert.alert('Success', 'Announcement created successfully');
      }
      
      // Reset form
      setTitle('');
      setContent('');
      setPriority('medium');
      setEditingId(null);
      
      // Refresh announcements list
      fetchAnnouncements();
    } catch (err: any) {
      console.error('Error saving announcement:', err);
      setError('Failed to save announcement: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this announcement? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getFirestore();
              await deleteDoc(doc(db, 'announcements', id));
              
              // Remove from local state
              setAnnouncements(announcements.filter(item => item.id !== id));
              
              Alert.alert('Success', 'Announcement deleted successfully');
            } catch (err: any) {
              console.error('Error deleting announcement:', err);
              Alert.alert('Error', 'Failed to delete announcement: ' + err.message);
            }
          }
        }
      ]
    );
  };

  const handleEdit = (announcement: Announcement) => {
    setTitle(announcement.title);
    setContent(announcement.content);
    setPriority(announcement.priority);
    setEditingId(announcement.id ?? null);
  };

  const handleCancel = () => {
    setTitle('');
    setContent('');
    setPriority('medium');
    setEditingId(null);
    setError('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#DC2626'; // Red
      case 'medium':
        return '#F59E0B'; // Amber
      case 'low':
        return '#059669'; // Green
      default:
        return '#6B7280'; // Gray
    }
  };

  const renderAnnouncementItem = ({ item }: { item: Announcement }) => (
    <View style={styles.announcementItem}>
      <View style={styles.announcementHeader}>
        <Text style={styles.announcementTitle}>{item.title}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
      </View>
      
      <Text style={styles.announcementContent} numberOfLines={2}>
        {item.content}
      </Text>
      
      {item.date && (
        <Text style={styles.dateText}>
          {item.date.toDate ? item.date.toDate().toLocaleDateString() : new Date(item.date).toLocaleDateString()}
        </Text>
      )}
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item)}
        >
          <FontAwesome name="edit" size={16} color="#1E40AF" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id!)}
        >
          <FontAwesome name="trash" size={16} color="#DC2626" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Announcements</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>
          {editingId ? 'Edit Announcement' : 'Create New Announcement'}
        </Text>
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        <TextInput
          style={styles.input}
          placeholder="Announcement Title"
          value={title}
          onChangeText={setTitle}
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Announcement Content"
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        
        <View style={styles.prioritySelector}>
          <Text style={styles.priorityLabel}>Priority:</Text>
          
          <TouchableOpacity
            style={[
              styles.priorityButton,
              { backgroundColor: priority === 'low' ? '#059669' : '#E2E8F0' }
            ]}
            onPress={() => setPriority('low')}
          >
            <Text style={[
              styles.priorityButtonText,
              { color: priority === 'low' ? '#FFFFFF' : '#1E293B' }
            ]}>Low</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.priorityButton,
              { backgroundColor: priority === 'medium' ? '#F59E0B' : '#E2E8F0' }
            ]}
            onPress={() => setPriority('medium')}
          >
            <Text style={[
              styles.priorityButtonText,
              { color: priority === 'medium' ? '#FFFFFF' : '#1E293B' }
            ]}>Medium</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.priorityButton,
              { backgroundColor: priority === 'high' ? '#DC2626' : '#E2E8F0' }
            ]}
            onPress={() => setPriority('high')}
          >
            <Text style={[
              styles.priorityButtonText,
              { color: priority === 'high' ? '#FFFFFF' : '#1E293B' }
            ]}>High</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonRow}>
          <Button
            label={editingId ? 'Update' : 'Create'}
            onPress={handleSave}
            loading={saving}
            fullWidth={false}
            style={styles.saveButton}
          />
          
          <Button
            label="Cancel"
            onPress={handleCancel}
            variant="outline"
            fullWidth={false}
            style={styles.cancelButton}
          />
        </View>
      </View>
      
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Existing Announcements</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E40AF" />
            <Text style={styles.loadingText}>Loading announcements...</Text>
          </View>
        ) : announcements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="bell-slash" size={50} color="#94A3B8" />
            <Text style={styles.emptyText}>No announcements found</Text>
          </View>
        ) : (
          <FlatList
            data={announcements}
            renderItem={renderAnnouncementItem}
            keyExtractor={(item) => item.id || Math.random().toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        )}
      </View>
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
    paddingVertical: 12,
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
  formContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 12,
    fontSize: 14,
  },
  prioritySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  priorityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginRight: 10,
  },
  priorityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    flex: 1,
    marginLeft: 8,
  },
  listContainer: {
    flex: 1,
    margin: 16,
    marginTop: 0,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  announcementItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  announcementContent: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  editButtonText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
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
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
}); 