import { Audio } from 'expo-av';
import { CameraView } from 'expo-camera';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  signalingUrl: string;
}

export interface CallState {
  status: 'idle' | 'connecting' | 'ringing' | 'active' | 'ended' | 'failed';
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  isMuted: boolean;
  isCameraOff: boolean;
  error?: string;
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signalingWebSocket: WebSocket | null = null;
  private config: WebRTCConfig;
  private callId: string = '';
  private userId: string = '';
  private remoteUserId: string = '';
  private onStateChange?: (state: CallState) => void;
  private onRemoteStream?: (stream: MediaStream) => void;
  private cameraRef: React.RefObject<CameraView> | null = null;

  constructor(config: WebRTCConfig) {
    this.config = config;
  }

  // Initialize the WebRTC service
  async initialize(
    callId: string,
    userId: string,
    remoteUserId: string,
    onStateChange: (state: CallState) => void,
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<void> {
    this.callId = callId;
    this.userId = userId;
    this.remoteUserId = remoteUserId;
    this.onStateChange = onStateChange;
    this.onRemoteStream = onRemoteStream;

    try {
      await this.setupAudioMode();
      await this.createPeerConnection();
      await this.setupSignaling();
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      this.updateState({ status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Set up audio mode for the call
  private async setupAudioMode(): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }

  // Create and configure the peer connection
  private async createPeerConnection(): Promise<void> {
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
          from: this.userId,
          to: this.remoteUserId,
          callId: this.callId,
        });
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state === 'connected') {
        this.updateState({ status: 'active' });
      } else if (state === 'disconnected' || state === 'failed') {
        this.updateState({ status: 'failed', error: 'Connection lost' });
      }
    };

    // Get user media
    this.localStream = await this.getUserMedia();
    this.localStream.getTracks().forEach(track => {
      if (this.peerConnection && this.localStream) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    });

    this.updateState({ 
      status: 'connecting', 
      localStream: this.localStream,
      isMuted: false,
      isCameraOff: false 
    });
  }

  // Get user media (camera and microphone)
  private async getUserMedia(): Promise<MediaStream> {
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw new Error('Failed to access camera and microphone');
    }
  }

  // Set up signaling connection
  private async setupSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalingWebSocket = new WebSocket(this.config.signalingUrl);

      this.signalingWebSocket.onopen = () => {
        console.log('Signaling connection established');
        resolve();
      };

      this.signalingWebSocket.onmessage = (event) => {
        this.handleSignalingMessage(JSON.parse(event.data));
      };

      this.signalingWebSocket.onerror = (error) => {
        console.error('Signaling error:', error);
        reject(error);
      };

      this.signalingWebSocket.onclose = () => {
        console.log('Signaling connection closed');
      };
    });
  }

  // Handle incoming signaling messages
  private async handleSignalingMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'offer':
        await this.handleOffer(message);
        break;
      case 'answer':
        await this.handleAnswer(message);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(message);
        break;
      case 'call-ended':
        this.endCall();
        break;
      default:
        console.log('Unknown signaling message type:', message.type);
    }
  }

  // Handle incoming offer
  private async handleOffer(message: any): Promise<void> {
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.sendSignalingMessage({
      type: 'answer',
      answer: answer,
      from: this.userId,
      to: this.remoteUserId,
      callId: this.callId,
    });

    this.updateState({ status: 'active' });
  }

  // Handle incoming answer
  private async handleAnswer(message: any): Promise<void> {
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    this.updateState({ status: 'active' });
  }

  // Handle ICE candidate
  private async handleIceCandidate(message: any): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  // Send signaling message
  private sendSignalingMessage(message: any): void {
    if (this.signalingWebSocket?.readyState === WebSocket.OPEN) {
      this.signalingWebSocket.send(JSON.stringify(message));
    }
  }

  // Create and send offer
  async createOffer(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: 'offer',
        offer: offer,
        from: this.userId,
        to: this.remoteUserId,
        callId: this.callId,
      });

      this.updateState({ status: 'ringing' });
    } catch (error) {
      console.error('Failed to create offer:', error);
      this.updateState({ status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Update call state
  private updateState(updates: Partial<CallState>): void {
    if (this.onStateChange) {
      this.onStateChange({
        ...this.getCurrentState(),
        ...updates,
      });
    }
  }

  // Get current call state
  private getCurrentState(): CallState {
    return {
      status: 'idle',
      localStream: this.localStream || undefined,
      remoteStream: this.remoteStream || undefined,
      isMuted: false,
      isCameraOff: false,
    };
  }

  // Toggle microphone
  toggleMute(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.updateState({ isMuted: !audioTrack.enabled });
      }
    }
  }

  // Toggle camera
  toggleCamera(): void {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.updateState({ isCameraOff: !videoTrack.enabled });
      }
    }
  }

  // Switch camera (front/back)
  async switchCamera(): Promise<void> {
    // This would require camera implementation with facing mode switching
    console.log('Camera switching not implemented yet');
  }

  // End the call
  endCall(): void {
    // Notify remote peer
    this.sendSignalingMessage({
      type: 'call-ended',
      from: this.userId,
      to: this.remoteUserId,
      callId: this.callId,
    });

    this.cleanup();
    this.updateState({ status: 'ended' });
  }

  // Clean up resources
  private cleanup(): void {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Close signaling connection
    if (this.signalingWebSocket) {
      this.signalingWebSocket.close();
      this.signalingWebSocket = null;
    }

    this.remoteStream = null;
  }

  // Get local stream (for video display)
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Get remote stream (for video display)
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // Set camera reference for recording
  setCameraRef(ref: React.RefObject<CameraView>): void {
    this.cameraRef = ref;
  }

  // Start call recording
  async startRecording(): Promise<void> {
    if (this.cameraRef?.current) {
      // Implement camera recording using expo-camera
      console.log('Recording started');
    }
  }

  // Stop call recording
  stopRecording(): void {
    console.log('Recording stopped');
  }
}