import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: process.env.API_PREFIX || '/api',
  appName: process.env.APP_NAME || 'NgoNguyenThanhPhuc_2380601731_DiemDanhAPI',
  appUrl: process.env.APP_BASE_URL || process.env.APP_URL || 'http://localhost:5000',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  databaseUrl: process.env.DATABASE_URL || '',

  jwt: {
    accessSecret: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'prime_jwt_access_super_secret_key_change_in_production_2026',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '2h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'prime_jwt_refresh_super_secret_key_change_in_production_2026',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '30d',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '"PRIME Attendance" <no-reply@prime.edu.vn>',
  },

  qr: {
    signingSecret: process.env.QR_SIGNING_SECRET || 'prime_qr_hmac_secret_anti_cheat_key_2026',
    expirationSeconds: parseInt(process.env.QR_EXPIRATION_SECONDS || '10', 10),
  },

  demo: {
    demoMode: process.env.DEMO_MODE === 'true' || process.env.ENABLE_DEMO_ACCOUNTS === 'true' || true,
    fixedOtp: process.env.DEMO_FIXED_OTP || '123456',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  },
};
