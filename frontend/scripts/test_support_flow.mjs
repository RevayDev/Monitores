import pool from '../../backend/utils/mysql.helper.js';
import { io } from 'socket.io-client';

// Configuration
const API_BASE = 'http://localhost:3000/api';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  try {
    // Find an admin/dev user from DB to act as advisor
    const [rows] = await pool.query("SELECT id, email, role FROM users WHERE role IN ('admin','dev') ORDER BY id ASC LIMIT 1");
    if (!rows || !rows[0]) {
      console.error('No admin/dev user found in DB seeds.');
      process.exit(1);
    }
    const advisor = rows[0];
    console.log('Using advisor:', advisor);

    // Create support ticket (anonymous allowed)
    const createRes = await fetch(`${API_BASE}/support/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Script Tester',
        email: 'script@test.local',
        subject: '[Chat en Vivo] Prueba de Socket',
        message: 'Mensaje de prueba para verificar sockets',
        category: 'chat'
      })
    });

    const created = await createRes.json();
    console.log('Ticket creation status:', createRes.status, created);
    if (!created?.ticketId) {
      console.error('Ticket not created, aborting test.');
      process.exit(1);
    }
    const ticketId = created.ticketId;

    // Create a socket client to listen to ticket room
    const socket = io('http://localhost:3000', { path: '/api/socket.io' });

    socket.on('connect', () => {
      console.log('Socket connected as', socket.id);
      socket.emit('join_support_chat', ticketId);
      console.log('Joined ticket room', ticketId);
    });

    socket.on('ticket_message_received', (msg) => {
      console.log('[socket] ticket_message_received', msg);
    });

    socket.on('advisor_joined', (data) => {
      console.log('[socket] advisor_joined', data);
    });

    socket.on('support_user_typing', (d) => {
      console.log('[socket] support_user_typing', d);
    });

    socket.on('support_user_stop_typing', (d) => {
      console.log('[socket] support_user_stop_typing', d);
    });

    socket.on('ticket_status_changed', (d) => {
      console.log('[socket] ticket_status_changed', d);
    });

    // give socket a moment to connect
    await sleep(800);

    // Call assign endpoint as advisor to simulate advisor taking the chat
    console.log('Calling assign endpoint as advisor id:', advisor.id);
    const assignRes = await fetch(`${API_BASE}/support/tickets/${ticketId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(advisor.id),
        'x-user-role': String(advisor.role)
      }
    });
    const assignBody = await assignRes.text();
    console.log('Assign response:', assignRes.status, assignBody);

    // Wait to capture emitted socket events
    await sleep(2000);

    console.log('Now sending a system message via the API (if permitted) to the ticket messages endpoint using advisor headers');
    const sendMsgRes = await fetch(`${API_BASE}/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(advisor.id),
        'x-user-role': String(advisor.role)
      },
      body: JSON.stringify({ message: 'Hola desde el asesor (script).' })
    });
    const sendMsgBody = await sendMsgRes.text();
    console.log('Send message response:', sendMsgRes.status, sendMsgBody);

    // Wait to receive message on socket
    await sleep(1500);

    console.log('Closing socket and exiting.');
    socket.close();
    process.exit(0);
  } catch (err) {
    console.error('Test flow error:', err);
    process.exit(1);
  }
})();
