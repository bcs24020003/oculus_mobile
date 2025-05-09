import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Schedule {
  id: string;
  courseCode: string;
  courseName: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  lecturer: string;
  capacity: number;
  enrolled: number;
  type: 'lecture' | 'tutorial' | 'lab';
  students: string[];
}

// Mock data for demonstration purposes
const MOCK_SCHEDULES: Omit<Schedule, 'id'>[] = [
  {
    courseCode: 'CS101',
    courseName: 'Introduction to Computer Science',
    day: 'Monday',
    startTime: '09:00',
    endTime: '11:00',
    room: 'Building 11, Room 401',
    lecturer: 'Dr. Sarah Johnson',
    capacity: 120,
    enrolled: 98,
    type: 'lecture',
    students: []
  },
  {
    courseCode: 'MATH202',
    courseName: 'Advanced Calculus',
    day: 'Monday',
    startTime: '13:00',
    endTime: '15:00',
    room: 'Building 5, Room 210',
    lecturer: 'Prof. Michael Chen',
    capacity: 80,
    enrolled: 65,
    type: 'lecture',
    students: []
  },
  {
    courseCode: 'ENG303',
    courseName: 'Technical Writing',
    day: 'Tuesday',
    startTime: '10:00',
    endTime: '12:00',
    room: 'Building 8, Room 105',
    lecturer: 'Dr. Emily Wilson',
    capacity: 40,
    enrolled: 32,
    type: 'lecture',
    students: []
  },
  {
    courseCode: 'BUS401',
    courseName: 'Business Analytics',
    day: 'Wednesday',
    startTime: '14:00',
    endTime: '16:00',
    room: 'Building 3, Room 302',
    lecturer: 'Prof. Robert Brown',
    capacity: 60,
    enrolled: 55,
    type: 'lecture',
    students: []
  },
  {
    courseCode: 'CS250',
    courseName: 'Data Structures and Algorithms',
    day: 'Thursday',
    startTime: '09:00',
    endTime: '12:00',
    room: 'Building 11, Room 405',
    lecturer: 'Dr. James Smith',
    capacity: 90,
    enrolled: 87,
    type: 'lecture',
    students: []
  },
  {
    courseCode: 'PHYS101',
    courseName: 'Introduction to Physics',
    day: 'Thursday',
    startTime: '15:00',
    endTime: '17:00',
    room: 'Building 7, Room 201',
    lecturer: 'Prof. Lisa Zhang',
    capacity: 100,
    enrolled: 89,
    type: 'lecture',
    students: []
  },
  {
    courseCode: 'ART110',
    courseName: 'Digital Design Foundations',
    day: 'Friday',
    startTime: '10:00',
    endTime: '13:00',
    room: 'Building 10, Room 301',
    lecturer: 'Dr. Alex Turner',
    capacity: 45,
    enrolled: 42,
    type: 'lecture',
    students: []
  },
  {
    courseCode: 'CS420',
    courseName: 'Artificial Intelligence',
    day: 'Friday',
    startTime: '14:00',
    endTime: '17:00',
    room: 'Building 11, Room 501',
    lecturer: 'Prof. David Lee',
    capacity: 75,
    enrolled: 75,
    type: 'lecture',
    students: []
  }
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Create time slots from 8:00 to 21:00 (9 PM)
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00'
];

