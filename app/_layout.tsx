import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './firebase.config'; // Import Firebase configuration

import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// This function checks if the user is logged in and redirects accordingly
function RootLayoutNav() {
  const { currentUser, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (loading) return;
    
    // After initial loading is complete
    if (initialLoad) {
      setInitialLoad(false);
      const inAuthGroup = segments[0] === 'auth';
      
      if (!currentUser && !inAuthGroup) {
        // Redirect to the sign-in page when not authenticated
        router.replace('/auth/sign-in');
      } else if (currentUser && inAuthGroup) {
        // Redirect to the home page when authenticated
        router.replace('/(tabs)/home');
      }
    }
  }, [currentUser, loading, segments, initialLoad]);

  // Use Slot for tabs navigation and Stack for all other routes
  return <Slot />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'InknutAntiqua-Bold': require('../assets/fonts/SpaceMono-Regular.ttf'),
    'InknutAntiqua_400Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <RootLayoutNav />
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
