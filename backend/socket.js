import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    path: '/api/socket.io',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_forum', (forumId) => {
      socket.join(`forum_${forumId}`);
    });

    socket.on('join_user', (userId) => {
      socket.join(`user_${userId}`);
    });

    socket.on('join_dev_console', () => {
      socket.join('dev_console_logs');
    });

    // Staff room — admins/devs join this to get real-time ticket list updates
    socket.on('join_support_staff', () => {
      socket.join('support_staff');
    });

    socket.on('join_support_chat', (ticketId) => {
      socket.join(`ticket_chat_${ticketId}`);
    });

    socket.on('support_typing', ({ ticketId, user }) => {
      socket.to(`ticket_chat_${ticketId}`).emit('support_user_typing', { user });
    });

    socket.on('support_stop_typing', ({ ticketId, userId }) => {
      socket.to(`ticket_chat_${ticketId}`).emit('support_user_stop_typing', { userId });
    });

    socket.on('typing', ({ forumId, user }) => {
      socket.to(`forum_${forumId}`).emit('user_typing', { user });
    });

    socket.on('stop_typing', ({ forumId, userId }) => {
      socket.to(`forum_${forumId}`).emit('user_stop_typing', { userId });
    });

    socket.on('new_message', ({ forumId, message }) => {
      socket.to(`forum_${forumId}`).emit('message_received', message);
    });

    socket.on('disconnect', () => {
      // console.log('User disconnected');
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export const notifyUser = (userId, notification) => {
  if (io) {
    io.to(`user_${userId}`).emit('new_notification', notification);
  }
};

// Broadcast ticket list change to all staff (admin/dev) dashboards
export const notifyStaffTicketUpdate = (payload) => {
  if (io) {
    io.to('support_staff').emit('support_ticket_list_updated', payload);
  }
};
