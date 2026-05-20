import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Button } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { api } from '../../services/api';

type SelfieVerificationScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

type VerificationStep = 'instructions' | 'camera' | 'processing' | 'success' | 'failed';

interface VerificationFailure {
  reason: 'face_no_match' | 'no_face_detected' | 'no_id_photo' | 'server_error';
  message: string;
  detail?: string;
}

export const SelfieVerificationScreen: React.FC<SelfieVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { formData, idFrontImage } = route.params as {
    formData?: any;
    idFrontImage?: string;
    idBackImage?: string;
    profilePhotos?: string[];
  };

  const [step, setStep] = useState<VerificationStep>('instructions');
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [processingLabel, setProcessingLabel] = useState('Verifying your identity...');
  const [failure, setFailure] = useState<VerificationFailure | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Camera ──────────────────────────────────────────────────────────────────
  const handleStartCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'TrustMatch needs camera access to verify your identity. Please enable it in your phone settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    setStep('camera');
  };

  const takeSelfie = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready. Please try again.');
      return;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
        exif: false,
      });
      if (photo?.uri) {
        setSelfieImage(photo.uri);
        setStep('processing');
        runVerification(photo.uri);
      } else {
        Alert.alert('Error', 'Failed to capture photo. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', `Failed to take photo: ${err.message}`);
    }
  };

  // ── Core verification logic ─────────────────────────────────────────────────
  const runVerification = async (photoUri: string) => {
    // Hard 90-second timeout
    timeoutRef.current = setTimeout(() => {
      setFailure({
        reason: 'server_error',
        message: 'Verification is taking too long.',
        detail: 'Please check your internet connection and try again.',
      });
      setStep('failed');
    }, 90_000);

    try {
      // Step 1 — ensure we have an ID photo to compare against
      if (!idFrontImage) {
        clearTimeout(timeoutRef.current!);
        setFailure({
          reason: 'no_id_photo',
          message: 'No ID photo found.',
          detail: 'Please go back and upload your ID document first.',
        });
        setStep('failed');
        return;
      }

      // Step 2 — compare selfie against ID photo via server face-api.js
      setProcessingLabel('Comparing your face to your ID photo...');
      const faceResult = await api.compareFaces(idFrontImage, photoUri);

      console.log('[SelfieVerification] face compare result:', faceResult);

      const sim: number = faceResult.similarity ?? 0;
      setSimilarity(sim);

      if (!faceResult.success) {
        clearTimeout(timeoutRef.current!);

        // Prefer structured/machine-readable fields if the external API provides them.
        // Your external endpoint currently returns at least `verified` and error text,
        // but when it says "No face detected in first/second image" we map it reliably.
      const rawMessage = faceResult.message || '';
      const msg = rawMessage.toLowerCase();

      // Debug: help determine what your external face endpoint is returning in production.
      // (Visible in Metro bundler / Android logs.)
      console.log('[SelfieVerification] faceResult.message:', rawMessage);

      const noFaceInId =
        msg.includes('no face detected') &&
        (msg.includes('first image') || msg.includes('id') || msg.includes('img1'));

      const noFaceInSelfie =
        msg.includes('no face detected') &&
        (msg.includes('second image') || msg.includes('selfie') || msg.includes('img2'));

      // Some endpoints say "No face detected in your ID photo" directly.
      const idPhotoDirect = msg.includes('id photo');
      const selfieDirect = msg.includes('selfie');

      // Decide which side is missing.
      // Priority:
      // 1) explicit second/selfie markers => selfie missing
      // 2) explicit first/id markers => id missing
      // 3) otherwise fallback to previous heuristic
      const fallbackNoFaceInSelfie = msg.includes('selfie') || msg.includes('second');

      const showSelfie =
        noFaceInSelfie ||
        (!noFaceInId && !idPhotoDirect && selfieDirect) ||
        (!noFaceInId && fallbackNoFaceInSelfie);

      setFailure({
          reason: 'no_face_detected',
          message: showSelfie
            ? 'No face detected in your selfie.'
            : 'No face detected in your ID photo.',
          detail: showSelfie
            ? 'Make sure your face is clearly visible, well-lit, and centred in the frame.'
            : 'Your ID photo may be blurry or the face area is not visible. Please go back and re-upload your ID.',
        });
        setStep('failed');
        return;
      }

      if (!faceResult.isMatch) {
        clearTimeout(timeoutRef.current!);
        setFailure({
          reason: 'face_no_match',
          message: 'Your selfie does not match your ID photo.',
        });
        setStep('failed');
        return;
      }

      // Step 3 — store the verified selfie on the server as the face anchor
      // sim is 0-1 from DeepFace; multiply by 100 so server stores it as a percentage (0-100)
      setProcessingLabel('Saving your verified identity...');
      try {
        await api.uploadSelfie(photoUri, sim * 100);
      } catch (uploadErr) {
        console.warn('[SelfieVerification] selfie upload failed, continuing:', uploadErr);
        // Non-fatal — selfie comparison passed, we can still proceed
      }

      clearTimeout(timeoutRef.current!);
      setStep('success');

      // Auto-navigate after 2 seconds, but user can also tap Continue immediately
      setTimeout(() => {
        navigation.navigate('PhotoUploadScreen', {
          formData: {
            ...formData,
            selfieVerified: true,
            verifiedSelfieUri: photoUri,
          },
          verifiedSelfieUri: photoUri,
        });
      }, 2000);
    } catch (err: any) {
      clearTimeout(timeoutRef.current!);
      console.error('[SelfieVerification] error:', err);
      setFailure({
        reason: 'server_error',
        message: 'Verification failed due to a server error.',
        detail: err?.message || 'Please check your connection and try again.',
      });
      setStep('failed');
    }
  };

  const retake = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSelfieImage(null);
    setFailure(null);
    setSimilarity(null);
    setProcessingLabel('Verifying your identity...');
    setStep('camera');
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderInstructions = () => (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
      <View style={styles.titleSection}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={44} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Live Selfie Verification</Text>
        <Text style={styles.subtitle}>
          Take a live selfie so we can confirm you are the person on your ID document.
        </Text>
      </View>

      <View style={styles.instructionsList}>
        {[
          { icon: 'sunny-outline' as const, text: 'Good lighting — natural light works best' },
          { icon: 'eye-outline' as const, text: 'Look directly at the camera' },
          { icon: 'glasses-outline' as const, text: 'Remove sunglasses or face coverings' },
          { icon: 'person-outline' as const, text: 'Keep a neutral expression' },
          { icon: 'shield-checkmark-outline' as const, text: 'Your selfie is compared against your ID photo' },
        ].map((item, i) => (
          <View key={i} style={styles.instructionItem}>
            <Ionicons name={item.icon} size={20} color={COLORS.primary} />
            <Text style={styles.instructionText}>{item.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title="Start Selfie Verification"
          onPress={handleStartCamera}
          size="large"
          icon={<Ionicons name="camera" size={20} color={COLORS.white} />}
        />
      </View>
    </ScrollView>
  );

  const renderCamera = () => {
    if (!permission?.granted) {
      return (
        <View style={[styles.cameraContainer, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
          <Ionicons name="camera-outline" size={60} color="white" />
          <Text style={{ color: 'white', fontSize: 16, textAlign: 'center', marginTop: 16, paddingHorizontal: 32 }}>
            Camera permission is required.{'\n'}Please allow camera access and try again.
          </Text>
          <TouchableOpacity
            style={{ marginTop: 24, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
            onPress={async () => {
              const result = await requestPermission();
              if (!result.granted) {
                Alert.alert('Permission Denied', 'Please enable camera access in your phone settings.');
              }
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
        <View style={[StyleSheet.absoluteFill, styles.cameraOverlay]}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setStep('instructions')}>
            <Ionicons name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.faceGuide} pointerEvents="none">
            <View style={styles.faceGuideInner} />
          </View>

          <Text style={styles.cameraHint}>Position your face within the oval</Text>

          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}
            >
              <Ionicons name="camera-reverse" size={28} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={takeSelfie} activeOpacity={0.8}>
              <View style={styles.captureButtonInner}>
                <Ionicons name="camera" size={24} color={COLORS.white} />
              </View>
            </TouchableOpacity>

            <View style={styles.flipButton} />
          </View>
        </View>
      </View>
    );
  };

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      {selfieImage && (
        <Image source={{ uri: selfieImage }} style={styles.selfiePreview} />
      )}
      <View style={styles.processingOverlay}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.processingTitle}>{processingLabel}</Text>
        <Text style={styles.processingSubtitle}>
          Comparing your live selfie against your ID document
        </Text>
      </View>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.resultContainer}>
      <View style={[styles.resultIconContainer, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
        <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
      </View>
      <Text style={styles.resultTitle}>Identity Verified!</Text>
      <Text style={styles.resultSubtitle}>
        Your selfie and information matches your ID. You can now upload your profile photos.
      </Text>
      {similarity !== null && (
        <View style={styles.scoreRow}>
          <Ionicons name="shield-checkmark" size={18} color={COLORS.success} />
          <Text style={styles.scoreText}>
            Face match: {Math.round(similarity * 100)}%
          </Text>
        </View>
      )}
    </View>
  );

  const renderFailed = () => {
    if (!failure) return null;

    const iconMap: Record<VerificationFailure['reason'], keyof typeof Ionicons.glyphMap> = {
      face_no_match: 'person-remove-outline',
      no_face_detected: 'eye-off-outline',
      no_id_photo: 'card-outline',
      server_error: 'cloud-offline-outline',
    };

    // If face doesn't match the ID, we treat it as a possible stolen-ID scenario.
    // In that case, do NOT allow retake (attacker could keep trying). Contact support instead.
    const allowRetake = failure.reason !== 'no_id_photo' && failure.reason !== 'face_no_match';

    const isStolenIdSuspected = failure.reason === 'face_no_match';

    return (
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.resultContainer}>
          <View style={[styles.resultIconContainer, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
            <Ionicons name={iconMap[failure.reason]} size={72} color={COLORS.error} />
          </View>
          <Text style={[styles.resultTitle, { color: COLORS.error }]}>Verification Failed</Text>
          <Text style={styles.resultSubtitle}>{failure.message}</Text>

          {failure.detail && (
            <View style={styles.detailBox}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{failure.detail}</Text>
            </View>
          )}

          <View style={styles.failedActions}>
            {allowRetake && (
              <Button
                title="Retake Selfie"
                onPress={retake}
                size="large"
                icon={<Ionicons name="camera" size={20} color={COLORS.white} />}
              />
            )}

            {isStolenIdSuspected && (
              <View style={styles.detailBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>
                  We couldn’t confirm your selfie matches your ID. For your safety, we’re asking support to review
                  your account. Please contact support.
                </Text>
              </View>
            )}
            {failure.reason === 'no_id_photo' && (
              <Button
                title="Go Back to ID Upload"
                onPress={() => navigation.goBack()}
                size="large"
                variant="outline"
              />
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {step !== 'camera' && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          {/* Progress: ID ✓ → Selfie (current) → Photos → Email */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotDone]} />
            <View style={[styles.progressLine, styles.progressLineDone]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
          </View>
        </View>
      )}

      {step === 'instructions' && renderInstructions()}
      {step === 'camera' && renderCamera()}
      {step === 'processing' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg }}>
          {renderProcessing()}
        </View>
      )}
      {step === 'success' && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg }}>
          {renderSuccess()}
        </View>
      )}
      {step === 'failed' && renderFailed()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
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
    marginTop: SPACING.md,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  progressDotActive: { backgroundColor: COLORS.primary },
  progressDotDone: { backgroundColor: COLORS.success },
  progressLine: {
    width: 32,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
  progressLineDone: { backgroundColor: COLORS.success },
  content: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  titleSection: { alignItems: 'center', marginBottom: SPACING.xl },
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
  instructionsList: { gap: SPACING.xs, marginBottom: SPACING.xl },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  instructionText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  footer: {
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.md,
  },
  // Camera
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  closeButton: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    borderColor: 'rgba(255,255,255,0.5)',
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
  flipButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Processing
  processingContainer: { alignItems: 'center', gap: SPACING.xl },
  selfiePreview: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  processingOverlay: { alignItems: 'center', gap: SPACING.md },
  processingTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  processingSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Result
  resultContainer: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xl },
  resultIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  resultTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  scoreText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.success,
  },
  detailBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginHorizontal: SPACING.sm,
  },
  detailText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  failedActions: { width: '100%', gap: SPACING.md, marginTop: SPACING.md },
});
