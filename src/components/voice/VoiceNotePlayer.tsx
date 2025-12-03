import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { voiceRecordingService } from '../../services/VoiceRecordingService';
import { COLORS } from '../../constants/theme';

interface VoiceNotePlayerProps {
  voiceNote: {
    id: string;
    audioUrl: string;
    duration: number;
    transcript?: string;
    prompt?: string;
    playCount?: number;
  };
  onPlay?: () => void;
  onPause?: () => void;
  style?: any;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  voiceNote,
  onPlay,
  onPause,
  style
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isPlaying) {
      // Wave animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(waveAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      waveAnimation.setValue(0);
    }

    return () => {
      voiceRecordingService.stopPlayback();
    };
  }, [isPlaying]);

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await voiceRecordingService.stopPlayback();
        setIsPlaying(false);
        onPause?.();
      } else {
        await voiceRecordingService.playRecording(voiceNote.audioUrl, (status) => {
          if (status.isLoaded) {
            if (status.positionMillis) {
              setCurrentTime(Math.round(status.positionMillis / 1000));
            }
            if (status.didJustFinish) {
              setIsPlaying(false);
              setCurrentTime(0);
              onPause?.();
            }
          }
        });
        setIsPlaying(true);
        onPlay?.();
      }
    } catch (error) {
      console.error('Playback error:', error);
      setIsPlaying(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWaveHeight = () => {
    return waveAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [8, 16],
    });
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.playerCard}>
        {/* Voice wave animation */}
        {isPlaying && (
          <View style={styles.waveContainer}>
            {[...Array(5)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.wave,
                  {
                    height: getWaveHeight(),
                    opacity: waveAnimation,
                  },
                ]}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={20}
            color={COLORS.primary}
          />
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <View style={styles.durationContainer}>
            <Text style={styles.duration}>
              {isPlaying ? formatDuration(currentTime) : formatDuration(voiceNote.duration)}
            </Text>
            {voiceNote.playCount && voiceNote.playCount > 0 && (
              <View style={styles.playCount}>
                <Ionicons name="play" size={12} color={COLORS.textSecondary} />
                <Text style={styles.playCountText}>{voiceNote.playCount}</Text>
              </View>
            )}
          </View>

          {voiceNote.prompt && (
            <View style={styles.promptContainer}>
              <Ionicons name="chatbubble-ellipses" size={12} color={COLORS.textSecondary} />
              <Text style={styles.promptText}>{voiceNote.prompt}</Text>
            </View>
          )}

          {voiceNote.transcript && !isPlaying && (
            <Text style={styles.transcript}>{voiceNote.transcript}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundGray,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginRight: 8,
  },
  wave: {
    width: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  duration: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  playCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  playCountText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  promptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  promptText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  transcript: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 16,
    marginTop: 2,
  },
});

// Hook for managing voice note players
export const useVoiceNotePlayer = () => {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  const playVoiceNote = async (voiceNote: any, onPlay?: () => void, onPause?: () => void) => {
    try {
      // Stop any currently playing voice note
      if (currentlyPlaying && currentlyPlaying !== voiceNote.id) {
        await voiceRecordingService.stopPlayback();
        setCurrentlyPlaying(null);
      }

      // Play the new voice note
      await voiceRecordingService.playRecording(voiceNote.audioUrl, (status) => {
        if (status.isLoaded && status.didJustFinish) {
          setCurrentlyPlaying(null);
          onPause?.();
        }
      });

      setCurrentlyPlaying(voiceNote.id);
      onPlay?.();
    } catch (error) {
      console.error('Failed to play voice note:', error);
      setCurrentlyPlaying(null);
    }
  };

  const stopCurrentPlayback = async () => {
    if (currentlyPlaying) {
      await voiceRecordingService.stopPlayback();
      setCurrentlyPlaying(null);
    }
  };

  return {
    currentlyPlaying,
    playVoiceNote,
    stopCurrentPlayback,
  };
};