import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { LiveDetectionService, LiveDetectionResult } from '../../services/LiveDetectionService';

interface LiveVerificationBadgeProps {
  onVerificationComplete?: (result: LiveDetectionResult) => void;
  style?: any;
}

export const LiveVerificationBadge: React.FC<LiveVerificationBadgeProps> = ({
  onVerificationComplete,
  style,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastVerification, setLastVerification] = useState<Date | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'verified' | 'failed'>('none');

  const liveDetectionService = LiveDetectionService.getInstance();

  const handleQuickVerify = async () => {
    if (!liveDetectionService.canPerformLiveDetection()) {
      const remaining = liveDetectionService.getCooldownRemaining();
      const minutes = Math.ceil(remaining / 60000);
      alert(`Please wait ${minutes} minute(s) before verifying again.`);
      return;
    }

    setIsVerifying(true);
    setShowModal(true);
  };

  const handleVerificationComplete = (result: LiveDetectionResult) => {
    setIsVerifying(false);
    setLastVerification(new Date());
    setVerificationStatus(result.isMatch ? 'verified' : 'failed');
    onVerificationComplete?.(result);
  };

  const formatLastVerification = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.badge, style]} 
        onPress={handleQuickVerify}
        activeOpacity={0.7}
      >
        <View style={[
          styles.badgeIcon, 
          { 
            backgroundColor: verificationStatus === 'verified' 
              ? 'rgba(16, 185, 129, 0.1)' 
              : verificationStatus === 'failed'
              ? 'rgba(239, 68, 68, 0.1)'
              : 'rgba(59, 130, 246, 0.1)'
          }
        ]}>
          <Ionicons 
            name={
              verificationStatus === 'verified' 
                ? 'shield-checkmark' 
                : verificationStatus === 'failed'
                ? 'warning'
                : 'shield-outline'
            } 
            size={24} 
            color={
              verificationStatus === 'verified' 
                ? COLORS.success 
                : verificationStatus === 'failed'
                ? COLORS.error
                : COLORS.primary
            } 
          />
        </View>
        <View style={styles.badgeContent}>
          <Text style={styles.badgeTitle}>
            {verificationStatus === 'verified' 
              ? 'Verified' 
              : verificationStatus === 'failed'
              ? 'Verification Failed'
              : 'Live Verification'}
          </Text>
          {lastVerification && (
            <Text style={styles.badgeSubtitle}>
              {formatLastVerification(lastVerification)}
            </Text>
          )}
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={COLORS.textSecondary} 
        />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isVerifying && setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Live Verification</Text>
              <TouchableOpacity 
                onPress={() => !isVerifying && setShowModal(false)}
                disabled={isVerifying}
              >
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {isVerifying ? (
              <View style={styles.verifyingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.verifyingText}>Performing live verification...</Text>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <View style={styles.instructions}>
                  <Ionicons name="shield-checkmark" size={48} color={COLORS.primary} />
                  <Text style={styles.instructionsTitle}>Verify Your Identity</Text>
                  <Text style={styles.instructionsText}>
                    Take a quick selfie to verify that you are the same person in your profile photos.
                  </Text>
                </View>

                <View style={styles.features}>
                  <View style={styles.featureItem}>
                    <Ionicons name="camera" size={20} color={COLORS.success} />
                    <Text style={styles.featureText}>Quick selfie capture</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="people" size={20} color={COLORS.success} />
                    <Text style={styles.featureText}>Compare with profile photos</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="lock-closed" size={20} color={COLORS.success} />
                    <Text style={styles.featureText}>Secure and private</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.verifyButton}
                  onPress={() => {
                    // Navigate to full verification screen
                    setShowModal(false);
                    // This would navigate to the LiveDetectionScreen
                    // For now, we'll just show a message
                    alert('Live verification would start here');
                  }}
                >
                  <Ionicons name="camera" size={20} color={COLORS.white} />
                  <Text style={styles.verifyButtonText}>Start Verification</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  badgeContent: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  badgeSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: SPACING.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  verifyingContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyingText: {
    marginTop: SPACING.lg,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  modalBody: {
    padding: SPACING.lg,
  },
  instructions: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  instructionsTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  instructionsText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    marginBottom: SPACING.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  featureText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  verifyButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
});

export default LiveVerificationBadge;