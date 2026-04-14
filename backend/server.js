import app from './app.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { ensureSchema } from './utils/schema-init.helper.js';

import { initSocket } from './socket.js';

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
initSocket(httpServer);

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
