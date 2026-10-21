import crypto from 'crypto';
import { config } from '../config/env';

// In-memory or temporary cache for used nonces to prevent replay attacks
const usedNonces = new Map<string, number>();

// Clean expired nonces every 60 seconds
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiresAt] of usedNonces.entries()) {
    if (expiresAt < now) {
      usedNonces.delete(nonce);
    }
  }
}, 60000);
if (cleanupInterval.unref) cleanupInterval.unref();

export const generateSecureOtp = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const hashOtp = (otp: string, email: string): string => {
  return crypto
    .createHmac('sha256', config.jwt.accessSecret)
    .update(`${email}:${otp}`)
    .digest('hex');
};

export const generateSessionToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export interface QrTokenPayload {
  sessionId: string;
  teacherId: string;
  nonce: string;
  timestamp: number; // millisecond timestamp
  expiresAt: number; // millisecond timestamp
}

export interface SignedQrData {
  payload: QrTokenPayload;
  signature: string;
  token: string;
}

/**
 * Generates an HMAC-SHA256 signed QR dynamic payload with 10s expiration
 */
export const generateDynamicQrToken = (sessionId: string, teacherId: string): SignedQrData => {
  const now = Date.now();
  const expiresAt = now + config.qr.expirationSeconds * 1000;
  const nonce = crypto.randomBytes(16).toString('hex');

  const payload: QrTokenPayload = {
    sessionId,
    teacherId,
    nonce,
    timestamp: now,
    expiresAt,
  };

  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', config.qr.signingSecret)
    .update(payloadString)
    .digest('hex');

  const base64Payload = Buffer.from(payloadString).toString('base64');
  const token = `${base64Payload}.${signature}`;

  return {
    payload,
    signature,
    token,
  };
};

/**
 * Verifies the signed QR dynamic token:
 * 1. Checks HMAC signature integrity
 * 2. Checks time window (must not be older than 10s + 3s clock drift allowance)
 * 3. Checks if nonce has been used already (Anti-Replay Attack)
 */
export const verifyDynamicQrToken = (
  rawToken: string
): { isValid: boolean; payload?: QrTokenPayload; error?: string } => {
  try {
    const parts = rawToken.split('.');
    if (parts.length !== 2) {
      return { isValid: false, error: 'Định dạng mã QR không hợp lệ' };
    }

    const [base64Payload, signature] = parts;
    const payloadString = Buffer.from(base64Payload, 'base64').toString('utf8');
    const expectedSignature = crypto
      .createHmac('sha256', config.qr.signingSecret)
      .update(payloadString)
      .digest('hex');

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
    ) {
      return { isValid: false, error: 'Chữ ký mã QR không hợp lệ hoặc bị giả mạo' };
    }

    const payload: QrTokenPayload = JSON.parse(payloadString);
    const now = Date.now();

    // Check expiration with a small 3-second grace period for network jitter
    const gracePeriodMs = 3000;
    if (now > payload.expiresAt + gracePeriodMs) {
      return { isValid: false, error: 'Mã QR đã hết hạn (chỉ có hiệu lực trong 10 giây). Vui lòng quét mã mới trên màn hình giảng viên' };
    }

    // Check if timestamp is suspiciously in the future (> 5 seconds ahead)
    if (payload.timestamp > now + 5000) {
      return { isValid: false, error: 'Thời gian trên thiết bị không đồng bộ với máy chủ' };
    }

    // Check replay attack via nonce
    if (usedNonces.has(payload.nonce)) {
      return { isValid: false, error: 'Mã QR này đã được sử dụng. Mỗi mã QR chỉ được quét một lần duy nhất' };
    }

    return { isValid: true, payload };
  } catch (err: any) {
    return { isValid: false, error: 'Không thể phân tích mã QR: ' + err.message };
  }
};

/**
 * Mark a nonce as consumed so it cannot be used again
 */
export const consumeNonce = (nonce: string, expiresAt: number): void => {
  usedNonces.set(nonce, expiresAt);
};
