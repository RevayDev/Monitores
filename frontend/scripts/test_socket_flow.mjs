import axios from 'axios';
import { io } from 'socket.io-client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = 'http://localhost:3000';
const SOCKET_URL = 'http://localhost:3000';
const SOCKET_PATH = '/api/socket.io';

console.log('🧪 Starting Socket Flow Test...\n');

// Test 1: Create a support ticket
console.log('📝 Test 1: Creating support ticket...');
try {
  const response = await axios.post(`${API_URL}/support/contact`, {
    name: 'Test User',
    email: 'test@example.com',
    subject: 'Test Socket Message',
    message: 'This is a test message to verify socket flow',
    category: 'chat'
  });
  
  const ticketId = response.data.ticketId;
  console.log('✅ Ticket created:', ticketId, '\n');

  // Test 2: Connect user socket and join room
  console.log('📡 Test 2: User connecting to socket and joining room...');
  const userSocket = io(SOCKET_URL, { path: SOCKET_PATH });
  
  userSocket.on('connect', () => {
    console.log('✅ User socket connected:', userSocket.id);
    console.log('📤 Emitting join_support_chat event...');
    userSocket.emit('join_support_chat', ticketId);
    console.log('✅ Emitted join_support_chat\n');
  });

  // Test 3: Connect admin socket and join room
  console.log('📡 Test 3: Admin connecting to socket and joining room...');
  const adminSocket = io(SOCKET_URL, { path: SOCKET_PATH });
  
  adminSocket.on('connect', () => {
    console.log('✅ Admin socket connected:', adminSocket.id);
    console.log('📤 Emitting join_support_chat event...');
    adminSocket.emit('join_support_chat', ticketId);
    console.log('✅ Emitted join_support_chat\n');
  });

  // Set up listeners
  let messageReceived = false;

  userSocket.on('ticket_message_received', (msg) => {
    console.log('📨 User received ticket_message_received:', msg);
  });

  adminSocket.on('ticket_message_received', (msg) => {
    console.log('📨 Admin received ticket_message_received:', msg);
    messageReceived = true;
  });

  // Wait for sockets to connect
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: Send a message
  console.log('📤 Test 4: Sending message via API...');
  try {
    const msgResponse = await axios.post(
      `${API_URL}/support/contact/${ticketId}/message`,
      {
        message: 'Test message from socket flow test',
        sender_name: 'Test User',
        sender_role: 'user'
      }
    );
    
    console.log('✅ Message sent:', msgResponse.data, '\n');

    // Wait for message to be received
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (messageReceived) {
      console.log('✅ SUCCESS: Message flow working correctly!');
    } else {
      console.log('❌ FAILED: Admin did not receive the message');
    }

    userSocket.disconnect();
    adminSocket.disconnect();
    process.exit(messageReceived ? 0 : 1);

  } catch (err) {
    console.error('❌ Error sending message:', err.message);
    userSocket.disconnect();
    adminSocket.disconnect();
    process.exit(1);
  }

} catch (err) {
  console.error('❌ Error creating ticket:', err.message);
  if (err.response?.data) console.error(err.response.data);
  process.exit(1);
}

// Timeout
setTimeout(() => {
  console.log('❌ Test timed out');
  process.exit(1);
}, 15000);
