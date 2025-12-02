import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Button, Card } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

type SelfieVerificationScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

type VerificationStep = 'instructions' | 'camera' | 'processing' | 'success';

export const SelfieVerificationScreen: React.FC<SelfieVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { formData } = route.params as { formData: any };
  const [step, setStep] = useState<VerificationStep>('instructions');
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const instructions = [
    { icon: '💡', text: 'Find good lighting - natural light works best' },
    { icon: '👤', text: 'Position your face in the center of the frame' },
    { icon: '😐', text: 'Keep a neutral expression' },
    { icon: '🚫', text: 'Remove sunglasses, hats, or face coverings' },
  ];

  const handleStartCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access to take your verification selfie.'
        );
        return;
      }
    }
    setStep('camera');
  };

  const takeSelfie = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        if (photo) {
          setSelfieImage(photo.uri);
          setStep('processing');
          simulateVerification();
        }
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
    }
  };

  const simulateVerification = () => {
    setTimeout(() => {
      setStep('success');
    }, 3000);
  };

  const handleComplete = async () => {
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to complete registration. Please try again.');
    }
  };

  const retakeSelfie = () => {
    setSelfieImage(null);
    setStep('camera');
  };

  const renderInstructions = () => (
    <View style={styles.content}>
      <View style={styles.titleSection}>
        <View style={styles.iconContainer}>
          <Ionicons name="person-circle" size={50} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Take a Selfie</Text>
        <Text style={styles.subtitle}>
          We'll compare your selfie with your ID to verify it's really you.
        </Text>
      </View>

      <View style={styles.instructionsList}>
        {instructions.map((item, index) => (
          <View key={index} style={styles.instructionItem}>
            <Text style={styles.instructionIcon}>{item.icon}</Text>
            <Text style={styles.instructionText}>{item.text}</Text>
          </View>
        ))}
      </View>

      <Card variant="outlined" style={styles.securityCard}>
        <View style={styles.securityRow}>
          <Ionicons name="lock-closed" size={20} color={COLORS.success} />
          <Text style={styles.securityText}>
            Your photos are encrypted and securely stored. We never share your verification data.
          </Text>
        </View>
      </Card>

      <View style={styles.footer}>
        <Button
          title="Open Camera"
          onPress={handleStartCamera}
          size="large"
          icon={<Ionicons name="camera" size={20} color={COLORS.white} />}
        />
      </View>
    </View>
  );

  const renderCamera = () => (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        <View style={styles.cameraOverlay}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setStep('instructions')}
          >
            <Ionicons name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.faceGuide}>
            <View style={styles.faceGuideInner} />
          </View>

          <Text style={styles.cameraHint}>
            Position your face within the circle
          </Text>

          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}
            >
              <Ionicons name="camera-reverse" size={28} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={takeSelfie}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.flipButton} />
          </View>
        </View>
      </CameraView>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.content}>
      <View style={styles.processingContainer}>
        {selfieImage && (
          <Image source={{ uri: selfieImage }} style={styles.selfiePreview} />
        )}
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.processingTitle}>Verifying your identity...</Text>
          <Text style={styles.processingSubtitle}>
            Comparing your selfie with your ID
          </Text>
        </View>

        <View style={styles.processingSteps}>
          <ProcessingStep label="Analyzing selfie" completed />
          <ProcessingStep label="Matching with ID" loading />
          <ProcessingStep label="Completing verification" />
        </View>
      </View>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.content}>
      <View style={styles.successContainer}>
        <View style={styles.successIconContainer}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
        </View>
        <Text style={styles.successTitle}>Verification Complete!</Text>
        <Text style={styles.successSubtitle}>
          Your identity has been verified. Welcome to TrustMatch!
        </Text>

        <View style={styles.verificationBadges}>
          <VerificationBadge icon="person" label="Identity Verified" />
          <VerificationBadge icon="document-text" label="ID Verified" />
          <VerificationBadge icon="camera" label="Selfie Matched" />
        </View>

        <View style={styles.footer}>
          <Button
            title="Start Finding Matches"
            onPress={handleComplete}
            size="large"
          />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {step !== 'camera' && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressLine, styles.progressLineActive]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressLine, styles.progressLineActive]} />
            <View style={[styles.progressDot, step === 'success' && styles.progressDotActive]} />
          </View>
        </View>
      )}

      {step === 'instructions' && renderInstructions()}
      {step === 'camera' && renderCamera()}
      {step === 'processing' && renderProcessing()}
      {step === 'success' && renderSuccess()}
    </SafeAreaView>
  );
};

const ProcessingStep: React.FC<{
  label: string;
  completed?: boolean;
  loading?: boolean;
}> = ({ label, completed, loading }) => (
  <View style={styles.processingStepItem}>
    {completed ? (
      <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
    ) : loading ? (
      <ActivityIndicator size="small" color={COLORS.primary} />
    ) : (
      <View style={styles.processingStepCircle} />
    )}
    <Text
      style={[
        styles.processingStepLabel,
        completed && styles.processingStepLabelCompleted,
      ]}
    >
      {label}
    </Text>
  </View>
);

const VerificationBadge: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}> = ({ icon, label }) => (
  <View style={styles.verificationBadge}>
    <Ionicons name={icon} size={24} color={COLORS.success} />
    <Text style={styles.verificationBadgeLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  instructionsList: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  instructionIcon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  instructionText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  securityCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: COLORS.success,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  securityText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: SPACING.xl,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  closeButton: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuide: {
    width: 250,
    height: 300,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuideInner: {
    width: 230,
    height: 280,
    borderRadius: 115,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderStyle: 'dashed',
  },
  cameraHint: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    textAlign: 'center',
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: SPACING.xl,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
  },
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfiePreview: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: SPACING.xl,
  },
  processingOverlay: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  processingTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  processingSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  processingSteps: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  processingStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  processingStepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  processingStepLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  processingStepLabelCompleted: {
    color: COLORS.success,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconContainer: {
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  verificationBadges: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  verificationBadge: {
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: BORDER_RADIUS.md,
  },
  verificationBadgeLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
    fontWeight: '600',
  },
});
