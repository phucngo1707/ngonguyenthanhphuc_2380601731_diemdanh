# PRIME Attendance - Đặc Tả Thiết Kế Hệ Thống (System Design Specification)

- **Tên dự án**: PRIME Attendance
- **Mã sinh viên**: 2380601731
- **Họ và tên**: Ngô Nguyễn Thanh Phúc
- **Cơ sở dữ liệu**: `DB_NgoNguyenThanhPhuc_2380601731_PrimeAttendance` (MySQL 8)
- **Tài khoản GitHub**: `phucngo1707@gmail.com` (`phucngo1707`)
- **Repository**: `https://github.com/phucngo1707/ngonguyenthanhphuc_prime_diemdanh`

---

## 1. Tổng quan Kiến Trúc Hệ Thống

Hệ thống PRIME Attendance gồm 3 phân hệ chính:
1. **Frontend Mobile (Flutter Material 3)**:
   - Kiến trúc Provider + Repository Pattern.
   - Định tuyến GoRouter với bảo vệ vai trò (Admin / Teacher / Student).
   - Dio HTTP Client với interceptor tự động refresh token, logging và timeout.
   - Lưu trữ FlutterSecureStorage cho JWT token và cấu hình nhạy cảm.
   - Tích hợp ngoại vi: QR Scanning (`mobile_scanner`), Biometrics (`local_auth`), Noise Meter (`noise_meter`), Accelerometer shake (`sensors_plus`), OCR và Dịch thuật (`google_mlkit_text_recognition`, `google_mlkit_translation`).
2. **Backend API (Node.js LTS, Express, TypeScript, Prisma ORM)**:
   - Kiến trúc Controller - Service - Repository / Model.
   - RESTful API `/api/v1` chuẩn hóa, có Swagger OpenAPI tại `/api-docs`.
   - Realtime WebSocket qua Socket.IO (kết nối phòng học/phiên điểm danh).
   - Bảo mật: Argon2id password hashing, OTP mã hóa SHA-256 kèm rate limiting (3 lần nhập sai, tối đa 3 lần resend/15 phút).
   - Dynamic Anti-Cheat QR: Ký số HMAC-SHA256 kèm nonce dùng 1 lần, timestamp hết hạn sau 10 giây.
   - Phân quyền (RBAC) nghiêm ngặt tại middleware backend trên từng endpoint.
3. **Cơ sở dữ liệu & Hạ tầng (MySQL 8, Docker Compose, Nginx/Caddy)**:
   - Database MySQL 8 với Prisma migrations và constraints chặt chẽ.
   - Docker Compose container hóa API + MySQL bền vững (volumes lưu trữ lâu dài) + Reverse proxy HTTPS.
   - Health check tự động `/health` và `/health/ready` sẵn sàng cho Uptime monitoring.

---

## 2. Mô hình Dữ Liệu (15 Bảng Prisma Schema)

Database: `DB_NgoNguyenThanhPhuc_2380601731_PrimeAttendance`

1. `users`: id, username, email, password_hash, full_name, avatar_url, role (ADMIN, TEACHER, STUDENT), phone_number, is_active, created_at, updated_at.
2. `faculties`: id, code, name, description, created_at, updated_at.
3. `subjects`: id, code, name, credits, faculty_id, created_at, updated_at.
4. `classrooms`: id, room_code, building, floor, capacity, latitude, longitude, radius_meters, created_at.
5. `class_sections`: id, code, subject_id, teacher_id, classroom_id, semester, academic_year, max_students, status, created_at, updated_at.
6. `enrollments`: id, student_id, class_section_id, enrolled_at, status, UNIQUE(student_id, class_section_id).
7. `class_schedules`: id, class_section_id, day_of_week, start_period, end_period, start_time, end_time, classroom_id.
8. `attendance_sessions`: id, class_section_id, teacher_id, session_code, title, start_time, end_time, status (PENDING, ACTIVE, CLOSED, CANCELLED), duration_minutes, allow_nfc, allow_biometric, allow_gps, created_at, updated_at.
9. `attendance_records`: id, session_id, student_id, check_in_time, status (PRESENT, LATE, ABSENT, EXCUSED), method (DYNAMIC_QR, NFC, MANUAL), device_info, ip_address, latitude, longitude, modified_by_teacher_id, modified_reason, updated_at, UNIQUE(session_id, student_id).
10. `leave_requests`: id, student_id, class_section_id, session_id, reason, start_date, end_date, status (PENDING, APPROVED, REJECTED, CANCELLED), reviewed_by_id, review_notes, reviewed_at, created_at, updated_at.
11. `leave_attachments`: id, leave_request_id, file_name, file_path, file_size, mime_type, created_at.
12. `registered_nfc_tags`: id, student_id, tag_uid, tag_label, is_active, registered_at.
13. `email_otps`: id, email, user_id, otp_hash, purpose (LOGIN, RESET_PASSWORD), expires_at, attempts, max_attempts, is_used, created_at.
14. `refresh_tokens`: id, user_id, token_hash, expires_at, is_revoked, created_at.
15. `audit_logs`: id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at.

---

## 3. Luồng Xác Thực 3 Bước & Chế Độ Demo

