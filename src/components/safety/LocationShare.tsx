import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const SHARE_DURATION_MINUTES = 120; // always 2 hours

interface LocationShareProps {
  onShareStarted?: (shareId: string) => void;
  onShareEnded?: () => void;
}

interface ActiveShare {
  id: string;
  contactName: string;
  contactPhone: string;
  expiresAt: Date;
}

export const LocationShare: React.FC<LocationShareProps> = ({
  onShareStarted,
  onShareEnded,
}) => {
  const [activeShare, setActiveShare] = useState<ActiveShare | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!activeShare) return;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((activeShare.expiresAt.getTime() - Date.now()) / 1000 / 60)
      );
      setTimeRemaining(remaining);
      if (remaining === 0) stopSharing();
    }, 10000); // update every 10s is enough
    // Set immediately on mount
    setTimeRemaining(
      Math.max(0, Math.floor((activeShare.expiresAt.getTime() - Date.now()) / 1000 / 60))
    );
    return () => clearInterval(interval);
  }, [activeShare]);

  const loadEmergencyContact = async (): Promise<{ name: string; phone: string } | null> => {
    try {
      const raw = await SecureStore.getItemAsync('emergency_contact');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const name = String(parsed?.name ?? '').trim();
      const phone = String(parsed?.phone ?? '').trim();
      if (!name || !phone) return null;
      return { name, phone };
    } catch {
      return null;
    }
  };

  const startSharing = async () => {
    setIsStarting(true);
    try {
      // 1. Load emergency contact
      const contact = await loadEmergencyContact();
      if (!contact) {
        Alert.alert(
          'No Emergency Contact',
          'Please add an emergency contact first. Go to Profile → Complete Profile → Step 5 (Safety First).'
        );
        return;
      }

      // 2. Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'TrustMatch needs location access to share your position with your emergency contact.'
        );
        return;
      }

      // 3. Get current position
      await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      // 4. Activate share
      const shareId = `share_${Date.now()}`;
      const expiresAt = new Date(Date.now() + SHARE_DURATION_MINUTES * 60 * 1000);

      setActiveShare({ id: shareId, contactName: contact.name, contactPhone: contact.phone, expiresAt });
      onShareStarted?.(shareId);

      Alert.alert(
        '📍 Location Sharing Active',
        `Your location is now being shared with ${contact.name} for 2 hours.`
      );
    } catch {
      Alert.alert('Error', 'Could not start location sharing. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const stopSharing = () => {
    setActiveShare(null);
    setTimeRemaining(null);
    onShareEnded?.();
  };

  // ── Active state ──────────────────────────────────────────────────────────
  if (activeShare) {
    return (
      <View style={styles.activeCard}>
        <View style={styles.activeHeader}>
          <View style={styles.pulsingDot} />
          <Text style={styles.activeTitle}>Location Sharing Active</Text>
        </View>
        <Text style={styles.activeContact}>
          Sharing with <Text style={styles.activeContactName}>{activeShare.contactName}</Text>
        </Text>
        <Text style={styles.activeTime}>
          {timeRemaining !== null ? `${timeRemaining} min remaining` : '2 hours'}
        </Text>
        <TouchableOpacity style={styles.stopBtn} onPress={stopSharing}>
          <Ionicons name="stop-circle" size={18} color={COLORS.error} />
          <Text style={styles.stopBtnText}>Stop Sharing</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Idle state ────────────────────────────────────────────────────────────
  return (
    <TouchableOpacity
      style={[styles.startBtn, isStarting && styles.startBtnDisabled]}
      onPress={startSharing}
      disabled={isStarting}
      activeOpacity={0.8}
    >
      {isStarting ? (
        <ActivityIndicator size="small" color={COLORS.white} />
      ) : (
        <Ionicons name="navigate" size={20} color={COLORS.white} />
      )}
      <Text style={styles.startBtnText}>
        {isStarting ? 'Starting…' : 'Start Sharing (2 hrs)'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
  },
  startBtnDisabled: {
    opacity: 0.6,
  },
  startBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  activeCard: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  activeTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.success,
  },
  activeContact: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  activeContactName: {
    fontWeight: '700',
    color: COLORS.text,
  },
  activeTime: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
  },
  stopBtnText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.error,
  },
});
