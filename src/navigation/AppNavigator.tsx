import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Platform, TouchableOpacity, Alert } from 'react-native';
import { NavigationContainer, useNavigation, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, authEventEmitter } from '../services/api';

import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ProfileDetailsScreen } from '../screens/auth/ProfileDetailsScreen';

import { IDVerificationScreen } from '../screens/auth/IDVerificationScreen';
import { PhotoUploadScreen } from '../screens/auth/PhotoUploadScreen';
import { SelfieVerificationScreen } from '../screens/auth/SelfieVerificationScreen';
import { HomeScreen } from '../screens/main/HomeScreen';
import { MessagesScreen } from '../screens/main/MessagesScreen';
import { ChatScreen } from '../screens/main/ChatScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { ProfileDetailScreen } from '../screens/main/ProfileDetailScreen';
import { VideoCallScreen } from '../screens/main/VideoCallScreen';
import { EventsScreen } from '../screens/main/EventsScreen';
import { LikesScreen } from '../screens/main/LikesScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { FilterScreen } from '../screens/main/FilterScreen';
import { PersonalityQuizScreen } from '../screens/profile/PersonalityQuizScreen';
import { DealbreakersScreen } from '../screens/profile/DealbreakersScreen';
import { ProfileSetupScreen } from '../screens/profile/ProfileSetupScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';
import { VerificationSuccessScreen } from '../screens/auth/VerificationSuccessScreen';
import { WelcomeNewUserScreen } from '../screens/main/WelcomeNewUserScreen';
import { SafetyCenterScreen } from '../screens/main/SafetyCenterScreen';
import { COLORS, SHADOWS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ProfileDetails: { email: string; password: string; phone: string };
  IDVerification: { formData: any };
  PhotoUploadScreen: { formData: any; verifiedSelfieUri?: string };
  SelfieVerification: { formData?: any; idFrontImage?: string; idBackImage?: string; profilePhotos?: string[] };
  EmailVerification: { formData: any };
  VerificationSuccess: { trustScore: number; verification: any };
  ProfileSetup: { formData: any };
  MainTabs: undefined;
  Chat: { matchId: string; name: string };
  VideoCall: { matchId: string; userName: string; userPhoto: string; isIncoming?: boolean };
  Events: undefined;
  PersonalityQuiz: undefined;
  Dealbreakers: undefined;
  Settings: undefined;
  Filters: undefined;
  ProfileDetail: { profile: any; isOwnProfile?: boolean };
  WelcomeNewUser: undefined;
  SafetyCenter: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Likes: undefined;
  Messages: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();



const MainTabs = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUserPhoto = async () => {
      try {
        const profile = await api.getProfile();
        if (profile?.photos?.length > 0) {
          setUserPhoto(profile.photos[0].url);
        }
      } catch (error) {
        console.warn('Could not fetch user photo for tab bar:', error);
      }
    };

    const fetchUnreadCount = async () => {
      try {
        const [matches, me] = await Promise.all([api.getMatches(), api.getProfile()]);
        const myId = me?.id;
        const total = matches.reduce((sum: number, m: any) => {
          const sentByOther = m.lastMessage?.senderId && m.lastMessage.senderId !== myId;
          return sum + (m.lastMessage && !m.lastMessage.isRead && sentByOther ? 1 : 0);
        }, 0);
        setUnreadCount(total);
      } catch {}
    };

    fetchUserPhoto();
    fetchUnreadCount();

    // Refresh unread count every 10 seconds
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'flame' : 'flame-outline';
              break;
            case 'Likes':
              iconName = focused ? 'heart' : 'heart-outline';
              break;
            case 'Messages':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          if (route.name === 'Messages' && unreadCount > 0) {
            return (
              <View>
                <Ionicons name={iconName} size={size} color={color} />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              </View>
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.white, borderTopColor: colors.border }],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
      })}
      detachInactiveScreens={false}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ 
        tabBarLabel: 'Discover',
        headerShown: false,
      }} />
      <Tab.Screen name="Likes" component={LikesScreen} options={{ 
        tabBarLabel: 'Likes',
        headerShown: true,
        headerTitle: 'Likes',
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: colors.white },
        headerTitleStyle: { color: colors.text, fontWeight: 'bold', fontSize: 18 },
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            {userPhoto ? (
              <Image source={{ uri: userPhoto }} style={{ width: 32, height: 32, borderRadius: 16 }} />
            ) : (
              <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
            )}
          </View>
        ),
      }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ 
        headerShown: true,
        headerTitle: 'Messages',
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: colors.white },
        headerTitleStyle: { color: colors.text, fontWeight: 'bold', fontSize: 18 },
        tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            {userPhoto ? (
              <Image source={{ uri: userPhoto }} style={{ width: 32, height: 32, borderRadius: 16 }} />
            ) : (
              <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
            )}
          </View>
        ),
      }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ 
        tabBarLabel: 'Profile',
        headerShown: false,
      }} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  // Determine initial route: new users who haven't seen welcome go to WelcomeNewUser
  useEffect(() => {
    const getInitialRoute = async () => {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
        if (hasSeenWelcome === 'false') {
          // Brand new user — show onboarding
          setInitialRoute('WelcomeNewUser');
        } else {
          setInitialRoute('Welcome');
        }
      } catch {
        setInitialRoute('Welcome');
      }
    };
    getInitialRoute();
  }, []);

  // Global 401 handler — redirect to Welcome when token expires
  useEffect(() => {
    const handleUnauthorized = () => {
      if (navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
        setTimeout(() => {
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please log in again.',
            [{ text: 'OK' }]
          );
        }, 300);
      }
    };
    authEventEmitter.on('unauthorized', handleUnauthorized);
    return () => {
      authEventEmitter.off('unauthorized', handleUnauthorized);
    };
  }, []);

  // Wait until we know the initial route
  if (!initialRoute) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
        <Stack.Screen name="IDVerification" component={IDVerificationScreen} />
        <Stack.Screen name="PhotoUploadScreen" component={PhotoUploadScreen} />
        <Stack.Screen name="SelfieVerification" component={SelfieVerificationScreen} />
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen
          name="VerificationSuccess"
          component={VerificationSuccessScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="VideoCall"
          component={VideoCallScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen name="Events" component={EventsScreen} />
        <Stack.Screen name="PersonalityQuiz" component={PersonalityQuizScreen} />
        <Stack.Screen name="Dealbreakers" component={DealbreakersScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Filters" component={FilterScreen} />
        <Stack.Screen 
          name="ProfileDetail" 
          component={ProfileDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="WelcomeNewUser"
          component={WelcomeNewUserScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="SafetyCenter"
          component={SafetyCenterScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 85,
    paddingBottom: 20,
    paddingTop: 5,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 0,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