export default function TimetableManagement() {
  const insets = useSafeAreaInsets();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState<Partial<Schedule>>({
    courseCode: '',
    courseName: '',
    day: 'Monday',
    startTime: '08:00',
    endTime: '09:00',
    room: '',
    lecturer: '',
    enrolled: 0,
    type: 'lecture',
  });
  
  // Flag to use mock data instead of Firebase
  const [useMockData, setUseMockData] = useState(false);

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; studentId: string; email: string; role: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingStudents, setViewingStudents] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    fetchSchedules();
    fetchUsers();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      // 修改查询方式，避免复合索引错误
      const schedulesRef = collection(db, 'schedules');
      // 使用单一排序而不是复合排序
      const q = query(schedulesRef, orderBy('day'));
      const querySnapshot = await getDocs(q);
      const schedulesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Schedule[];
      
      // 在JavaScript中进行第二级排序，而不是在Firestore查询中
      const sortedData = schedulesData.sort((a, b) => {
        // 首先按天排序
        const dayComparison = a.day.localeCompare(b.day);
        if (dayComparison !== 0) return dayComparison;
        // 然后按开始时间排序
        return a.startTime.localeCompare(b.startTime);
      });
      
      setSchedules(sortedData);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      Alert.alert('Error', 'Failed to fetch schedules');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const studentsRef = collection(db, 'students');
      const querySnapshot = await getDocs(studentsRef);
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().fullName || doc.data().email || 'Unknown Student',
        studentId: doc.data().studentId || 'No ID',
        email: doc.data().email || '',
        role: doc.data().role || 'student',
      })).filter(user => user.role === 'student'); // 只保留学生用户
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchSchedules();
  }, []);

  const handleSave = async () => {
    try {
      if (!formData.courseCode || !formData.courseName || !formData.day || 
          !formData.startTime || !formData.endTime || !formData.room || !formData.lecturer || !formData.type) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      if (formData.startTime >= formData.endTime) {
        Alert.alert('Error', 'End time must be after start time');
        return;
      }

      const scheduleData = {
        ...formData,
        capacity: 50,
        students: selectedUsers,
        lastUpdated: new Date().toISOString(),
      };

      if (editingSchedule) {
        const scheduleRef = doc(db, 'schedules', editingSchedule.id);
        await updateDoc(scheduleRef, scheduleData);
        Alert.alert('Success', 'Schedule updated successfully');
      } else {
        await addDoc(collection(db, 'schedules'), {
          ...scheduleData,
          createdAt: new Date().toISOString(),
        });
        Alert.alert('Success', 'Schedule created successfully');
      }
      
      setModalVisible(false);
      setEditingSchedule(null);
      setSelectedUsers([]);
      setFormData({
        courseCode: '',
        courseName: '',
        day: 'Monday',
        startTime: '08:00',
        endTime: '09:00',
        room: '',
        lecturer: '',
        enrolled: 0,
        type: 'lecture',
      });
      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to save schedule');
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData(schedule);
    setSelectedUsers(schedule.students || []);
    setModalVisible(true);
  };

  const handleDelete = async (schedule: Schedule) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this schedule? This will immediately remove it from student timetables as well.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'schedules', schedule.id));
              Alert.alert('Success', 'Schedule deleted successfully. It has been removed from student timetables.');
              fetchSchedules();
            } catch (error) {
              console.error('Error deleting schedule:', error);
              Alert.alert('Error', 'Failed to delete schedule');
            }
          },
        },
      ]
    );
  };

  // 过滤学生列表
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.studentId.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  // 查找并返回课程中的学生名单
  const getEnrolledStudents = (studentIds: string[]) => {
    return users.filter(user => studentIds.includes(user.id));
  };
  
  // 显示学生列表对话框
  const handleViewStudents = (schedule: Schedule) => {
    setCurrentSchedule(schedule);
    setViewingStudents(true);
  };

  const renderScheduleItem = ({ item }: { item: Schedule }) => (
    <View style={styles.scheduleItem}>
      <View style={styles.scheduleHeader}>
        <Text style={styles.courseCode}>{item.courseCode}</Text>
        <Text style={styles.courseName}>{item.courseName}</Text>
        {item.type && (
          <View style={[styles.typeBadge, styles[`${item.type}Badge`]]}>
            <Text style={styles.typeText}>
              {(item.type || 'lecture').charAt(0).toUpperCase() + (item.type || 'lecture').slice(1)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.scheduleDetails}>
        <Text style={styles.detailText}>
          <FontAwesome name="calendar" size={14} color="#64748B" /> {item.day}
        </Text>
        <Text style={styles.detailText}>
          <FontAwesome name="clock-o" size={14} color="#64748B" /> {item.startTime} - {item.endTime}
        </Text>
        <Text style={styles.detailText}>
          <FontAwesome name="building" size={14} color="#64748B" /> {item.room}
        </Text>
        <Text style={styles.detailText}>
          <FontAwesome name="user" size={14} color="#64748B" /> {item.lecturer}
        </Text>
        <TouchableOpacity onPress={() => handleViewStudents(item)}>
          <Text style={[styles.detailText, styles.studentCountLink]}>
            <FontAwesome name="users" size={14} color="#1E3A8A" /> {item.students ? item.students.length : 0} Students Enrolled
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item)}
        >
          <FontAwesome name="edit" size={16} color="#1E40AF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <FontAwesome name="trash" size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

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
          <Text style={styles.title}>Timetable Management</Text>
          <View style={styles.addButtonPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
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
        <Text style={styles.title}>Timetable Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingSchedule(null);
            setFormData({
              courseCode: '',
              courseName: '',
              day: 'Monday',
              startTime: '08:00',
              endTime: '09:00',
              room: '',
              lecturer: '',
              enrolled: 0,
              type: 'lecture',
            });
            setModalVisible(true);
          }}
        >
          <FontAwesome name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={schedules}
        renderItem={renderScheduleItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setEditingSchedule(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
            </Text>
            <ScrollView style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Course Code"
                value={formData.courseCode}
                onChangeText={(text) => setFormData({ ...formData, courseCode: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Course Name"
                value={formData.courseName}
                onChangeText={(text) => setFormData({ ...formData, courseName: text })}
              />
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Course Type</Text>
                <View style={styles.typeButtons}>
                  {(['lecture', 'tutorial', 'lab'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        formData.type === type && styles.selectedType,
                      ]}
                      onPress={() => setFormData({ ...formData, type })}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        formData.type === type && styles.selectedTypeText,
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Day</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {DAYS.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayButton,
                        formData.day === day && styles.selectedDay,
                      ]}
                      onPress={() => setFormData({ ...formData, day })}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        formData.day === day && styles.selectedDayText,
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.timeContainer}>
                <View style={styles.timeInput}>
                  <Text style={styles.label}>Start Time</Text>
                  <ScrollView 
                    style={styles.timePicker}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    contentContainerStyle={styles.timePickerContent}
                  >
                    {TIME_SLOTS.map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeButton,
                          formData.startTime === time && styles.selectedTime,
                        ]}
                        onPress={() => setFormData({ ...formData, startTime: time })}
                      >
                        <Text style={[
                          styles.timeButtonText,
                          formData.startTime === time && styles.selectedTimeText,
                        ]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.timeInput}>
                  <Text style={styles.label}>End Time</Text>
                  <ScrollView 
                    style={styles.timePicker}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    contentContainerStyle={styles.timePickerContent}
                  >
                    {TIME_SLOTS.map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeButton,
                          formData.endTime === time && styles.selectedTime,
                        ]}
                        onPress={() => setFormData({ ...formData, endTime: time })}
                      >
                        <Text style={[
                          styles.timeButtonText,
                          formData.endTime === time && styles.selectedTimeText,
                        ]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Room"
                value={formData.room}
                onChangeText={(text) => setFormData({ ...formData, room: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Lecturer"
                value={formData.lecturer}
                onChangeText={(text) => setFormData({ ...formData, lecturer: text })}
              />
              <View style={styles.pickerContainer}>
                <View style={styles.selectAllContainer}>
                  <Text style={styles.label}>Select Students</Text>
                  <TouchableOpacity
                    style={styles.selectAllButton}
                    onPress={() => {
                      if (selectedUsers.length === users.length) {
                        setSelectedUsers([]);
                      } else {
                        setSelectedUsers(users.map(user => user.id));
                      }
                    }}
                  >
                    <Text style={styles.selectAllText}>
                      {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search students by name or ID..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
                
                <View style={styles.userList}>
                  {filteredUsers.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={[
                        styles.userItem,
                        selectedUsers.includes(user.id) && styles.selectedUser,
                      ]}
                      onPress={() => {
                        if (selectedUsers.includes(user.id)) {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        } else {
                          setSelectedUsers([...selectedUsers, user.id]);
                        }
                      }}
                    >
                      <View style={styles.userItemContent}>
                        <Text style={[
                          styles.userText,
                          selectedUsers.includes(user.id) && styles.selectedUserText,
                        ]}>
                          {user.name}
                        </Text>
                        <Text style={styles.userIdText}>
                          ID: {user.studentId}
                        </Text>
                      </View>
                      <FontAwesome 
                        name={selectedUsers.includes(user.id) ? "check-square-o" : "square-o"} 
                        size={20} 
                        color={selectedUsers.includes(user.id) ? "#1E3A8A" : "#64748B"} 
                      />
                    </TouchableOpacity>
                  ))}
                  {filteredUsers.length === 0 && (
                    <Text style={styles.noResultsText}>No students found matching search query</Text>
                  )}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setEditingSchedule(null);
                  setFormData({
                    courseCode: '',
                    courseName: '',
                    day: 'Monday',
                    startTime: '08:00',
                    endTime: '09:00',
                    room: '',
                    lecturer: '',
                    enrolled: 0,
                    type: 'lecture',
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 学生列表对话框 */}
      <Modal
        visible={viewingStudents}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setViewingStudents(false);
          setCurrentSchedule(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Enrolled Students - {currentSchedule?.courseCode}
            </Text>
            <ScrollView style={styles.studentListContainer}>
              {currentSchedule && currentSchedule.students && currentSchedule.students.length > 0 ? (
                getEnrolledStudents(currentSchedule.students).map((student) => (
                  <View key={student.id} style={styles.enrolledStudentItem}>
                    <Text style={styles.enrolledStudentName}>{student.name}</Text>
                    <Text style={styles.enrolledStudentId}>ID: {student.studentId}</Text>
                    <Text style={styles.enrolledStudentEmail}>{student.email}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noStudentsText}>No students enrolled in this course</Text>
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => {
                  setViewingStudents(false);
                  setCurrentSchedule(null);
                }}
              >
                <Text style={styles.closeButtonText}>Close</Text>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
    textAlign: 'center'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#1E40AF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  scheduleItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleHeader: {
    marginBottom: 12,
  },
  courseCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  courseName: {
    fontSize: 16,
    color: '#64748B',
  },
  scheduleDetails: {
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748B',
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  editButton: {
    backgroundColor: '#EFF6FF',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
  },
  formContainer: {
    maxHeight: 500,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  selectedDay: {
    backgroundColor: '#1E40AF',
  },
  dayButtonText: {
    color: '#64748B',
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeInput: {
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#F8FAFC',
  },
  timePicker: {
    maxHeight: 180,
  },
  timePickerContent: {
    paddingBottom: 8,
  },
  timeButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginBottom: 6,
    alignItems: 'center',
  },
  selectedTime: {
    backgroundColor: '#1E40AF',
  },
  timeButtonText: {
    color: '#64748B',
    fontSize: 16,
  },
  selectedTimeText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  saveButton: {
    backgroundColor: '#1E40AF',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  lectureBadge: {
    backgroundColor: '#E6F2FF',
  },
  tutorialBadge: {
    backgroundColor: '#E6FFF2',
  },
  labBadge: {
    backgroundColor: '#FFF2E6',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0F172A',
  },
  typeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectedType: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeButtonText: {
    color: '#64748B',
    fontWeight: '500',
  },
  selectedTypeText: {
    color: '#FFFFFF',
  },
  userList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  userItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  selectedUser: {
    backgroundColor: '#1E40AF',
  },
  userText: {
    fontSize: 14,
    color: '#64748B',
  },
  selectedUserText: {
    color: '#FFFFFF',
  },
  selectAllContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E40AF',
  },
  selectAllText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  searchInput: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  userItemContent: {
    flex: 1,
  },
  userIdText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  noResultsText: {
    textAlign: 'center',
    padding: 15,
    color: '#64748B',
    fontStyle: 'italic',
  },
  studentCountLink: {
    color: '#1E3A8A',
    textDecorationLine: 'underline',
  },
  studentListContainer: {
    maxHeight: 400,
  },
  enrolledStudentItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  enrolledStudentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  enrolledStudentId: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  enrolledStudentEmail: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  noStudentsText: {
    textAlign: 'center',
    padding: 20,
    color: '#64748B',
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignSelf: 'center',
    width: '100%',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
}); 