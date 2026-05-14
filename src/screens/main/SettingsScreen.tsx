import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

type Props = { navigation: NativeStackNavigationProp<any> };

// ─── Preference keys stored locally ──────────────────────────────────────────
const PREFS_KEY = 'trustmatch_user_prefs_v1';

interface UserPrefs {
  pushNotifications: boolean;
  matchAlerts: boolean;
  messageAlerts: boolean;
  showOnlineStatus: boolean;
  showAge: boolean;
}

const DEFAULT_PREFS: UserPrefs = {
  pushNotifications: true,
  matchAlerts: true,
  messageAlerts: true,
  showOnlineStatus: true,
  showAge: true,
};

// ─── Change Password Modal ────────────────────────────────────────────────────
const ChangePasswordModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const reset = () => {
    setCurrent(''); setNext(''); setConfirm('');
    setShowCurrent(false); setShowNext(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!current || !next || !confirm) {
      Alert.alert('Missing Fields', 'Please fill in all fields.'); return;
    }
    if (next.length < 8) {
      Alert.alert('Too Short', 'New password must be at least 8 characters.'); return;
    }
    if (next !== confirm) {
      Alert.alert('Mismatch', 'New passwords do not match.'); return;
    }
    setLoading(true);
    try {
      await api.changePassword(current, next);
      Alert.alert('Password Changed', 'Your password has been updated. Please log in again on all devices.', [
        { text: 'OK', onPress: handleClose },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to change password.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Change Password</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {(['Current Password', 'New Password', 'Confirm New Password'] as const).map((label, i) => {
            const value = i === 0 ? current : i === 1 ? next : confirm;
            const setter = i === 0 ? setCurrent : i === 1 ? setNext : setConfirm;
            const show = i === 0 ? showCurrent : showNext;
            const toggleShow = i === 0
              ? () => setShowCurrent(v => !v)
              : i === 1 ? () => setShowNext(v => !v) : undefined;

            return (
              <View key={label} style={modal.fieldWrap}>
                <Text style={modal.label}>{label}</Text>
                <View style={modal.inputRow}>
                  <TextInput
                    style={modal.input}
                    value={value}
                    onChangeText={setter}
                    secureTextEntry={!show}
                    placeholder={label}
                    placeholderTextColor={COLORS.textLight}
                    autoCapitalize="none"
                  />
                  {toggleShow && (
                    <TouchableOpacity onPress={toggleShow} style={modal.eyeBtn}>
                      <Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[modal.btn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={modal.btnText}>Update Password</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Blocked Users Modal ──────────────────────────────────────────────────────
const BlockedUsersModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={modal.overlay}>
      <View style={modal.sheet}>
        <View style={modal.header}>
          <Text style={modal.title}>Blocked Users</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: SPACING.xl }}>
          <Ionicons name="ban-outline" size={48} color={COLORS.textLight} />
          <Text style={{ marginTop: SPACING.md, color: COLORS.textSecondary, fontSize: FONTS.sizes.md }}>
            No blocked users
          </Text>
          <Text style={{ marginTop: SPACING.xs, color: COLORS.textLight, fontSize: FONTS.sizes.sm, textAlign: 'center' }}>
            Users you block will appear here.{'\n'}You can block someone from their profile.
          </Text>
        </View>
      </View>
    </View>
  </Modal>
);

// ─── Verification Status Modal ────────────────────────────────────────────────
const VerificationModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  verification: any;
}> = ({ visible, onClose, verification }) => {
  // Compute TrustScore using the same model as the server:
  // email=20 (base), id=35, face scaled to 35, photo=10
  const rawFace   = verification?.faceMatchScore ?? 0;
  const facePoints = Math.round((rawFace / 100) * 35);
  const idPoints   = verification?.idVerified     ? 35 : 0;
  const photoPoints = 10; // flat — main photo verified
  const trustScore  = 20 + idPoints + facePoints + photoPoints;

  const scoreColor =
    trustScore >= 80 ? COLORS.success :
    trustScore >= 60 ? '#F59E0B' :
    COLORS.error;

  const checks = [
    {
      label: 'Email Verified',
      sublabel: 'Email address confirmed',
      icon: 'mail-outline' as const,
      done: true, // always true — required to reach this point
      pts: 20,
    },
    {
      label: 'Identity Document',
      sublabel: verification?.idDocumentType
        ? verification.idDocumentType.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
        : 'ID document',
      icon: 'card-outline' as const,
      done: !!verification?.idVerified,
      pts: 35,
    },
    {
      label: 'Face Verification',
      sublabel: rawFace > 0 ? `${Math.round(rawFace)}% selfie match` : 'Selfie vs ID',
      icon: 'person-circle-outline' as const,
      done: !!verification?.selfieVerified,
      pts: facePoints,
    },
    {
      label: 'Profile Photo',
      sublabel: 'Main photo verified',
      icon: 'images-outline' as const,
      done: !!verification?.idVerified, // photo check only passes if ID passed
      pts: photoPoints,
    },
    {
      label: 'Live Verified',
      sublabel: 'Periodic liveness check',
      icon: 'videocam-outline' as const,
      done: !!verification?.liveVerified,
      pts: null, // bonus, not in base score
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Verification Status</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* TrustScore summary */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
            backgroundColor: scoreColor + '12', borderRadius: BORDER_RADIUS.lg,
            padding: SPACING.md, marginBottom: SPACING.lg,
          }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              borderWidth: 3, borderColor: scoreColor,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: COLORS.white,
            }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: scoreColor }}>{trustScore}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text }}>
                TrustScore
              </Text>
              <Text style={{ fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 }}>
                {trustScore >= 80 ? 'Excellent — fully verified' :
                 trustScore >= 60 ? 'Good — most checks passed' :
                 'Fair — complete more steps'}
              </Text>
            </View>
          </View>

          {/* Check rows */}
          <View style={{ gap: SPACING.sm }}>
            {checks.map(c => (
              <View key={c.label} style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
                backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md,
                padding: SPACING.sm,
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: c.done ? COLORS.success + '20' : COLORS.border + '60',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons
                    name={c.done ? c.icon : 'ellipse-outline'}
                    size={18}
                    color={c.done ? COLORS.success : COLORS.textLight}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FONTS.sizes.sm, fontWeight: '600', color: c.done ? COLORS.text : COLORS.textSecondary }}>
                    {c.label}
                  </Text>
                  <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 1 }}>
                    {c.sublabel}
                  </Text>
                </View>
                <Text style={{
                  fontSize: FONTS.sizes.sm, fontWeight: '700',
                  color: c.done ? COLORS.success : COLORS.textLight,
                }}>
                  {c.done
                    ? (c.pts !== null ? `+${c.pts}` : '✓')
                    : (c.pts !== null ? `+0/${c.pts}` : 'Pending')}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Report Problem Modal ─────────────────────────────────────────────────────
const ReportModal: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!text.trim()) { Alert.alert('Empty', 'Please describe the problem.'); return; }
    setSent(true);
    setTimeout(() => { setSent(false); setText(''); onClose(); }, 1500);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Report a Problem</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          {sent ? (
            <View style={{ alignItems: 'center', paddingVertical: SPACING.xl }}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              <Text style={{ marginTop: SPACING.md, color: COLORS.success, fontWeight: '600', fontSize: FONTS.sizes.md }}>
                Report sent. Thank you!
              </Text>
            </View>
          ) : (
            <>
              <Text style={modal.label}>Describe the issue</Text>
              <TextInput
                style={[modal.input, { height: 120, textAlignVertical: 'top', marginBottom: SPACING.lg }]}
                value={text}
                onChangeText={setText}
                placeholder="Tell us what went wrong..."
                placeholderTextColor={COLORS.textLight}
                multiline
              />
              <TouchableOpacity style={modal.btn} onPress={handleSend}>
                <Text style={modal.btnText}>Send Report</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const C = colors; // shorthand

  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [verification, setVerification] = useState<any>(null);

  // Modals
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Load saved prefs + verification on mount
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await SecureStore.getItemAsync(PREFS_KEY);
        if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
      } catch {}
      try {
        const profile = await api.getProfile();
        setVerification(profile?.verification ?? null);
      } catch {}
    };
    load();
  }, []);

  const savePrefs = useCallback(async (updated: UserPrefs) => {
    setPrefs(updated);
    try {
      await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(updated));
    } catch {}
  }, []);

  const toggle = (key: keyof UserPrefs) =>
    savePrefs({ ...prefs, [key]: !prefs[key] });

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          await api.logout();
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Are you absolutely sure?',
              'Type DELETE to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete', style: 'destructive',
                  onPress: async () => {
                    try {
                      await api.deleteAccount();
                    } catch {}
                    await api.logout();
                    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
                  },
                },
              ]
            ),
        },
      ]
    );
  };

  // ── Section definitions ──────────────────────────────────────────────────
  const sections = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline' as const,
          title: 'Edit Profile',
          subtitle: 'Update your photos, bio and details',
          type: 'link' as const,
          onPress: () => navigation.navigate('ProfileSetup', { formData: {} }),
        },
        {
          icon: 'options-outline' as const,
          title: 'Discovery Preferences',
          subtitle: 'Age range, city, who you see',
          type: 'link' as const,
          onPress: () => navigation.navigate('Filters'),
        },
        {
          icon: 'shield-checkmark-outline' as const,
          title: 'Verification Status',
          subtitle: verification?.isVerified ? '✅ Fully verified' : 'Tap to see details',
          type: 'link' as const,
          onPress: () => setShowVerification(true),
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: 'notifications-outline' as const,
          title: 'Push Notifications',
          type: 'toggle' as const,
          value: prefs.pushNotifications,
          onToggle: () => toggle('pushNotifications'),
        },
        {
          icon: 'heart-outline' as const,
          title: 'New Match Alerts',
          type: 'toggle' as const,
          value: prefs.matchAlerts,
          onToggle: () => toggle('matchAlerts'),
        },
        {
          icon: 'chatbubble-outline' as const,
          title: 'Message Notifications',
          type: 'toggle' as const,
          value: prefs.messageAlerts,
          onToggle: () => toggle('messageAlerts'),
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: 'ellipse' as const,
          title: 'Show Online Status',
          type: 'toggle' as const,
          value: prefs.showOnlineStatus,
          onToggle: () => toggle('showOnlineStatus'),
        },
        {
          icon: 'calendar-outline' as const,
          title: 'Show Age on Profile',
          type: 'toggle' as const,
          value: prefs.showAge,
          onToggle: () => toggle('showAge'),
        },
        {
          icon: 'ban-outline' as const,
          title: 'Blocked Users',
          subtitle: 'Manage who you\'ve blocked',
          type: 'link' as const,
          onPress: () => setShowBlocked(true),
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          icon: 'lock-closed-outline' as const,
          title: 'Change Password',
          subtitle: 'Update your account password',
          type: 'link' as const,
          onPress: () => setShowChangePassword(true),
        },
      ],
    },

    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle-outline' as const,
          title: 'Help Center',
          subtitle: 'FAQs and guides',
          type: 'link' as const,
          onPress: () => Linking.openURL('mailto:support@trustmatch.app'),
        },
        {
          icon: 'shield-outline' as const,
          title: 'Safety Center',
          subtitle: 'Emergency, location sharing & tips',
          type: 'link' as const,
          onPress: () => navigation.navigate('SafetyCenter'),
        },
        {
          icon: 'flag-outline' as const,
          title: 'Report a Problem',
          subtitle: 'Something not working right?',
          type: 'link' as const,
          onPress: () => setShowReport(true),
        },
        {
          icon: 'document-text-outline' as const,
          title: 'Terms of Service',
          type: 'link' as const,
          onPress: () => Linking.openURL('https://trustmatch.app/terms'),
        },
        {
          icon: 'eye-outline' as const,
          title: 'Privacy Policy',
          type: 'link' as const,
          onPress: () => Linking.openURL('https://trustmatch.app/privacy'),
        },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        {
          icon: 'log-out-outline' as const,
          title: 'Log Out',
          type: 'action' as const,
          danger: false,
          onPress: handleLogout,
        },
        {
          icon: 'trash-outline' as const,
          title: 'Delete Account',
          subtitle: 'Permanently remove all your data',
          type: 'action' as const,
          danger: true,
          onPress: handleDeleteAccount,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.backgroundGray }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.white, borderBottomColor: C.border }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: C.background }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: C.white }]}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.title}
                  style={[
                    styles.row,
                    idx < section.items.length - 1 && [styles.rowBorder, { borderBottomColor: C.border }],
                  ]}
                  onPress={item.type !== 'toggle' ? (item as any).onPress : undefined}
                  activeOpacity={item.type === 'toggle' ? 1 : 0.7}
                >
                  <View style={[styles.iconWrap, (item as any).danger && styles.iconWrapDanger,
                    { backgroundColor: (item as any).danger ? C.errorLight : C.primarySoft }]}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={(item as any).danger ? C.error : C.primary}
                    />
                  </View>

                  <View style={styles.rowContent}>
                    <Text style={[styles.rowTitle, { color: (item as any).danger ? C.error : C.text }]}>
                      {item.title}
                    </Text>
                    {(item as any).subtitle && (
                      <Text style={[styles.rowSubtitle, { color: C.textSecondary }]}>{(item as any).subtitle}</Text>
                    )}
                  </View>

                  {item.type === 'toggle' && (
                    <Switch
                      value={(item as any).value}
                      onValueChange={(item as any).onToggle}
                      trackColor={{ false: C.border, true: C.primaryLight }}
                      thumbColor={(item as any).value ? C.primary : C.textLight}
                    />
                  )}
                  {item.type === 'link' && (
                    <Ionicons name="chevron-forward" size={18} color={C.textLight} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={[styles.version, { color: C.textLight }]}>TrustMatch v1.0.0</Text>
      </ScrollView>

      {/* Modals */}
      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
      <BlockedUsersModal
        visible={showBlocked}
        onClose={() => setShowBlocked(false)}
      />
      <VerificationModal
        visible={showVerification}
        onClose={() => setShowVerification(false)}
        verification={verification}
      />
      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
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
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text,
  },
  section: { marginTop: SPACING.lg },
  sectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.lg,
    ...SHADOWS.small,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.md,
  },
  iconWrapDanger: {
    backgroundColor: COLORS.errorLight,
  },
  rowContent: { flex: 1 },
  rowTitle: {
    fontSize: FONTS.sizes.md, fontWeight: '500', color: COLORS.text,
  },
  rowSubtitle: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2,
  },
  version: {
    fontSize: FONTS.sizes.sm, color: COLORS.textLight,
    textAlign: 'center', paddingVertical: SPACING.xl,
  },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text,
  },
  label: {
    fontSize: FONTS.sizes.sm, fontWeight: '600',
    color: COLORS.text, marginBottom: SPACING.xs,
  },
  fieldWrap: { marginBottom: SPACING.md },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  eyeBtn: {
    padding: SPACING.sm,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  btnText: {
    color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700',
  },
});
