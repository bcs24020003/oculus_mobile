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
  Image,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth, deleteUser, getIdToken } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  where
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PLACEHOLDER_IMAGES } from '../../utils/imageUtil';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import firebase from 'firebase/app';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  isVerified: boolean;
  role: string;
  studentId?: string;
}

// Function to delete Firebase Auth user using Cloud Functions
const deleteAuthUser = async (userId: string) => {
  try {
    const functions = getFunctions();
    const deleteUserFunction = httpsCallable(functions, 'deleteUser');
    const result = await deleteUserFunction({ userId });
    
    // 检查部分成功情况 (Auth用户不存在)
    const data = result.data as any;
    if (data && data.partial && data.authError === 'not-found') {
      console.warn(`Auth user with ID ${userId} not found, proceeding with Firestore cleanup`);
      // 这种情况下我们仍然返回true，因为我们仍可以继续清理Firestore数据
      return true;
    }
    
    console.log('User deletion result:', result.data);
    return true;
  } catch (error: any) {
    // 如果错误消息包含"not-found"，表示Auth用户已不存在
    if (error.message && error.message.includes('not-found')) {
      console.warn(`Auth user with ID ${userId} not found, proceeding with Firestore cleanup`);
      // 这种情况下我们仍然返回true，因为我们仍可以继续清理Firestore数据
      return true;
    }
    console.error('Error deleting Firebase Auth user:', error);
    return false;
  }
};

