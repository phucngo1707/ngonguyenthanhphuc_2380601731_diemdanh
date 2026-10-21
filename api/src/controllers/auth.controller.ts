import { Request, Response } from 'express';
import * as argon2 from 'argon2';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { config } from '../config/env';
import { sendSuccess, sendError } from '../utils/response';
import { generateSessionToken } from '../utils/crypto';
import { signAccessToken } from '../utils/jwt';
import { emailService } from '../services/email.service';
import { OtpType, UserRole } from '@prisma/client';

// Memory store: sessionToken -> { userId, email, expiresAt }
const authSessions = new Map<string, { userId: string; email: string; expiresAt: number }>();

const DEMO_EMAILS = [
  'admin@prime.edu.vn',
  'teacher@prime.edu.vn',
  'student@prime.edu.vn',
  'student2@prime.edu.vn',
];

const generate6DigitOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * 1. Register new Student Account
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, studentCode, password, confirmPassword } = req.body;

    if (!fullName || !email || !studentCode || !password || !confirmPassword) {
      sendError(res, 'Vui lòng điền đầy đủ tất cả các trường thông tin', 400);
      return;
    }

    if (password !== confirmPassword) {
      sendError(res, 'Mật khẩu và xác nhận mật khẩu không khớp', 400);
      return;
    }

    // Password rule: min 8 chars, must contain letter and number
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      sendError(res, 'Mật khẩu phải có tối thiểu 8 ký tự, bao gồm cả chữ cái và chữ số', 400);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanStudentCode = studentCode.trim().toUpperCase();

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      sendError(res, 'Địa chỉ email này đã được đăng ký trong hệ thống', 409);
      return;
    }

    // Check if studentCode already exists
    const existingCode = await prisma.user.findUnique({
      where: { studentCode: cleanStudentCode },
    });
    if (existingCode) {
      sendError(res, 'Mã số sinh viên (MSSV) này đã được sử dụng', 409);
      return;
    }

    const passwordHash = await argon2.hash(password);
    const username = cleanStudentCode.toLowerCase();

    // Create user with isEmailVerified: false
    const newUser = await prisma.user.create({
      data: {
        username,
        email: normalizedEmail,
        passwordHash,
        fullName: fullName.trim(),
        studentCode: cleanStudentCode,
        role: UserRole.STUDENT, // Public registration strictly creates STUDENT role
        isEmailVerified: false,
        isActive: true,
      },
    });

    // Invalidate previous register OTPs for this email
    await prisma.emailOtp.updateMany({
      where: { email: normalizedEmail, type: OtpType.REGISTER, isUsed: false },
      data: { isUsed: true },
    });

    // Generate 6-digit OTP
    const otp = config.demo.demoMode ? config.demo.fixedOtp : generate6DigitOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        otp,
        type: OtpType.REGISTER,
        expiresAt,
      },
    });

    // Send verification email
    await emailService.sendVerificationOtp(normalizedEmail, otp, newUser.fullName);

    sendSuccess(
      res,
      'Đăng ký tài khoản thành công! Vui lòng nhập mã OTP được gửi tới email để xác thực.',
      {
        email: normalizedEmail,
        studentCode: cleanStudentCode,
        demoOtp: config.demo.demoMode ? config.demo.fixedOtp : undefined,
      },
      201,
    );
  } catch (error: any) {
    console.error('Register error:', error);
    sendError(res, 'Lỗi hệ thống khi đăng ký tài khoản', 500);
  }
};

