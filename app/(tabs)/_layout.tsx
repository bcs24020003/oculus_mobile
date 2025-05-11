import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export default function TabLayout() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [checkingAdmin, setCheckingAdmin] = React.useState(true);

  React.useEffect(() => {
    if (!loading && currentUser) {
      const checkAdmin = async () => {
        try {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          setIsAdmin(userDoc.exists() && (userDoc.data().role === 'admin' || userDoc.data().isAdmin === true));
        } catch (e) {
          setIsAdmin(false);
        } finally {
          setCheckingAdmin(false);
        }
      };
      checkAdmin();
    } else if (!currentUser) {
      setCheckingAdmin(false);
    }
  }, [currentUser, loading]);

  // Don't render tabs until auth and admin check are done
  if (loading || !currentUser || checkingAdmin) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E40AF',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <FontAwesome name="user" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <FontAwesome name="cog" size={22} color={color} />,
        }}
      />
      {isAdmin && (
        <Tabs.Screen
          name="courses/index"
          options={{
            title: 'Courses',
            tabBarIcon: ({ color }) => <FontAwesome name="book" size={22} color={color} />,
          }}
        />
      )}
    </Tabs>
  );
}
