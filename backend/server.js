import 'dotenv/config';
import app from './app.js';
import { createServer } from 'http';
import { initializeDatabase } from './database/index.js';
import { initSocket } from './socket.js';
import os from 'os';
import { spawn } from 'child_process';
import emailService from './services/email.service.js';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
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

const getNetworkUrls = (port) => {
  const urls = [];
  const nets = os.networkInterfaces();
  Object.values(nets).forEach((entries) => {
    (entries || []).forEach((net) => {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${port}`);
      }
    });
  });
  return [...new Set(urls)];
};

const logRuntimeInfo = () => {
  const azureHost = process.env.WEBSITE_HOSTNAME;
  const isAzure = Boolean(process.env.WEBSITE_INSTANCE_ID || azureHost);
  const mode = isAzure ? 'AZURE' : 'LOCAL/PRIVATE-NETWORK';
  console.log(`[runtime] Mode: ${mode}`);
  console.log(`[runtime] Binding: ${HOST}:${PORT}`);
  console.log(`[runtime] Local URL: http://localhost:${PORT}`);
  if (azureHost) {
    console.log(`[runtime] Azure URL: https://${azureHost}`);
  } else {
    const urls = getNetworkUrls(PORT);
    if (urls.length) {
      console.log('[runtime] Network URLs:');
      urls.forEach((url) => console.log(`  - ${url}`));
    }
  }
};

const startOllama = () => {
  return new Promise((resolve) => {
    const proc = spawn('ollama', ['serve'], {
      stdio: 'ignore',
      detached: true,
      windowsHide: true
    });
    proc.on('error', (err) => {
      console.warn('[Ollama] No se pudo iniciar automáticamente:', err.message);
      resolve(false);
    });
    proc.unref();
    // esperar un par de segundos para que Ollama termine de arrancar
    setTimeout(() => {
      console.log('[Ollama] Servicio iniciado correctamente');
      resolve(true);
    }, 3000);
  });
};

initializeDatabase()
  .then(() => startOllama())
  .then(() => {
    httpServer.listen(PORT, HOST, () => {
      logRuntimeInfo();
      // Verify SMTP service connection asynchronously without blocking server startup
      emailService.verifySMTP().catch(err => {
        console.warn('[SMTP] Fallo silencioso al verificar el servidor de correo:', err.message);
      });
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