/**
 * 2. Verify Email OTP after Registration
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      sendError(res, 'Vui lòng cung cấp email và mã OTP xác minh', 400);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      sendError(res, 'Tài khoản không tồn tại', 404);
      return;
    }

    if (user.isEmailVerified) {
      sendSuccess(res, 'Email đã được xác thực trước đó. Bạn có thể đăng nhập ngay.');
      return;
    }

    // Check OTP
    const isDemoOtp = config.demo.demoMode && cleanOtp === config.demo.fixedOtp;

    if (!isDemoOtp) {
      const emailOtp = await prisma.emailOtp.findFirst({
        where: {
          email: normalizedEmail,
          type: OtpType.REGISTER,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!emailOtp || emailOtp.otp !== cleanOtp) {
        sendError(res, 'Mã OTP không chính xác hoặc đã hết hạn (5 phút)', 400);
        return;
      }

      await prisma.emailOtp.update({
        where: { id: emailOtp.id },
        data: { isUsed: true },
      });
    }

    // Activate user email verification
    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });

    sendSuccess(res, 'Xác thực email thành công! Bạn có thể đăng nhập vào ứng dụng.');
  } catch (error: any) {
    console.error('Verify email error:', error);
    sendError(res, 'Lỗi khi xác minh mã OTP', 500);
  }
};

/**
 * 3. Step 1 & 2: Login with Email & Password -> Sends OTP
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailOrUsername, email, password } = req.body;
    const accountInput = (emailOrUsername || email || '').trim();

    if (!accountInput || !password) {
      sendError(res, 'Vui lòng cung cấp tài khoản/email và mật khẩu', 400);
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: accountInput }, { username: accountInput }],
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

    // Block unverified accounts from logging in
    if (!user.isEmailVerified) {
      sendError(res, 'Tài khoản chưa xác thực email. Vui lòng xác thực trước khi đăng nhập.', 403);
      return;
    }

    const isDemoUser = config.demo.demoMode && DEMO_EMAILS.includes(user.email);
    let isPasswordValid = await argon2.verify(user.passwordHash, password);

    // Support convenient demo passwords
    if (!isPasswordValid && isDemoUser) {
      if (
        (user.email === 'admin@prime.edu.vn' && (password === 'admin123' || password === 'Admin@123')) ||
        (user.email === 'teacher@prime.edu.vn' && (password === 'teacher123' || password === 'Teacher@123')) ||
        (user.email === 'student@prime.edu.vn' && (password === 'student123' || password === 'Student@123'))
      ) {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      sendError(res, 'Tài khoản hoặc mật khẩu không chính xác', 401);
      return;
    }

    const sessionToken = generateSessionToken();

    authSessions.set(sessionToken, {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Generate login OTP
    const otp = config.demo.demoMode ? config.demo.fixedOtp : generate6DigitOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate old login OTPs
    await prisma.emailOtp.updateMany({
      where: { email: user.email, type: OtpType.LOGIN, isUsed: false },
      data: { isUsed: true },
    });

    await prisma.emailOtp.create({
      data: {
        email: user.email,
        otp,
        type: OtpType.LOGIN,
        expiresAt,
      },
    });

    // Send login OTP via email
    await emailService.sendLoginOtp(user.email, otp, user.fullName);

    sendSuccess(
      res,
      'Xác thực mật khẩu thành công. Vui lòng nhập mã OTP 6 chữ số được gửi tới email để hoàn tất.',
      {
        sessionToken,
        email: user.email,
        requiresOtp: true,
        demoOtp: config.demo.demoMode ? config.demo.fixedOtp : undefined,
      },
    );
  } catch (error: any) {
    console.error('Login error:', error);
    sendError(res, 'Lỗi hệ thống khi đăng nhập', 500);
  }
};

/**
 * 4. Step 3: Verify Login OTP -> Issues JWT
 */
export const verifyLoginOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionToken, otp } = req.body;

    if (!sessionToken || !otp) {
      sendError(res, 'Vui lòng cung cấp sessionToken và mã OTP', 400);
      return;
    }

    const session = authSessions.get(sessionToken);
    if (!session) {
      sendError(res, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.', 401);
      return;
    }

    if (Date.now() > session.expiresAt) {
      authSessions.delete(sessionToken);
      sendError(res, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
      return;
    }

    const cleanOtp = otp.toString().trim();
    const isDemoOtp = config.demo.demoMode && cleanOtp === config.demo.fixedOtp;

    if (!isDemoOtp) {
      const emailOtp = await prisma.emailOtp.findFirst({
        where: {
          email: session.email,
          type: OtpType.LOGIN,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!emailOtp || emailOtp.otp !== cleanOtp) {
        sendError(res, 'Mã OTP không chính xác hoặc đã hết hạn', 400);
        return;
      }

      await prisma.emailOtp.update({
        where: { id: emailOtp.id },
        data: { isUsed: true },
      });
    }

    // Session verified: remove temporary session
    authSessions.delete(sessionToken);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        studentCode: true,
        teacherCode: true,
        phoneNumber: true,
        isActive: true,
        isEmailVerified: true,
      },
    });

    if (!user || !user.isActive) {
      sendError(res, 'Tài khoản không khả dụng', 403);
      return;
    }

    const token = signAccessToken(user);

    sendSuccess(res, 'Đăng nhập thành công', {
      token,
      user,
    });
  } catch (error: any) {
    console.error('Verify login OTP error:', error);
    sendError(res, 'Lỗi hệ thống khi xác thực OTP đăng nhập', 500);
  }
};

/**
 * 5. Resend OTP (for register, login, or forgot-password)
 */
