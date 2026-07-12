import dotenv from 'dotenv';
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtCookieDays: Number(process.env.JWT_COOKIE_EXPIRES_DAYS || 7),
  clientOrigins: (process.env.CLIENT_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  publicApiUrl: (process.env.PUBLIC_API_URL || '').replace(/\/$/, ''),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 5),
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  // Secret slug used to serve admin.html at a hidden URL instead of /admin.html
  adminSecretPath: (process.env.ADMIN_SECRET_PATH || '').trim().replace(/^\/+|\/+$/g, '')
};

export const validateEnv = () => {
  for (const [key, val] of Object.entries({ MONGODB_URI: env.mongodbUri, JWT_SECRET: env.jwtSecret })) {
    if (!val) throw new Error(`${key} is required`);
  }
  if (env.nodeEnv === 'production' && env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
};
