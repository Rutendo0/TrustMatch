import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, VerifiedBadge } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showDistance, setShowDistance] = useState(true);

  const user = {
    name: 'Alex Johnson',
    age: 28,
    bio: 'Software developer by day, adventurer by heart. Love hiking, photography, and good conversations.',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    ],
    isVerified: true,
    location: 'San Francisco, CA',
    preferences: {
      ageRange: { min: 24, max: 35 },
      distance: 25,
      showMe: 'Women',
    },
  };

  const menuItems = [
    { icon: 'settings-outline', label: 'Settings', route: 'Settings' },
    { icon: 'shield-checkmark-outline', label: 'Safety Center', route: 'Safety' },
    { icon: 'help-circle-outline', label: 'Help & Support', route: 'Help' },
    { icon: 'document-text-outline', label: 'Terms & Privacy', route: 'Terms' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.photoContainer}>
            <Image source={{ uri: user.photos[0] }} style={styles.mainPhoto} />
            <TouchableOpacity style={styles.addPhotoButton}>
              <Ionicons name="camera" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user.name}, {user.age}</Text>
              <VerifiedBadge isVerified={user.isVerified} showLabel size="medium" />
            </View>
            <Text style={styles.location}>
              <Ionicons name="location" size={14} color={COLORS.textSecondary} /> {user.location}
            </Text>
          </View>

          <Text style={styles.bio}>{user.bio}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>156</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>42</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>89%</Text>
              <Text style={styles.statLabel}>Profile Score</Text>
            </View>
          </View>
        </View>

        <Card style={styles.verificationCard}>
          <View style={styles.verificationHeader}>
            <View style={styles.verificationIcon}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.success} />
            </View>
            <View style={styles.verificationText}>
              <Text style={styles.verificationTitle}>Identity Verified</Text>
              <Text style={styles.verificationSubtitle}>
                Your profile is verified and trusted
              </Text>
            </View>
          </View>
          <View style={styles.verificationBadges}>
            <View style={styles.badgeItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.badgeText}>ID Verified</Text>
            </View>
            <View style={styles.badgeItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.badgeText}>Selfie Matched</Text>
            </View>
            <View style={styles.badgeItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.badgeText}>Phone Verified</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.preferencesCard}>
          <Text style={styles.sectionTitle}>Discovery Preferences</Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLabel}>
              <Ionicons name="people" size={20} color={COLORS.textSecondary} />
              <Text style={styles.preferenceText}>Show Me</Text>
            </View>
            <Text style={styles.preferenceValue}>{user.preferences.showMe}</Text>
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLabel}>
              <Ionicons name="calendar" size={20} color={COLORS.textSecondary} />
              <Text style={styles.preferenceText}>Age Range</Text>
            </View>
            <Text style={styles.preferenceValue}>
              {user.preferences.ageRange.min} - {user.preferences.ageRange.max}
            </Text>
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceLabel}>
              <Ionicons name="location" size={20} color={COLORS.textSecondary} />
              <Text style={styles.preferenceText}>Maximum Distance</Text>
            </View>
            <Text style={styles.preferenceValue}>{user.preferences.distance} km</Text>
          </View>
        </Card>

        <Card style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <Ionicons name="notifications" size={20} color={COLORS.textSecondary} />
              <Text style={styles.settingText}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={notificationsEnabled ? COLORS.primary : COLORS.textLight}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <Ionicons name="eye" size={20} color={COLORS.textSecondary} />
              <Text style={styles.settingText}>Show Distance</Text>
            </View>
            <Switch
              value={showDistance}
              onValueChange={setShowDistance}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={showDistance ? COLORS.primary : COLORS.textLight}
            />
          </View>
        </Card>

        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },
  photoContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  mainPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  addPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  name: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  location: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  bio: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  statValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  verificationCard: {
    margin: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  verificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationText: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.success,
  },
  verificationSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  verificationBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
    fontWeight: '500',
  },
  preferencesCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  preferenceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  preferenceText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  preferenceValue: {
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  settingsCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  settingText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  menuSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuItemText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  logoutText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.error,
    fontWeight: '600',
  },
  version: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
});