export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, type = 'LOGIN' } = req.body;

    if (!email) {
      sendError(res, 'Vui lòng cung cấp email nhận lại mã OTP', 400);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otpType = type.toUpperCase() as OtpType;

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't leak existence
      sendSuccess(res, 'Mã OTP mới đã được gửi lại vào email nếu hợp lệ.');
      return;
    }

    // Invalidate previous OTPs of this type
    await prisma.emailOtp.updateMany({
      where: { email: normalizedEmail, type: otpType, isUsed: false },
      data: { isUsed: true },
    });

    const newOtp = config.demo.demoMode ? config.demo.fixedOtp : generate6DigitOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        otp: newOtp,
        type: otpType,
        expiresAt,
      },
    });

    if (otpType === OtpType.REGISTER) {
      await emailService.sendVerificationOtp(normalizedEmail, newOtp, user.fullName);
    } else if (otpType === OtpType.FORGOT_PASSWORD) {
      await emailService.sendPasswordResetOtp(normalizedEmail, newOtp, user.fullName);
    } else {
      await emailService.sendLoginOtp(normalizedEmail, newOtp, user.fullName);
    }

    sendSuccess(res, 'Đã gửi lại mã OTP thành công. Vui lòng kiểm tra email.', {
      demoOtp: config.demo.demoMode ? config.demo.fixedOtp : undefined,
    });
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    sendError(res, 'Lỗi khi gửi lại mã OTP', 500);
  }
};

/**
 * 6. Forgot Password: Request Reset OTP
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      sendError(res, 'Vui lòng nhập địa chỉ email đã đăng ký', 400);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Uniform response to never leak whether email exists
    const uniformResponse = {
      message: 'Nếu địa chỉ email tồn tại trong hệ thống, mã xác nhận đặt lại mật khẩu đã được gửi đến hộp thư.',
      email: normalizedEmail,
      demoOtp: config.demo.demoMode ? config.demo.fixedOtp : undefined,
    };

    if (!user || !user.isActive) {
      sendSuccess(res, uniformResponse.message, uniformResponse);
      return;
    }

    // Invalidate previous reset OTPs
    await prisma.emailOtp.updateMany({
      where: { email: normalizedEmail, type: OtpType.FORGOT_PASSWORD, isUsed: false },
      data: { isUsed: true },
    });

    const otp = config.demo.demoMode ? config.demo.fixedOtp : generate6DigitOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes as required

    await prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        otp,
        type: OtpType.FORGOT_PASSWORD,
        expiresAt,
      },
    });

    await emailService.sendPasswordResetOtp(normalizedEmail, otp, user.fullName);

    sendSuccess(res, uniformResponse.message, uniformResponse);
  } catch (error: any) {
    console.error('Forgot password error:', error);
    sendError(res, 'Lỗi khi xử lý yêu cầu đặt lại mật khẩu', 500);
  }
};

/**
 * 7. Reset Password with OTP
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      sendError(res, 'Vui lòng nhập đầy đủ thông tin: email, mã OTP và mật khẩu mới', 400);
      return;
    }

    if (newPassword !== confirmPassword) {
      sendError(res, 'Mật khẩu mới và xác nhận mật khẩu không khớp', 400);
      return;
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      sendError(res, 'Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm cả chữ cái và số', 400);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      sendError(res, 'Yêu cầu không hợp lệ', 400);
      return;
    }

    const isDemoOtp = config.demo.demoMode && cleanOtp === config.demo.fixedOtp;

    if (!isDemoOtp) {
      const emailOtp = await prisma.emailOtp.findFirst({
        where: {
          email: normalizedEmail,
          type: OtpType.FORGOT_PASSWORD,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!emailOtp || emailOtp.otp !== cleanOtp) {
        sendError(res, 'Mã OTP đặt lại mật khẩu không chính xác hoặc đã hết hạn', 400);
        return;
      }

      await prisma.emailOtp.update({
        where: { id: emailOtp.id },
        data: { isUsed: true },
      });
    }

    // Hash and update new password
    const passwordHash = await argon2.hash(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Send confirmation notice
    await emailService.sendPasswordChangeConfirmation(normalizedEmail, user.fullName);

    sendSuccess(res, 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.');
  } catch (error: any) {
    console.error('Reset password error:', error);
    sendError(res, 'Lỗi hệ thống khi đặt lại mật khẩu', 500);
  }
};

/**
 * 8. Logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Client discards token, session revoked
    sendSuccess(res, 'Đăng xuất thành công');
  } catch (error: any) {
    sendError(res, 'Lỗi khi đăng xuất', 500);
  }
};

/**
 * 9. Get Authenticated User Profile
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      sendError(res, 'Chưa xác thực người dùng', 401);
      return;
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        studentCode: true,
        teacherCode: true,
        phoneNumber: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!fullUser) {
      sendError(res, 'Không tìm thấy người dùng', 404);
      return;
    }

    sendSuccess(res, 'Lấy thông tin người dùng thành công', fullUser);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy thông tin người dùng', 500);
  }
};
