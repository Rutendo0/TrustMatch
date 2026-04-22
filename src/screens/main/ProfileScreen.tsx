import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, VerifiedBadge } from '../../components/common';
import { LiveVerificationBadge } from '../../components/verification/LiveVerificationBadge';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useResponsive, normalize, MIN_TOUCH_SIZE, HIT_SLOP, wp, hp } from '../../hooks/useResponsive';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { api } from '../../services/api';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showDistance, setShowDistance] = useState(true);
  const { isSmall, isTablet } = useResponsive();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [likesCount, setLikesCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);

  useEffect(() => {
    fetchProfile();
    fetchLikesAndMatches();
  }, []);

  // Refresh profile data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
      fetchLikesAndMatches();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const profileData = await api.getProfile();
      setUser(profileData);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikesAndMatches = async () => {
    try {
      const [likes, matches] = await Promise.all([
        api.getLikes(),
        api.getMatches()
      ]);
      setLikesCount(Array.isArray(likes) ? likes.length : 0);
      setMatchesCount(Array.isArray(matches) ? matches.length : 0);
    } catch (error) {
      console.error('Failed to fetch likes/matches:', error);
    }
  };

  // Helper to compute age from dateOfBirth
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Helper to get user display name
  const getUserName = () => {
    if (!user) return 'User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.firstName || 'User';
  };

  // Helper to get user location
  const getUserLocation = () => {
    if (!user) return 'Location not set';
    if (user.city && user.country) {
      return `${user.city}, ${user.country}`;
    }
    return user.city || user.country || 'Location not set';
  };

  // Helper to get user age
  const getUserAge = () => {
    if (!user || !user.dateOfBirth) return null;
    return calculateAge(user.dateOfBirth);
  };

  // Helper to check if verified
  const isUserVerified = () => {
    if (!user) return false;
    return user.verification?.isVerified || false;
  };

  // Helper to get first photo
  const getFirstPhoto = () => {
    if (!user || !user.photos || user.photos.length === 0) return null;
    return user.photos[0]?.url || null;
  };

  // Helper to get all photos
  const getAllPhotos = () => {
    if (!user || !user.photos || user.photos.length === 0) return [];
    return user.photos.map((p: any) => p?.url).filter(Boolean);
  };

  // Show loading state
  if (loading || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const menuItems = [
    { icon: 'settings-outline', label: 'Settings', route: 'Settings' },
    { icon: 'shield-checkmark-outline', label: 'Safety Center', route: 'Safety' },
    { icon: 'help-circle-outline', label: 'Help & Support', route: 'Help' },
    { icon: 'document-text-outline', label: 'Terms & Privacy', route: 'Terms' },
  ];

  const photoSize = isTablet ? wp(25) : isSmall ? wp(28) : wp(32);
  const addButtonSize = Math.max(MIN_TOUCH_SIZE, normalize(36));

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity 
              style={styles.editButton}
              hitSlop={HIT_SLOP}
              accessibilityLabel="Edit profile"
              accessibilityRole="button"
              onPress={() => navigation.navigate('ProfileSetup', { formData: user })}
            >
              <Ionicons name="create-outline" size={normalize(24)} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.photoContainer}>
              <Image 
                source={{ uri: getFirstPhoto() || 'https://via.placeholder.com/150' }} 
                style={[
                  styles.mainPhoto,
                  { width: photoSize, height: photoSize, borderRadius: photoSize / 2 }
                ]} 
              />
              <TouchableOpacity 
                style={[
                  styles.addPhotoButton,
                  { width: addButtonSize, height: addButtonSize, borderRadius: addButtonSize / 2 }
                ]}
                hitSlop={HIT_SLOP}
                accessibilityLabel="Add photo"
                accessibilityRole="button"
                onPress={() => {
                  // TODO: Implement photo picker functionality
                  // Photo picker functionality will be implemented here
                }}
              >
                <Ionicons name="camera" size={normalize(18)} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.nameSection}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{getUserName()}{getUserAge() ? `, ${getUserAge()}` : ''}</Text>
                <VerifiedBadge isVerified={isUserVerified()} showLabel size="medium" />
              </View>
              <Text style={styles.location}>
                <Ionicons name="location" size={normalize(14)} color={COLORS.textSecondary} /> {getUserLocation()}
              </Text>
            </View>

            <Text style={styles.bio}>{user.bio || 'No bio added yet. Tap edit to add your bio!'}</Text>

            {/* Profile Details Section */}
            {(user.occupation || user.education || user.relationshipGoal || user.aboutMe || (user.interests && user.interests.length > 0) || user.city || user.country) && (
              <View style={styles.profileDetailsSection}>
                {(user.city || user.country) && (
                  <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={normalize(18)} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{user.city}{user.city && user.country ? ', ' : ''}{user.country}</Text>
                  </View>
                )}
                {user.occupation && (
                  <View style={styles.detailItem}>
                    <Ionicons name="briefcase-outline" size={normalize(18)} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{user.occupation}</Text>
                  </View>
                )}
                {user.education && (
                  <View style={styles.detailItem}>
                    <Ionicons name="school-outline" size={normalize(18)} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{user.education}</Text>
                  </View>
                )}
                {user.relationshipGoal && (
                  <View style={styles.detailItem}>
                    <Ionicons name="heart-outline" size={normalize(18)} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>Looking for: {user.relationshipGoal}</Text>
                  </View>
                )}
                {user.aboutMe && (
                  <View style={styles.detailItem}>
                    <Ionicons name="person-outline" size={normalize(18)} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{user.aboutMe}</Text>
                  </View>
                )}
                {user.interests && user.interests.length > 0 && (
                  <View style={styles.interestsContainer}>
                    <Ionicons name="sparkles-outline" size={normalize(18)} color={COLORS.textSecondary} />
                    <View style={styles.interestsList}>
                      {user.interests.slice(0, 5).map((interest: string, index: number) => (
                        <View key={index} style={styles.interestTag}>
                          <Text style={styles.interestText}>{interest}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{likesCount}</Text>
                <Text style={styles.statLabel}>Likes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{matchesCount}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{user?.trustScore || user?.verification?.trustScore || 0}%</Text>
                <Text style={styles.statLabel}>Profile Score</Text>
              </View>
            </View>
          </View>

          <Card style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <View style={styles.verificationIcon}>
                <Ionicons name="shield-checkmark" size={normalize(24)} color={COLORS.success} />
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
                <Ionicons 
                  name={user?.verification?.idVerified ? "checkmark-circle" : "close-circle"} 
                  size={normalize(16)} 
                  color={user?.verification?.idVerified ? COLORS.success : COLORS.textSecondary} 
                />
                <Text style={styles.badgeText}>ID Verified</Text>
              </View>
              <View style={styles.badgeItem}>
                <Ionicons 
                  name={user?.verification?.selfieVerified ? "checkmark-circle" : "close-circle"} 
                  size={normalize(16)} 
                  color={user?.verification?.selfieVerified ? COLORS.success : COLORS.textSecondary} 
                />
                <Text style={styles.badgeText}>Selfie Matched</Text>
              </View>
              <View style={styles.badgeItem}>
                <Ionicons 
                  name={user?.phone ? "checkmark-circle" : "close-circle"} 
                  size={normalize(16)} 
                  color={user?.phone ? COLORS.success : COLORS.textSecondary} 
                />
                <Text style={styles.badgeText}>Phone Verified</Text>
              </View>
              {user?.verification?.liveVerified && (
                <View style={styles.badgeItem}>
                  <Ionicons 
                    name="shield-checkmark" 
                    size={normalize(16)} 
                    color={COLORS.success} 
                  />
                  <Text style={styles.badgeText}>Live Verified</Text>
                </View>
              )}
            </View>
          </Card>

          {/* Live Verification Badge */}
          <LiveVerificationBadge
            style={styles.liveVerificationBadge}
            onVerificationComplete={(result) => {
              console.log('Live verification completed:', result);
              // Refresh profile to show updated verification status
              fetchProfile();
            }}
          />

          <Card style={styles.preferencesCard}>
            <Text style={styles.sectionTitle}>Discovery Preferences</Text>
            
            <TouchableOpacity 
              style={styles.preferenceItem}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              onPress={() => {
                navigation.navigate('Filters');
              }}
            >
              <View style={styles.preferenceLabel}>
                <Ionicons name="people" size={normalize(20)} color={COLORS.textSecondary} />
                <Text style={styles.preferenceText}>Show Me</Text>
              </View>
              <Text style={styles.preferenceValue}>{user.preferences?.interestedIn === 'FEMALE' ? 'Women' : user.preferences?.interestedIn === 'MALE' ? 'Men' : 'Men'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.preferenceItem}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              onPress={() => {
                navigation.navigate('Filters');
              }}
            >
              <View style={styles.preferenceLabel}>
                <Ionicons name="calendar" size={normalize(20)} color={COLORS.textSecondary} />
                <Text style={styles.preferenceText}>Age Range</Text>
              </View>
              <Text style={styles.preferenceValue}>
                {user.preferences?.ageRangeMin || 18} - {user.preferences?.ageRangeMax || 50}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.preferenceItem}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              onPress={() => {
                navigation.navigate('Filters');
              }}
            >
              <View style={styles.preferenceLabel}>
                <Ionicons name="location" size={normalize(20)} color={COLORS.textSecondary} />
                <Text style={styles.preferenceText}>Maximum Distance</Text>
              </View>
              <Text style={styles.preferenceValue}>{user.preferences?.maxDistance || 25} km</Text>
            </TouchableOpacity>
          </Card>

          {/* My Photos Section */}
          <Card style={styles.preferencesCard}>
            <Text style={styles.sectionTitle}>My Photos</Text>
            <View style={styles.photosGrid}>
              {getAllPhotos().map((photoUrl: string, index: number) => (
                <TouchableOpacity key={index} style={styles.photoItem}>
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.photoThumbnail}
                  />
                </TouchableOpacity>
              ))}
              {getAllPhotos().length === 0 && (
                <Text style={styles.emptyText}>No photos added yet</Text>
              )}
            </View>
          </Card>

          <Card style={styles.settingsCard}>
            <Text style={styles.sectionTitle}>Settings</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLabel}>
                <Ionicons name="notifications" size={normalize(20)} color={COLORS.textSecondary} />
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
                <Ionicons name="eye" size={normalize(20)} color={COLORS.textSecondary} />
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
              <TouchableOpacity 
                key={index} 
                style={styles.menuItem}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => {
                  switch (item.route) {
                    case 'Settings':
                      navigation.navigate('Settings');
                      break;
                    case 'Safety':
                      // TODO: Navigate to Safety Center
                      // Safety Center navigation will be implemented here
                      break;
                    case 'Help':
                      // TODO: Navigate to Help & Support
                      // Help & Support navigation will be implemented here
                      break;
                    case 'Terms':
                      // TODO: Navigate to Terms & Privacy
                      // Terms & Privacy navigation will be implemented here
                      break;
                    default:
                      // Unknown route handling will be implemented here
                  }
                }}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons
                    name={item.icon as any}
                    size={normalize(22)}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={normalize(20)} color={COLORS.textLight} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.logoutButton}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={() => {
              // TODO: Implement logout functionality
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
            }}
          >
            <Ionicons name="log-out-outline" size={normalize(22)} color={COLORS.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={styles.version}>TrustMatch v1.0.0</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.textSecondary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: hp(2),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: normalize(SPACING.lg),
    paddingVertical: normalize(SPACING.md),
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: normalize(FONTS.sizes.xxl),
    fontWeight: 'bold',
    color: COLORS.text,
  },
  editButton: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(22),
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: normalize(SPACING.lg),
    paddingBottom: normalize(SPACING.lg),
    alignItems: 'center',
  },
  photoContainer: {
    position: 'relative',
    marginBottom: normalize(SPACING.md),
  },
  mainPhoto: {
    borderWidth: normalize(3),
    borderColor: COLORS.primary,
  },
  addPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: normalize(3),
    borderColor: COLORS.white,
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: normalize(SPACING.sm),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(SPACING.sm),
    marginBottom: normalize(SPACING.xs),
  },
  name: {
    fontSize: normalize(FONTS.sizes.xl),
    fontWeight: 'bold',
    color: COLORS.text,
  },
  location: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.textSecondary,
  },
  bio: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: normalize(22),
    marginBottom: normalize(SPACING.lg),
    paddingHorizontal: normalize(SPACING.sm),
  },
  profileDetailsSection: {
    marginBottom: normalize(SPACING.md),
    paddingHorizontal: normalize(SPACING.sm),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(SPACING.sm),
  },
  detailText: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.text,
    marginLeft: normalize(SPACING.sm),
  },
  interestsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: normalize(SPACING.xs),
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: normalize(SPACING.sm),
    marginTop: normalize(2),
  },
  interestTag: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: normalize(SPACING.sm),
    paddingVertical: normalize(4),
    borderRadius: normalize(12),
    marginRight: normalize(6),
    marginBottom: normalize(4),
  },
  interestText: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.primary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: normalize(SPACING.lg),
  },
  statValue: {
    fontSize: normalize(FONTS.sizes.xl),
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: normalize(FONTS.sizes.xs),
    color: COLORS.textSecondary,
    marginTop: normalize(2),
  },
  statDivider: {
    width: 1,
    height: normalize(30),
    backgroundColor: COLORS.border,
  },
  verificationCard: {
    margin: normalize(SPACING.lg),
    marginBottom: normalize(SPACING.md),
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(SPACING.md),
    marginBottom: normalize(SPACING.md),
  },
  verificationIcon: {
    width: normalize(48),
    height: normalize(48),
    borderRadius: normalize(24),
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationText: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: normalize(FONTS.sizes.md),
    fontWeight: '600',
    color: COLORS.success,
  },
  verificationSubtitle: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.textSecondary,
  },
  verificationBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(SPACING.sm),
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(SPACING.xs),
    backgroundColor: COLORS.white,
    paddingVertical: normalize(SPACING.xs),
    paddingHorizontal: normalize(SPACING.sm),
    borderRadius: BORDER_RADIUS.full,
  },
  badgeText: {
    fontSize: normalize(FONTS.sizes.xs),
    color: COLORS.success,
    fontWeight: '500',
  },
  preferencesCard: {
    marginHorizontal: normalize(SPACING.lg),
    marginBottom: normalize(SPACING.md),
  },
  sectionTitle: {
    fontSize: normalize(FONTS.sizes.md),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: normalize(SPACING.md),
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingVertical: normalize(SPACING.sm),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(SPACING.sm),
  },
  photoItem: {
    width: normalize(80),
    height: normalize(80),
    borderRadius: normalize(8),
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  emptyText: {
    fontSize: normalize(FONTS.sizes.sm),
    color: COLORS.textSecondary,
    textAlign: 'center',
    width: '100%',
    paddingVertical: normalize(SPACING.md),
  },
  preferenceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(SPACING.sm),
  },
  preferenceText: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.text,
  },
  preferenceValue: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.primary,
    fontWeight: '500',
  },
  settingsCard: {
    marginHorizontal: normalize(SPACING.lg),
    marginBottom: normalize(SPACING.md),
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingVertical: normalize(SPACING.sm),
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(SPACING.sm),
  },
  settingText: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.text,
  },
  menuSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: normalize(SPACING.lg),
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: normalize(SPACING.md),
    ...SHADOWS.small,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingVertical: normalize(SPACING.md),
    paddingHorizontal: normalize(SPACING.md),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(SPACING.md),
  },
  menuItemText: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(SPACING.sm),
    marginHorizontal: normalize(SPACING.lg),
    minHeight: MIN_TOUCH_SIZE,
    paddingVertical: normalize(SPACING.md),
    marginBottom: normalize(SPACING.md),
  },
  logoutText: {
    fontSize: normalize(FONTS.sizes.md),
    color: COLORS.error,
    fontWeight: '600',
  },
  version: {
    fontSize: normalize(FONTS.sizes.xs),
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: normalize(SPACING.xl),
  },
  liveVerificationBadge: {
    marginHorizontal: normalize(SPACING.lg),
    marginBottom: normalize(SPACING.md),
  },
});
