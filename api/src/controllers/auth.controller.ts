import { Request, Response } from 'express';
import * as argon2 from 'argon2';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { sendSuccess, sendError } from '../utils/response';
import { generateSessionToken } from '../utils/crypto';
import { signAccessToken } from '../utils/jwt';

// Memory store: sessionToken -> { userId, email, expiresAt }
const authSessions = new Map<string, { userId: string; email: string; expiresAt: number }>();

const DEMO_EMAILS = [
  'admin@prime.edu.vn',
  'teacher@prime.edu.vn',
  'student@prime.edu.vn',
  'student2@prime.edu.vn',
];

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      sendError(res, 'Vui lòng cung cấp tài khoản/email và mật khẩu', 400);
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
      sendError(res, 'Tài khoản của bạn đã bị khóa', 403);
      return;
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      sendError(res, 'Tài khoản hoặc mật khẩu không chính xác', 401);
      return;
    }

    const isDemoUser = config.demo.enableDemoAccounts && DEMO_EMAILS.includes(user.email);
    const sessionToken = generateSessionToken();

    authSessions.set(sessionToken, {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    sendSuccess(
      res,
      isDemoUser
        ? `Đăng nhập hợp lệ. Nhập mã OTP demo: ${config.demo.fixedOtp}`
        : 'Đăng nhập hợp lệ. Vui lòng nhập mã OTP để tiếp tục.',
      {
        sessionToken,
        email: user.email,
        username: user.username,
        role: user.role,
        isDemoAccount: isDemoUser,
        demoOtp: isDemoUser ? config.demo.fixedOtp : undefined,
      }
    );
  } catch (error: any) {
    console.error('Login error:', error);
    sendError(res, 'Lỗi hệ thống khi đăng nhập', 500);
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
    if (sessionToken) {
      const session = authSessions.get(sessionToken);
      if (session && session.expiresAt > Date.now()) {
        targetEmail = session.email;
      }
    }

    if (!targetEmail) {
      sendError(res, 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại.', 400);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!user || !user.isActive) {
      sendError(res, 'Người dùng không tồn tại hoặc đã bị khóa', 403);
      return;
    }

    // In demo mode or demo accounts, OTP 123456 is verified
    if (otp !== config.demo.fixedOtp) {
      sendError(res, `Mã OTP không chính xác. Mã OTP demo là: ${config.demo.fixedOtp}`, 400);
      return;
    }

    if (sessionToken) authSessions.delete(sessionToken);

    const token = signAccessToken(user);

    sendSuccess(res, 'Xác thực OTP thành công', {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        studentCode: user.studentCode,
        teacherCode: user.teacherCode,
        phoneNumber: user.phoneNumber,
      },
      token,
    });
  } catch (error: any) {
    sendError(res, 'Lỗi hệ thống khi xác minh OTP', 500);
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
    sendError(res, 'Lỗi khi lấy thông tin tài khoản', 500);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  sendSuccess(res, 'Đăng xuất thành công');
};