export default function UserManagement() {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'students' | 'admins'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, filterMode, users]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      
      // 获取管理员用户
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const adminUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        username: doc.data().username || doc.id,
        email: doc.data().email,
        fullName: doc.data().fullName,
        isAdmin: true,
        isVerified: true,
        role: 'admin'
      }));

      // 获取学生用户
      const studentsRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      const studentUsers = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        username: doc.data().studentId || doc.id,
        email: doc.data().email,
        fullName: doc.data().fullName,
        isAdmin: false,
        isVerified: doc.data().isVerified || false,
        role: 'student',
        studentId: doc.data().studentId
      }));

      // 合并用户列表
      const allUsers = [...adminUsers, ...studentUsers];
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // 应用筛选逻辑
    switch (filterMode) {
      case 'students':
        filtered = filtered.filter(user => !user.isAdmin);
        break;
      case 'admins':
        filtered = filtered.filter(user => user.isAdmin);
        break;
      // 'all' 不需要额外筛选
    }

    // 应用搜索查询
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        user => 
          user.username?.toLowerCase().includes(query) || 
          user.email?.toLowerCase().includes(query) || 
          user.fullName?.toLowerCase().includes(query) ||
          user.studentId?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this user? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive', 
            onPress: async () => {
              try {
                setLoading(true);
                const db = getFirestore();
                let authUserDeleted = false;

                // 1. Try to delete Firebase Auth user (requires Cloud Function with admin privileges)
                try {
                  console.log(`Attempting to delete Firebase Auth user: ${userId}`);
                  authUserDeleted = await deleteAuthUser(userId);
                  if (authUserDeleted) {
                    console.log(`Firebase Auth user deleted or not found: ${userId}`);
                  } else {
                    console.warn(`Could not delete Firebase Auth user: ${userId}`);
                  }
                } catch (authError: any) {
                  // 如果错误消息包含"not-found"，不需要报告错误
                  if (authError.message && authError.message.includes('not-found')) {
                    console.warn(`Auth user ${userId} not found, proceeding with Firestore cleanup`);
                    authUserDeleted = true;
                  } else {
                    console.error('Error deleting Firebase Auth user:', authError);
                  }
                  // Continue with Firestore data deletion even if Auth deletion fails
                }

                // 2. Delete Firestore data
                // The deletion order is important, first try students collection, then users collection
                try {
                  // First check and delete data from students collection
                  const studentDoc = await getDoc(doc(db, 'students', userId));
                  if (studentDoc.exists()) {
                    console.log(`Deleting student document for ${userId}`);
                    await deleteDoc(doc(db, 'students', userId));
                    console.log(`Student document deleted for ${userId}`);
                  }
                } catch (studentError: any) {
                  console.error('Error deleting student data:', studentError);
                  // Continue trying to delete the user
                }

                try {
                  // Delete data from users collection
                  console.log(`Deleting user document for ${userId}`);
                  await deleteDoc(doc(db, 'users', userId));
                  console.log(`User document deleted for ${userId}`);
                } catch (userError: any) {
                  console.error('Error deleting user data:', userError);
                  throw new Error(`Failed to delete user data: ${userError.message}`);
                }

                // Update local state
                setUsers(users.filter(user => user.id !== userId));
                setFilteredUsers(filteredUsers.filter(user => user.id !== userId));
                
                if (authUserDeleted) {
                  Alert.alert('Success', 'User has been successfully deleted');
                } else {
                  Alert.alert('Partial Success', 'User data has been deleted from the database, but there was an issue with the authentication account');
                }
              } catch (error: any) {
                console.error('Error during user deletion process:', error);
                Alert.alert('Error', 'Failed to delete user data: ' + error.message);
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error showing confirmation dialog:', error);
      Alert.alert('Error', error.message);
    }
  };

  const handleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Note', 'Please select users to delete first');
      return;
    }

    Alert.alert(
      'Confirm Batch Delete',
      `Are you sure you want to delete these ${selectedUsers.length} users? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              setLoading(true);
              const db = getFirestore();
              let successCount = 0;
              let errorCount = 0;
              let authDeletedCount = 0;

              for (const userId of selectedUsers) {
                try {
                  // 1. Try to delete Firebase Auth user
                  let authUserDeleted = false;
                  try {
                    console.log(`Batch: Attempting to delete Firebase Auth user: ${userId}`);
                    authUserDeleted = await deleteAuthUser(userId);
                    if (authUserDeleted) {
                      console.log(`Batch: Firebase Auth user deleted: ${userId}`);
                      authDeletedCount++;
                    } else {
                      console.warn(`Batch: Could not delete Firebase Auth user: ${userId}`);
                    }
                  } catch (authError) {
                    console.error(`Batch: Error deleting Firebase Auth user ${userId}:`, authError);
                    // Continue with Firestore data deletion
                  }

                  // 2. Delete Firestore data
                  // Deletion order: first students collection, then users collection
                  try {
                    // Check and delete data from students collection
                    const studentDoc = await getDoc(doc(db, 'students', userId));
                    if (studentDoc.exists()) {
                      console.log(`Batch: Deleting student document for ${userId}`);
                      await deleteDoc(doc(db, 'students', userId));
                      console.log(`Batch: Student document deleted for ${userId}`);
                    }
                  } catch (studentError) {
                    console.error(`Batch: Error deleting student ${userId}:`, studentError);
                    // Continue trying to delete data from users collection
                  }
                  
                  try {
                    // Delete data from users collection
                    console.log(`Batch: Deleting user document for ${userId}`);
                    await deleteDoc(doc(db, 'users', userId));
                    console.log(`Batch: User document deleted for ${userId}`);
                    successCount++;
                  } catch (userError) {
                    console.error(`Batch: Error deleting user ${userId}:`, userError);
                    errorCount++;
                  }
                } catch (error) {
                  console.error(`Batch: Failed completely for user ${userId}:`, error);
                  errorCount++;
                }
              }

              // Update local state
              setUsers(users.filter(user => !selectedUsers.includes(user.id)));
              setFilteredUsers(filteredUsers.filter(user => !selectedUsers.includes(user.id)));
              setSelectedUsers([]);
              
              if (errorCount === 0) {
                if (authDeletedCount === selectedUsers.length) {
                  Alert.alert('Success', `Successfully deleted all ${successCount} users completely (including authentication)`);
                } else {
                  Alert.alert('Partial Success', 
                    `Successfully deleted all ${successCount} users from database\n` +
                    `${authDeletedCount} users deleted from authentication`);
                }
              } else {
                Alert.alert('Partial Success', 
                  `Success: ${successCount} users\n` +
                  `Failed: ${errorCount} users\n` +
                  `Auth deleted: ${authDeletedCount} users`);
              }
            } catch (error: any) {
              console.error('Error deleting users:', error);
              Alert.alert('Error', 'Failed to delete users: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      {isSelectMode && (
        <TouchableOpacity
          style={[styles.checkbox, selectedUsers.includes(item.id) && styles.checked]}
          onPress={() => handleSelectUser(item.id)}
        >
          {selectedUsers.includes(item.id) && (
            <FontAwesome name="check" size={12} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      )}
      <View style={[styles.userInfo, isSelectMode && { marginLeft: 8 }]}>
        <View style={styles.userIconContainer}>
          <FontAwesome 
            name={item.isAdmin ? "user-circle" : "user"} 
            size={32} 
            color={item.isAdmin ? "#7C3AED" : "#1E40AF"} 
          />
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.fullName}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {!item.isAdmin && item.studentId && (
            <Text style={styles.studentId}>ID: {item.studentId}</Text>
          )}
          <View style={styles.userBadges}>
            <View style={[styles.badge, item.isAdmin ? styles.adminBadge : styles.studentBadge]}>
              <Text style={styles.badgeText}>{item.isAdmin ? 'Admin' : 'Student'}</Text>
            </View>
          </View>
        </View>
      </View>
      {!isSelectMode && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => router.push(`/admin/users/details/${item.id}`)}
          >
            <FontAwesome name="pencil" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteUser(item.id)}
          >
            <FontAwesome name="trash" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFilterButton = (
    title: string, 
    mode: 'all' | 'students' | 'admins',
    icon: "users" | "user" | "user-circle",
    index: number
  ) => (
    <TouchableOpacity
      key={index}
      style={[styles.filterButton, filterMode === mode && styles.activeFilterButton]}
      onPress={() => setFilterMode(mode)}
    >
      <View style={styles.filterButtonContent}>
        <FontAwesome 
          name={icon} 
          size={16} 
          color={filterMode === mode ? '#FFFFFF' : '#64748B'} 
          style={styles.filterButtonIcon}
        />
        <Text 
          style={[styles.filterButtonText, filterMode === mode && styles.activeFilterButtonText]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFilterButtonDisabled = (
    title: string, 
    icon: "users" | "user" | "user-circle",
    index: number,
    isActive: boolean
  ) => (
    <View
      key={index}
      style={[
        styles.filterButton, 
        isActive && styles.activeFilterButton,
        {opacity: 0.5}
      ]}
    >
      <View style={styles.filterButtonContent}>
        <FontAwesome 
          name={icon} 
          size={16} 
          color={isActive ? '#FFFFFF' : '#CBD5E1'} 
          style={styles.filterButtonIcon}
        />
        <Text 
          style={[
            styles.filterButtonText, 
            isActive && styles.activeFilterButtonText
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
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
          <Text style={styles.headerTitle}>User Management</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.iconButton} disabled={true}>
              <FontAwesome name="refresh" size={18} color="#CBD5E1" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} disabled={true}>
              <FontAwesome name="plus" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={16} color="#CBD5E1" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, {color: '#CBD5E1'}]}
            placeholder="Search by name, email, or ID..."
            editable={false}
            placeholderTextColor="#CBD5E1"
          />
        </View>
        
        <View style={styles.filterContainer}>
          <View style={styles.filterButtonsRow}>
            {[
              { title: 'All', mode: 'all' as const, icon: 'users' as const, isActive: true },
              { title: 'Students', mode: 'students' as const, icon: 'user' as const, isActive: false },
              { title: 'Admins', mode: 'admins' as const, icon: 'user-circle' as const, isActive: false }
            ].map((item, index) => 
              renderFilterButtonDisabled(item.title, item.icon, index, item.isActive)
            )}
          </View>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading users...</Text>
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
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={styles.headerButtons}>
          {isSelectMode ? (
            <>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={handleDeleteSelected}
              >
                <FontAwesome name="trash" size={18} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => {
                  setSelectedUsers([]);
                  setIsSelectMode(false);
                }}
              >
                <FontAwesome name="times" size={20} color="#1E293B" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={fetchUsers}
              >
                <FontAwesome name="refresh" size={18} color="#1E40AF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => setIsSelectMode(true)}
              >
                <FontAwesome name="check-square-o" size={20} color="#1E40AF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => router.push('/admin/users/create')}
              >
                <FontAwesome name="plus" size={20} color="#1E40AF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94A3B8"
        />
      </View>
      
      <View style={styles.filterContainer}>
        <View style={styles.filterButtonsRow}>
          {[
            { title: 'All Users', mode: 'all' as const, icon: 'users' as const },
            { title: 'Students', mode: 'students' as const, icon: 'user' as const },
            { title: 'Administrators', mode: 'admins' as const, icon: 'user-circle' as const }
          ].map((item, index) => 
            renderFilterButton(item.title, item.mode, item.icon, index)
          )}
        </View>
      </View>
      
      {filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="users" size={60} color="#94A3B8" />
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => `${item.id}-${item.role}`}
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
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
  filterContainer: {
    padding: 16,
    marginBottom: 8,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeFilterButton: {
    backgroundColor: '#1E40AF',
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonIcon: {
    marginRight: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  userItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  userBadges: {
    flexDirection: 'row',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  adminBadge: {
    backgroundColor: '#7C3AED',
  },
  studentBadge: {
    backgroundColor: '#1E40AF',
  },
  actionButtons: {
    flexDirection: 'row',
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
}); 