import { Request, Response } from 'express';
import * as argon2 from 'argon2';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { sendSuccess, sendError } from '../utils/response';
import {
  generateSecureOtp,
  hashOtp,
  generateSessionToken,
} from '../utils/crypto';
import {
  signAccessToken,
  signRefreshToken,
  verifyAndRotateRefreshToken,
  revokeAllUserTokens,
} from '../utils/jwt';
import { sendOtpEmail } from '../utils/email';
import { OtpPurpose, UserRole } from '@prisma/client';

// Temporary session token store: sessionToken -> { userId, email, expiresAt }
const authSessions = new Map<string, { userId: string; email: string; expiresAt: number }>();

// Seed demo emails list
const DEMO_EMAILS = [
  'admin@prime.edu.vn',
  'teacher@prime.edu.vn',
  'teacher2@prime.edu.vn',
  'student@prime.edu.vn',
  'student2@prime.edu.vn',
  'student3@prime.edu.vn',
];

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      sendError(res, 'Vui lòng cung cấp email/tên đăng nhập và mật khẩu', 400);
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    });

    if (!user) {
      sendError(res, 'Tài khoản hoặc mật khẩu không chính xác', 401);
      return;
    }

    if (!user.isActive) {
      sendError(res, 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên', 403);
      return;
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      sendError(res, 'Tài khoản hoặc mật khẩu không chính xác', 401);
      return;
    }

    // Step 2: Generate 6-digit OTP
    const isDemoUser = config.demo.enableDemoAccounts && DEMO_EMAILS.includes(user.email);
    const otpCode = isDemoUser ? config.demo.fixedOtp : generateSecureOtp();
    const otpHash = hashOtp(otpCode, user.email);

    // Invalidate old OTPs for this user
    await prisma.emailOtp.updateMany({
      where: { email: user.email, isUsed: false },
      data: { isUsed: true },
    });

    // Save hashed OTP in database with 5-minute expiration
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.emailOtp.create({
      data: {
        email: user.email,
        userId: user.id,
        otpHash,
        purpose: OtpPurpose.LOGIN,
        expiresAt,
        maxAttempts: 3,
        attempts: 0,
      },
    });

    // Send email OTP (async)
    sendOtpEmail(user.email, otpCode, user.fullName);

    // Generate handshake session token for step 3
    const sessionToken = generateSessionToken();
    authSessions.set(sessionToken, {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    sendSuccess(
      res,
      isDemoUser
        ? `Đăng nhập hợp lệ. Tài khoản Demo có thể dùng mã OTP: ${config.demo.fixedOtp}`
        : 'Thông tin chính xác. Mã OTP 6 chữ số đã được gửi tới email của bạn.',
      {
        sessionToken,
        email: user.email,
        isDemoAccount: isDemoUser,
        demoOtpGuide: isDemoUser ? `Mã OTP demo cố định: ${config.demo.fixedOtp}` : undefined,
      }
    );
  } catch (error: any) {
    console.error('Login error:', error);
    sendError(res, 'Lỗi hệ thống trong quá trình đăng nhập', 500);
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionToken, otp, email } = req.body;

    if (!otp) {
      sendError(res, 'Vui lòng nhập mã OTP 6 chữ số', 400);
      return;
    }

    let targetEmail = email;
    let targetUserId: string | undefined;

    if (sessionToken) {
      const session = authSessions.get(sessionToken);
      if (!session || session.expiresAt < Date.now()) {
        sendError(res, 'Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại.', 400);
        return;
      }
      targetEmail = session.email;
      targetUserId = session.userId;
    }

    if (!targetEmail) {
      sendError(res, 'Thiếu thông tin phiên đăng nhập hoặc email', 400);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!user || !user.isActive) {
      sendError(res, 'Người dùng không tồn tại hoặc đã bị khóa', 403);
      return;
    }

    // Check demo accounts bypass with fixed OTP
    const isDemoUser = config.demo.enableDemoAccounts && DEMO_EMAILS.includes(user.email);
    if (isDemoUser && otp === config.demo.fixedOtp) {
      if (sessionToken) authSessions.delete(sessionToken);

      const accessToken = signAccessToken(user);
      const refreshToken = await signRefreshToken(user);

      sendSuccess(res, 'Xác minh OTP tài khoản Demo thành công', {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatarUrl: user.avatarUrl,
          studentCode: user.studentCode,
          teacherCode: user.teacherCode,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: config.jwt.accessExpiration,
        },
      });
      return;
    }

    // Normal OTP verification against database
    const latestOtp = await prisma.emailOtp.findFirst({
      where: {
        email: user.email,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp) {
      sendError(res, 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.', 400);
      return;
    }

    if (new Date() > latestOtp.expiresAt) {
      sendError(res, 'Mã OTP đã hết hạn (chỉ có giá trị trong 5 phút). Vui lòng yêu cầu mã mới.', 400);
      return;
    }

    if (latestOtp.attempts >= latestOtp.maxAttempts) {
      sendError(res, 'Bạn đã nhập sai mã OTP quá 3 lần. Mã đã bị hủy vì lý do an toàn.', 400);
      return;
    }

    const submittedHash = hashOtp(otp, user.email);
    if (submittedHash !== latestOtp.otpHash) {
      await prisma.emailOtp.update({
        where: { id: latestOtp.id },
        data: { attempts: latestOtp.attempts + 1 },
      });
      const remaining = latestOtp.maxAttempts - (latestOtp.attempts + 1);
      sendError(
        res,
        `Mã OTP không chính xác. Bạn còn ${remaining} lần thử trước khi mã bị khóa.`,
        400
      );
      return;
    }

    // OTP is valid
    await prisma.emailOtp.update({
      where: { id: latestOtp.id },
      data: { isUsed: true },
    });

    if (sessionToken) authSessions.delete(sessionToken);

    const accessToken = signAccessToken(user);
    const refreshToken = await signRefreshToken(user);

    sendSuccess(res, 'Xác thực OTP thành công', {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        studentCode: user.studentCode,
        teacherCode: user.teacherCode,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.jwt.accessExpiration,
      },
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    sendError(res, 'Lỗi hệ thống khi xác minh OTP', 500);
  }
};

export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionToken, email } = req.body;
    let targetEmail = email;

    if (sessionToken) {
      const session = authSessions.get(sessionToken);
      if (session) {
        targetEmail = session.email;
      }
    }

    if (!targetEmail) {
      sendError(res, 'Vui lòng cung cấp email hoặc sessionToken hợp lệ', 400);
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: targetEmail } });
    if (!user) {
      sendError(res, 'Không tìm thấy người dùng', 404);
      return;
    }

    // Check resend rate limit (e.g., max 3 in last 15 mins)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const countRecentOtps = await prisma.emailOtp.count({
      where: {
        email: targetEmail,
        createdAt: { gte: fifteenMinutesAgo },
      },
    });

    if (countRecentOtps >= 4) {
      sendError(
        res,
        'Bạn đã yêu cầu gửi lại OTP quá nhiều lần. Vui lòng thử lại sau 15 phút.',
        429
      );
      return;
    }

    // Invalidate previous OTPs
    await prisma.emailOtp.updateMany({
      where: { email: targetEmail, isUsed: false },
      data: { isUsed: true },
    });

    const isDemoUser = config.demo.enableDemoAccounts && DEMO_EMAILS.includes(user.email);
    const otpCode = isDemoUser ? config.demo.fixedOtp : generateSecureOtp();
    const otpHash = hashOtp(otpCode, targetEmail);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.emailOtp.create({
      data: {
        email: targetEmail,
        userId: user.id,
        otpHash,
        purpose: OtpPurpose.LOGIN,
        expiresAt,
        maxAttempts: 3,
        attempts: 0,
      },
    });

    sendOtpEmail(targetEmail, otpCode, user.fullName);

    sendSuccess(res, 'Mã OTP mới đã được gửi lại vào email của bạn.');
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    sendError(res, 'Lỗi khi gửi lại OTP', 500);
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      sendError(res, 'Vui lòng cung cấp refresh token', 400);
      return;
    }

    const result = await verifyAndRotateRefreshToken(token);
    if (!result) {
      sendError(res, 'Refresh token không hợp lệ hoặc đã bị thu hồi', 401);
      return;
    }

    const newAccessToken = signAccessToken(result.user);
    const newRefreshToken = await signRefreshToken(result.user);

    sendSuccess(res, 'Làm mới token thành công', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    sendError(res, 'Lỗi khi làm mới token', 500);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await revokeAllUserTokens(req.user.id);
    }
    sendSuccess(res, 'Đăng xuất thành công');
  } catch (error: any) {
    console.error('Logout error:', error);
    sendError(res, 'Lỗi khi đăng xuất', 500);
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Chưa đăng nhập', 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        phoneNumber: true,
        studentCode: true,
        teacherCode: true,
        createdAt: true,
      },
    });

    if (!user) {
      sendError(res, 'Không tìm thấy người dùng', 404);
      return;
    }

    sendSuccess(res, 'Lấy thông tin tài khoản thành công', user);
  } catch (error: any) {
    console.error('GetMe error:', error);
    sendError(res, 'Lỗi khi lấy thông tin tài khoản', 500);
  }
};
