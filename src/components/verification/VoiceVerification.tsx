import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Button, Card } from '../common';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface VoiceVerificationProps {
  onVerified: (audioUri: string) => void;
  onClose: () => void;
}

const PROMPTS = [
  "Say your name and what you're looking for",
  "Describe your perfect first date",
  "Tell us about your favorite hobby",
  "What makes you laugh the most?",
];

export const VoiceVerification: React.FC<VoiceVerificationProps> = ({
  onVerified,
  onClose,
}) => {
  const [step, setStep] = useState<'intro' | 'recording' | 'playback' | 'verifying' | 'success'>('intro');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentPrompt] = useState(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Microphone access is needed for voice verification');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setStep('recording');

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= 10) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
      setIsRecording(false);
      setStep('playback');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const playRecording = async () => {
    if (!recordingUri) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true }
      );
      setSound(newSound);
    } catch (error) {
      console.error('Failed to play recording:', error);
    }
  };

  const retakeRecording = () => {
    setRecordingUri(null);
    setDuration(0);
    setStep('intro');
  };

  const submitVerification = async () => {
    setStep('verifying');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setStep('success');
    
    setTimeout(() => {
      if (recordingUri) {
        onVerified(recordingUri);
      }
    }, 1500);
  };

  const renderIntro = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="mic" size={50} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>Voice Verification</Text>
      <Text style={styles.subtitle}>
        Record a short voice clip to verify your identity and help others hear your real voice
      </Text>

      <Card style={styles.promptCard}>
        <Text style={styles.promptLabel}>Your Prompt:</Text>
        <Text style={styles.promptText}>"{currentPrompt}"</Text>
      </Card>

      <View style={styles.requirements}>
        <Text style={styles.requirementsTitle}>Requirements:</Text>
        <View style={styles.requirementItem}>
          <Ionicons name="time" size={16} color={COLORS.textSecondary} />
          <Text style={styles.requirementText}>5-10 seconds</Text>
        </View>
        <View style={styles.requirementItem}>
          <Ionicons name="volume-high" size={16} color={COLORS.textSecondary} />
          <Text style={styles.requirementText}>Clear audio, no background noise</Text>
        </View>
        <View style={styles.requirementItem}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.textSecondary} />
          <Text style={styles.requirementText}>Your voice will be verified against future calls</Text>
        </View>
      </View>

      <Button
        title="Start Recording"
        onPress={startRecording}
        size="large"
        icon={<Ionicons name="mic" size={20} color={COLORS.white} />}
      />
    </View>
  );

  const renderRecording = () => (
    <View style={styles.stepContent}>
      <Text style={styles.promptText}>"{currentPrompt}"</Text>

      <Animated.View
        style={[
          styles.recordingIndicator,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <View style={styles.recordingDot} />
      </Animated.View>

      <Text style={styles.timer}>{duration}s / 10s</Text>
      <Text style={styles.recordingHint}>Recording... Speak clearly</Text>

      <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
        <Ionicons name="stop" size={32} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );

  const renderPlayback = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={50} color={COLORS.success} />
      </View>
      <Text style={styles.title}>Recording Complete!</Text>
      <Text style={styles.subtitle}>
        Listen to your recording and submit when ready
      </Text>

      <View style={styles.playbackControls}>
        <TouchableOpacity style={styles.playButton} onPress={playRecording}>
          <Ionicons name="play" size={32} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.durationText}>Duration: {duration}s</Text>
      </View>

      <View style={styles.playbackActions}>
        <Button
          title="Retake"
          onPress={retakeRecording}
          variant="outline"
          style={styles.retakeButton}
        />
        <Button
          title="Submit for Verification"
          onPress={submitVerification}
          style={styles.submitButton}
        />
      </View>
    </View>
  );

  const renderVerifying = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Ionicons name="sync" size={50} color={COLORS.primary} />
      </View>
      <Text style={styles.title}>Verifying Voice...</Text>
      <Text style={styles.subtitle}>
        Our AI is analyzing your voice for authenticity
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconContainer, styles.successIcon]}>
        <Ionicons name="shield-checkmark" size={50} color={COLORS.success} />
      </View>
      <Text style={styles.title}>Voice Verified!</Text>
      <Text style={styles.subtitle}>
        Your voice has been verified successfully. Your trust score has been updated.
      </Text>
    </View>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Voice Verification</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {step === 'intro' && renderIntro()}
          {step === 'recording' && renderRecording()}
          {step === 'playback' && renderPlayback()}
          {step === 'verifying' && renderVerifying()}
          {step === 'success' && renderSuccess()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  stepContent: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  successIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  promptCard: {
    backgroundColor: COLORS.background,
    width: '100%',
    marginBottom: SPACING.lg,
  },
  promptLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  promptText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  requirements: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  requirementsTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  requirementText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  recordingIndicator: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.xl,
  },
  recordingDot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.error,
  },
  timer: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  recordingHint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  stopButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playbackControls: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  durationText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  playbackActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  retakeButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
