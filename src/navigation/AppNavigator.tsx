import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

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
import { COLORS, SHADOWS } from '../constants/theme';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ProfileDetails: { email: string; password: string; phone: string };
  IDVerification: { formData: any };
  PhotoUploadScreen: { formData: any };
  SelfieVerification: { formData?: any; idFrontImage?: string; idBackImage?: string; profilePhotos?: string[] };
  EmailVerification: { formData: any };
  ProfileSetup: { formData: any };
  MainTabs: undefined;
  Chat: { matchId: string; name: string };
  VideoCall: { matchId: string; userName: string; userPhoto: string; isIncoming?: boolean };
  Events: undefined;
  PersonalityQuiz: undefined;
  Dealbreakers: undefined;
  Settings: undefined;
  Filters: undefined;
  ProfileDetail: { profile: any };
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
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  useEffect(() => {
    // Fetch current user profile for tab bar photo
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
    fetchUserPhoto();
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
            case 'Profile':
              // Show user photo if available, otherwise show person icon
              if (userPhoto) {
                return (
                  <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
                    <Image
                      source={{ uri: userPhoto }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                );
              }
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
      })}
      detachInactiveScreens={false}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Discover' }} />
      <Tab.Screen name="Likes" component={LikesScreen} options={{ tabBarLabel: 'Likes' }} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 80,
    paddingBottom: 10,
    paddingTop: 10,
    ...SHADOWS.small,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
