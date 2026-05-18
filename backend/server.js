import app from './app.js';
import { createServer } from 'http';
import { initializeDatabase } from './database/index.js';
import { initSocket } from './socket.js';

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
initSocket(httpServer);

const origLog = console.log;
const origErr = console.error;
const origWarn = console.warn;
const origInfo = console.info;

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise rejection:', reason);
});

const emitToSocket = (type, args) => {
  try {
    const text = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    import('./socket.js').then(({ getIo }) => {
      const io = getIo();
      if (io) io.to('dev_console_logs').emit('backend_log', { type, text, source: 'backend', timestamp: new Date().toLocaleTimeString() });
    }).catch(() => {});
  } catch(e) {}
};

console.log = (...args) => { origLog(...args); emitToSocket('info', args); };
console.error = (...args) => { origErr(...args); emitToSocket('error', args); };
console.warn = (...args) => { origWarn(...args); emitToSocket('warn', args); };
console.info = (...args) => { origInfo(...args); emitToSocket('info', args); };

initializeDatabase()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