### Luồng chuẩn
1. **Bước 1**: `POST /api/v1/auth/login` (body: `{ emailOrUsername, password }`).
   - Backend xác thực Argon2id. Nếu hợp lệ, sinh mã OTP 6 chữ số ngẫu nhiên.
   - Hash OTP bằng SHA-256 lưu vào bảng `email_otps` với thời hạn 5 phút.
   - Gửi OTP qua SMTP (Nodemailer).
   - Trả về `{ sessionToken, message: "Mã OTP đã được gửi về email" }`.
2. **Bước 2**: Người dùng nhận email OTP.
3. **Bước 3**: `POST /api/v1/auth/verify-otp` (body: `{ sessionToken, otp }`).
   - Kiểm tra mã OTP: chưa dùng, chưa hết hạn, số lần thử < 3.
   - Nếu đúng: Đánh dấu `is_used = true`, sinh cặp JWT `accessToken` (thời hạn 2 giờ) và `refreshToken` (thời hạn 30 ngày).
   - Trả về token và thông tin user cùng vai trò (ADMIN, TEACHER, STUDENT).

### Chế độ Demo Giảng Viên
- Biến môi trường: `ENABLE_DEMO_ACCOUNTS=true` và `DEMO_FIXED_OTP=170723`.
- Chỉ áp dụng cho các tài khoản demo được seed sẵn (`admin@prime.edu.vn`, `teacher@prime.edu.vn`, `student@prime.edu.vn`).
- Đối với các tài khoản demo, OTP luôn được chấp nhận nếu nhập đúng `DEMO_FIXED_OTP`. Các tài khoản thông thường khác bắt buộc phải qua SMTP OTP.

---

## 4. Cơ Chế Smart Anti-Cheat Dynamic QR

Nhằm ngăn chặn triệt để hành vi chụp màn hình mã QR gửi ra ngoài lớp học:
1. Giảng viên mở màn hình phiên điểm danh trên điện thoại/máy chiếu:
   - Ứng dụng Teacher gọi `POST /api/v1/attendance-sessions/:id/generate-qr-token` mỗi 10 giây (hoặc qua WebSocket room).
   - Backend sinh một payload chứa: `{ sessionId, nonce, timestamp, exp: now + 10s }`.
   - Backend ký số payload bằng HMAC-SHA256 (`QR_SECRET_KEY`) và lưu `nonce` vào cache/bảng tạm với TTL 15s.
   - Frontend hiển thị mã QR kèm thanh đếm ngược visual 10 giây.
2. Sinh viên quét mã QR:
   - Client gửi `POST /api/v1/attendance-records/check-in-qr` kèm signed payload và thông tin thiết bị (tùy chọn: sinh trắc học đã xác minh trên máy).
   - Backend giải mã chữ ký, kiểm tra:
     a) Phiên đang ở trạng thái ACTIVE và trong khoảng thời gian hợp lệ.
     b) Sinh viên có ghi danh (enrollment) trong lớp học phần này.
     c) `timestamp` không quá 10 giây so với giờ server (cho phép sai số mạng ±3s).
     d) `nonce` chưa từng được sử dụng (chống Replay Attack). Đánh dấu `nonce` đã dùng ngay lập tức.
     e) Sinh viên chưa có bản ghi điểm danh trong phiên này (`UNIQUE(session_id, student_id)`).
   - Nếu hợp lệ: Tạo bản ghi `attendance_records` với trạng thái `PRESENT` (hoặc `LATE` nếu sau thời gian quy định), phát sự kiện Socket.IO `attendance:updated` tới phòng của Giảng viên để cập nhật danh sách tức thì!

---

## 5. Tích Hợp Cảm Biến & AI ML Kit

1. **Đo Độ Ồn Lớp Học (Sensor D1)**:
   - Ứng dụng Teacher dùng `noise_meter` đo decibel thời gian thực từ microphone điện thoại.
   - Giao diện có đồng hồ đo dạng bán nguyệt trực quan, biểu đồ sóng âm.
   - Ngưỡng cảnh báo tùy chỉnh (mặc định 70 dB). Khi vượt ngưỡng, hiển thị cảnh báo đỏ và ghi lại mức độ ồn trung bình của buổi học.
   - Minh bạch quyền riêng tư: Ứng dụng chỉ đọc biên độ âm thanh (RMS decibel), tuyệt đối không lưu file thu âm hoặc truyền dữ liệu âm thanh lên server.
2. **Lắc Điện Thoại Điểm Danh (Sensor D2)**:
   - Ứng dụng Student dùng `sensors_plus` nhận diện cử chỉ lắc (accelerometer > 15 m/s²).
   - Khi lắc, tự động mở nhanh màn hình Quét QR hoặc Điểm danh (sau khi đã mở khóa bảo vệ).
3. **Sinh Trắc Học (Sensor E1)**:
   - Dùng `local_auth` kiểm tra Face ID / Fingerprint trên thiết bị trước khi xác nhận điểm danh.
4. **OCR Minh Chứng Nghỉ Phép (Sensor F1)**:
   - Khi sinh viên làm đơn xin nghỉ phép, chụp ảnh giấy khám bệnh/giấy xác nhận.
   - Chạy `google_mlkit_text_recognition` trên thiết bị để trích xuất chữ viết, tự động gợi ý điền vào lý do và ngày nghỉ.
5. **Dịch Thuật Đa Ngữ (Sensor F2)**:
   - Dùng `google_mlkit_translation` dịch thông báo lớp học và đơn xin phép giữa Tiếng Việt và Tiếng Anh.
