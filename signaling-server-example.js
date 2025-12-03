// Simple WebRTC Signaling Server Example
// This is a basic Node.js WebSocket server for signaling
// Run with: node signaling-server-example.js

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const rooms = new Map(); // roomId -> { participants: Map(userId -> ws), callState }
const users = new Map(); // ws -> { userId, roomId }

console.log('WebRTC Signaling Server running on port 8080');

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(ws, message);
    } catch (error) {
      console.error('Invalid message format:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    handleDisconnect(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleMessage(ws, message) {
  const { type, callId, from, to, offer, answer, candidate } = message;

  switch (type) {
    case 'join-room':
      handleJoinRoom(ws, message);
      break;
    
    case 'offer':
      handleOffer(ws, { callId, from, to, offer });
      break;
    
    case 'answer':
      handleAnswer(ws, { callId, from, to, answer });
      break;
    
    case 'ice-candidate':
      handleIceCandidate(ws, { callId, from, to, candidate });
      break;
    
    case 'call-ended':
      handleCallEnded(ws, { callId, from, to });
      break;
    
    default:
      console.log('Unknown message type:', type);
  }
}

function handleJoinRoom(ws, message) {
  const { roomId, userId } = message;
  
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { participants: new Map(), callState: 'idle' });
  }
  
  const room = rooms.get(roomId);
  room.participants.set(userId, ws);
  users.set(ws, { userId, roomId });
  
  console.log(`User ${userId} joined room ${roomId}`);
  
  // Notify other participants
  room.participants.forEach((participantWs, participantUserId) => {
    if (participantWs !== ws) {
      participantWs.send(JSON.stringify({
        type: 'user-joined',
        userId,
        roomId
      }));
    }
  });
}

function handleOffer(ws, { callId, from, to, offer }) {
  const roomId = users.get(ws)?.roomId;
  if (!roomId) return;
  
  const room = rooms.get(roomId);
  const targetWs = room?.participants.get(to);
  
  if (targetWs) {
    targetWs.send(JSON.stringify({
      type: 'offer',
      callId,
      from,
      offer
    }));
    console.log(`Offer sent from ${from} to ${to} for call ${callId}`);
  }
}

function handleAnswer(ws, { callId, from, to, answer }) {
  const roomId = users.get(ws)?.roomId;
  if (!roomId) return;
  
  const room = rooms.get(roomId);
  const targetWs = room?.participants.get(to);
  
  if (targetWs) {
    targetWs.send(JSON.stringify({
      type: 'answer',
      callId,
      from,
      answer
    }));
    console.log(`Answer sent from ${from} to ${to} for call ${callId}`);
  }
}

function handleIceCandidate(ws, { callId, from, to, candidate }) {
  const roomId = users.get(ws)?.roomId;
  if (!roomId) return;
  
  const room = rooms.get(roomId);
  const targetWs = room?.participants.get(to);
  
  if (targetWs) {
    targetWs.send(JSON.stringify({
      type: 'ice-candidate',
      callId,
      from,
      candidate
    }));
  }
}

function handleCallEnded(ws, { callId, from, to }) {
  const roomId = users.get(ws)?.roomId;
  if (!roomId) return;
  
  const room = rooms.get(roomId);
  const targetWs = room?.participants.get(to);
  
  if (targetWs) {
    targetWs.send(JSON.stringify({
      type: 'call-ended',
      callId,
      from
    }));
  }
  
  console.log(`Call ${callId} ended by ${from}`);
}

function handleDisconnect(ws) {
  const userInfo = users.get(ws);
  if (userInfo) {
    const { userId, roomId } = userInfo;
    const room = rooms.get(roomId);
    
    if (room) {
      room.participants.delete(userId);
      
      // Notify other participants
      room.participants.forEach((participantWs, participantUserId) => {
        participantWs.send(JSON.stringify({
          type: 'user-left',
          userId,
          roomId
        }));
      });
      
      // Clean up empty rooms
      if (room.participants.size === 0) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} cleaned up`);
      }
    }
    
    users.delete(ws);
    console.log(`User ${userId} removed from room ${roomId}`);
  }
}

// Handle server shutdown gracefully
process.on('SIGINT', () => {
  console.log('Shutting down signaling server...');
  wss.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down signaling server...');
  wss.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});