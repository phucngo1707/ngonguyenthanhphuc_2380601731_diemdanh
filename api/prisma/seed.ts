import { PrismaClient, UserRole, ClassSectionStatus, SessionStatus, AttendanceStatus, CheckInMethod, LeaveStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding for PRIME Attendance...');

  // 1. Clean existing records in reverse order
  await prisma.auditLog.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.emailOtp.deleteMany({});
  await prisma.registeredNfcTag.deleteMany({});
  await prisma.leaveAttachment.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.attendanceSession.deleteMany({});
  await prisma.classSchedule.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.classSection.deleteMany({});
  await prisma.classroom.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.faculty.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Cleaned existing tables.');

  // 2. Hash default passwords
  const adminPasswordHash = await argon2.hash('Admin@123456');
  const teacherPasswordHash = await argon2.hash('Teacher@123456');
  const studentPasswordHash = await argon2.hash('Student@123456');

  // 3. Seed Users
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@prime.edu.vn',
      passwordHash: adminPasswordHash,
      fullName: 'Quản trị viên Hệ thống PRIME',
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

  const teacherAnh = await prisma.user.create({
    data: {
      username: 'teacher2',
      email: 'teacher2@prime.edu.vn',
      passwordHash: teacherPasswordHash,
      fullName: 'ThS. Lê Thị Kim Anh',
      role: UserRole.TEACHER,
      phoneNumber: '0923456789',
      teacherCode: 'GV202602',
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

  const studentTriet = await prisma.user.create({
    data: {
      username: 'student3',
      email: 'student3@prime.edu.vn',
      passwordHash: studentPasswordHash,
      fullName: 'Trần Minh Triết',
      role: UserRole.STUDENT,
      phoneNumber: '0956789012',
      studentCode: '2380601733',
      isActive: true,
    },
  });

  console.log('✅ Created Demo Users (Admin, Teachers, Students)');

  // 4. Seed Faculties
  const itFaculty = await prisma.faculty.create({
    data: {
      code: 'CNTT',
      name: 'Khoa Công nghệ Thông tin',
      description: 'Khoa đào tạo chuyên ngành Kỹ thuật Phần mềm, Hệ thống Thông tin và Trí tuệ Nhân tạo.',
    },
  });

  const seFaculty = await prisma.faculty.create({
    data: {
      code: 'KTPM',
      name: 'Khoa Kỹ thuật Phần mềm',
      description: 'Khoa đào tạo phát triển ứng dụng di động, điện toán đám mây và DevOps.',
    },
  });

  console.log('✅ Created Faculties');

  // 5. Seed Subjects
  const flutterSubject = await prisma.subject.create({
    data: {
      code: 'IT3101',
      name: 'Lập trình Thiết bị Di động (Flutter)',
      credits: 3,
      facultyId: itFaculty.id,
      description: 'Môn học phát triển ứng dụng di động đa nền tảng bằng Flutter & Dart.',
    },
  });

  const dbSubject = await prisma.subject.create({
    data: {
      code: 'IT3202',
      name: 'Cơ sở Dữ liệu Nâng cao',
      credits: 3,
      facultyId: itFaculty.id,
      description: 'Môn học kiến trúc dữ liệu, tối ưu hóa truy vấn, replication và sharding.',
    },
  });

  const devopsSubject = await prisma.subject.create({
    data: {
      code: 'SE4105',
      name: 'Kiến trúc Phần mềm & DevOps',
      credits: 4,
      facultyId: seFaculty.id,
      description: 'Triển khai hạ tầng container, CI/CD, Microservices và giám sát hệ thống.',
    },
  });

  console.log('✅ Created Subjects');

  // 6. Seed Classrooms
  const roomA1302 = await prisma.classroom.create({
    data: {
      roomCode: 'P.A1-302',
      building: 'Tòa A1',
      floor: 3,
      capacity: 60,
      latitude: 10.801824,
      longitude: 106.711245,
      radiusMeters: 50,
    },
  });

  const roomB2405 = await prisma.classroom.create({
    data: {
      roomCode: 'P.B2-405',
      building: 'Tòa B2',
      floor: 4,
      capacity: 80,
      latitude: 10.802145,
      longitude: 106.711890,
      radiusMeters: 60,
    },
  });

  console.log('✅ Created Classrooms');

  // 7. Seed Class Sections
  const sectionFlutter = await prisma.classSection.create({
    data: {
      code: '261IT3101_01',
      name: 'Lập trình Flutter - Nhóm 01 (Sáng T2)',
      subjectId: flutterSubject.id,
      teacherId: teacherHung.id,
      classroomId: roomA1302.id,
      semester: 'HK1',
      academicYear: '2025-2026',
      maxStudents: 60,
      status: ClassSectionStatus.ACTIVE,
    },
  });

  const sectionDB = await prisma.classSection.create({
    data: {
      code: '261IT3202_02',
      name: 'CSDL Nâng cao - Nhóm 02 (Chiều T4)',
      subjectId: dbSubject.id,
      teacherId: teacherAnh.id,
      classroomId: roomB2405.id,
      semester: 'HK1',
      academicYear: '2025-2026',
      maxStudents: 75,
      status: ClassSectionStatus.ACTIVE,
    },
  });

  console.log('✅ Created Class Sections');

  // 8. Enrollments
  await prisma.enrollment.createMany({
    data: [
      { studentId: studentPhuc.id, classSectionId: sectionFlutter.id },
      { studentId: studentLong.id, classSectionId: sectionFlutter.id },
      { studentId: studentTriet.id, classSectionId: sectionFlutter.id },
      { studentId: studentPhuc.id, classSectionId: sectionDB.id },
      { studentId: studentLong.id, classSectionId: sectionDB.id },
    ],
  });

  console.log('✅ Enrolled Students in Sections');

  // 9. Schedules
  await prisma.classSchedule.createMany({
    data: [
      {
        classSectionId: sectionFlutter.id,
        classroomId: roomA1302.id,
        dayOfWeek: 2, // Monday
        startPeriod: 1,
        endPeriod: 4,
        startTime: '07:30',
        endTime: '11:00',
      },
      {
        classSectionId: sectionDB.id,
        classroomId: roomB2405.id,
        dayOfWeek: 4, // Wednesday
        startPeriod: 6,
        endPeriod: 9,
        startTime: '13:00',
        endTime: '16:30',
      },
    ],
  });

  console.log('✅ Created Class Schedules');

  // 10. Sample Attendance Session (Active for Demo)
  const now = new Date();
  const sessionEndTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins later

  const activeSession = await prisma.attendanceSession.create({
    data: {
      classSectionId: sectionFlutter.id,
      teacherId: teacherHung.id,
      sessionCode: `SESS_${Date.now()}`,
      title: 'Buổi 01: Giới thiệu Flutter & Kiến trúc Mobile 2026',
      startTime: now,
      endTime: sessionEndTime,
      status: SessionStatus.ACTIVE,
      durationMinutes: 15,
      allowNfc: true,
      allowBiometric: true,
      allowGps: false,
      soundLevelAvgDb: 52.4,
      soundPeakDb: 68.1,
    },
  });

  // Sample Past Session (Closed)
  const pastStartTime = new Date(now.getTime() - 7 * 24 * 3600 * 1000); // 7 days ago
  const pastEndTime = new Date(pastStartTime.getTime() + 15 * 60 * 1000);

  const pastSession = await prisma.attendanceSession.create({
    data: {
      classSectionId: sectionFlutter.id,
      teacherId: teacherHung.id,
      sessionCode: `SESS_PAST_WEEK1`,
      title: 'Buổi 00: Hướng dẫn cài đặt Flutter & Android Studio',
      startTime: pastStartTime,
      endTime: pastEndTime,
      status: SessionStatus.CLOSED,
      durationMinutes: 15,
      allowNfc: true,
      allowBiometric: false,
      soundLevelAvgDb: 48.0,
      soundPeakDb: 62.5,
    },
  });

  // Attendance Records for Past Session
  await prisma.attendanceRecord.createMany({
    data: [
      {
        sessionId: pastSession.id,
        studentId: studentPhuc.id,
        checkInTime: new Date(pastStartTime.getTime() + 2 * 60 * 1000),
        status: AttendanceStatus.PRESENT,
        method: CheckInMethod.DYNAMIC_QR,
        deviceInfo: 'Flutter Mobile App (Android 14)',
        ipAddress: '192.168.1.15',
        verifiedBiometric: true,
      },
      {
        sessionId: pastSession.id,
        studentId: studentLong.id,
        checkInTime: new Date(pastStartTime.getTime() + 12 * 60 * 1000),
        status: AttendanceStatus.LATE,
        method: CheckInMethod.DYNAMIC_QR,
        deviceInfo: 'Flutter Mobile App (iOS 18)',
        ipAddress: '192.168.1.20',
      },
      {
        sessionId: pastSession.id,
        studentId: studentTriet.id,
        checkInTime: pastStartTime,
        status: AttendanceStatus.ABSENT,
        method: CheckInMethod.MANUAL,
        modifiedByTeacherId: teacherHung.id,
        modifiedReason: 'Vắng không phép',
      },
    ],
  });

  console.log('✅ Created Attendance Sessions and Sample Records');

  // 11. Sample Leave Request
  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      studentId: studentTriet.id,
      classSectionId: sectionFlutter.id,
      reason: 'Em bị sốt xuất huyết nhập viện điều trị, kính mong thầy cho em xin nghỉ phép buổi học hôm nay.',
      startDate: now,
      endDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
      status: LeaveStatus.PENDING,
    },
  });

  await prisma.leaveAttachment.create({
    data: {
      leaveRequestId: leaveRequest.id,
      fileName: 'giay_ra_vien_benh_vien.jpg',
      filePath: 'uploads/demo_giay_vien.jpg',
      fileSize: 245012,
      mimeType: 'image/jpeg',
      ocrText: 'BỆNH VIỆN ĐA KHOA QUẬN BÌNH THẠNH\nGIẤY XÁC NHẬN NẰM VIỆN\nBệnh nhân: Trần Minh Triết\nChẩn đoán: Sốt xuất huyết Dengue',
    },
  });

  console.log('✅ Created Sample Leave Request with Attachment & OCR Text');

  // 12. Sample NFC Tag for student
  await prisma.registeredNfcTag.create({
    data: {
      studentId: studentPhuc.id,
      tagUid: '04:5A:B2:3C:D4:80',
      tagLabel: 'Thẻ Sinh Viên PRIME NFC - Phúc',
      isActive: true,
    },
  });

  console.log('✅ Registered Sample NFC Tag');

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
