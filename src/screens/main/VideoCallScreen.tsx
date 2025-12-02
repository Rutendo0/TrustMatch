import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../constants/theme';

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

  const [callStatus, setCallStatus] = useState<
    'connecting' | 'ringing' | 'active' | 'ended'
  >(isIncoming ? 'ringing' : 'connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (callStatus === 'connecting') {
      const timeout = setTimeout(() => {
        setCallStatus('active');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [callStatus]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'active') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  useEffect(() => {
    if (callStatus === 'ringing') {
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
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => navigation.goBack(), 1000);
  };

  const handleAcceptCall = async () => {
    if (!permission?.granted) {
      await requestPermission();
    }
    setCallStatus('active');
  };

  const handleDeclineCall = () => {
    setCallStatus('ended');
    navigation.goBack();
  };

  if (callStatus === 'ringing' && isIncoming) {
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
      {callStatus === 'active' && !isCameraOff && permission?.granted ? (
        <CameraView style={styles.remoteVideo} facing="front" />
      ) : (
        <View style={styles.noVideoContainer}>
          <Image source={{ uri: userPhoto }} style={styles.noVideoAvatar} />
          {callStatus === 'connecting' && (
            <Text style={styles.connectingText}>Connecting...</Text>
          )}
        </View>
      )}

      <View style={styles.localVideoContainer}>
        {!isCameraOff && permission?.granted ? (
          <CameraView style={styles.localVideo} facing="front" />
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
            {callStatus === 'active' && (
              <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
            )}
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={() => setIsMuted(!isMuted)}
            >
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic'}
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, isCameraOff && styles.controlButtonActive]}
              onPress={() => setIsCameraOff(!isCameraOff)}
            >
              <Ionicons
                name={isCameraOff ? 'videocam-off' : 'videocam'}
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

            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="camera-reverse" size={24} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="chatbubble" size={24} color={COLORS.white} />
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
