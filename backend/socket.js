import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    // console.log(`User connected: ${socket.id}`);

    socket.on('join_forum', (forumId) => {
      socket.join(`forum_${forumId}`);
    });

    socket.on('join_user', (userId) => {
      socket.join(`user_${userId}`);
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
