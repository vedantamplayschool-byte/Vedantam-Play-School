import app from './app.js';
import { connectDB } from './config/db.js';
import { env, validateEnv } from './config/env.js';
import Admin from './models/Admin.js';

const bootstrap = async () => {
  console.log('========== BOOTSTRAP START ==========');
  console.log('ADMIN_EMAIL:', env.adminEmail || '(NOT FOUND)');
  console.log('ADMIN_PASSWORD exists:', !!env.adminPassword);

  try {
    const count = await Admin.countDocuments();
    console.log('Admin count:', count);

    if (count === 0) {
      if (!env.adminEmail || !env.adminPassword) {
        console.log('❌ ADMIN_EMAIL or ADMIN_PASSWORD environment variables are missing.');
        return;
      }

      console.log('Creating default admin...');

      await Admin.create({
        name: 'Administrator',
        email: env.adminEmail,
        password: env.adminPassword,
        role: 'super_admin',
        mustChangePassword: true
      });

      console.log('✅ Default admin created successfully.');
    } else {
      console.log('✅ Admin already exists. Bootstrap skipped.');
    }
  } catch (err) {
    console.error('❌ Bootstrap Error:', err);
  }

  console.log('========== BOOTSTRAP END ==========');
};

const start = async () => {
  try {
    validateEnv();

    await connectDB();

    console.log('✅ MongoDB connected successfully.');

    await bootstrap();

    const server = app.listen(env.port, () => {
      console.log(
        `🚀 Vedantam API running on port ${env.port} [${env.nodeEnv}]`
      );
    });

    process.on('unhandledRejection', err => {
      console.error('[UnhandledRejection]', err);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', err => {
      console.error('[UncaughtException]', err);
      process.exit(1);
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => process.exit(0));
    });
  } catch (err) {
    console.error('❌ Server Startup Error:', err);
    process.exit(1);
  }
};

start();
