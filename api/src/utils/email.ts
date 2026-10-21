import nodemailer from 'nodemailer';
import { config } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
};

export const sendOtpEmail = async (
  toEmail: string,
  otpCode: string,
  fullName: string
): Promise<boolean> => {
  // If SMTP user is not configured (or dev demo), log that email would be sent without throwing fatal error
  if (!config.smtp.user || !config.smtp.pass) {
    console.log(`[SMTP DEV MODE] To: ${toEmail} | Name: ${fullName} | OTP Code: ${otpCode}`);
    return true;
  }

  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #3F51B5; text-align: center;">PRIME Attendance</h2>
        <p>Xin chào <strong>${fullName}</strong>,</p>
        <p>Bạn đang thực hiện đăng nhập vào hệ thống điểm danh PRIME Attendance. Mã xác thực OTP của bạn là:</p>
        <div style="text-align: center; margin: 25px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1A237E; background: #E8EAF6; padding: 10px 24px; border-radius: 6px; display: inline-block;">${otpCode}</span>
        </div>
        <p style="color: #666; font-size: 14px;">Mã OTP có hiệu lực trong vòng <strong>5 phút</strong>. Tuyệt đối không chia sẻ mã này với bất kỳ ai để bảo vệ tài khoản.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">Đồ án tốt nghiệp: PRIME Attendance - Nhóm PRIME</p>
      </div>
    `;

    await getTransporter().sendMail({
      from: config.smtp.from,
      to: toEmail,
      subject: `[PRIME Attendance] Mã xác thực đăng nhập: ${otpCode}`,
      html: htmlContent,
    });

    return true;
  } catch (error) {
    console.error('Lỗi khi gửi email SMTP:', error);
    // Return false but don't crash app
    return false;
  }
};
