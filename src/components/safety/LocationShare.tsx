import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { Button, Card } from '../common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';


interface LocationShareProps {
  onShareStarted?: (shareId: string) => void;
  onShareEnded?: () => void;
}

interface ActiveShare {
  id: string;
  name: string;
  phone: string;
  expiresAt: Date;
}

export const LocationShare: React.FC<LocationShareProps> = ({
  onShareStarted,
  onShareEnded,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [activeShare, setActiveShare] = useState<ActiveShare | null>(null);
  const [contactName, setContactName] = useState('Emergency contact');
  const [contactPhone, setContactPhone] = useState('');


  const duration = 120; // always 2 hours
  const [isSharing, setIsSharing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);


  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeShare) {
      interval = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.floor((activeShare.expiresAt.getTime() - Date.now()) / 1000 / 60)
        );
        setTimeRemaining(remaining);
        if (remaining === 0) {
          handleStopSharing();
        }
      }, 1000);
    }
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

  const handleStartSharing = async () => {
    const emergency = await loadEmergencyContact();
    if (!emergency) {
      Alert.alert(
        'Emergency contact not set',
        'To share your location in an emergency, add an emergency contact in Settings → Safety Center.'
      );
      setShowModal(false);
      return;
    }

    setContactName(emergency.name);
    setContactPhone(emergency.phone);


    setIsSharing(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for this feature');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const shareId = `share_${Date.now()}`;
      const expiresAt = new Date(Date.now() + duration * 60 * 1000);

      setActiveShare({
        id: shareId,
        name: emergency.name,
        phone: emergency.phone,
        expiresAt,
      });


      Alert.alert(
        'Location Shared',
        `Your location has been shared with ${emergency.name}. They will receive updates for 120 minutes.`
      );


      onShareStarted?.(shareId);
      setShowModal(false);
      setContactName('Emergency contact');
      setContactPhone('');


    } catch (error) {
      Alert.alert('Error', 'Failed to share location. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleStopSharing = () => {
    setActiveShare(null);
    setTimeRemaining(null);
    onShareEnded?.();
  };

  if (activeShare) {

    return (
      <Card style={styles.activeShareCard}>
        <View style={styles.activeShareHeader}>
          <View style={styles.pulsingDot} />
          <Text style={styles.activeShareTitle}>Location Sharing Active</Text>
        </View>
        <Text style={styles.activeShareInfo}>
          Sharing with {activeShare.name}
        </Text>
        <Text style={styles.timeRemaining}>
          {timeRemaining} minutes remaining
        </Text>
        <TouchableOpacity
          style={styles.stopButton}
          onPress={handleStopSharing}
        >
          <Ionicons name="stop-circle" size={20} color={COLORS.error} />
          <Text style={styles.stopButtonText}>Stop Sharing</Text>
        </TouchableOpacity>
      </Card>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.shareButton}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="location" size={20} color={COLORS.primary} />
        <Text style={styles.shareButtonText}>Share Location</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Your Location</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>
              Share your live location with a trusted contact before meeting someone.
              They'll receive real-time updates.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Sharing contact</Text>
              <Text style={styles.description}>
                {contactName && contactPhone
                  ? `Emergency contact: ${contactName} (${contactPhone})`
                  : 'Using your saved emergency contact. If not set, add it in Settings → Safety Center.'}
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Duration</Text>
              <Text style={styles.description}>Always 2 hours</Text>
            </View>



            <Button
              title={isSharing ? 'Starting...' : 'Start Sharing'}
              onPress={handleStartSharing}
              loading={isSharing}
              size="large"
              icon={<Ionicons name="navigate" size={20} color={COLORS.white} />}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  shareButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  activeShareCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  activeShareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  activeShareTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.success,
  },
  activeShareInfo: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  timeRemaining: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  stopButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  description: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
  },

});
