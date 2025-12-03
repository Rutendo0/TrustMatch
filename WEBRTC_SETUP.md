# WebRTC Video Calling Setup Guide

This guide explains how to set up real WebRTC video calling functionality in the TrustMatch app.

## Overview

The TrustMatch app now includes a complete WebRTC implementation that enables real peer-to-peer video calls between users. This replaces the previous simulation with actual video streaming capabilities.

## Components Implemented

### 1. WebRTCService
- **Location**: `src/services/WebRTCService.ts`
- **Purpose**: Core WebRTC functionality including peer connection management, signaling, and media stream handling
- **Features**:
  - Peer-to-peer video/audio streaming
  - ICE candidate management
  - Call state management
  - Audio/video track controls
  - Resource cleanup

### 2. VideoCallScreen Integration
- **Location**: `src/screens/main/VideoCallScreen.tsx`
- **Purpose**: Updated video calling interface with real WebRTC integration
- **Features**:
  - Real video streaming display
  - Call controls (mute, camera toggle, end call)
  - Call status tracking
  - Error handling

## Required Infrastructure

### 1. Signaling Server
You need to implement a WebSocket-based signaling server to handle:
- Call offer/answer exchange
- ICE candidate relay
- Call management (ringing, active, ended states)
- Room/session management

**Example WebSocket message format**:
```typescript
// Offer message
{
  type: 'offer',
  offer: RTCSessionDescription,
  from: 'user_id',
  to: 'remote_user_id',
  callId: 'call_unique_id'
}

// Answer message
{
  type: 'answer', 
  answer: RTCSessionDescription,
  from: 'user_id',
  to: 'remote_user_id',
  callId: 'call_unique_id'
}

// ICE candidate
{
  type: 'ice-candidate',
  candidate: RTCIceCandidate,
  from: 'user_id', 
  to: 'remote_user_id',
  callId: 'call_unique_id'
}
```

### 2. TURN Servers (Recommended)
For production, add TURN servers to handle NAT traversal:
```typescript
const webrtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN servers for production:
    // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
  ],
  signalingUrl: 'ws://your-signaling-server.com/ws'
};
```

## Configuration Steps

### 1. Update Signaling URL
In `VideoCallScreen.tsx`, update the signaling URL:
```typescript
const webrtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  signalingUrl: 'wss://your-secure-signaling-server.com/ws' // Use wss:// for HTTPS
};
```

### 2. User ID Integration
Update the user ID generation in `VideoCallScreen.tsx`:
```typescript
// Replace these with actual user authentication
const currentUserId = 'current-user-id'; // Get from user session
const remoteUserId = 'remote-user-id'; // Get from match data
```

### 3. Implement Signaling Server
Create a WebSocket server that:
- Maintains user connections
- Routes messages between users
- Handles room/session management
- Provides STUN/TURN server configuration

### 4. Permissions Setup
Ensure your app has proper permissions in `app.json`:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "This app needs camera access for video calling",
        "NSMicrophoneUsageDescription": "This app needs microphone access for voice calls"
      }
    },
    "android": {
      "permissions": ["CAMERA", "RECORD_AUDIO"]
    }
  }
}
```

## Usage Flow

### Outgoing Call
1. User taps video call button in chat
2. WebRTC service initializes
3. Local media stream is acquired (camera + microphone)
4. Offer is created and sent via signaling server
5. Remote user receives call and accepts
6. Answer is received and connection established
7. Video streams are displayed

### Incoming Call
1. User receives call notification
2. Accepts call
3. WebRTC service initializes
4. Local media stream is acquired
5. Answer is sent back to caller
6. Video streams are displayed

### Call Controls
- **Mute/Unmute**: Toggles audio track
- **Camera Toggle**: Turns video on/off
- **Camera Switch**: Switches between front/back cameras (requires implementation)
- **End Call**: Terminates connection and cleans up resources

## Troubleshooting

### Common Issues

1. **Camera Permission Denied**
   - Ensure proper permission requests
   - Check app.json permissions configuration

2. **Connection Failed**
   - Verify signaling server is running
   - Check STUN/TURN server configuration
   - Ensure WebSocket connection is established

3. **No Remote Video**
   - Check if remote stream is received
   - Verify video track is enabled
   - Ensure proper video element display

4. **Audio Issues**
   - Check microphone permissions
   - Verify audio track is not muted
   - Ensure proper audio mode configuration

## Production Considerations

### 1. Security
- Use HTTPS/WSS for all connections
- Implement authentication for signaling server
- Validate all incoming messages
- Implement rate limiting

### 2. Performance
- Add call quality monitoring
- Implement adaptive bitrate streaming
- Use TURN servers for reliability
- Monitor network conditions

### 3. Scalability
- Implement proper room management
- Use load balancing for signaling server
- Consider SFU for group calls
- Monitor server resources

### 4. Analytics
- Track call success rates
- Monitor connection quality
- Log errors for debugging
- Track usage metrics

## Testing

### Manual Testing
1. Test on multiple devices
2. Test different network conditions
3. Test camera/microphone permissions
4. Test call controls functionality

### Automated Testing
- WebRTC connection establishment
- Media stream handling
- Call state transitions
- Error scenarios

## Future Enhancements

1. **Call Recording**: Implement video call recording
2. **Screen Sharing**: Add screen sharing capability
3. **Group Calls**: Support multiple participants
4. **Chat Integration**: In-call messaging
5. **Call History**: Save and review past calls
6. **AI Features**: Background blur, noise cancellation

## Support

For issues with the WebRTC implementation:
1. Check browser console for errors
2. Verify signaling server logs
3. Test with known good configurations
4. Review STUN/TURN server connectivity