import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Speech from 'expo-speech';

export interface VoiceRecording {
  uri: string;
  duration: number;
  transcript?: string;
  prompt?: string;
}

export interface RecordingOptions {
  prompt?: string;
  maxDuration?: number; // in seconds
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
}

export class VoiceRecordingService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private isRecording = false;
  private isPlaying = false;

  constructor() {
    this.initializeAudio();
  }

  private async initializeAudio() {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio recording permission not granted');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error;
    }
  }

  async startRecording(options: RecordingOptions = {}): Promise<void> {
    try {
      if (this.isRecording) {
        throw new Error('Recording is already in progress');
      }

      // Get audio permissions
      const permission = await Audio.getPermissionsAsync();
      if (!permission.granted) {
        const request = await Audio.requestPermissionsAsync();
        if (!request.granted) {
          throw new Error('Audio recording permission denied');
        }
      }

      // Create recording with simple options
      const recording = new Audio.Recording();
      
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      this.recording = recording;
      await recording.startAsync();
      this.isRecording = true;

      // Auto-stop recording after max duration
      if (options.maxDuration) {
        setTimeout(() => {
          this.stopRecording();
        }, options.maxDuration * 1000);
      }

    } catch (error) {
      console.error('Failed to start recording:', error);
      this.isRecording = false;
      throw error;
    }
  }

  async stopRecording(): Promise<VoiceRecording | null> {
    try {
      if (!this.recording || !this.isRecording) {
        throw new Error('No recording in progress');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      // Get recording details
      const status = await this.recording.getStatusAsync();
      const duration = status.durationMillis ? Math.round(status.durationMillis / 1000) : 0;

      this.isRecording = false;
      this.recording = null;

      return {
        uri,
        duration,
      };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.isRecording = false;
      throw error;
    }
  }

  async playRecording(uri: string, onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void): Promise<void> {
    try {
      if (this.isPlaying) {
        await this.stopPlayback();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      this.sound = sound;
      this.isPlaying = true;

      // Handle playback completion using the correct API
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.isPlaying = false;
          this.sound = null;
        }
      });

    } catch (error) {
      console.error('Failed to play recording:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  async stopPlayback(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
      this.isPlaying = false;
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  }

  async pausePlayback(): Promise<void> {
    try {
      if (this.sound && this.isPlaying) {
        await this.sound.pauseAsync();
        this.isPlaying = false;
      }
    } catch (error) {
      console.error('Failed to pause playback:', error);
    }
  }

  async resumePlayback(): Promise<void> {
    try {
      if (this.sound && !this.isPlaying) {
        await this.sound.playAsync();
        this.isPlaying = true;
      }
    } catch (error) {
      console.error('Failed to resume playback:', error);
    }
  }

  async transcribeAudio(uri: string): Promise<string> {
    try {
      // Mock transcription - in real implementation, you would use a service like:
      // - OpenAI Whisper API
      // - Google Speech-to-Text
      // - Azure Speech Services
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

      // Mock transcription results based on common voice note patterns
      const mockTranscriptions = [
        "Hey! I really enjoyed learning about your passion for travel. I've been to Paris twice and it's absolutely magical.",
        "I love that you mentioned cooking - I'm actually a huge foodie and would love to try that restaurant you suggested.",
        "Your photos show such genuine happiness. I can tell you really value authentic connections, which I appreciate.",
        "I'm really excited to meet you! Your personality comes through so clearly in your profile.",
        "The hiking photo is incredible! I actually love outdoor adventures too. Maybe we could explore a trail together?"
      ];

      return mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      throw error;
    }
  }

  async saveRecordingToDevice(uri: string, filename?: string): Promise<string> {
    try {
      // Return the original URI - it's already stored in cache
      return uri;
    } catch (error) {
      console.error('Failed to save recording:', error);
      throw error;
    }
  }

  async deleteRecording(uri: string): Promise<void> {
    // Skip deletion - let the system handle cleanup
    // In production, you would use FileSystem.deleteAsync(uri)
  }

  getRecordingStatus(): { isRecording: boolean; isPlaying: boolean } {
    return {
      isRecording: this.isRecording,
      isPlaying: this.isPlaying,
    };
  }

  // Voice-to-text for live transcription during recording
  async getLiveTranscription(): Promise<string> {
    try {
      // This would require real-time speech recognition
      // For now, return empty string as it's a complex implementation
      return '';
    } catch (error) {
      console.error('Failed to get live transcription:', error);
      return '';
    }
  }

  // Cleanup method
  dispose(): void {
    if (this.recording) {
      this.recording = null;
      this.isRecording = false;
    }
    
    if (this.sound) {
      this.sound = null;
      this.isPlaying = false;
    }
  }
}

// Singleton instance
export const voiceRecordingService = new VoiceRecordingService();
