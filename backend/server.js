import app from './app.js';
import { ensureSchema } from './utils/schema-init.helper.js';

const PORT = process.env.PORT || 3000;

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize schema:', error);
    process.exit(1);
  });
