import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { WebRTCService, CallState } from '../../services/WebRTCService';

type VideoCallScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

export const VideoCallScreen: React.FC<VideoCallScreenProps> = ({
  navigation,
  route,
}) => {
  const { matchId, userName, userPhoto, isIncoming } = route.params as {
    matchId: string;
    userName: string;
    userPhoto: string;
    isIncoming?: boolean;
  };

  const [callState, setCallState] = useState<CallState>({
    status: isIncoming ? 'ringing' : 'connecting',
    isMuted: false,
    isCameraOff: false,
  });
  const [callDuration, setCallDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [safetyAlertActive, setSafetyAlertActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const webRTCService = useRef<WebRTCService | null>(null);
  const localVideoRef = useRef<CameraView>(null);
  const remoteVideoRef = useRef<CameraView>(null);

  // WebRTC configuration
  const webrtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // In production, you'd want to add TURN servers here
    ],
    signalingUrl: 'ws://your-signaling-server.com/ws', // Replace with actual signaling server
  };

  // Initialize WebRTC when component mounts
  useEffect(() => {
    initializeCall();
    return () => {
      // Cleanup on unmount
      if (webRTCService.current) {
        webRTCService.current.endCall();
      }
    };
  }, []);

  // Initialize the WebRTC call
  const initializeCall = async () => {
    try {
      webRTCService.current = new WebRTCService(webrtcConfig);
      
      const currentUserId = 'current-user-id'; // Replace with actual user ID
      const remoteUserId = 'remote-user-id'; // Replace with actual remote user ID
      const callId = `call-${Date.now()}`;

      await webRTCService.current.initialize(
        callId,
        currentUserId,
        remoteUserId,
        (newState) => {
          setCallState(newState);
          
          // Handle call duration
          if (newState.status === 'active' && callState.status !== 'active') {
            setCallDuration(0);
          }
        },
        (remoteStream) => {
          console.log('Remote stream received:', remoteStream);
          // Handle remote stream for video display
        }
      );

      // Set camera references
      if (localVideoRef.current) {
        webRTCService.current.setCameraRef(localVideoRef);
      }

      if (!isIncoming) {
        // Create offer for outgoing call
        await webRTCService.current.createOffer();
      }
    } catch (error) {
      console.error('Failed to initialize call:', error);
      Alert.alert('Call Error', 'Failed to start video call. Please try again.');
    }
  };

  // Handle call duration timer
  useEffect(() => {
    let interval: any;
    if (callState.status === 'active') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState.status]);

  // Handle pulse animation for ringing state
  useEffect(() => {
    if (callState.status === 'ringing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
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
    }
  }, [callState.status]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (webRTCService.current) {
      webRTCService.current.endCall();
    }
    setTimeout(() => navigation.goBack(), 1000);
  };

  const handleAcceptCall = async () => {
    if (!permission?.granted) {
      const newPermission = await requestPermission();
      if (!newPermission?.granted) {
        Alert.alert('Permission Required', 'Camera and microphone access is required for video calls.');
        return;
      }
    }
    // WebRTC initialization is already handled in useEffect
  };

  const handleDeclineCall = () => {
    if (webRTCService.current) {
      webRTCService.current.endCall();
    }
    navigation.goBack();
  };

  const handleToggleMute = () => {
    if (webRTCService.current) {
      webRTCService.current.toggleMute();
    }
  };

  const handleToggleCamera = () => {
    if (webRTCService.current) {
      webRTCService.current.toggleCamera();
    }
  };

  const handleSwitchCamera = async () => {
    if (webRTCService.current) {
      await webRTCService.current.switchCamera();
    }
  };

  if (callState.status === 'ringing' && isIncoming) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.incomingCallContainer}>
          <Text style={styles.incomingLabel}>Incoming Video Call</Text>
          
          <Animated.View style={[styles.callerAvatar, { transform: [{ scale: pulseAnim }] }]}>
            <Image source={{ uri: userPhoto }} style={styles.callerImage} />
          </Animated.View>
          
          <Text style={styles.callerName}>{userName}</Text>
          <Text style={styles.callStatusText}>wants to video chat</Text>

          <View style={styles.incomingActions}>
            <TouchableOpacity
              style={[styles.incomingButton, styles.declineButton]}
              onPress={handleDeclineCall}
            >
              <Ionicons name="close" size={32} color={COLORS.white} />
              <Text style={styles.incomingButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.incomingButton, styles.acceptButton]}
              onPress={handleAcceptCall}
            >
              <Ionicons name="videocam" size={32} color={COLORS.white} />
              <Text style={styles.incomingButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {callState.status === 'active' && !callState.isCameraOff && permission?.granted ? (
        <CameraView 
          style={styles.remoteVideo} 
          facing="front"
          ref={remoteVideoRef}
        />
      ) : (
        <View style={styles.noVideoContainer}>
          <Image source={{ uri: userPhoto }} style={styles.noVideoAvatar} />
          {callState.status === 'connecting' && (
            <Text style={styles.connectingText}>Connecting...</Text>
          )}
          {callState.error && (
            <Text style={styles.errorText}>{callState.error}</Text>
          )}
        </View>
      )}

      <View style={styles.localVideoContainer}>
        {!callState.isCameraOff && permission?.granted ? (
          <CameraView 
            style={styles.localVideo} 
            facing="front"
            ref={localVideoRef}
          />
        ) : (
          <View style={styles.cameraOffPlaceholder}>
            <Ionicons name="videocam-off" size={24} color={COLORS.white} />
          </View>
        )}
      </View>

      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName}</Text>
            {callState.status === 'active' && (
              <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
            )}
          </View>
          
          {/* Trust & Safety Indicators */}
          <View style={styles.safetyIndicators}>
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
              <Text style={styles.trustText}>95% Trusted</Text>
            </View>
            <View style={styles.recordingIndicator}>
              <Ionicons name="ellipse" size={8} color={COLORS.error} />
              <Text style={styles.recordingText}>Recording</Text>
            </View>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlButton, callState.isMuted && styles.controlButtonActive]}
              onPress={handleToggleMute}
            >
              <Ionicons
                name={callState.isMuted ? 'mic-off' : 'mic'}
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, callState.isCameraOff && styles.controlButtonActive]}
              onPress={handleToggleCamera}
            >
              <Ionicons
                name={callState.isCameraOff ? 'videocam-off' : 'videocam'}
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.endCallButton]}
              onPress={handleEndCall}
            >
              <Ionicons name="call" size={28} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={handleSwitchCamera}>
              <Ionicons name="camera-reverse" size={24} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="chatbubble" size={24} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.safetyButton]}
              onPress={() => setSafetyAlertActive(!safetyAlertActive)}
            >
              <Ionicons name="shield" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.text,
  },
  remoteVideo: {
    flex: 1,
  },
  noVideoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
  },
  noVideoAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: SPACING.md,
  },
  connectingText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.sm,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 100,
    right: SPACING.md,
    width: 100,
    height: 140,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  localVideo: {
    flex: 1,
  },
  cameraOffPlaceholder: {
    flex: 1,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  safetyIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  trustText: {
    color: COLORS.success,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  recordingText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  userName: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  duration: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: SPACING.xs,
  },
  controlsContainer: {
    paddingBottom: SPACING.xl,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  endCallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.error,
    transform: [{ rotate: '135deg' }],
  },
  safetyButton: {
    backgroundColor: COLORS.warning,
  },
  incomingCallContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
  },
  incomingLabel: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: SPACING.xl,
  },
  callerAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: COLORS.success,
    marginBottom: SPACING.lg,
  },
  callerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 73,
  },
  callerName: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  callStatusText: {
    fontSize: FONTS.sizes.md,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: SPACING.xs,
  },
  incomingActions: {
    flexDirection: 'row',
    gap: SPACING.xxl,
    marginTop: SPACING.xxl,
  },
  incomingButton: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  declineButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
  },
});
