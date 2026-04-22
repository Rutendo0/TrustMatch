import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Button, Card } from '../../components/common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { LiveDetectionService, LiveDetectionResult } from '../../services/LiveDetectionService';
import { api } from '../../services/api';

type LiveDetectionScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

type DetectionStep = 'intro' | 'camera' | 'processing' | 'results' | 'success';

export const LiveDetectionScreen: React.FC<LiveDetectionScreenProps> = ({
  navigation,
  route,
}) => {
  const [step, setStep] = useState<DetectionStep>('intro');
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [detectionResult, setDetectionResult] = useState<LiveDetectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  
  const liveDetectionService = LiveDetectionService.getInstance();
  const cameraRef = useRef<CameraView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Check cooldown on mount
  useEffect(() => {
    const checkCooldown = () => {
      const remaining = liveDetectionService.getCooldownRemaining();
      setCooldownRemaining(remaining);
      
      if (remaining > 0) {
        const timer = setInterval(() => {
          const newRemaining = liveDetectionService.getCooldownRemaining();
          setCooldownRemaining(newRemaining);
          if (newRemaining <= 0) {
            clearInterval(timer);
          }
        }, 1000);
        return () => clearInterval(timer);
      }
    };
    
    checkCooldown();
  }, []);

  const startLiveDetection = async () => {
    if (!liveDetectionService.canPerformLiveDetection()) {
      const minutes = Math.ceil(cooldownRemaining / 60000);
      Alert.alert(
        'Cooldown Active',
        `You can perform live detection again in ${minutes} minute(s).`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to perform live detection.',
          [{ text: 'OK' }]
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
          skipProcessing: false,
        });

        if (photo && photo.uri) {
          setSelfieImage(photo.uri);
          setStep('processing');
          performLiveDetection(photo.uri);
        }
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
    }
  };

  const performLiveDetection = async (photoUri: string) => {
    setIsProcessing(true);
    
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    try {
      const result = await liveDetectionService.performLiveDetection(photoUri, {
        threshold: 0.4,
        requireMinimumMatches: 2,
      });

      setDetectionResult(result);
      setStep('results');
    } catch (error) {
      console.error('Live detection error:', error);
      Alert.alert('Error', 'Live detection failed. Please try again.');
      setStep('intro');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setSelfieImage(null);
    setDetectionResult(null);
    setStep('camera');
    progressAnim.setValue(0);
  };

  const handleComplete = () => {
    if (detectionResult?.isMatch) {
      navigation.goBack();
    } else {
      setStep('intro');
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderIntro = () => (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
      <View style={styles.titleSection}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={60} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Live Identity Verification</Text>
        <Text style={styles.subtitle}>
          Take a live selfie to verify your identity and prevent catfishing.
          We'll compare your live photo with your stored profile photos.
        </Text>
      </View>

      <Card variant="outlined" style={styles.instructionsCard}>
        <Text style={styles.sectionTitle}>How It Works:</Text>
        <View style={styles.instructionItem}>
          <Ionicons name="camera" size={20} color={COLORS.primary} />
          <Text style={styles.instructionText}>
            Take a clear selfie with good lighting
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <Ionicons name="people" size={20} color={COLORS.primary} />
          <Text style={styles.instructionText}>
            We compare it with your stored profile photos
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.instructionText}>
            Get verified if the match is successful
          </Text>
        </View>
      </Card>

      <Card variant="outlined" style={styles.securityCard}>
        <View style={styles.securityRow}>
          <Ionicons name="lock-closed" size={20} color={COLORS.success} />
          <Text style={styles.securityText}>
            Your photos are securely processed and never stored beyond this session.
          </Text>
        </View>
      </Card>

      {cooldownRemaining > 0 && (
        <Card variant="outlined" style={styles.cooldownCard}>
          <View style={styles.cooldownRow}>
            <Ionicons name="timer" size={20} color={COLORS.warning} />
            <Text style={styles.cooldownText}>
              Next detection available in: {formatTime(cooldownRemaining)}
            </Text>
          </View>
        </Card>
      )}

      <View style={styles.footer}>
        <Button
          title={cooldownRemaining > 0 ? "Wait for Cooldown" : "Start Live Detection"}
          onPress={startLiveDetection}
          size="large"
          disabled={cooldownRemaining > 0}
          icon={<Ionicons name="shield-checkmark" size={20} color={COLORS.white} />}
          style={styles.detectionButton}
        />
      </View>
    </ScrollView>
  );

  const renderCamera = () => (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      />
      <View style={[StyleSheet.absoluteFill, styles.cameraOverlay]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setStep('intro')}
        >
          <Ionicons name="close" size={28} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.faceGuide}>
          <View style={styles.faceGuideInner} />
        </View>

        <Text style={styles.cameraHint}>
          Position your face within the circle
        </Text>

        <View style={styles.captureButtonContainer}>
          <Text style={styles.captureButtonText}>
            Tap to take live selfie
          </Text>
        </View>

        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => setFacing(facing === 'front' ? 'back' : 'front')}
          >
            <Ionicons name="camera-reverse" size={28} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.captureButton} 
            onPress={takeSelfie}
            activeOpacity={0.8}
          >
            <View style={styles.captureButtonInner}>
              <Ionicons name="camera" size={24} color={COLORS.white} />
            </View>
          </TouchableOpacity>

          <View style={styles.flipButton} />
        </View>
      </View>
    </View>
  );

  const renderProcessing = () => (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
      <View style={styles.processingContainer}>
        {selfieImage && (
          <Image source={{ uri: selfieImage }} style={styles.selfiePreview} />
        )}
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.processingTitle}>Verifying Your Identity...</Text>
          <Text style={styles.processingSubtitle}>
            Comparing with your stored photos
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <Animated.View 
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        <View style={styles.processingSteps}>
          <ProcessingStep 
            label="Photo Analysis" 
            completed={false}
            loading={true}
            details="Analyzing your live selfie"
          />
          <ProcessingStep 
            label="Face Matching" 
            completed={false}
            loading={true}
            details="Comparing with stored photos"
          />
          <ProcessingStep 
            label="Identity Verification" 
            completed={false}
            loading={true}
            details="Verifying match confidence"
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderResults = () => (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
      <View style={styles.resultsContainer}>
        {detectionResult?.isMatch ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            <Text style={styles.successTitle}>Identity Verified!</Text>
            <Text style={styles.successSubtitle}>
              Your live selfie matches your stored photos.
            </Text>
          </View>
        ) : (
          <View style={styles.failureContainer}>
            <Ionicons name="close-circle" size={80} color={COLORS.error} />
            <Text style={styles.failureTitle}>Verification Failed</Text>
            <Text style={styles.failureSubtitle}>
              Your live selfie doesn't match your stored photos.
            </Text>
          </View>
        )}

        <Card variant="outlined" style={styles.resultsCard}>
          <View style={styles.resultsHeader}>
            <Ionicons name="analytics" size={20} color={COLORS.primary} />
            <Text style={styles.resultsTitle}>Detection Results</Text>
          </View>
          
          <View style={styles.resultsDetails}>
            <ResultItem 
              label="Match Status" 
              value={detectionResult?.isMatch ? 'VERIFIED' : 'NOT VERIFIED'}
              color={detectionResult?.isMatch ? COLORS.success : COLORS.error}
            />
            <ResultItem 
              label="Similarity Score" 
              value={`${Math.round((detectionResult?.similarity || 0) * 100)}%`}
              color={COLORS.primary}
            />
            <ResultItem 
              label="Confidence Level" 
              value={`${Math.round((detectionResult?.confidence || 0) * 100)}%`}
              color={COLORS.primary}
            />
            <ResultItem 
              label="Photos Matched" 
              value={`${detectionResult?.storedPhotosMatched || 0}/${detectionResult?.totalStoredPhotos || 0}`}
              color={COLORS.primary}
            />
          </View>
        </Card>

        {detectionResult?.details?.selfieWithProfiles && (
          <Card variant="outlined" style={styles.matchesCard}>
            <Text style={styles.matchesTitle}>Photo-by-Photo Results:</Text>
            {detectionResult.details.selfieWithProfiles.map((match, index) => (
              <View key={index} style={styles.matchItem}>
                <View style={styles.matchPhotoContainer}>
                  <Text style={styles.matchPhotoLabel}>Photo {index + 1}</Text>
                </View>
                <View style={styles.matchResult}>
                  <Ionicons 
                    name={match.isMatch ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={match.isMatch ? COLORS.success : COLORS.error} 
                  />
                  <Text style={[
                    styles.matchText,
                    { color: match.isMatch ? COLORS.success : COLORS.error }
                  ]}>
                    {match.isMatch ? 'MATCH' : 'NO MATCH'}
                  </Text>
                  <Text style={styles.matchSimilarity}>
                    {Math.round(match.similarity * 100)}%
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        <View style={styles.footer}>
          {detectionResult?.isMatch ? (
            <Button
              title="Complete Verification"
              onPress={handleComplete}
              size="large"
              style={styles.successButton}
            />
          ) : (
            <>
              <Button
                title="Try Again"
                onPress={handleRetry}
                size="large"
                variant="outline"
                style={styles.retryButton}
              />
              <Button
                title="Cancel"
                onPress={() => navigation.goBack()}
                size="large"
                variant="ghost"
                style={styles.cancelButton}
              />
            </>
          )}
        </View>
      </View>
    </ScrollView>
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
          <Text style={styles.headerTitle}>Live Detection</Text>
          <View style={styles.placeholder} />
        </View>
      )}

      {step === 'intro' && renderIntro()}
      {step === 'camera' && renderCamera()}
      {step === 'processing' && renderProcessing()}
      {step === 'results' && renderResults()}
    </SafeAreaView>
  );
};

const ProcessingStep: React.FC<{
  label: string;
  completed?: boolean;
  loading?: boolean;
  details?: string;
}> = ({ label, completed, loading, details }) => (
  <View style={styles.processingStepItem}>
    {completed ? (
      <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
    ) : loading ? (
      <ActivityIndicator size="small" color={COLORS.primary} />
    ) : (
      <View style={styles.processingStepCircle} />
    )}
    <View style={styles.processingStepTextContainer}>
      <Text
        style={[
          styles.processingStepLabel,
          completed && styles.processingStepLabelCompleted,
        ]}
      >
        {label}
      </Text>
      {details && (
        <Text style={styles.processingStepDetails}>{details}</Text>
      )}
    </View>
  </View>
);

const ResultItem: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => (
  <View style={styles.resultItem}>
    <Text style={styles.resultLabel}>{label}</Text>
    <Text style={[styles.resultValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
  instructionsCard: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  instructionText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  securityCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: COLORS.success,
    marginBottom: SPACING.md,
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
  cooldownCard: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: COLORS.warning,
    marginBottom: SPACING.md,
  },
  cooldownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cooldownText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.warning,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.md,
  },
  detectionButton: {
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
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
  captureButtonContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  captureButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
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
    borderWidth: 6,
    borderColor: COLORS.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
  progressBarContainer: {
    width: '80%',
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginVertical: SPACING.lg,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
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
  processingStepTextContainer: {
    flex: 1,
  },
  processingStepDetails: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  resultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  failureContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  failureTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  failureSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  resultsCard: {
    backgroundColor: COLORS.background,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  resultsTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  resultsDetails: {
    gap: SPACING.sm,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  resultValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  matchesCard: {
    backgroundColor: COLORS.background,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  matchesTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  matchPhotoContainer: {
    flex: 1,
  },
  matchPhotoLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  matchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  matchText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  matchSimilarity: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  successButton: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  retryButton: {
    marginBottom: SPACING.sm,
  },
  cancelButton: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
  },
});

// Add ActivityIndicator import
import { ActivityIndicator } from 'react-native';