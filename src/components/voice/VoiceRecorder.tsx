import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { voiceRecordingService, VoiceRecording } from '../../services/VoiceRecordingService';
import { COLORS } from '../../constants/theme';

interface VoiceRecorderProps {
  prompt?: string;
  maxDuration?: number;
  onRecordingComplete?: (recording: VoiceRecording) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  style?: any;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  prompt,
  maxDuration = 60,
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  style
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState<VoiceRecording | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pulseAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            handleStopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, maxDuration]);

  useEffect(() => {
    // Start pulse animation when recording
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isRecording]);

  const handleStartRecording = async () => {
    try {
      setRecordingTime(0);
      setTranscript('');
      await voiceRecordingService.startRecording({
        maxDuration,
        prompt
      });
      
      setIsRecording(true);
      onRecordingStart?.();
    } catch (error: any) {
      Alert.alert('Recording Error', error.message || 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      const recordingResult = await voiceRecordingService.stopRecording();
      
      if (recordingResult) {
        setRecording(recordingResult);
        setIsRecording(false);
        onRecordingStop?.();
        
        // Auto-transcribe
        setIsTranscribing(true);
        const transcription = await voiceRecordingService.transcribeAudio(recordingResult.uri);
        setTranscript(transcription);
        setIsTranscribing(false);
        
        onRecordingComplete?.({ ...recordingResult, transcript });
      }
    } catch (error: any) {
      Alert.alert('Recording Error', error.message || 'Failed to stop recording');
      setIsRecording(false);
    }
  };

  const handlePlayRecording = async () => {
    if (!recording) return;

    try {
      if (isPlaying) {
        await voiceRecordingService.stopPlayback();
        setIsPlaying(false);
      } else {
        await voiceRecordingService.playRecording(recording.uri, (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        });
        setIsPlaying(true);
      }
    } catch (error: any) {
      Alert.alert('Playback Error', error.message || 'Failed to play recording');
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingStatus = () => {
    if (isRecording) return `Recording... ${formatTime(recordingTime)}`;
    if (recording) return `Recorded ${formatTime(recording.duration)}`;
    return 'Ready to record';
  };

  return (
    <View style={[styles.container, style]}>
      {prompt && (
        <View style={styles.promptContainer}>
          <Ionicons name="mic-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.prompt}>{prompt}</Text>
        </View>
      )}

      <View style={styles.recorderContainer}>
        <Animated.View 
          style={[
            styles.recordingButton,
            isRecording && { transform: [{ scale: pulseAnimation }] }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.mainButton,
              isRecording ? styles.recordingButtonActive : styles.recordingButtonInactive
            ]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={32}
              color={isRecording ? COLORS.white : COLORS.primary}
            />
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.statusText}>{getRecordingStatus()}</Text>

        {recording && !isRecording && (
          <View style={styles.playbackContainer}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayRecording}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.playButtonText}>
                {isPlaying ? 'Pause' : 'Play'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setRecording(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash" size={20} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        )}

        {isTranscribing && (
          <View style={styles.transcriptionContainer}>
            <View style={styles.loadingIndicator}>
              <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
              <Text style={styles.transcribingText}>Transcribing audio...</Text>
            </View>
          </View>
        )}

        {transcript && (
          <View style={styles.transcriptContainer}>
            <Text style={styles.transcriptLabel}>Transcription:</Text>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  promptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  prompt: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
    fontStyle: 'italic',
  },
  recorderContainer: {
    alignItems: 'center',
  },
  recordingButton: {
    marginBottom: 12,
  },
  mainButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  recordingButtonActive: {
    backgroundColor: COLORS.error,
  },
  recordingButtonInactive: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  playbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  playButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcriptionContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 8,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  transcribingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  transcriptContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  transcriptLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});