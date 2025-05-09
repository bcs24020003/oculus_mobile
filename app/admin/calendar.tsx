import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
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
} from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  type: 'term' | 'holiday' | 'exam' | 'event';
  createdAt?: Date;
  updatedAt?: Date;
}

export default function AcademicCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [eventType, setEventType] = useState<CalendarEvent['type']>('event');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  useEffect(() => {
    checkAdminStatus();
  }, []);
  
  const checkAdminStatus = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to access this page');
        router.replace('/auth/sign-in');
        return;
      }
      
      const db = getFirestore();
      // Additional admin check can be performed here
      
      fetchEvents();
    } catch (error) {
      console.error('Error checking admin status:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.replace('/auth/sign-in');
    }
  };
  
  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      const db = getFirestore();
      const q = query(collection(db, 'calendar'), orderBy('startDate', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const calendarEvents: CalendarEvent[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        calendarEvents.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          startDate: data.startDate.toDate(),
          endDate: data.endDate?.toDate(),
          type: data.type,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        });
      });
      
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to load calendar events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };
  
  const openAddModal = () => {
    // Reset form
    setTitle('');
    setDescription('');
    setStartDate(new Date());
    setEndDate(new Date());
    setEventType('event');
    setEditingEvent(null);
    setModalVisible(true);
  };
  
  const openEditModal = (event: CalendarEvent) => {
    setTitle(event.title);
    setDescription(event.description);
    setStartDate(event.startDate);
    setEndDate(event.endDate || new Date());
    setEventType(event.type);
    setEditingEvent(event);
    setModalVisible(true);
  };
  
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the event');
      return;
    }
    
    try {
      const db = getFirestore();
      const now = new Date();
      
      // Prepare data
      const eventData = {
        title: title.trim(),
        description: description.trim(),
        startDate: startDate,
        endDate: endDate,
        type: eventType,
        updatedAt: now,
      };
      
      if (editingEvent) {
        // Update existing event
        await updateDoc(doc(db, 'calendar', editingEvent.id), eventData);
        
        // Update local state
        setEvents(events.map(event => 
          event.id === editingEvent.id 
            ? { ...event, ...eventData } 
            : event
        ));
        
        Alert.alert('Success', 'Event updated successfully');
      } else {
        // Create new event
        const newEventRef = doc(collection(db, 'calendar'));
        await setDoc(newEventRef, {
          ...eventData,
          createdAt: now,
        });
        
        // Update local state
        const newEvent: CalendarEvent = {
          id: newEventRef.id,
          title: title.trim(),
          description: description.trim(),
          startDate: startDate,
          endDate: endDate,
          type: eventType,
          createdAt: now,
          updatedAt: now,
        };
        
        setEvents([...events, newEvent].sort((a, b) => 
          a.startDate.getTime() - b.startDate.getTime()
        ));
        
        Alert.alert('Success', 'Event created successfully');
      }
      
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Failed to save event. Please try again.');
    }
  };
  
  const handleDelete = (event: CalendarEvent) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const db = getFirestore();
              await deleteDoc(doc(db, 'calendar', event.id));
              
              // Update local state
              setEvents(events.filter(e => e.id !== event.id));
              
              Alert.alert('Success', 'Event deleted successfully');
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const getEventTypeIcon = (type: CalendarEvent['type']): any => {
    switch (type) {
      case 'term':
        return 'calendar';
      case 'holiday':
        return 'sun-o';
      case 'exam':
        return 'pencil-square-o';
      case 'event':
      default:
        return 'star-o';
    }
  };
  
  const getEventTypeColor = (type: CalendarEvent['type']): string => {
    switch (type) {
      case 'term':
        return '#3B82F6';
      case 'holiday':
        return '#F59E0B';
      case 'exam':
        return '#EF4444';
      case 'event':
      default:
        return '#8B5CF6';
    }
  };
  
  const renderEventItem = ({ item }: { item: CalendarEvent }) => (
    <View style={styles.eventCard}>
      <View style={[styles.eventTypeIndicator, { backgroundColor: getEventTypeColor(item.type) }]} />
      
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <View style={styles.eventTitleContainer}>
            <FontAwesome 
              name={getEventTypeIcon(item.type)} 
              size={16} 
              color={getEventTypeColor(item.type)}
              style={styles.eventIcon}
            />
            <Text style={styles.eventTitle}>{item.title}</Text>
          </View>
          
          <View style={styles.eventActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openEditModal(item)}
            >
              <FontAwesome name="edit" size={16} color="#64748B" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item)}
            >
              <FontAwesome name="trash" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.eventDateContainer}>
          <FontAwesome name="calendar-o" size={14} color="#64748B" style={styles.dateIcon} />
          <Text style={styles.eventDate}>
            {formatDate(item.startDate)}
            {item.endDate && ` - ${formatDate(item.endDate)}`}
          </Text>
        </View>
        
        {item.description && (
          <Text style={styles.eventDescription}>{item.description}</Text>
        )}
      </View>
    </View>
  );
  
  const renderEventTypeButton = (type: CalendarEvent['type'], label: string) => (
    <TouchableOpacity
      style={[
        styles.eventTypeButton,
        eventType === type && { backgroundColor: getEventTypeColor(type) }
      ]}
      onPress={() => setEventType(type)}
    >
      <FontAwesome 
        name={getEventTypeIcon(type)} 
        size={16} 
        color={eventType === type ? '#FFFFFF' : getEventTypeColor(type)}
      />
      <Text 
        style={[
          styles.eventTypeLabel,
          eventType === type && { color: '#FFFFFF' }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Academic Calendar</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddModal}
        >
          <FontAwesome name="plus" size={20} color="#1E3A8A" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading calendar events...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome name="calendar-plus-o" size={50} color="#E2E8F0" />
              <Text style={styles.emptyText}>No calendar events</Text>
              <Text style={styles.emptySubtext}>
                Tap the "+" button to add academic calendar events
              </Text>
            </View>
          }
        />
      )}
      
      {/* Add/Edit Event Modal */}
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
                {editingEvent ? 'Edit Event' : 'Add New Event'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <FontAwesome name="times" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Event Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter event title"
                placeholderTextColor="#94A3B8"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Event Type</Text>
              <View style={styles.eventTypeButtons}>
                {renderEventTypeButton('term', 'Term')}
                {renderEventTypeButton('holiday', 'Holiday')}
                {renderEventTypeButton('exam', 'Exam')}
                {renderEventTypeButton('event', 'Event')}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartDatePicker(true)}
              >
                <FontAwesome name="calendar" size={16} color="#64748B" style={styles.inputIcon} />
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={(event: any, selectedDate?: Date) => {
                    setShowStartDatePicker(false);
                    if (selectedDate) setStartDate(selectedDate);
                  }}
                />
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndDatePicker(true)}
              >
                <FontAwesome name="calendar" size={16} color="#64748B" style={styles.inputIcon} />
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="default"
                  onChange={(event: any, selectedDate?: Date) => {
                    setShowEndDatePicker(false);
                    if (selectedDate) setEndDate(selectedDate);
                  }}
                />
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter event description"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>
                  {editingEvent ? 'Update' : 'Save'}
                </Text>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
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
    flex: 1,
  },
  addButton: {
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
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  eventTypeIndicator: {
    width: 6,
  },
  eventContent: {
    flex: 1,
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventIcon: {
    marginRight: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  eventActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 6,
    marginLeft: 8,
  },
  eventDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateIcon: {
    marginRight: 6,
  },
  eventDate: {
    fontSize: 14,
    color: '#64748B',
  },
  eventDescription: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  eventTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1,
    marginHorizontal: 4,
  },
  eventTypeLabel: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#1E293B',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
}); 