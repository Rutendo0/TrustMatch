import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EmergencyButton } from '../../components/safety/EmergencyButton';
import { LocationShare } from '../../components/safety/LocationShare';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const SAFETY_TIPS = [
  { icon: 'people-outline' as const,    tip: 'Always meet for the first time in a public place.' },
  { icon: 'call-outline' as const,      tip: 'Tell a friend or family member where you\'re going and who you\'re meeting.' },
  { icon: 'card-outline' as const,      tip: 'Never share financial information or send money to someone you haven\'t met.' },
  { icon: 'car-outline' as const,       tip: 'Arrange your own transport — don\'t rely on your date for a ride home.' },
  { icon: 'wine-outline' as const,      tip: 'Watch your drink and never leave it unattended.' },
  { icon: 'heart-outline' as const,     tip: 'Trust your instincts. If something feels off, leave.' },
  { icon: 'shield-outline' as const,    tip: 'Use the in-app report feature if someone makes you uncomfortable.' },
  { icon: 'phone-portrait-outline' as const, tip: 'Keep your phone charged before going on a date.' },
];

export const SafetyCenterScreen: React.FC<Props> = ({ navigation }) => {
  const [locationShareActive, setLocationShareActive] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="shield-checkmark" size={22} color="#fff" />
          <Text style={styles.headerTitle}>Safety Center</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Emergency section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency</Text>
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyInfo}>
              <Ionicons name="warning" size={28} color={COLORS.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emergencyTitle}>Feel unsafe?</Text>
                <Text style={styles.emergencySubtitle}>
                  Tap the shield to call emergency services, alert your contacts, or block a user instantly.
                </Text>
              </View>
            </View>
            <View style={styles.emergencyBtnRow}>
              <EmergencyButton
                onEmergencyActivated={() => {
                  // Could navigate back or show confirmation
                }}
              />
              <Text style={styles.emergencyBtnLabel}>Tap for safety options</Text>
            </View>
          </View>
        </View>

        {/* Location sharing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Sharing</Text>
          <View style={styles.card}>
            <Text style={styles.cardDesc}>
              Tap the button below to share your live location with your emergency contact for 2 hours. No setup needed — it uses the contact you saved in your profile.
            </Text>
            <LocationShare
              onShareStarted={() => setLocationShareActive(true)}
              onShareEnded={() => setLocationShareActive(false)}
            />
          </View>
        </View>

        {/* Safety tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          <View style={styles.card}>
            {SAFETY_TIPS.map((item, i) => (
              <View key={i} style={[styles.tipRow, i < SAFETY_TIPS.length - 1 && styles.tipBorder]}>
                <View style={styles.tipIcon}>
                  <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.tipText}>{item.tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Report / block */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report & Block</Text>
          <View style={styles.card}>
            <Text style={styles.cardDesc}>
              If someone is making you uncomfortable, you can report or block them from their profile. Our safety team reviews every report.
            </Text>
            <View style={styles.reportRow}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.reportText}>All reports are reviewed within 24 hours</Text>
            </View>
            <View style={styles.reportRow}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.reportText}>Blocked users can never contact you again</Text>
            </View>
            <View style={styles.reportRow}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.reportText}>Your identity is kept anonymous in reports</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#fff' },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  section: { gap: SPACING.sm },
  sectionTitle: {
    fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  card: {
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg, ...SHADOWS.card,
  },
  cardDesc: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary,
    lineHeight: 20, marginBottom: SPACING.md,
  },
  emergencyCard: {
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    ...SHADOWS.card,
  },
  emergencyInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  emergencyTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.error, marginBottom: 4 },
  emergencySubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 18 },
  emergencyBtnRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  emergencyBtnLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, paddingVertical: SPACING.sm },
  tipBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tipIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  tipText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.text, lineHeight: 20 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  reportText: { fontSize: FONTS.sizes.sm, color: COLORS.text },
});
