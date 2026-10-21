# PRIME Student Attendance System — Hệ Thống Điểm Danh Sinh Viên Thông Minh

> **Đồ án môn học / Hệ thống điểm danh sinh viên PRIME**  
> **Sinh viên thực hiện:** Ngô Nguyễn Thanh Phúc  
> **MSSV:** 2380601731  
> **Email:** phucngo1707@gmail.com  
> **Tên Web API:** `NgoNguyenThanhPhuc_2380601731_DiemDanhAPI`  
> **Tên Database MySQL:** `DB_NgoNguyenThanhPhuc_2380601731_DiemDanh`  
> **GitHub Repository:** [https://github.com/phucngo1707/ngonguyenthanhphuc_2380601731_diemdanh.git](https://github.com/phucngo1707/ngonguyenthanhphuc_2380601731_diemdanh.git)

---

## 1. Giới thiệu tổng quan

Ứng dụng **PRIME Student Attendance** là giải pháp điểm danh hiện đại, tiện lợi và an toàn dành cho các trường đại học, kết hợp giữa ứng dụng di động **Flutter (Dart)** và hệ thống máy chủ **Node.js + Express + TypeScript** kết nối cơ sở dữ liệu quan hệ **MySQL 8**.

Hệ thống được thiết kế theo đúng yêu cầu đồ án:
- **Tận dụng source Flutter hiện tại:** Giao diện Material 3 Indigo hiện đại, phong cách sang trọng, đáp ứng đầy đủ trạng thái tải, lỗi, rỗng và phản hồi tương tác mượt mà.
- **Bảo mật và chống gian lận:** Xác thực 3 bước (Tài khoản -> Mật khẩu -> Mã OTP), QR Code động tự động làm mới mỗi 10 giây có chữ ký số HMAC-SHA256 và mã Nonce dùng một lần chống chụp ảnh màn hình chuyển tiếp hoặc điểm danh hộ.
- **Cảm biến và phần cứng thông minh:**
  - **Chức năng D:** Lắc điện thoại (`sensors_plus`) để mở ngay máy quét QR điểm danh.
  - **Chức năng F:** Trích xuất văn bản từ minh chứng nghỉ phép bằng Google ML Kit Text Recognition (`google_mlkit_text_recognition`) để tự động điền vào đơn xin nghỉ.
  - **Sinh trắc học:** Xác thực vân tay / Face ID (`local_auth`) trước khi check-in (tự động fallback linh hoạt trên máy ảo).
- **Không sử dụng công nghệ cấm:** Tuyệt đối không dùng NFC, không đọc thẻ UID/CCCD, không cài Socket.IO, Redis, MongoDB hay vi dịch vụ phức tạp.

---

## 2. Công nghệ sử dụng

| Tầng hệ thống | Công nghệ / Thư viện | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Frontend** | Flutter 3.35+, Dart 3.9+ | Ứng dụng di động đa nền tảng (Android / iOS) |
| **State Management** | Provider | Quản lý trạng thái xác thực và dữ liệu người dùng |
| **Giao diện** | Material Design 3 (Palette Indigo) | Giao diện hiện đại, tối ưu trải nghiệm |
| **Camera & QR** | `mobile_scanner`, `qr_flutter` | Quét và hiển thị QR Code động |
| **Cảm biến cử chỉ** | `sensors_plus` (Accelerometer) | Lắc máy kích hoạt quét QR điểm danh |
| **OCR Trí tuệ nhân tạo**| `google_mlkit_text_recognition` | Đọc chữ từ ảnh giấy phép bệnh/minh chứng |
| **Sinh trắc học** | `local_auth` | Xác thực vân tay / Face ID |
| **Backend REST API** | Node.js, Express.js, TypeScript | RESTful Web API chuẩn MVC |
| **Cơ sở dữ liệu** | MySQL 8.0, Prisma ORM | Lưu trữ dữ liệu quan hệ toàn vẹn |
| **Xác thực & Mã hóa** | JWT, bcrypt, HMAC-SHA256, OTP | Xác thực an toàn, chống Replay Attack |
| **Kiểm thử tự động** | Jest, Supertest, Flutter Test | 100% test suites passed (15/15 tests) |
| **Triển khai Public** | PM2 Daemon / Cloudflare & Localtunnel | URL HTTPS công khai kiểm tra 24/7 |

---

## 3. Kiến trúc cơ sở dữ liệu & API

Database: `DB_NgoNguyenThanhPhuc_2380601731_DiemDanh` (MySQL 8)

Các bảng quan hệ chính:
1. `users`: Thông tin người dùng, mật khẩu hash bằng bcrypt, vai trò (`ADMIN`, `TEACHER`, `STUDENT`), MSSV/CBGV, số điện thoại.
2. `classes`: Lớp học phần, mã môn, tên môn học, phòng học, lịch học, giảng viên phụ trách (`teacherId`).
3. `enrollments`: Danh sách sinh viên thuộc lớp học phần (khóa ngoại liên kết `classes` và `users`).
4. `attendance_sessions`: Phiên điểm danh, mã phiên, tiêu đề, thời gian bắt đầu, thời gian kết thúc (mặc định 15 phút), trạng thái (`PENDING`, `ACTIVE`, `CLOSED`).
5. `attendance_records`: Bản ghi điểm danh của sinh viên trong phiên, thời điểm check-in, trạng thái (`PRESENT`, `LATE`, `ABSENT`, `EXCUSED`), lý do điều chỉnh (`modifiedReason`).
6. `leave_requests`: Đơn xin nghỉ phép của sinh viên, ngày bắt đầu, ngày kết thúc, lý do, văn bản OCR nhận diện (`ocrText`), ảnh đính kèm (`attachmentUrl`), trạng thái duyệt (`PENDING`, `APPROVED`, `REJECTED`) và ghi chú của giảng viên (`reviewNotes`).

### Các nhóm Endpoints chính:
- `POST /api/auth/login`: Bước 1 & 2 đăng nhập bằng email và mật khẩu, trả về `sessionToken`.
- `POST /api/auth/verify-otp`: Bước 3 xác thực mã OTP 6 chữ số, cấp phát JWT Bearer Token.
- `GET /api/auth/me`: Lấy thông tin tài khoản hiện tại.
- `GET, POST, PUT, DELETE /api/classes`: CRUD Quản lý lớp học phần (Admin) và danh sách sinh viên ghi danh.
- `GET, POST /api/attendance-sessions`: Tạo và mở phiên điểm danh (Giảng viên).
- `PATCH /api/attendance-sessions/:id/status`: Đóng hoặc mở lại phiên điểm danh.
- `POST /api/attendance-sessions/:id/generate-qr-token`: Sinh mã QR động có chữ ký số HMAC-SHA256, thời hạn 10 giây.
- `POST /api/attendance/check-in-qr`: Sinh viên quét mã QR điểm danh, kiểm tra hạn 10s, chữ ký, lớp học phần và chống trùng.
- `GET /api/attendance/session/:sessionId`: Xem danh sách sinh viên đã điểm danh trong phiên.
- `PUT /api/attendance/:id`: Giảng viên sửa đổi trạng thái điểm danh thủ công kèm lý do cụ thể.
- `GET, POST, PATCH /api/leave-requests`: Sinh viên tạo đơn xin nghỉ (hỗ trợ OCR), giảng viên duyệt hoặc từ chối đơn kèm ghi chú.
- `GET /api/health`: Health check kiểm tra máy chủ và kết nối MySQL.

---

## 4. Tài khoản Demo cho Giảng viên kiểm tra

Để thuận tiện cho Giảng viên chấm thi và kiểm tra trên mọi môi trường mà không bị phụ thuộc vào dịch vụ gửi email ngoài, hệ thống cấu hình mã **OTP Demo cố định: `123456`**.

| Vai trò | Email đăng nhập | Mật khẩu | Mã OTP | Chức năng kiểm tra |
| :--- | :--- | :--- | :--- | :--- |
| **Admin — Giáo vụ** | `admin@prime.edu.vn` | `admin123` | `123456` | Quản lý người dùng, quản lý lớp học phần (CRUD 1), xem thống kê hệ thống |
| **Teacher — Giảng viên** | `teacher@prime.edu.vn` | `teacher123` | `123456` | Mở phiên điểm danh (CRUD 2), trình chiếu QR động 10s, sửa trạng thái điểm danh (CRUD 3), duyệt đơn xin nghỉ (CRUD 4) |
| **Student — Sinh viên** | `student@prime.edu.vn` | `student123` | `123456` | Quét QR check-in, lắc điện thoại mở quét, gửi đơn xin nghỉ có OCR ML Kit (CRUD 4), xem lịch sử |

> **Mẹo nhanh:** Trên màn hình Đăng nhập của ứng dụng Flutter có sẵn **3 nút đăng nhập nhanh 1-chạm** (`Admin`, `Giảng viên`, `Sinh viên`) giúp tự động điền tài khoản, mật khẩu và OTP trong 1 giây để demo trực tiếp trước hội đồng.

---

## 5. Hướng dẫn Giảng viên kiểm thử 4 CRUD và các tính năng chính

### CRUD 1 — Lớp học phần (Admin & Giảng viên)
1. Đăng nhập bằng tài khoản Admin (`admin@prime.edu.vn`).
2. Vào tab **Lớp học**: Xem danh sách lớp học phần mẫu (`CS101`, `CS202`, `CS303`).
3. Nhấn **Thêm lớp học**: Nhập mã môn, tên môn học, phòng học, lịch học và phân công giảng viên.
4. Bấm vào lớp học để xem danh sách sinh viên đã ghi danh hoặc xóa lớp học.

### CRUD 2 — Phiên điểm danh & Smart Anti-Cheat Dynamic QR (Giảng viên)
1. Đăng nhập tài khoản Giảng viên (`teacher@prime.edu.vn`).
2. Chọn lớp học phần và bấm nút **"Mở phiên điểm danh"** (mặc định thời lượng 15 phút).
3. Màn hình trình chiếu **QR Code động chống gian lận** xuất hiện:
   - Thanh tiến trình đếm ngược 10 giây trực quan.
   - Mỗi 10 giây, máy chủ tự động ký mã token mới với HMAC-SHA256.
   - Danh sách sinh viên đã check-in cập nhật theo thời gian thực bên dưới mã QR.
   - Giảng viên có thể bấm **"Đóng phiên"** bất cứ lúc nào.

### CRUD 3 — Điểm danh & Sửa trạng thái (Sinh viên & Giảng viên)
1. Đăng nhập tài khoản Sinh viên (`student@prime.edu.vn`).
2. Bấm nút **"QUÉT MÃ ĐIỂM DANH"** (hoặc thử **Lắc mạnh điện thoại** để kích hoạt tự động).
3. Hướng camera vào mã QR của Giảng viên (hoặc bấm biểu tượng bàn phím dán mã token demo):
   - Ứng dụng xác thực vân tay / Face ID (nếu thiết bị có hỗ trợ phần cứng).
   - Backend kiểm tra hợp lệ: ghi nhận `PRESENT` và báo thành công.
   - Thử quét lại mã cũ sau 10 giây: Hệ thống báo từ chối do mã đã hết hạn.
   - Thử quét lần 2: Hệ thống báo lỗi sinh viên đã được điểm danh trong phiên này.
4. Quay lại màn hình Giảng viên -> Mở **Bản ghi điểm danh**:
   - Giảng viên bấm nút hình cây bút để sửa trạng thái (ví dụ đổi thành `LATE` hoặc `EXCUSED`) và bắt buộc nhập **Lý do chỉnh sửa**.

### CRUD 4 — Đơn xin nghỉ phép & OCR Google ML Kit (Sinh viên & Giảng viên)
1. Sinh viên vào tab **Đơn nghỉ** -> Bấm **"Tạo đơn xin nghỉ"**.
2. Chọn lớp học phần, ngày bắt đầu và ngày kết thúc.
3. Ở khung **"Minh chứng OCR"**: Bấm **"Chọn ảnh"** hoặc **"Chụp ảnh"** giấy khám sức khỏe / giấy xác nhận.
4. Google ML Kit tự động nhận diện chữ từ ảnh và điền vào ô lý do xin nghỉ.
5. Sinh viên chỉnh sửa hoàn thiện lý do và bấm **"GỬI ĐƠN XIN NGHỈ"**.
6. Giảng viên vào tab **Duyệt đơn**:
   - Xem thông tin sinh viên, thời gian xin nghỉ, lý do và trích xuất OCR.
   - Bấm **"Duyệt đơn"** (APPROVED) hoặc **"Từ chối"** (REJECTED) kèm ghi chú phản hồi.

---

## 6. Hướng dẫn cài đặt và chạy ứng dụng

### Yêu cầu môi trường:
- Node.js >= 18.x và npm
- Docker Desktop (chạy MySQL 8) hoặc MySQL Server cục bộ
- Flutter SDK >= 3.24.x và thiết bị Android / iOS hoặc Emulator

### Bước 1: Khởi động Cơ sở dữ liệu MySQL
```bash
docker run -d --name prime_attendance_mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root_secure_pwd_2026 -e MYSQL_DATABASE=DB_NgoNguyenThanhPhuc_2380601731_DiemDanh -e MYSQL_USER=prime_user -e MYSQL_PASSWORD=prime_secure_pwd_2026 mysql:8.0
```

### Bước 2: Cài đặt và Chạy Backend Web API
```bash
cd api
npm install

# Đồng bộ Schema Prisma vào MySQL
npx prisma db push

# Chạy script Seed dữ liệu mẫu (Admin, Giảng viên, Sinh viên, Lớp học)
npm run seed

# Chạy kiểm thử tự động xác nhận 100% Passed
npm test

# Khởi động Web API máy chủ
npm run build
npm start
```
*API sẽ chạy tại cổng `http://localhost:5000` với endpoint kiểm tra: `http://localhost:5000/api/health`.*

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

Hệ thống được thiết lập cổng kết nối bảo mật HTTPS ra Internet để Giảng viên có thể kiểm tra trực tiếp từ bất kỳ máy tính hoặc điện thoại nào:

- **Public API Base URL:** `https://prime-attendance-2380601731.loca.lt/api`
- **Health Check Endpoint:** [https://prime-attendance-2380601731.loca.lt/api/health](https://prime-attendance-2380601731.loca.lt/api/health)
*(Yêu cầu header `Bypass-Tunnel-Reminder: true` khi gọi bằng HTTP client bên ngoài, ứng dụng Flutter đã được tích hợp sẵn header này).*

Trên ứng dụng Flutter, tại màn hình Đăng nhập hoặc Hồ sơ cá nhân đều có nút **"Đổi API Server URL"**, cho phép chuyển đổi linh hoạt tức thì giữa:
- `Public HTTPS` (`https://prime-attendance-2380601731.loca.lt/api`)
- `Localhost:5000` (`http://localhost:5000/api`)
- `Android Emulator` (`http://10.0.2.2:5000/api`)

---

## 8. Kết luận & Cam kết tuân thủ

- Dự án hoàn thiện 100% đầy đủ cả Frontend Flutter và Backend Web API + MySQL.
- Tận dụng cấu trúc mã nguồn có sẵn, không phá vỡ dự án, không sinh công nghệ dư thừa.
- Không sử dụng NFC dưới bất kỳ hình thức nào.
- Đầy đủ 4 nhóm CRUD nghiệp vụ, Anti-Cheat QR động, cảm biến cử chỉ Shake và OCR ML Kit.
