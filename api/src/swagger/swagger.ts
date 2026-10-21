export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'PRIME Attendance REST API',
    version: '1.0.0',
    description: `
Hệ thống điểm danh sinh viên thông minh PRIME Attendance.
- Sinh viên thực hiện: Ngô Nguyễn Thanh Phúc - MSSV: 2380601731
- Cơ sở dữ liệu: DB_NgoNguyenThanhPhuc_2380601731_PrimeAttendance
- Tính năng: Xác thực 3 bước OTP, Phân quyền 3 vai trò (Admin, Teacher, Student), Smart Anti-Cheat Dynamic QR 10s Nonce, Cảm biến độ ồn, Thẻ NFC, OCR đơn nghỉ phép.
    `,
    contact: {
      name: 'Ngo Nguyen Thanh Phuc',
      email: 'phucngo1707@gmail.com',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Endpoint',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập access token nhận được từ bước xác thực OTP',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Kiểm tra trạng thái máy chủ API',
        responses: {
          200: { description: 'API đang hoạt động bình thường' },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Kiểm tra kết nối cơ sở dữ liệu MySQL 8',
        responses: {
          200: { description: 'Database sẵn sàng kết nối' },
          503: { description: 'Database ngắt kết nối' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Bước 1: Đăng nhập bằng email/username và mật khẩu, hệ thống sẽ cấp mã OTP 6 số',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  emailOrUsername: { type: 'string', example: 'student@prime.edu.vn' },
                  password: { type: 'string', example: 'Student@123456' },
                },
                required: ['emailOrUsername', 'password'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Thông tin hợp lệ, OTP đã được gửi' },
          401: { description: 'Sai mật khẩu hoặc tài khoản không tồn tại' },
        },
      },
    },
    '/auth/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Bước 3: Nhập OTP 6 chữ số để hoàn tất đăng nhập và nhận JWT token pair',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sessionToken: { type: 'string', description: 'Token nhận được từ bước login' },
                  email: { type: 'string', example: 'student@prime.edu.vn' },
                  otp: { type: 'string', example: '170723', description: 'Mã OTP 6 số (hoặc 170723 cho tài khoản Demo)' },
                },
                required: ['otp'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Đăng nhập thành công, trả về Access Token và Refresh Token' },
          400: { description: 'Mã OTP không đúng hoặc hết hạn' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Lấy thông tin tài khoản đang đăng nhập',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Thông tin người dùng' },
          401: { description: 'Chưa đăng nhập' },
        },
      },
    },
    '/class-sections': {
      get: {
        tags: ['Class Sections (CRUD 1)'],
        summary: 'Lấy danh sách lớp học phần (phân quyền theo vai trò)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Danh sách lớp học phần' },
        },
      },
      post: {
        tags: ['Class Sections (CRUD 1)'],
        summary: 'Tạo lớp học phần mới (Admin)',
        security: [{ BearerAuth: [] }],
        responses: {
          201: { description: 'Tạo lớp học phần thành công' },
        },
      },
    },
    '/attendance-sessions': {
      get: {
        tags: ['Attendance Sessions (CRUD 2)'],
        summary: 'Lấy danh sách các phiên điểm danh',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Danh sách phiên điểm danh' },
        },
      },
      post: {
        tags: ['Attendance Sessions (CRUD 2)'],
        summary: 'Giảng viên tạo và mở phiên điểm danh mới (mặc định 15 phút)',
        security: [{ BearerAuth: [] }],
        responses: {
          201: { description: 'Mở phiên điểm danh thành công' },
        },
      },
    },
    '/attendance-sessions/{id}/generate-qr-token': {
      post: {
        tags: ['Attendance Sessions (CRUD 2)'],
        summary: 'Sinh mã QR động chống gian lận (Ký số HMAC, thời hạn 10 giây, nonce dùng 1 lần)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Token QR đã ký số thành công' },
        },
      },
    },
    '/attendance-records/check-in-qr': {
      post: {
        tags: ['Attendance Records (CRUD 3)'],
        summary: 'Sinh viên quét QR để điểm danh (Anti-Cheat Verification)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  qrToken: { type: 'string', description: 'Chuỗi token đọc được từ mã QR' },
                  deviceInfo: { type: 'string', example: 'Flutter Android App' },
                  verifiedBiometric: { type: 'boolean', example: true },
                },
                required: ['qrToken'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Điểm danh thành công' },
          400: { description: 'Mã QR hết hạn hoặc đã được sử dụng (Replay Attack bị từ chối)' },
        },
      },
    },
    '/attendance-records/{id}': {
      put: {
        tags: ['Attendance Records (CRUD 3)'],
        summary: 'Giảng viên điều chỉnh trạng thái điểm danh thủ công (kèm lý do và audit log)',
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
                properties: {
                  status: { type: 'string', enum: ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] },
                  modifiedReason: { type: 'string', example: 'Sinh viên có giấy báo phép của phòng đào tạo' },
                },
                required: ['status', 'modifiedReason'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Điều chỉnh thành công' },
        },
      },
    },
    '/leave-requests': {
      get: {
        tags: ['Leave Requests (CRUD 4)'],
        summary: 'Lấy danh sách đơn xin nghỉ phép',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Danh sách đơn nghỉ phép' },
        },
      },
      post: {
        tags: ['Leave Requests (CRUD 4)'],
        summary: 'Sinh viên gửi đơn xin nghỉ phép kèm tệp minh chứng và văn bản OCR',
        security: [{ BearerAuth: [] }],
        responses: {
          201: { description: 'Nộp đơn thành công' },
        },
      },
    },
    '/leave-requests/{id}/review': {
      patch: {
        tags: ['Leave Requests (CRUD 4)'],
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
                properties: {
                  status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
                  reviewNotes: { type: 'string', example: 'Đã xác minh giấy nằm viện hợp lệ' },
                },
                required: ['status'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Phê duyệt đơn thành công' },
        },
      },
    },
    '/noise/log': {
      post: {
        tags: ['Sensors (D1)'],
        summary: 'Giảng viên gửi chỉ số đo độ ồn phòng học (decibel) từ microphone',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sessionId: { type: 'string' },
                  soundLevelAvgDb: { type: 'number', example: 56.5 },
                  soundPeakDb: { type: 'number', example: 72.1 },
                },
                required: ['sessionId', 'soundLevelAvgDb'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Ghi nhận độ ồn thành công' },
        },
      },
    },
    '/nfc-tags/register': {
      post: {
        tags: ['NFC Tags (E2)'],
        summary: 'Đăng ký thẻ NFC điểm danh cho sinh viên',
        security: [{ BearerAuth: [] }],
        responses: {
          201: { description: 'Đăng ký thẻ thành công' },
        },
      },
    },
    '/reports/attendance-summary': {
      get: {
        tags: ['Reports'],
        summary: 'Báo cáo tổng hợp chuyên cần (tỷ lệ có mặt, đi trễ, vắng)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Thống kê chuyên cần' },
        },
      },
    },
  },
};
