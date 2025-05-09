import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EditAnnouncement() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [originalAnnouncement, setOriginalAnnouncement] = useState<any>(null);
  
  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'Announcement ID is missing');
      router.back();
      return;
    }
    
    fetchAnnouncement();
  }, [id]);
  
  const fetchAnnouncement = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to edit an announcement');
        router.replace('/auth/sign-in');
        return;
      }
      
      const db = getFirestore();
      const docRef = doc(db, 'announcements', id as string);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        Alert.alert('Error', 'Announcement not found');
        router.back();
        return;
      }
      
      const data = docSnap.data();
      setOriginalAnnouncement(data);
      setTitle(data.title || '');
      setContent(data.content || '');
      setPriority(data.priority || 'medium');
    } catch (error) {
      console.error('Error fetching announcement:', error);
      Alert.alert('Error', 'Failed to load announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the announcement');
      return;
    }
    
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter content for the announcement');
      return;
    }
    
    // Check if anything has changed
    if (
      title === originalAnnouncement.title &&
      content === originalAnnouncement.content &&
      priority === originalAnnouncement.priority
    ) {
      Alert.alert('No Changes', 'No changes were made to the announcement');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to update an announcement');
        setSubmitting(false);
        return;
      }
      
      const db = getFirestore();
      const announcementRef = doc(db, 'announcements', id as string);
      
      await updateDoc(announcementRef, {
        title: title.trim(),
        content: content.trim(),
        priority,
        lastUpdated: serverTimestamp(),
        updatedBy: currentUser.uid
      });
      
      Alert.alert(
        'Success', 
        'Announcement updated successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error updating announcement:', error);
      Alert.alert('Error', 'Failed to update announcement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const getPriorityColor = (value: string): string => {
    switch (value) {
      case 'high': return '#EF4444'; // Red
      case 'medium': return '#F59E0B'; // Amber
      case 'low': return '#10B981'; // Green
      default: return '#64748B'; // Slate
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
          <Text style={styles.headerTitle}>Edit Announcement</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading announcement...</Text>
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
        <Text style={styles.headerTitle}>Edit Announcement</Text>
      </View>
      
      <ScrollView style={styles.formContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter announcement title"
            placeholderTextColor="#94A3B8"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityButtons}>
            {(['high', 'medium', 'low'] as const).map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.priorityButton,
                  priority === value && { 
                    backgroundColor: getPriorityColor(value) + '20',
                    borderColor: getPriorityColor(value) 
                  }
                ]}
                onPress={() => setPriority(value)}
              >
                <View style={[
                  styles.priorityDot, 
                  { backgroundColor: getPriorityColor(value) }
                ]} />
                <Text 
                  style={[
                    styles.priorityText,
                    priority === value && { 
                      color: getPriorityColor(value),
                      fontWeight: '600'
                    }
                  ]}
                >
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Content</Text>
          <TextInput
            style={styles.textArea}
            value={content}
            onChangeText={setContent}
            placeholder="Enter announcement content"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <FontAwesome name="save" size={16} color="#FFFFFF" style={styles.submitIcon} />
              <Text style={styles.submitButtonText}>Save Changes</Text>
            </>
          )}
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
  formContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
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
    padding: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0F172A',
    height: 160,
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    flex: 1,
    marginHorizontal: 4,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 14,
    color: '#64748B',
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitIcon: {
    marginRight: 8,
  },
}); 