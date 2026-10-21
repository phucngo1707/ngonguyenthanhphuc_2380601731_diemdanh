import nodemailer from 'nodemailer';
import { config } from '../config/env';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.createTransporter();
  }

  private createTransporter(): void {
    if (config.smtp.user && config.smtp.pass) {
      const isGmail = config.smtp.host.toLowerCase().includes('gmail');
      this.transporter = nodemailer.createTransport({
        service: isGmail ? 'gmail' : undefined,
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass.replace(/\s+/g, ''), // Strip spaces from App Password
        },
      });
    }
  }

  private async sendMail(to: string, subject: string, html: string, text: string): Promise<boolean> {
    if (config.smtp.user && config.smtp.pass) {
      if (!this.transporter) {
        this.createTransporter();
      }
      try {
        await this.transporter!.sendMail({
          from: config.smtp.from || `"PRIME Attendance" <${config.smtp.user}>`,
          to,
          subject,
          text,
          html,
        });
        console.log(`📧 [REAL EMAIL SENT VIA GMAIL] To: ${to} | Subject: ${subject}`);
        return true;
      } catch (err: any) {
        console.error(`❌ [SMTP ERROR] Gửi email qua Gmail thất bại: ${err.message}`);
        console.log(`ℹ️ [FALLBACK OTP LOG] To: ${to} | Subject: ${subject}`);
        console.log(`   Message summary: ${text}`);
        return false;
      }
    }

    // In demo mode or when SMTP_PASS is pending: log OTP and continue gracefully
    console.log(`📧 [OTP NOTIFICATION] To: ${to} | Subject: ${subject}`);
    console.log(`   Message summary: ${text}`);
    return false;
  }

  /**
   * Send Email Verification OTP for Registration
   */
  async sendVerificationOtp(to: string, otp: string, fullName: string): Promise<boolean> {
    const subject = `[PRIME Attendance] Mã xác thực đăng ký tài khoản: ${otp}`;
    const text = `Xin chào ${fullName},\n\nMã xác thực OTP đăng ký tài khoản PRIME của bạn là: ${otp}\nMã này có hiệu lực trong vòng 5 phút.\n\nTrân trọng,\nHệ thống PRIME Attendance`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px;">
        <h2 style="color: #1E3A8A; margin-top: 0;">PRIME Attendance</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản trên hệ thống Điểm danh PRIME. Vui lòng nhập mã OTP sau để xác minh địa chỉ email của bạn:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1E3A8A; background: #EEF2FF; padding: 12px 24px; border-radius: 8px; border: 1px solid #C7D2FE;">${otp}</span>
        </div>
        <p style="color: #64748B; font-size: 13px;">Mã OTP có hiệu lực trong 5 phút. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94A3B8; text-align: center;">Hệ thống Điểm danh Sinh viên Thông minh PRIME</p>
      </div>
    `;
    return this.sendMail(to, subject, html, text);
  }

  /**
   * Send 3-Step Login OTP
   */
  async sendLoginOtp(to: string, otp: string, fullName: string): Promise<boolean> {
    const subject = `[PRIME Attendance] Mã OTP đăng nhập: ${otp}`;
    const text = `Xin chào ${fullName},\n\nMã xác thực OTP đăng nhập hệ thống PRIME của bạn là: ${otp}\nHiệu lực trong 5 phút.\n\nPRIME Attendance`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px;">
        <h2 style="color: #1E3A8A; margin-top: 0;">PRIME Attendance</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Bạn vừa thực hiện yêu cầu đăng nhập. Vui lòng nhập mã OTP sau để hoàn tất bước 3:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1E3A8A; background: #EEF2FF; padding: 12px 24px; border-radius: 8px; border: 1px solid #C7D2FE;">${otp}</span>
        </div>
        <p style="color: #64748B; font-size: 13px;">Mã có hiệu lực trong 5 phút. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
      </div>
    `;
    return this.sendMail(to, subject, html, text);
  }

  /**
   * Send Password Reset OTP
   */
  async sendPasswordResetOtp(to: string, otp: string, fullName: string): Promise<boolean> {
    const subject = `[PRIME Attendance] Mã đặt lại mật khẩu: ${otp}`;
    const text = `Xin chào ${fullName},\n\nMã xác nhận đặt lại mật khẩu của bạn là: ${otp}\nMã có hiệu lực trong 15 phút.\n\nPRIME Attendance`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px;">
        <h2 style="color: #DC2626; margin-top: 0;">Yêu cầu đặt lại mật khẩu</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản PRIME của bạn. Mã xác thực của bạn là:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #DC2626; background: #FEF2F2; padding: 12px 24px; border-radius: 8px; border: 1px solid #FECACA;">${otp}</span>
        </div>
        <p style="color: #64748B; font-size: 13px;">Mã này có hiệu lực trong 15 phút. Nếu bạn không yêu cầu, vui lòng đổi mật khẩu ngay lập tức.</p>
      </div>
    `;
    return this.sendMail(to, subject, html, text);
  }

  /**
   * Send Password Change Confirmation
   */
  async sendPasswordChangeConfirmation(to: string, fullName: string): Promise<boolean> {
    const subject = `[PRIME Attendance] Mật khẩu đã được thay đổi thành công`;
    const text = `Xin chào ${fullName},\n\nMật khẩu tài khoản PRIME của bạn đã được thay đổi thành công vào lúc ${new Date().toLocaleString('vi-VN')}.\n\nNếu không phải bạn thực hiện, vui lòng liên hệ Ban Quản Trị ngay.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px;">
        <h2 style="color: #16A34A; margin-top: 0;">Đổi mật khẩu thành công</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Mật khẩu tài khoản PRIME của bạn đã được cập nhật thành công vào lúc <strong>${new Date().toLocaleString('vi-VN')}</strong>.</p>
        <p style="color: #64748B; font-size: 13px;">Tất cả phiên đăng nhập cũ đã được thu hồi vì lý do an toàn. Bạn có thể đăng nhập lại bằng mật khẩu mới.</p>
      </div>
    `;
    return this.sendMail(to, subject, html, text);
  }
}

export const emailService = new EmailService();
