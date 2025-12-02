import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { IDVerificationScreen } from '../screens/auth/IDVerificationScreen';
import { SelfieVerificationScreen } from '../screens/auth/SelfieVerificationScreen';
import { HomeScreen } from '../screens/main/HomeScreen';
import { MessagesScreen } from '../screens/main/MessagesScreen';
import { ChatScreen } from '../screens/main/ChatScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { VideoCallScreen } from '../screens/main/VideoCallScreen';
import { EventsScreen } from '../screens/main/EventsScreen';
import { LikesScreen } from '../screens/main/LikesScreen';
import { PersonalityQuizScreen } from '../screens/profile/PersonalityQuizScreen';
import { DealbreakersScreen } from '../screens/profile/DealbreakersScreen';
import { COLORS, SHADOWS } from '../constants/theme';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  IDVerification: { formData: any };
  SelfieVerification: { formData: any };
  MainTabs: undefined;
  Chat: { matchId: string; name: string };
  VideoCall: { matchId: string; userName: string; userPhoto: string; isIncoming?: boolean };
  Events: undefined;
  PersonalityQuiz: undefined;
  Dealbreakers: undefined;
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
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
      })}
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
        <Stack.Screen name="IDVerification" component={IDVerificationScreen} />
        <Stack.Screen name="SelfieVerification" component={SelfieVerificationScreen} />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 0,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
    ...SHADOWS.small,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
