import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth, db, storage } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  restoreAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  function signup(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    // Clear stored user from AsyncStorage before signing out
    await AsyncStorage.removeItem('user_auth');
    setCurrentUser(null);
    return signOut(auth);
  }

  function resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  }

  // Function to restore auth state from AsyncStorage
  async function restoreAuthState() {
    try {
      const userAuthId = await AsyncStorage.getItem('user_auth_id');
      if (userAuthId && !auth.currentUser) {
        // We have a user ID but no current user
        // This means we need to wait for Firebase to rehydrate the session
        // The onAuthStateChanged listener will handle it
        console.log('Waiting for Firebase Auth to rehydrate session...');
      }
      
      // We no longer try to re-authenticate using stored credentials
      // Instead, we rely on Firebase's built-in token persistence
      // enhanced by our AsyncStorage tracking
    } catch (error) {
      console.error('Error restoring auth state:', error);
    }
  }

  useEffect(() => {
    // Initial load - try to restore auth state
    restoreAuthState().finally(() => {
      // Setup the auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        
        if (user) {
          // Store minimal user info in AsyncStorage when logged in
          try {
            await AsyncStorage.setItem('user_auth_id', user.uid);
          } catch (error) {
            console.error('Error storing auth state:', error);
          }
        } else {
          // Remove user info from AsyncStorage when logged out
          try {
            await AsyncStorage.removeItem('user_auth_id');
          } catch (error) {
            console.error('Error removing auth state:', error);
          }
        }
        
        setLoading(false);
      });

      return unsubscribe;
    });
  }, []);

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    restoreAuthState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { auth, db, storage }; 