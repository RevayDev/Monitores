import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';
const SOCKET_PATH = '/api/socket.io';

console.log('🧪 Testing Support Message Flow\n');

// Step 1: Create a support ticket
console.log('📝 Step 1: Creating support ticket...');
try {
  const ticketRes = await fetch(`${API_URL}/support/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      subject: 'Socket Flow Test',
      message: 'Initial message',
      category: 'chat'
    })
  });

  const ticketData = await ticketRes.json();
  const ticketId = ticketData.ticketId;
  
  if (!ticketId) {
    console.error('❌ No ticketId returned:', ticketData);
    process.exit(1);
  }
  
  console.log('✅ Ticket created:', ticketId, '\n');

  // Step 2: Connect sockets
  console.log('📡 Step 2: Connecting sockets...');
  
  const userSocket = io(SOCKET_URL, { path: SOCKET_PATH });
  const adminSocket = io(SOCKET_URL, { path: SOCKET_PATH });

  let userConnected = false;
  let adminConnected = false;

  userSocket.on('connect', () => {
    console.log('✅ User socket connected');
    userSocket.emit('join_support_chat', ticketId);
    userConnected = true;
  });

  adminSocket.on('connect', () => {
    console.log('✅ Admin socket connected');
    adminSocket.emit('join_support_chat', ticketId);
    adminConnected = true;
  });

  let messageReceived = false;

  userSocket.on('ticket_message_received', (msg) => {
    console.log('\n📨 User received message:', msg.message);
    messageReceived = true;
  });

  adminSocket.on('ticket_message_received', (msg) => {
    console.log('\n📨 Admin received message:', msg.message);
    messageReceived = true;
  });

  // Wait for connection
  await new Promise(r => setTimeout(r, 1000));

  if (!userConnected || !adminConnected) {
    console.error('❌ Sockets did not connect');
    process.exit(1);
  }

  // Step 3: Send a message via API
  console.log('\n📤 Step 3: Sending message via API...');
  const msgRes = await fetch(`${API_URL}/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': '1', 'x-user-role': 'student' },
    body: JSON.stringify({
      message: 'Test message content',
      sender_name: 'Test User',
      sender_role: 'user'
    })
  });

  const msgData = await msgRes.json();
  console.log('✅ Message API response:', msgData.message);

  // Wait for socket events
  console.log('\n⏳ Waiting for socket events...\n');
  await new Promise(r => setTimeout(r, 3000));

  // Step 4: Check results
  console.log('\n📊 Results:');
  console.log('   Message received by socket:', messageReceived ? '✅' : '❌');

  userSocket.disconnect();
  adminSocket.disconnect();
  
  process.exit(messageReceived ? 0 : 1);

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}

setTimeout(() => {
  console.log('\n❌ Test timed out');
  process.exit(1);
}, 20000);
