import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000';
const SOCKET_PATH = '/api/socket.io';

console.log('🧪 Starting Socket Connection Test...\n');

// Create ticket manually (would need to be done via curl or direct DB insert for this test)
const ticketId = 4; // Using existing ticket

console.log('📡 Connecting user socket to ticket room:', ticketId);
const userSocket = io(SOCKET_URL, { path: SOCKET_PATH });

userSocket.on('connect', () => {
  console.log('✅ User socket connected:', userSocket.id);
  console.log('📤 Emitting join_support_chat event with ticketId:', ticketId);
  userSocket.emit('join_support_chat', ticketId);
});

userSocket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});

console.log('\n📡 Connecting admin socket to ticket room:', ticketId);
const adminSocket = io(SOCKET_URL, { path: SOCKET_PATH });

adminSocket.on('connect', () => {
  console.log('✅ Admin socket connected:', adminSocket.id);
  console.log('📤 Emitting join_support_chat event with ticketId:', ticketId);
  adminSocket.emit('join_support_chat', ticketId);
});

adminSocket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});

let userMessageReceived = false;
let adminMessageReceived = false;

userSocket.on('ticket_message_received', (msg) => {
  console.log('\n📨 User received ticket_message_received event');
  console.log('   Message:', msg);
  userMessageReceived = true;
});

adminSocket.on('ticket_message_received', (msg) => {
  console.log('\n📨 Admin received ticket_message_received event');
  console.log('   Message:', msg);
  adminMessageReceived = true;
});

// Test typing events
userSocket.on('support_user_typing', (data) => {
  console.log('\n⌨️ User socket received typing event:', data);
});

adminSocket.on('support_user_typing', (data) => {
  console.log('\n⌨️ Admin socket received typing event:', data);
});

// Simulate typing
setTimeout(() => {
  console.log('\n📤 Simulating user typing...');
  userSocket.emit('support_typing', { ticketId, user: 'Test User' });
}, 2000);

setTimeout(() => {
  console.log('\n📤 Simulating stop typing...');
  userSocket.emit('support_stop_typing', { ticketId, userId: 1 });
}, 3000);

// Log connection status
setTimeout(() => {
  console.log('\n========== CONNECTION STATUS ==========');
  console.log('User Socket Connected:', userSocket.connected);
  console.log('Admin Socket Connected:', adminSocket.connected);
  console.log('User rooms:', Object.keys(userSocket.rooms || {}));
  console.log('Admin rooms:', Object.keys(adminSocket.rooms || {}));
  console.log('========================================\n');
}, 5000);

// Close after test
setTimeout(() => {
  console.log('📊 Test Results:');
  console.log('   User received message:', userMessageReceived ? '✅' : '❌');
  console.log('   Admin received message:', adminMessageReceived ? '✅' : '❌');
  
  userSocket.disconnect();
  adminSocket.disconnect();
  console.log('\nDisconnected. Exiting...');
  process.exit(adminMessageReceived ? 0 : 1);
}, 10000);

// Timeout safety
setTimeout(() => {
  console.log('\n❌ Test timed out');
  process.exit(1);
}, 15000);
