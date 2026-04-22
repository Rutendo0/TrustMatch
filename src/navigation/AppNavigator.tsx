import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
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
  ProfileDetail: { profile: any; isOwnProfile?: boolean };
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
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

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
      <Tab.Screen name="Home" component={HomeScreen} options={{ 
        tabBarLabel: 'Discover',
        headerShown: true,
        headerTitle: 'Discover',
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: COLORS.white },
        headerTitleStyle: { color: COLORS.text, fontWeight: 'bold', fontSize: 18 },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 16 }}>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Ionicons 
                name="settings-outline" 
                size={24} 
                color={COLORS.text} 
              />
            </TouchableOpacity>
            {userPhoto ? (
              <TouchableOpacity onPress={() => navigation.navigate('ProfileDetail', { profile: null, isOwnProfile: true })}>
                <Image
                  source={{ uri: userPhoto }}
                  style={{ width: 32, height: 32, borderRadius: 16 }}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => navigation.navigate('ProfileDetail', { profile: null, isOwnProfile: true })}>
                <Ionicons 
                  name="person-circle-outline" 
                  size={28} 
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        ),
        headerLeft: () => (
          <View style={{ marginLeft: 16 }}>
            {userPhoto ? (
              <Image source={{ uri: userPhoto }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ) : (
              <Ionicons name="person-circle" size={36} color={COLORS.primary} />
            )}
          </View>
        ),
      }} />
      <Tab.Screen name="Likes" component={LikesScreen} options={{ 
        tabBarLabel: 'Likes',
        headerShown: true,
        headerTitle: 'Likes',
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: COLORS.white },
        headerTitleStyle: { color: COLORS.text, fontWeight: 'bold', fontSize: 18 },
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            {userPhoto ? (
              <Image source={{ uri: userPhoto }} style={{ width: 32, height: 32, borderRadius: 16 }} />
            ) : (
              <Ionicons name="person-circle-outline" size={28} color={COLORS.primary} />
            )}
          </View>
        ),
      }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ 
        headerShown: true,
        headerTitle: 'Messages',
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: COLORS.white },
        headerTitleStyle: { color: COLORS.text, fontWeight: 'bold', fontSize: 18 },
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            {userPhoto ? (
              <Image source={{ uri: userPhoto }} style={{ width: 32, height: 32, borderRadius: 16 }} />
            ) : (
              <Ionicons name="person-circle-outline" size={28} color={COLORS.primary} />
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
    height: 85,
    paddingBottom: 20,
    paddingTop: 5,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 0,
  },
});
