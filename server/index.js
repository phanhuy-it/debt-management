import { app, initializeDatabase, pool } from './app.js';

const port = process.env.PORT || 3001;
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

initializeDatabase().then(() => {
  app.listen(port, host, () => console.log(`API listening on ${host}:${port}`));
}).catch(error => {
  console.error('Server startup failed:', error.message);
  process.exitCode = 1;
  pool.end();
});
