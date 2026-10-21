import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_ACCOUNTS = 'true';
process.env.DEMO_FIXED_OTP = '123456';
process.env.QR_EXPIRATION_SECONDS = '10';
