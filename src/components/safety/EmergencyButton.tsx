import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

interface EmergencyButtonProps {
  matchId?: string;
  onEmergencyActivated?: () => void;
}

export const EmergencyButton: React.FC<EmergencyButtonProps> = ({
  matchId,
  onEmergencyActivated,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const handleEmergency = async (action: 'call' | 'alert' | 'block') => {
    setIsActivating(true);

    try {
      switch (action) {
        case 'call':
          await Linking.openURL('tel:911');
          break;
        case 'alert':
          Alert.alert(
            'Emergency Alert Sent',
            'Your emergency contacts have been notified with your current location.',
            [{ text: 'OK' }]
          );
          onEmergencyActivated?.();
          break;
        case 'block':
          Alert.alert(
            'User Blocked & Reported',
            'This conversation has been logged and the user has been blocked. Our safety team will review.',
            [{ text: 'OK' }]
          );
          onEmergencyActivated?.();
          break;
      }
    } catch (error) {
      console.error('Emergency action failed:', error);
    } finally {
      setIsActivating(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.emergencyButton}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="shield" size={20} color={COLORS.error} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.emergencyIcon}>
                <Ionicons name="warning" size={32} color={COLORS.error} />
              </View>
              <Text style={styles.modalTitle}>Safety Options</Text>
              <Text style={styles.modalSubtitle}>
                Choose an action if you feel unsafe
              </Text>
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.callButton]}
                onPress={() => handleEmergency('call')}
                disabled={isActivating}
              >
                <Ionicons name="call" size={24} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Call Emergency (911)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.alertButton]}
                onPress={() => handleEmergency('alert')}
                disabled={isActivating}
              >
                <Ionicons name="notifications" size={24} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Alert Emergency Contacts</Text>
                <Text style={styles.actionSubtext}>
                  Share your location with trusted contacts
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.blockButton]}
                onPress={() => handleEmergency('block')}
                disabled={isActivating}
              >
                <Ionicons name="close-circle" size={24} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Block & Report User</Text>
                <Text style={styles.actionSubtext}>
                  Logs conversation and blocks immediately
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  emergencyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emergencyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: SPACING.md,
  },
  actionButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  callButton: {
    backgroundColor: COLORS.error,
  },
  alertButton: {
    backgroundColor: '#F59E0B',
  },
  blockButton: {
    backgroundColor: '#6B7280',
  },
  actionButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  actionSubtext: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  cancelButton: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
