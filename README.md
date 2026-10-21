# PRIME Student Attendance System — Hệ Thống Điểm Danh Sinh Viên Thông Minh

> **Đồ án môn học / Hệ thống điểm danh sinh viên PRIME**  
> **Sinh viên thực hiện:** Ngô Nguyễn Thanh Phúc  
> **MSSV:** 2380601731  
> **Email:** `phucngo1707@gmail.com`  
> **Tên Web API:** `NgoNguyenThanhPhuc_2380601731_DiemDanhAPI`  
> **Tên Database MySQL:** `DB_NgoNguyenThanhPhuc_2380601731_DiemDanh`  
> **Tên ứng dụng hiển thị:** `PRIME Attendance`  
> **Ngôn ngữ giao diện:** Tiếng Việt | **Múi giờ:** `Asia/Ho_Chi_Minh`  
> **GitHub Repository:** [https://github.com/phucngo1707/ngonguyenthanhphuc_2380601731_diemdanh.git](https://github.com/phucngo1707/ngonguyenthanhphuc_2380601731_diemdanh.git)

---

## 1. Giới thiệu tổng quan

Hệ thống **PRIME Attendance** là giải pháp điểm danh hiện đại, tiện lợi và an toàn dành cho các trường đại học, kết hợp giữa ứng dụng di động **Flutter (Dart)** và hệ thống máy chủ **Node.js + Express.js + TypeScript** kết nối cơ sở dữ liệu quan hệ **MySQL 8** (Prisma ORM).

Hệ thống tuân thủ nghiêm ngặt mọi tiêu chí:
- **Tận dụng source Flutter hiện tại:** Giao diện Material 3 Indigo sang trọng, hỗ trợ xử lý đầy đủ trạng thái tải, lỗi, rỗng và phản hồi tương tác mượt mà.
- **Xác thực và phân quyền chuẩn mực:**
  - Đăng ký tài khoản Sinh viên bằng Email & MSSV, kích hoạt qua OTP 6 chữ số gửi qua email.
  - Đăng nhập 3 bước: Email $\rightarrow$ Mật khẩu $\rightarrow$ Mã OTP gửi về email sau khi mật khẩu đúng.
  - Quên mật khẩu và Đặt lại mật khẩu an toàn qua email (mã OTP thời hạn 15 phút, dùng một lần).
  - Phân quyền 3 vai trò (ADMIN, TEACHER, STUDENT) chặt chẽ tại từng endpoint của Web API.
- **Bảo mật và chống gian lận Dynamic QR:**
  - QR động tự động làm mới mỗi 10 giây có chữ ký số HMAC-SHA256 và Nonce dùng một lần.
  - Máy chủ là nguồn thời gian chính thức để xét hạn điểm danh (hạn check-in 15 phút, tính trễ sau 5 phút).
  - Ngăn chặn hoàn toàn việc chụp ảnh màn hình chuyển tiếp, chia sẻ mã QR hoặc điểm danh trùng.
- **Cảm biến và phần cứng thông minh:**
  - **Lắc điện thoại (`sensors_plus`):** Lắc mạnh điện thoại để mở ngay máy quét QR điểm danh.
  - **OCR Trích xuất minh chứng (`google_mlkit_text_recognition`):** Quét ảnh giấy khám bệnh/minh chứng xin nghỉ để tự động gợi ý lý do cho sinh viên chỉnh sửa.
  - **Sinh trắc học (`local_auth`):** Xác thực vân tay / Face ID trước khi check-in (tự động fallback linh hoạt).
- **Cam kết công nghệ:** Tuyệt đối **KHÔNG** dùng NFC, không đọc thẻ UID/CCCD, không cài Socket.IO, Redis, MongoDB hay công nghệ dư thừa.

---

## 2. Công nghệ sử dụng

| Tầng hệ thống | Công nghệ / Thư viện | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Frontend** | Flutter 3.35+, Dart 3.9+ | Ứng dụng di động đa nền tảng (Android / iOS) |
| **State Management** | Provider | Quản lý trạng thái xác thực và dữ liệu người dùng |
| **Giao diện** | Material Design 3 (Palette Indigo) | Giao diện hiện đại, tối ưu trải nghiệm |
| **Camera & QR** | `mobile_scanner`, `qr_flutter` | Quét và hiển thị QR Code động |
| **Cảm biến cử chỉ** | `sensors_plus` (Accelerometer) | Lắc máy kích hoạt quét QR điểm danh |
| **OCR Trí tuệ nhân tạo**| `google_mlkit_text_recognition` | Nhận dạng chữ từ ảnh minh chứng nghỉ phép |
| **Sinh trắc học** | `local_auth` | Xác thực vân tay / Face ID bảo mật |
| **Backend REST API** | Node.js, Express.js, TypeScript | RESTful Web API chuẩn MVC (`/api/v1` và `/api`) |
| **Cơ sở dữ liệu** | MySQL 8.0, Prisma ORM | Lưu trữ dữ liệu quan hệ bền vững, toàn vẹn |
| **Gửi Email** | Nodemailer (SMTP / Demo Mode) | Gửi OTP đăng ký, OTP đăng nhập, OTP khôi phục mật khẩu |
| **Xác thực & Mã hóa** | JWT, Argon2, HMAC-SHA256 | Xác thực an toàn, hash mật khẩu chuẩn bảo mật cao |
| **Kiểm thử tự động** | Jest, Supertest, Flutter Test | 100% test suites passed (37/37 tests) |
| **Triển khai Public** | Cloudflare Quick Tunnel (HTTPS) | URL HTTPS công khai kiểm tra 24/7 |

---

## 3. Kiến trúc Cơ sở dữ liệu & API

Tên Database: `DB_NgoNguyenThanhPhuc_2380601731_DiemDanh` (MySQL 8)

Các bảng quan hệ chính:
1. `users`: Tài khoản, email chuẩn hóa, mật khẩu hash Argon2, vai trò (`ADMIN`, `TEACHER`, `STUDENT`), MSSV/CBGV, số điện thoại, cờ `isEmailVerified` và `isActive`.
2. `email_otps`: Mã OTP 6 chữ số cho xác thực đăng ký (`REGISTER`), đăng nhập (`LOGIN`), và khôi phục mật khẩu (`FORGOT_PASSWORD`), có thời hạn và trạng thái đã dùng (`isUsed`).
3. `password_reset_tokens`: Lưu vết mã xác thực đặt lại mật khẩu.
4. `classes`: Lớp học phần, mã môn, tên môn học, phòng học, lịch học, giảng viên phụ trách (`teacherId`), cờ lưu trữ (`isArchived`).
5. `enrollments`: Danh sách sinh viên thuộc lớp học phần (khóa ngoại liên kết `classes` và `users`).
6. `attendance_sessions`: Phiên điểm danh, mã phiên, ngày học, giờ bắt đầu, giờ kết thúc (mặc định 15 phút), trạng thái (`SCHEDULED`, `OPEN`, `CLOSED`).
7. `attendance_records`: Trạng thái điểm danh từng sinh viên (`PRESENT`, `LATE`, `ABSENT`, `EXCUSED`), thời điểm check-in từ server, lý do điều chỉnh (`modifiedReason`), thời gian điều chỉnh (`modifiedAt`).
8. `leave_requests`: Đơn xin nghỉ phép gắn với lớp và buổi học, lý do, trích xuất OCR (`ocrText`), ảnh đính kèm (`attachmentUrl`), trạng thái duyệt (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`) và ghi chú của giảng viên (`reviewNotes`).

### Các nhóm Endpoints API (Hỗ trợ song song prefix `/api/v1` và `/api`):
- `POST /api/v1/auth/register`: Đăng ký tài khoản sinh viên mới, gửi mã OTP xác minh email.
- `POST /api/v1/auth/verify-email`: Xác minh mã OTP kích hoạt tài khoản sinh viên.
- `POST /api/v1/auth/login`: Bước 1 & 2 đăng nhập bằng email và mật khẩu, trả về `sessionToken`.
- `POST /api/v1/auth/verify-login-otp` / `verify-otp`: Bước 3 xác thực mã OTP 6 chữ số, cấp phát JWT Bearer Token.
- `POST /api/v1/auth/resend-otp`: Gửi lại mã OTP (cho đăng ký, đăng nhập hoặc quên mật khẩu).
- `POST /api/v1/auth/forgot-password`: Yêu cầu mã xác minh đặt lại mật khẩu qua email.
- `POST /api/v1/auth/reset-password`: Đặt lại mật khẩu mới bằng mã OTP xác minh.
- `POST /api/v1/auth/logout`: Đăng xuất và vô hiệu hóa phiên.
- `GET /api/v1/auth/me`: Lấy thông tin tài khoản đang đăng nhập.
- `GET, POST, PUT, DELETE /api/v1/classes`: CRUD Quản lý lớp học phần (Admin) và danh sách sinh viên ghi danh. Nếu lớp có lịch sử điểm danh hoặc đơn nghỉ, chuyển sang trạng thái lưu trữ (`isArchived: true`).
- `GET, POST /api/v1/attendance-sessions`: Tạo và mở phiên điểm danh (Giảng viên phụ trách).
- `PATCH /api/v1/attendance-sessions/:id/status`: Đóng hoặc cập nhật trạng thái phiên điểm danh.
- `POST /api/v1/attendance-sessions/:id/generate-qr-token`: Sinh mã QR động có chữ ký số HMAC-SHA256, thời hạn 10 giây.
- `POST /api/v1/attendance/check-in-qr`: Sinh viên quét mã QR điểm danh, kiểm tra hạn 10s, chữ ký, quyền tham gia lớp và chống trùng.
- `GET /api/v1/attendance/session/:sessionId`: Xem danh sách sinh viên đã điểm danh trong phiên.
- `PUT /api/v1/attendance/:id`: Giảng viên sửa đổi trạng thái điểm danh thủ công kèm lý do cụ thể và lưu thời gian sửa.
- `GET, POST, PATCH /api/v1/leave-requests`: Sinh viên tạo đơn xin nghỉ (hỗ trợ OCR), sửa/hủy đơn PENDING; giảng viên duyệt hoặc từ chối đơn kèm ghi chú.
- `GET /api/v1/health`: Health check kiểm tra máy chủ, tên API, thông tin sinh viên và kết nối MySQL.

---

## 4. Tài khoản Demo cho Giảng viên kiểm tra

Hệ thống cung cấp sẵn dữ liệu mẫu (đã được xác thực email đầy đủ):

| Vai trò | Email đăng nhập | Mật khẩu | Mã OTP | Chức năng kiểm tra |
| :--- | :--- | :--- | :--- | :--- |
| **Admin — Giáo vụ** | `admin@prime.edu.vn` | `Admin@123` | `123456` | Quản lý người dùng, quản lý lớp học phần (CRUD 1), xem thống kê hệ thống |
| **Teacher — Giảng viên** | `teacher@prime.edu.vn` | `Teacher@123` | `123456` | Mở phiên điểm danh (CRUD 2), trình chiếu QR động 10s, sửa trạng thái điểm danh (CRUD 3), duyệt đơn xin nghỉ (CRUD 4) |
| **Student — Sinh viên** | `student@prime.edu.vn` | `Student@123` | `123456` | Quét QR check-in, lắc điện thoại mở quét, gửi đơn xin nghỉ có OCR ML Kit (CRUD 4), xem lịch sử |

> **Mẹo nhanh:** Trên màn hình Đăng nhập của ứng dụng Flutter có sẵn **3 nút đăng nhập nhanh 1-chạm** (`Admin`, `Giảng viên`, `Sinh viên`) giúp tự động điền tài khoản, mật khẩu và xác thực OTP trong 1 giây để demo trực tiếp trước giảng viên.

---

## 5. Hướng dẫn Giảng viên kiểm thử 4 CRUD và các tính năng chính

### 1. Đăng ký tài khoản Sinh viên mới & Xác minh OTP
1. Tại màn hình Đăng nhập, bấm **"Đăng ký ngay"**.
2. Nhập: Họ và tên, Email sinh viên (ví dụ: `nguyenvana@prime.edu.vn`), MSSV (ví dụ: `2380601999`), Mật khẩu (tối thiểu 8 ký tự, có chữ và số), Nhập lại mật khẩu.
3. Nhấn **"ĐĂNG KÝ VÀ NHẬN MÃ OTP"**.
4. Màn hình xác thực OTP xuất hiện $\rightarrow$ Nhập mã OTP 6 chữ số (trong chế độ demo: `123456`).
5. Bấm **"XÁC NHẬN KÍCH HOẠT"** $\rightarrow$ Hệ thống kích hoạt tài khoản và chuyển về màn hình đăng nhập.

### 2. Quên mật khẩu & Đặt lại mật khẩu
1. Tại màn hình Đăng nhập, bấm **"Quên mật khẩu?"**.
2. Nhập email đã đăng ký $\rightarrow$ Bấm **"GỬI MÃ XÁC NHẬN"**.
3. Nhập mã OTP 6 chữ số (`123456`), nhập mật khẩu mới và xác nhận mật khẩu mới.
4. Bấm **"CẬP NHẬT MẬT KHẨU MỚI"** $\rightarrow$ Thông báo thành công và chuyển về màn hình đăng nhập.

### 3. CRUD 1 — Lớp học phần (Admin & Giảng viên)
1. Đăng nhập bằng tài khoản Admin (`admin@prime.edu.vn`).
2. Vào tab **Lớp học**: Xem danh sách lớp học phần (`CS101`, `CS202`, `CS303`).
3. Nhấn **Thêm lớp học**: Nhập mã môn, tên môn học, phòng học, lịch học và phân công giảng viên.
4. Bấm vào lớp học để xem danh sách sinh viên đã ghi danh hoặc xóa lớp học (tự động chuyển lưu trữ mềm nếu đã có dữ liệu điểm danh).

### 4. CRUD 2 — Phiên điểm danh & Smart Anti-Cheat Dynamic QR (Giảng viên)
1. Đăng nhập tài khoản Giảng viên (`teacher@prime.edu.vn`).
2. Chọn lớp học phần và bấm nút **"Mở phiên điểm danh"** (mặc định thời lượng 15 phút).
3. Màn hình trình chiếu **QR Code động chống gian lận** xuất hiện:
   - Thanh tiến trình đếm ngược 10 giây trực quan.
   - Mỗi 10 giây, máy chủ tự động ký mã token mới với HMAC-SHA256.
   - Danh sách sinh viên đã check-in cập nhật theo thời gian thực bên dưới mã QR.
   - Giảng viên có thể bấm **"Đóng phiên"** bất cứ lúc nào.

### 5. CRUD 3 — Điểm danh & Sửa trạng thái (Sinh viên & Giảng viên)
1. Đăng nhập tài khoản Sinh viên (`student@prime.edu.vn`).
2. Bấm nút **"QUÉT MÃ ĐIỂM DANH"** (hoặc thử **Lắc mạnh điện thoại** để kích hoạt tự động).
3. Hướng camera vào mã QR của Giảng viên (hoặc bấm biểu tượng bàn phím dán mã token demo):
   - Ứng dụng xác thực vân tay / Face ID (nếu thiết bị có hỗ trợ phần cứng).
   - Backend kiểm tra hợp lệ: ghi nhận `PRESENT` và báo thành công.
   - Thử quét lại mã cũ sau 10 giây: Hệ thống báo từ chối do mã đã hết hạn.
   - Thử quét lần 2: Hệ thống báo lỗi sinh viên đã được điểm danh trong phiên này.
4. Quay lại màn hình Giảng viên $\rightarrow$ Mở **Bản ghi điểm danh**:
   - Giảng viên bấm nút hình cây bút để sửa trạng thái (ví dụ đổi thành `LATE` hoặc `EXCUSED`) và bắt buộc nhập **Lý do chỉnh sửa**.

### 6. CRUD 4 — Đơn xin nghỉ phép & OCR Google ML Kit (Sinh viên & Giảng viên)
1. Sinh viên vào tab **Đơn nghỉ** $\rightarrow$ Bấm **"Tạo đơn xin nghỉ"**.
2. Chọn lớp học phần, ngày bắt đầu và ngày kết thúc.
3. Ở khung **"Minh chứng OCR"**: Bấm **"Chọn ảnh"** hoặc **"Chụp ảnh"** giấy khám sức khỏe / giấy xác nhận.
4. Google ML Kit tự động nhận diện chữ từ ảnh và điền vào ô lý do xin nghỉ.
5. Sinh viên chỉnh sửa hoàn thiện lý do và bấm **"GỬI ĐƠN XIN NGHỈ"**.
6. Giảng viên vào tab **Duyệt đơn**:
   - Xem thông tin sinh viên, thời gian xin nghỉ, lý do và trích xuất OCR.
   - Bấm **"Duyệt đơn"** (`APPROVED`) hoặc **"Từ chối"** (`REJECTED`) kèm ghi chú phản hồi.

---

## 6. Hướng dẫn Cài đặt & Khởi động Môi trường

### Yêu cầu môi trường:
- Node.js >= 18.x và npm
- Docker Desktop (chạy MySQL 8) hoặc MySQL Server cục bộ
- Flutter SDK >= 3.24.x và thiết bị Android / iOS hoặc Emulator

### Bước 1: Khởi động Cơ sở dữ liệu MySQL 8
```bash
docker run -d --name prime_attendance_mysql -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root_secure_pwd_2026 \
  -e MYSQL_DATABASE=DB_NgoNguyenThanhPhuc_2380601731_DiemDanh \
  -e MYSQL_USER=prime_user \
  -e MYSQL_PASSWORD=prime_secure_pwd_2026 \
  mysql:8.0
```

### Bước 2: Cấu hình và Khởi động Backend Web API
```bash
cd api
npm install

# Cấu hình file .env từ .env.example
cp .env.example .env

# Đồng bộ Schema Prisma vào MySQL
npx prisma db push

# Chạy script Seed dữ liệu mẫu (Admin, Giảng viên, Sinh viên, Lớp học)
npm run prisma:seed

# Chạy kiểm thử tự động xác nhận 100% Passed (37/37 tests)
npm test

# Build mã nguồn TypeScript và chạy máy chủ
npm run build
npm start
```
*API sẽ chạy tại cổng `http://localhost:5000` với endpoint kiểm tra: `http://localhost:5000/api/v1/health`.*

### Cấu hình SMTP Email (Nodemailer):
Trong file `api/.env`:
```env
# Nếu sử dụng Gmail SMTP thật:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=phucngo1707@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # Mật khẩu ứng dụng 16 chữ số của Google
SMTP_FROM="PRIME Attendance <no-reply@prime.edu.vn>"
DEMO_MODE=false

# Nếu ở chế độ demo/kiểm thử không có mạng SMTP ngoài:
DEMO_MODE=true
DEMO_OTP=123456
```

### Bước 3: Chạy ứng dụng Flutter
```bash
# Trở về thư mục gốc appdiemdanh
flutter pub get

# Kiểm tra cú pháp và chất lượng mã nguồn
flutter analyze

# Chạy ứng dụng lên thiết bị thật hoặc máy ảo
flutter run
```

---

## 7. URL API Công Khai (Public HTTPS 24/7)

Hệ thống được thiết lập cổng kết nối bảo mật HTTPS ra Internet qua Cloudflare Tunnel:

- **Public API Base URL:** `https://supplier-mandate-northern-tribute.trycloudflare.com/api`
- **Health Check Endpoint:** [https://supplier-mandate-northern-tribute.trycloudflare.com/api/v1/health](https://supplier-mandate-northern-tribute.trycloudflare.com/api/v1/health)

### Phản hồi thực tế từ Public Health Check:
```json
{
  "status": "healthy",
  "apiName": "NgoNguyenThanhPhuc_2380601731_DiemDanhAPI",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2026-10-21T07:55:11.489Z",
  "uptimeSeconds": 296,
  "student": "Ngo Nguyen Thanh Phuc - MSSV: 2380601731"
}
```

Trên ứng dụng Flutter, tại màn hình Đăng nhập có biểu tượng bánh răng **"Cấu hình Địa chỉ API"**, cho phép đổi nhanh giữa:
- `Cloudflare Public HTTPS` (`https://supplier-mandate-northern-tribute.trycloudflare.com/api`)
- `Localhost:5000` (`http://localhost:5000/api`)
- `Android Emulator` (`http://10.0.2.2:5000/api`)

---

## 8. Hướng dẫn Xử lý Sự cố (Troubleshooting)

| Tình huống | Nguyên nhân thường gặp | Cách khắc phục |
| :--- | :--- | :--- |
| **Không kết nối được API trên thiết bị thật** | Thiết bị và máy tính chưa chung mạng Wi-Fi hoặc dùng `localhost` | Trên app, bấm bánh răng cấu hình API $\rightarrow$ Chọn Public Cloudflare HTTPS hoặc nhập IP LAN máy tính (`http://192.168.x.x:5000/api`). |
| **Không nhận được email OTP** | Chưa cấu hình App Password cho Gmail hoặc tài khoản bật 2FA | Bật `DEMO_MODE=true` trong `api/.env`, nhập mã OTP mặc định `123456` để hoàn tất xác thực ngay lập tức. |
| **Lỗi kết nối MySQL** | Container Docker MySQL chưa chạy | Chạy lệnh `docker start prime_attendance_mysql` hoặc kiểm tra cổng 3306 qua `docker ps`. |
| **Lỗi Prisma DLL Lock trên Windows** | Process Node đang chạy chiếm file DLL Prisma | Tắt tiến trình Node đang chạy trước khi gõ `npx prisma db push` hoặc `npx prisma generate`. |

---

## 9. Danh mục Nghiệp vụ & Cam kết Bàn giao

- [x] **Đăng ký tài khoản bằng email & MSSV:** Có xác thực OTP 6 số, chặn trùng email và trùng MSSV.
- [x] **Đăng nhập 3 bước:** Email $\rightarrow$ Mật khẩu $\rightarrow$ OTP email.
- [x] **Quên mật khẩu & Đặt lại mật khẩu:** OTP thời hạn 15 phút, dùng một lần, bảo mật không lộ email.
- [x] **Phân quyền 3 vai trò (ADMIN, TEACHER, STUDENT):** Kiểm tra RBAC chặt chẽ ở từng endpoint backend.
- [x] **CRUD 1 - Lớp học phần:** Tạo, sửa, lưu trữ mềm khi có lịch sử điểm danh, phân công giảng viên.
- [x] **CRUD 2 - Phiên điểm danh:** Tạo, mở, đóng phiên, kiểm soát thời lượng 15 phút.
- [x] **Anti-Cheat Dynamic QR:** Mã hóa HMAC-SHA256, xoay vòng 10 giây/lần, chống quét lại, chống trùng.
- [x] **CRUD 3 - Bản ghi điểm danh:** Tự động ghi nhận `PRESENT`, `LATE` (sau 5 phút), sửa thủ công lưu lý do.
- [x] **CRUD 4 - Đơn xin nghỉ phép:** Gửi đơn, sửa/hủy đơn PENDING, duyệt/từ chối kèm ghi chú.
- [x] **Lắc điện thoại:** Dùng `sensors_plus` gia tốc kế mở nhanh máy quét QR.
- [x] **OCR Minh chứng:** Dùng `google_mlkit_text_recognition` trích xuất chữ từ ảnh minh chứng.
- [x] **Cơ sở dữ liệu thật MySQL 8:** Đầy đủ khóa ngoại, ràng buộc duy nhất, seed data hoàn chỉnh.
- [x] **Kiểm thử tự động:** 6 test suites, 37/37 tests đạt 100% PASS.
- [x] **Triển khai Public HTTPS:** Cloudflare Quick Tunnel hoạt động ổn định 24/7.
- [x] **Không sử dụng công nghệ cấm:** Tuyệt đối không dùng NFC, không đọc thẻ UID/CCCD, không cài Socket.IO, Redis, MongoDB.
