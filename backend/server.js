import app from './app.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { ensureSchema } from './utils/schema-init.helper.js';

import { initSocket } from './socket.js';

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
initSocket(httpServer);

const origLog = console.log;
const origErr = console.error;
const origWarn = console.warn;
const origInfo = console.info;

const emitToSocket = (type, args) => {
  try {
    const text = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    // Import getIo to access socket instance
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

ensureSchema()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize schema:', error);
    process.exit(1);
  });
