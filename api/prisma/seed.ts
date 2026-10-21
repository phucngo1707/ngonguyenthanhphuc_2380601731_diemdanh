import { PrismaClient, UserRole, SessionStatus, AttendanceStatus, LeaveStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Seed for DB_NgoNguyenThanhPhuc_2380601731_DiemDanh...');

  // 1. Clean existing records in reverse order
  await prisma.leaveRequest.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.attendanceSession.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Cleaned existing tables.');

  // 2. Hash default passwords
  const adminPasswordHash = await argon2.hash('Admin@123');
  const teacherPasswordHash = await argon2.hash('Teacher@123');
  const studentPasswordHash = await argon2.hash('Student@123');

  // 3. Seed Users
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@prime.edu.vn',
      passwordHash: adminPasswordHash,
      fullName: 'Quản trị viên Giáo vụ PRIME',
      role: UserRole.ADMIN,
      phoneNumber: '0901234567',
      isActive: true,
    },
  });

  const teacherHung = await prisma.user.create({
    data: {
      username: 'teacher',
      email: 'teacher@prime.edu.vn',
      passwordHash: teacherPasswordHash,
      fullName: 'TS. Trần Văn Hưng',
      role: UserRole.TEACHER,
      phoneNumber: '0912345678',
      teacherCode: 'GV202601',
      isActive: true,
    },
  });

  const studentPhuc = await prisma.user.create({
    data: {
      username: 'student',
      email: 'student@prime.edu.vn',
      passwordHash: studentPasswordHash,
      fullName: 'Ngô Nguyễn Thanh Phúc',
      role: UserRole.STUDENT,
      phoneNumber: '0934567890',
      studentCode: '2380601731',
      isActive: true,
    },
  });

  const studentLong = await prisma.user.create({
    data: {
      username: 'student2',
      email: 'student2@prime.edu.vn',
      passwordHash: studentPasswordHash,
      fullName: 'Nguyễn Hoàng Long',
      role: UserRole.STUDENT,
      phoneNumber: '0945678901',
      studentCode: '2380601732',
      isActive: true,
    },
  });

  console.log('✅ Created Demo Users (Admin, Teacher, Students)');

  // 4. Seed Classes
  const classFlutter = await prisma.class.create({
    data: {
      code: '261IT3101_01',
      name: 'Lập trình Thiết bị Di động (Flutter) - Nhóm 01',
      subjectName: 'Lập trình Di động Flutter',
      teacherId: teacherHung.id,
      room: 'P.A1-302',
      schedule: 'Thứ 2 (07:30 - 11:00)',
      semester: 'HK1-2025-2026',
    },
  });

  const classDB = await prisma.class.create({
    data: {
      code: '261IT3202_02',
      name: 'Cơ sở Dữ liệu Nâng cao - Nhóm 02',
      subjectName: 'Cơ sở Dữ liệu Nâng cao',
      teacherId: teacherHung.id,
      room: 'P.B2-405',
      schedule: 'Thứ 4 (13:00 - 16:30)',
      semester: 'HK1-2025-2026',
    },
  });

  console.log('✅ Created Classes');

  // 5. Enrollments
  await prisma.enrollment.createMany({
    data: [
      { studentId: studentPhuc.id, classId: classFlutter.id },
      { studentId: studentLong.id, classId: classFlutter.id },
      { studentId: studentPhuc.id, classId: classDB.id },
      { studentId: studentLong.id, classId: classDB.id },
    ],
  });

  console.log('✅ Enrolled Students in Classes');

  // 6. Active Session for Live Demo
  const now = new Date();
  const sessionEndTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins later

  const activeSession = await prisma.attendanceSession.create({
    data: {
      classId: classFlutter.id,
      teacherId: teacherHung.id,
      sessionCode: `SES_${Date.now()}`,
      title: 'Buổi 01: Kiến trúc Flutter & Smart Check-in',
      startTime: now,
      endTime: sessionEndTime,
      status: SessionStatus.ACTIVE,
      durationMinutes: 15,
    },
  });

  // Past Session (Closed)
  const pastStartTime = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const pastEndTime = new Date(pastStartTime.getTime() + 15 * 60 * 1000);

  const pastSession = await prisma.attendanceSession.create({
    data: {
      classId: classFlutter.id,
      teacherId: teacherHung.id,
      sessionCode: `SES_PAST_WEEK1`,
      title: 'Buổi 00: Khởi tạo và thiết lập môi trường',
      startTime: pastStartTime,
      endTime: pastEndTime,
      status: SessionStatus.CLOSED,
      durationMinutes: 15,
    },
  });

  // Past Records
  await prisma.attendanceRecord.createMany({
    data: [
      {
        sessionId: pastSession.id,
        studentId: studentPhuc.id,
        checkInTime: new Date(pastStartTime.getTime() + 3 * 60 * 1000),
        status: AttendanceStatus.PRESENT,
        method: 'DYNAMIC_QR',
        deviceInfo: 'Flutter Mobile App (Android 14)',
        verifiedBiometric: true,
      },
      {
        sessionId: pastSession.id,
        studentId: studentLong.id,
        checkInTime: new Date(pastStartTime.getTime() + 12 * 60 * 1000),
        status: AttendanceStatus.LATE,
        method: 'DYNAMIC_QR',
        deviceInfo: 'Flutter Mobile App (iOS 18)',
      },
    ],
  });

  console.log('✅ Created Attendance Sessions and Records');

  // 7. Sample Leave Request with OCR Text
  await prisma.leaveRequest.create({
    data: {
      studentId: studentLong.id,
      classId: classFlutter.id,
      reason: 'Em bị cảm sốt và đau họng, bác sĩ yêu cầu nghỉ ngơi tại nhà.',
      ocrText: 'BỆNH VIỆN BÌNH THẠNH - KHOA KHÁM BỆNH\nGIẤY XÁC NHẬN NGHỈ ỐM\nBệnh nhân: Nguyễn Hoàng Long\nChẩn đoán: Viêm đường hô hấp trên',
      startDate: now,
      endDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
      status: LeaveStatus.PENDING,
    },
  });

  console.log('✅ Created Sample Leave Request with OCR text');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
