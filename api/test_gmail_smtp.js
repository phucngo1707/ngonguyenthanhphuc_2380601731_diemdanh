const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const user = process.env.SMTP_USER;
const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

console.log('--- KIỂM TRA KẾT NỐI GMAIL SMTP ---');
console.log('SMTP_USER:', user || '(Chưa cấu hình)');
console.log('SMTP_PASS:', pass ? '*** (Đã cấu hình ' + pass.length + ' ký tự)' : '(Chưa cấu hình)');

if (!user || !pass) {
  console.log('\n❌ [LỖI]: Chưa điền SMTP_USER hoặc SMTP_PASS trong file api/.env');
  console.log('👉 Hướng dẫn:');
  console.log('1. Truy cập https://myaccount.google.com/apppasswords');
  console.log('2. Bật "Xác minh 2 bước" (2-Step Verification) nếu chưa bật.');
  console.log('3. Tạo "Mật khẩu ứng dụng" (App Password) mới, đặt tên: PRIME Attendance.');
  console.log('4. Google sẽ cấp mã 16 ký tự (ví dụ: abcd efgh ijkl mnop).');
  console.log('5. Điền vào api/.env:');
  console.log('   SMTP_USER=' + (user || 'phucngo1707@gmail.com'));
  console.log('   SMTP_PASS=abcdefghijklmnop');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: user,
    pass: pass,
  },
});

async function run() {
  try {
    console.log('⏳ Đang kết nối tới máy chủ Gmail SMTP (smtp.gmail.com:587)...');
    await transporter.verify();
    console.log('✅ Xác thực tài khoản Gmail SMTP thành công!');

    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`⏳ Đang gửi thử email mã OTP [${testOtp}] đến: ${user}...`);

    const info = await transporter.sendMail({
      from: `"PRIME Attendance" <${user}>`,
      to: user,
      subject: `[PRIME Attendance] Mã xác thực thử nghiệm: ${testOtp}`,
      text: `Xin chào Ngô Nguyễn Thanh Phúc,\n\nĐây là email kiểm tra hệ thống gửi mã OTP thật của PRIME Attendance.\nMã OTP của bạn là: ${testOtp}\n\nTrân trọng!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #1E3A8A; margin-top: 0;">PRIME Attendance</h2>
          <p>Xin chào <strong>Ngô Nguyễn Thanh Phúc</strong>,</p>
          <p>Hệ thống vừa gửi thành công mã OTP thật qua Gmail SMTP:</p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1E3A8A; background: #EEF2FF; padding: 12px 24px; border-radius: 8px; border: 1px solid #C7D2FE;">${testOtp}</span>
          </div>
          <p style="color: #16A34A; font-weight: bold;">✅ Kết nối Gmail SMTP hoạt động 100%!</p>
        </div>
      `,
    });

    console.log('🎉 GỬI EMAIL THÀNH CÔNG! MessageId:', info.messageId);
    console.log(`📬 Vui lòng mở hộp thư Gmail (${user}) để kiểm tra.`);
  } catch (err) {
    console.error('❌ GỬI EMAIL THẤT BẠI:', err.message);
    if (err.code === 'EAUTH') {
      console.error('\n👉 Gợi ý sửa lỗi: Google từ chối mật khẩu thông thường.');
      console.error('   Bạn PHẢI sử dụng "Mật khẩu ứng dụng" (App Password) 16 ký tự.');
      console.error('   Xem tại: https://myaccount.google.com/apppasswords');
    }
    process.exit(1);
  }
}

run();
