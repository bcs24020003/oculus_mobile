import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BackupRestore() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [backupStats, setBackupStats] = useState<{ [key: string]: number }>({});
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [backupPassword, setBackupPassword] = useState('');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in as an admin to access this page');
        router.replace('/auth/sign-in');
        return;
      }
      
      const db = getFirestore();
      // Check for previous backup info
      try {
        const systemDoc = await getDocs(collection(db, 'system'));
        systemDoc.forEach(doc => {
          if (doc.id === 'backup' && doc.data().lastBackup) {
            setLastBackupDate(formatDate(doc.data().lastBackup.toDate()));
          }
        });
      } catch (error) {
        console.log('No backup info found');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      Alert.alert('Error', 'Failed to verify admin access');
      router.replace('/auth/sign-in');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCreateBackup = () => {
    setPasswordModalVisible(true);
  };

  const startBackup = async () => {
    if (!backupPassword || backupPassword.length < 6) {
      Alert.alert('Error', 'Please enter a password of at least 6 characters to encrypt the backup');
      return;
    }
    
    setPasswordModalVisible(false);
    setBackupLoading(true);
    
    try {
      const db = getFirestore();
      const collections = ['students', 'users', 'announcements', 'courses', 'calendar', 'system'];
      const backupData: { [key: string]: any[] } = {};
      const stats: { [key: string]: number } = {};
      
      // Collect data from each collection
      for (const collectionName of collections) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        backupData[collectionName] = [];
        stats[collectionName] = querySnapshot.size;
        
        querySnapshot.forEach(doc => {
          backupData[collectionName].push({
            id: doc.id,
            ...doc.data()
          });
        });
      }
      
      // Simple encryption (in a real app, use a proper encryption library)
      const backupString = JSON.stringify(backupData);
      const encryptedData = simpleEncrypt(backupString, backupPassword);
      
      // Create backup file
      const backupFileName = `uts_oculus_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.utsbackup`;
      const fileUri = `${FileSystem.documentDirectory}${backupFileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, encryptedData);
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
      
      // Update backup stats and last backup date
      setBackupStats(stats);
      const now = new Date();
      setLastBackupDate(formatDate(now));
      
      // Save backup info to Firestore
      await setDoc(doc(db, 'system', 'backup'), {
        lastBackup: now,
        stats: stats
      });
      
      Alert.alert('Success', 'Backup created successfully');
    } catch (error) {
      console.error('Error creating backup:', error);
      Alert.alert('Error', 'Failed to create backup. Please try again.');
    } finally {
      setBackupLoading(false);
      setBackupPassword('');
    }
  };

  const handleSelectRestoreFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });
      
      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        if (!file.name.endsWith('.utsbackup')) {
          Alert.alert('Error', 'Please select a valid .utsbackup file');
          return;
        }
        
        setSelectedFile(file);
        setRestoreModalVisible(true);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      Alert.alert('Error', 'Failed to select file');
    }
  };

  const startRestore = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'No backup file selected');
      return;
    }
    
    if (!restorePassword) {
      Alert.alert('Error', 'Please enter the backup password');
      return;
    }
    
    setRestoreModalVisible(false);
    setRestoreLoading(true);
    
    try {
      // Read the backup file
      const fileContent = await FileSystem.readAsStringAsync(selectedFile.uri);
      
      // Decrypt the data
      let decryptedData: string;
      try {
        decryptedData = simpleDecrypt(fileContent, restorePassword);
      } catch (error) {
        Alert.alert('Error', 'Invalid password or corrupted backup file');
        setRestoreLoading(false);
        return;
      }
      
      // Parse the backup data
      const backupData = JSON.parse(decryptedData);
      
      // Confirm restore
      Alert.alert(
        'Confirm Restore',
        'This will overwrite existing data. Are you sure you want to proceed?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setRestoreLoading(false) },
          { text: 'Restore', style: 'destructive', onPress: () => performRestore(backupData) }
        ]
      );
    } catch (error) {
      console.error('Error processing backup file:', error);
      Alert.alert('Error', 'Failed to process backup file. The file may be corrupted or the password may be incorrect.');
      setRestoreLoading(false);
    }
  };

  const performRestore = async (backupData: { [key: string]: any[] }) => {
    try {
      const db = getFirestore();
      const batch = writeBatch(db);
      const collections = Object.keys(backupData);
      
      // First clear existing data
      for (const collectionName of collections) {
        const existingDocs = await getDocs(collection(db, collectionName));
        existingDocs.forEach(document => {
          batch.delete(doc(db, collectionName, document.id));
        });
      }
      
      // Then restore from backup
      for (const collectionName of collections) {
        const docs = backupData[collectionName];
        for (const document of docs) {
          const { id, ...data } = document;
          batch.set(doc(db, collectionName, id), data);
        }
      }
      
      // Commit all changes
      await batch.commit();
      
      // Update stats
      const stats: { [key: string]: number } = {};
      for (const collectionName of collections) {
        stats[collectionName] = backupData[collectionName].length;
      }
      setBackupStats(stats);
      
      Alert.alert('Success', 'Data restored successfully');
    } catch (error) {
      console.error('Error restoring data:', error);
      Alert.alert('Error', 'Failed to restore data. Please try again.');
    } finally {
      setRestoreLoading(false);
      setRestorePassword('');
    }
  };

  // Simple "encryption" for demo purposes only
  // In a real app, use a proper encryption library
  const simpleEncrypt = (text: string, password: string): string => {
    // This is a very basic and insecure encryption method
    // Just for demonstration purposes
    return btoa(text + '::' + password);
  };

  const simpleDecrypt = (encrypted: string, password: string): string => {
    // Very basic decryption to match our simple encryption
    const decoded = atob(encrypted);
    const parts = decoded.split('::');
    if (parts.length < 2 || parts[parts.length - 1] !== password) {
      throw new Error('Invalid password');
    }
    return parts.slice(0, -1).join('::');
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
          <Text style={styles.headerTitle}>Backup & Restore</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.headerTitle}>Backup & Restore</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Backup</Text>
          <Text style={styles.sectionDescription}>
            Create an encrypted backup of all app data including user accounts, 
            courses, and system settings.
          </Text>
          
          {lastBackupDate && (
            <View style={styles.infoBox}>
              <FontAwesome name="info-circle" size={16} color="#3B82F6" />
              <Text style={styles.infoText}>
                Last backup: {lastBackupDate}
              </Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleCreateBackup}
            disabled={backupLoading}
          >
            {backupLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <FontAwesome name="download" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Create New Backup</Text>
              </>
            )}
          </TouchableOpacity>
          
          {Object.keys(backupStats).length > 0 && (
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>Backup Statistics:</Text>
              {Object.entries(backupStats).map(([collection, count]) => (
                <Text key={collection} style={styles.statsItem}>
                  {collection}: {count} items
                </Text>
              ))}
            </View>
          )}
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restore from Backup</Text>
          <Text style={styles.sectionDescription}>
            Restore app data from a previously created backup file.
            This will overwrite existing data.
          </Text>
          
          <View style={styles.warningBox}>
            <FontAwesome name="exclamation-triangle" size={16} color="#F59E0B" />
            <Text style={styles.warningText}>
              Restoring will replace all current data. This action cannot be undone.
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.restoreButton]}
            onPress={handleSelectRestoreFile}
            disabled={restoreLoading}
          >
            {restoreLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <FontAwesome name="upload" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Select Backup File</Text>
              </>
            )}
          </TouchableOpacity>
          
          {selectedFile && !restoreLoading && !restoreModalVisible && (
            <View style={styles.selectedFileContainer}>
              <FontAwesome name="file" size={16} color="#1E3A8A" />
              <Text style={styles.selectedFileText}>{selectedFile.name}</Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Password Modal for Backup */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={passwordModalVisible}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Backup Password</Text>
            
            <Text style={styles.modalText}>
              Create a password to encrypt your backup. You'll need this password to restore the data later.
            </Text>
            
            <TextInput
              style={styles.passwordInput}
              value={backupPassword}
              onChangeText={setBackupPassword}
              placeholder="Enter password (min 6 characters)"
              secureTextEntry
              placeholderTextColor="#94A3B8"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setBackupPassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={startBackup}
              >
                <Text style={styles.confirmButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Password Modal for Restore */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={restoreModalVisible}
        onRequestClose={() => setRestoreModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Restore Password</Text>
            
            <Text style={styles.modalText}>
              Enter the password used to create this backup file.
            </Text>
            
            <TextInput
              style={styles.passwordInput}
              value={restorePassword}
              onChangeText={setRestorePassword}
              placeholder="Enter backup password"
              secureTextEntry
              placeholderTextColor="#94A3B8"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRestoreModalVisible(false);
                  setRestorePassword('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={startRestore}
              >
                <Text style={styles.confirmButtonText}>Restore</Text>
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
    flex: 1,
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
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#3B82F6',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#D97706',
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  restoreButton: {
    backgroundColor: '#F59E0B',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  statsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  statsItem: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 24,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedFileText: {
    fontSize: 14,
    color: '#334155',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  passwordInput: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  confirmButton: {
    backgroundColor: '#1E3A8A',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
}); 