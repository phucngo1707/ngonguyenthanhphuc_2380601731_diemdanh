export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'PRIME Attendance System API - Ngô Nguyễn Thanh Phúc (2380601731)',
    version: '1.0.0',
    description: `
### Hệ Thống Điểm Danh Sinh Viên Thông Minh
**Sinh viên thực hiện:** Ngô Nguyễn Thanh Phúc  
**MSSV:** 2380601731  
**Công nghệ:** Node.js, Express, TypeScript, Prisma ORM, MySQL 8, Dynamic QR (HMAC-SHA256 10s Window), Face Recognition, Flutter 3.x.

---
### Tài khoản kiểm thử có sẵn:
* **Giảng viên:** \`phucngo1707@gmail.com\` | Mật khẩu: \`12345Aa@\` (OTP gửi về Gmail thật)
* **Sinh viên:** \`student@prime.edu.vn\` (MSSV: \`2380601731\`) | Mật khẩu: \`Student@123\` | OTP Demo: \`123456\`
* **Admin:** \`admin@prime.edu.vn\` | Mật khẩu: \`Admin@123\` | OTP Demo: \`123456\`
    `,
    contact: {
      name: 'Ngô Nguyễn Thanh Phúc - 2380601731',
      email: 'phucngo1707@gmail.com',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API Base Path (/api/v1)',
    },
    {
      url: '/api',
      description: 'API Base Path Alias (/api)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập Access Token nhận được sau khi xác thực OTP để gọi các API yêu cầu quyền.',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Mô tả lỗi' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health Check'],
        summary: 'Kiểm tra trạng thái máy chủ và Database',
        responses: {
          200: {
            description: 'Máy chủ và cơ sở dữ liệu hoạt động bình thường',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    apiName: { type: 'string', example: 'NgoNguyenThanhPhuc_2380601731_DiemDanhAPI' },
                    version: { type: 'string', example: '1.0.0' },
                    database: { type: 'string', example: 'connected' },
                    student: { type: 'string', example: 'Ngo Nguyen Thanh Phuc - MSSV: 2380601731' },
                    timestamp: { type: 'string', example: '2026-10-21T13:27:25.571Z' },
                    uptimeSeconds: { type: 'number', example: 120 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng nhập bước 1 bằng Email và Mật khẩu (Yêu cầu OTP)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'student@prime.edu.vn' },
                  password: { type: 'string', example: 'Student@123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Xác thực mật khẩu đúng. Mã OTP 6 chữ số đã được gửi.',
          },
          401: {
            description: 'Tài khoản hoặc mật khẩu không chính xác',
          },
        },
      },
    },
    '/auth/verify-otp': {
      post: {
        tags: ['Authentication'],
        summary: 'Xác thực mã OTP để nhận Access Token và Refresh Token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sessionToken', 'otp'],
                properties: {
                  sessionToken: { type: 'string', description: 'Token nhận được từ bước đăng nhập 1' },
                  otp: { type: 'string', example: '123456', description: 'Mã OTP 6 số' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Đăng nhập thành công, trả về Access Token',
          },
          400: {
            description: 'Mã OTP không đúng hoặc đã hết hạn',
          },
        },
      },
    },
    '/auth/face-login': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng nhập nhanh bằng Khuôn mặt (Đối chiếu ảnh chụp trực tiếp với ảnh đã đăng ký)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'scannedPhoto'],
                properties: {
                  email: { type: 'string', example: 'student@prime.edu.vn' },
                  scannedPhoto: { type: 'string', description: 'Ảnh chụp camera quét khuôn mặt (Base64 data:image/...)' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Đối chiếu khuôn mặt khớp thành công (Độ tương đồng > 98%), đăng nhập thành công',
          },
          400: {
            description: 'Tài khoản chưa cài đặt nhận diện khuôn mặt hoặc ảnh không khớp',
          },
        },
      },
    },
    '/auth/enroll-face': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng ký / Chụp ảnh khuôn mặt chuẩn để lưu vào hồ sơ (Yêu cầu đăng nhập)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['photoBase64'],
                properties: {
                  photoBase64: { type: 'string', description: 'Ảnh chân dung chụp từ camera (Base64)' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Đã lưu ảnh nhận diện khuôn mặt thành công',
          },
        },
      },
    },
    '/auth/face-photo': {
      get: {
        tags: ['Authentication'],
        summary: 'Lấy ảnh khuôn mặt đã đăng ký theo Email',
        parameters: [
          {
            name: 'email',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'student@prime.edu.vn' },
          },
        ],
        responses: {
          200: {
            description: 'Trả về ảnh khuôn mặt đã đăng ký (Base64)',
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Lấy thông tin tài khoản đang đăng nhập',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Thông tin cá nhân, quyền hạn và trạng thái khuôn mặt',
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Đăng xuất tài khoản',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Đăng xuất thành công',
          },
        },
      },
    },
    '/classes': {
      get: {
        tags: ['Classes'],
        summary: 'Danh sách các lớp học của người dùng',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Danh sách lớp học',
          },
        },
      },
      post: {
        tags: ['Classes'],
        summary: 'Tạo lớp học mới (Dành cho Giảng viên)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'name', 'semester'],
                properties: {
                  code: { type: 'string', example: 'IT401' },
                  name: { type: 'string', example: 'Lập trình Thiết bị Di động' },
                  semester: { type: 'string', example: 'HK1-2026' },
                  room: { type: 'string', example: 'A1-402' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Tạo lớp học thành công',
          },
        },
      },
    },
    '/classes/join': {
      post: {
        tags: ['Classes'],
        summary: 'Sinh viên tham gia lớp học bằng Mã tham gia (Join Code)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['joinCode'],
                properties: {
                  joinCode: { type: 'string', example: 'CLASS-123456' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Tham gia lớp học thành công',
          },
          404: {
            description: 'Mã lớp không tồn tại hoặc đã tham gia trước đó',
          },
        },
      },
    },
    '/classes/{id}': {
      get: {
        tags: ['Classes'],
        summary: 'Xem chi tiết lớp học và danh sách sinh viên',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Chi tiết lớp học' },
        },
      },
    },
    '/attendance-sessions': {
      get: {
        tags: ['Attendance Sessions'],
        summary: 'Lấy danh sách các buổi điểm danh',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'classId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Danh sách buổi điểm danh' },
        },
      },
      post: {
        tags: ['Attendance Sessions'],
        summary: 'Mở buổi điểm danh mới (Giảng viên)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['classId', 'sessionName'],
                properties: {
                  classId: { type: 'string' },
                  sessionName: { type: 'string', example: 'Buổi 5 - Thực hành Face & QR' },
                  allowGps: { type: 'boolean', example: true },
                  latitude: { type: 'number', example: 10.762622 },
                  longitude: { type: 'number', example: 106.660172 },
                  radiusMeters: { type: 'number', example: 50 },
                  allowWifi: { type: 'boolean', example: false },
                  wifiBssid: { type: 'string', example: '' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Mở buổi điểm danh thành công' },
        },
      },
    },
    '/attendance-sessions/{id}/generate-qr-token': {
      post: {
        tags: ['Attendance Sessions'],
        summary: 'Tạo mã Dynamic QR mới (Chống chụp ảnh gian lận - Tự động thay đổi mỗi 10 giây)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Trả về chuỗi mã QR có chữ ký HMAC kèm thời gian hết hạn (expiresIn: 10s)',
          },
        },
      },
    },
    '/attendance-sessions/{id}/status': {
      patch: {
        tags: ['Attendance Sessions'],
        summary: 'Cập nhật trạng thái buổi điểm danh (ACTIVE / CLOSED)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['ACTIVE', 'CLOSED', 'CANCELLED'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cập nhật trạng thái thành công' },
        },
      },
    },
    '/attendance/check-in-qr': {
      post: {
        tags: ['Attendance'],
        summary: 'Sinh viên quét mã Dynamic QR để điểm danh',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['qrToken', 'sessionId'],
                properties: {
                  sessionId: { type: 'string' },
                  qrToken: { type: 'string', description: 'Chuỗi mã đọc được từ Camera quét mã QR' },
                  latitude: { type: 'number', example: 10.762622 },
                  longitude: { type: 'number', example: 106.660172 },
                  wifiBssid: { type: 'string', example: '' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Điểm danh thành công (Ghi nhận trạng thái PRESENT / LATE)',
          },
          400: {
            description: 'Mã QR đã hết hạn (Quá 10s) hoặc vị trí GPS nằm ngoài phòng học',
          },
        },
      },
    },
    '/attendance/my-history': {
      get: {
        tags: ['Attendance'],
        summary: 'Lấy toàn bộ lịch sử điểm danh của sinh viên đang đăng nhập',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Lịch sử điểm danh' },
        },
      },
    },
    '/attendance/session/{sessionId}': {
      get: {
        tags: ['Attendance'],
        summary: 'Xem danh sách điểm danh của một buổi học (Giảng viên)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Danh sách sinh viên có mặt / vắng / trễ' },
        },
      },
    },
    '/leave-requests': {
      get: {
        tags: ['Leave Requests'],
        summary: 'Lấy danh sách đơn xin nghỉ phép',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Danh sách đơn nghỉ phép' },
        },
      },
      post: {
        tags: ['Leave Requests'],
        summary: 'Nộp đơn xin nghỉ phép kèm minh chứng',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['classId', 'date', 'reason'],
                properties: {
                  classId: { type: 'string' },
                  date: { type: 'string', format: 'date', example: '2026-10-25' },
                  reason: { type: 'string', example: 'Em bị sốt xuất huyết xin nghỉ học có giấy viện' },
                  attachment: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Nộp đơn thành công' },
        },
      },
    },
    '/leave-requests/{id}/review': {
      patch: {
        tags: ['Leave Requests'],
        summary: 'Giảng viên duyệt hoặc từ chối đơn xin nghỉ phép',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
                  teacherNote: { type: 'string', example: 'Đồng ý cho nghỉ' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cập nhật trạng thái đơn thành công' },
        },
      },
    },
  },
};
