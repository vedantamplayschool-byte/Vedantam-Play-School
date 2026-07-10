import app from './app.js';
import { connectDB } from './config/db.js';
import { env, validateEnv } from './config/env.js';
import Admin from './models/Admin.js';

const bootstrap = async () => {
  try {
    const count = await Admin.countDocuments();
    if (count === 0 && env.adminEmail && env.adminPassword) {
      await Admin.create({
        name: 'Administrator',
        email: env.adminEmail,
        password: env.adminPassword,
        role: 'super_admin',
        mustChangePassword: true
      });
      console.log('[Bootstrap] Default admin created — please change password on first login');
    }
  } catch (err) {
    console.error('[Bootstrap] Could not create default admin:', err.message);
  }
};

const start = async () => {
  validateEnv();
  await connectDB();
  await bootstrap();
  const server = app.listen(env.port, () =>
    console.log(`Vedantam API running on port ${env.port} [${env.nodeEnv}]`)
  );
  process.on('unhandledRejection', err => {
    console.error('[UnhandledRejection]', err);
    server.close(() => process.exit(1));
  });
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
};

start();
