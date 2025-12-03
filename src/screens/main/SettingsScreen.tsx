import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

type SettingsScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

interface SettingItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  type: 'toggle' | 'link' | 'action';
  value?: boolean;
  onPress?: () => void;
  danger?: boolean;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState(true);
  const [matchNotifications, setMatchNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showDistance, setShowDistance] = useState(true);
  const [showAge, setShowAge] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [biometricLogin, setBiometricLogin] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],
          })
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deleted', 'Your account has been deleted.');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Welcome' }],
            });
          }
        },
      ]
    );
  };

  const settingSections = [
    {
      title: 'Account',
      items: [
        {
          id: 'edit-profile',
          icon: 'person-outline' as const,
          title: 'Edit Profile',
          subtitle: 'Update your photos and bio',
          type: 'link' as const,
          onPress: () => navigation.navigate('ProfileSetup', { formData: {} }),
        },
        {
          id: 'verification',
          icon: 'shield-checkmark-outline' as const,
          title: 'Verification Status',
          subtitle: 'ID verified, Selfie verified',
          type: 'link' as const,
          onPress: () => {},
        },
        {
          id: 'subscription',
          icon: 'diamond-outline' as const,
          title: 'Subscription',
          subtitle: 'Free Plan',
          type: 'link' as const,
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          id: 'notifications',
          icon: 'notifications-outline' as const,
          title: 'Push Notifications',
          type: 'toggle' as const,
          value: notifications,
          onPress: () => setNotifications(!notifications),
        },
        {
          id: 'match-notifications',
          icon: 'heart-outline' as const,
          title: 'New Match Alerts',
          type: 'toggle' as const,
          value: matchNotifications,
          onPress: () => setMatchNotifications(!matchNotifications),
        },
        {
          id: 'message-notifications',
          icon: 'chatbubble-outline' as const,
          title: 'Message Notifications',
          type: 'toggle' as const,
          value: messageNotifications,
          onPress: () => setMessageNotifications(!messageNotifications),
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          id: 'online-status',
          icon: 'ellipse' as const,
          title: 'Show Online Status',
          type: 'toggle' as const,
          value: showOnlineStatus,
          onPress: () => setShowOnlineStatus(!showOnlineStatus),
        },
        {
          id: 'show-distance',
          icon: 'location-outline' as const,
          title: 'Show Distance',
          type: 'toggle' as const,
          value: showDistance,
          onPress: () => setShowDistance(!showDistance),
        },
        {
          id: 'show-age',
          icon: 'calendar-outline' as const,
          title: 'Show Age',
          type: 'toggle' as const,
          value: showAge,
          onPress: () => setShowAge(!showAge),
        },
        {
          id: 'blocked-users',
          icon: 'ban-outline' as const,
          title: 'Blocked Users',
          subtitle: '0 blocked',
          type: 'link' as const,
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          id: 'biometric',
          icon: 'finger-print-outline' as const,
          title: 'Biometric Login',
          type: 'toggle' as const,
          value: biometricLogin,
          onPress: () => setBiometricLogin(!biometricLogin),
        },
        {
          id: 'change-password',
          icon: 'lock-closed-outline' as const,
          title: 'Change Password',
          type: 'link' as const,
          onPress: () => {},
        },
        {
          id: 'two-factor',
          icon: 'key-outline' as const,
          title: 'Two-Factor Authentication',
          subtitle: 'Not enabled',
          type: 'link' as const,
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          id: 'dark-mode',
          icon: 'moon-outline' as const,
          title: 'Dark Mode',
          type: 'toggle' as const,
          value: darkMode,
          onPress: () => setDarkMode(!darkMode),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          icon: 'help-circle-outline' as const,
          title: 'Help Center',
          type: 'link' as const,
          onPress: () => {},
        },
        {
          id: 'safety',
          icon: 'shield-outline' as const,
          title: 'Safety Tips',
          type: 'link' as const,
          onPress: () => {},
        },
        {
          id: 'report',
          icon: 'flag-outline' as const,
          title: 'Report a Problem',
          type: 'link' as const,
          onPress: () => {},
        },
        {
          id: 'terms',
          icon: 'document-text-outline' as const,
          title: 'Terms of Service',
          type: 'link' as const,
          onPress: () => {},
        },
        {
          id: 'privacy-policy',
          icon: 'eye-outline' as const,
          title: 'Privacy Policy',
          type: 'link' as const,
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        {
          id: 'logout',
          icon: 'log-out-outline' as const,
          title: 'Log Out',
          type: 'action' as const,
          onPress: handleLogout,
          danger: false,
        },
        {
          id: 'delete',
          icon: 'trash-outline' as const,
          title: 'Delete Account',
          type: 'action' as const,
          onPress: handleDeleteAccount,
          danger: true,
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.type === 'toggle' ? undefined : item.onPress}
      disabled={item.type === 'toggle'}
    >
      <View style={[styles.iconContainer, item.danger && styles.dangerIcon]}>
        <Ionicons 
          name={item.icon} 
          size={22} 
          color={item.danger ? COLORS.error : COLORS.primary} 
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, item.danger && styles.dangerText]}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      {item.type === 'toggle' && (
        <Switch
          value={item.value}
          onValueChange={item.onPress}
          trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
          thumbColor={item.value ? COLORS.primary : COLORS.textLight}
        />
      )}
      {item.type === 'link' && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {settingSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map(renderSettingItem)}
            </View>
          </View>
        ))}

        <Text style={styles.version}>TrustMatch v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.lg,
    ...SHADOWS.small,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  dangerIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  dangerText: {
    color: COLORS.error,
  },
  settingSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  version: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
});
