import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { ClassSectionStatus, EnrollmentStatus, UserRole } from '@prisma/client';

// -----------------------------------------------------------------------------
// Faculties (Khoa)
// -----------------------------------------------------------------------------
export const listFaculties = async (req: Request, res: Response): Promise<void> => {
  try {
    const faculties = await prisma.faculty.findMany({
      include: { _count: { select: { subjects: true } } },
      orderBy: { code: 'asc' },
    });
    sendSuccess(res, 'Lấy danh sách khoa thành công', faculties);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy danh sách khoa', 500);
  }
};

export const createFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, description } = req.body;
    if (!code || !name) {
      sendError(res, 'Mã khoa và tên khoa là bắt buộc', 400);
      return;
    }
    const faculty = await prisma.faculty.create({
      data: { code, name, description },
    });
    sendSuccess(res, 'Tạo khoa mới thành công', faculty, 201);
  } catch (error: any) {
    sendError(res, 'Mã khoa đã tồn tại hoặc dữ liệu không hợp lệ', 400);
  }
};

export const updateFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const faculty = await prisma.faculty.update({
      where: { id },
      data: { name, description },
    });
    sendSuccess(res, 'Cập nhật khoa thành công', faculty);
  } catch (error: any) {
    sendError(res, 'Lỗi khi cập nhật khoa', 500);
  }
};

export const deleteFaculty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.faculty.delete({ where: { id } });
    sendSuccess(res, 'Đã xóa khoa thành công');
  } catch (error: any) {
    sendError(res, 'Không thể xóa khoa có môn học trực thuộc', 400);
  }
};

// -----------------------------------------------------------------------------
// Subjects (Môn học)
// -----------------------------------------------------------------------------
export const listSubjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const { facultyId } = req.query;
    const where: any = {};
    if (facultyId) where.facultyId = facultyId as string;

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        faculty: { select: { id: true, code: true, name: true } },
        _count: { select: { sections: true } },
      },
      orderBy: { code: 'asc' },
    });
    sendSuccess(res, 'Lấy danh sách môn học thành công', subjects);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy danh sách môn học', 500);
  }
};

export const createSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, credits, facultyId, description } = req.body;
    if (!code || !name || !facultyId) {
      sendError(res, 'Vui lòng cung cấp mã môn, tên môn và khoa phụ trách', 400);
      return;
    }
    const subject = await prisma.subject.create({
      data: {
        code,
        name,
        credits: credits ? parseInt(credits, 10) : 3,
        facultyId,
        description,
      },
      include: { faculty: true },
    });
    sendSuccess(res, 'Tạo môn học mới thành công', subject, 201);
  } catch (error: any) {
    sendError(res, 'Mã môn đã tồn tại hoặc khoa không hợp lệ', 400);
  }
};

export const updateSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, credits, description, facultyId } = req.body;
    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(credits && { credits: parseInt(credits, 10) }),
        ...(description !== undefined && { description }),
        ...(facultyId && { facultyId }),
      },
    });
    sendSuccess(res, 'Cập nhật môn học thành công', subject);
  } catch (error: any) {
    sendError(res, 'Lỗi khi cập nhật môn học', 500);
  }
};

export const deleteSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.subject.delete({ where: { id } });
    sendSuccess(res, 'Xóa môn học thành công');
  } catch (error: any) {
    sendError(res, 'Không thể xóa môn học đang có lớp học phần', 400);
  }
};

// -----------------------------------------------------------------------------
// Classrooms (Phòng học)
// -----------------------------------------------------------------------------
export const listClassrooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const classrooms = await prisma.classroom.findMany({
      orderBy: { roomCode: 'asc' },
    });
    sendSuccess(res, 'Lấy danh sách phòng học thành công', classrooms);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy danh sách phòng học', 500);
  }
};

export const createClassroom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomCode, building, floor, capacity, latitude, longitude, radiusMeters } = req.body;
    if (!roomCode || !building) {
      sendError(res, 'Mã phòng và tòa nhà là bắt buộc', 400);
      return;
    }
    const classroom = await prisma.classroom.create({
      data: {
        roomCode,
        building,
        floor: floor ? parseInt(floor, 10) : 1,
        capacity: capacity ? parseInt(capacity, 10) : 50,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        radiusMeters: radiusMeters ? parseInt(radiusMeters, 10) : 50,
      },
    });
    sendSuccess(res, 'Thêm phòng học mới thành công', classroom, 201);
  } catch (error: any) {
    sendError(res, 'Mã phòng học đã tồn tại', 400);
  }
};

// -----------------------------------------------------------------------------
// Class Sections (Lớp học phần - CRUD 1)
// -----------------------------------------------------------------------------
export const listClassSections = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    const semester = req.query.semester as string | undefined;
    const academicYear = req.query.academicYear as string | undefined;
    const teacherId = req.query.teacherId as string | undefined;

    const where: any = {};
    if (semester) where.semester = semester;
    if (academicYear) where.academicYear = academicYear;
    if (teacherId) where.teacherId = teacherId;

    // If teacher role, only show sections taught by this teacher unless admin
    if (req.user?.role === UserRole.TEACHER) {
      where.teacherId = req.user.id;
    }

    // If student role, filter to sections the student is enrolled in
    if (req.user?.role === UserRole.STUDENT) {
      where.enrollments = {
        some: {
          studentId: req.user.id,
          status: EnrollmentStatus.ENROLLED,
        },
      };
    }

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { subject: { name: { contains: search } } },
      ];
    }

    const [total, sections] = await Promise.all([
      prisma.classSection.count({ where }),
      prisma.classSection.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subject: { select: { id: true, code: true, name: true, credits: true } },
          teacher: { select: { id: true, fullName: true, email: true, teacherCode: true } },
          classroom: { select: { id: true, roomCode: true, building: true } },
          schedules: true,
          _count: {
            select: {
              enrollments: true,
              sessions: true,
            },
          },
        },
      }),
    ]);

    sendSuccess(res, 'Lấy danh sách lớp học phần thành công', sections, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('List sections error:', error);
    sendError(res, 'Lỗi khi lấy danh sách lớp học phần', 500);
  }
};

export const getClassSectionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const section = await prisma.classSection.findUnique({
      where: { id },
      include: {
        subject: { include: { faculty: true } },
        teacher: { select: { id: true, fullName: true, email: true, phoneNumber: true, teacherCode: true } },
        classroom: true,
        schedules: { include: { classroom: true } },
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                email: true,
                studentCode: true,
                phoneNumber: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 10,
        },
      },
    });

    if (!section) {
      sendError(res, 'Không tìm thấy lớp học phần', 404);
      return;
    }

    // Role security check: Teacher can only view assigned section; Student can only view enrolled section
    if (req.user?.role === UserRole.TEACHER && section.teacherId !== req.user.id) {
      sendError(res, 'Bạn không có quyền truy cập lớp học phần không phụ trách', 403);
      return;
    }

    if (req.user?.role === UserRole.STUDENT) {
      const isEnrolled = section.enrollments.some((e) => e.student.id === req.user?.id);
      if (!isEnrolled) {
        sendError(res, 'Bạn chưa đăng ký lớp học phần này', 403);
        return;
      }
    }

    sendSuccess(res, 'Lấy chi tiết lớp học phần thành công', section);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy thông tin lớp học phần', 500);
  }
};

export const createClassSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      code,
      name,
      subjectId,
      teacherId,
      classroomId,
      semester,
      academicYear,
      maxStudents,
    } = req.body;

    if (!code || !name || !subjectId || !teacherId || !semester || !academicYear) {
      sendError(res, 'Vui lòng cung cấp đầy đủ thông tin bắt buộc của lớp học phần', 400);
      return;
    }

    const section = await prisma.classSection.create({
      data: {
        code,
        name,
        subjectId,
        teacherId,
        classroomId: classroomId || null,
        semester,
        academicYear,
        maxStudents: maxStudents ? parseInt(maxStudents, 10) : 60,
        status: ClassSectionStatus.ACTIVE,
      },
      include: {
        subject: true,
        teacher: { select: { id: true, fullName: true, email: true } },
        classroom: true,
      },
    });

    sendSuccess(res, 'Tạo lớp học phần mới thành công', section, 201);
  } catch (error: any) {
    console.error('Create section error:', error);
    sendError(res, 'Mã lớp học phần đã tồn tại hoặc thông tin không hợp lệ', 400);
  }
};

export const updateClassSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, teacherId, classroomId, semester, academicYear, maxStudents, status } = req.body;

    const section = await prisma.classSection.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(teacherId && { teacherId }),
        ...(classroomId !== undefined && { classroomId }),
        ...(semester && { semester }),
        ...(academicYear && { academicYear }),
        ...(maxStudents && { maxStudents: parseInt(maxStudents, 10) }),
        ...(status && { status }),
      },
    });

    sendSuccess(res, 'Cập nhật lớp học phần thành công', section);
  } catch (error: any) {
    sendError(res, 'Lỗi khi cập nhật lớp học phần', 500);
  }
};

export const deleteClassSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.classSection.delete({ where: { id } });
    sendSuccess(res, 'Đã xóa lớp học phần thành công');
  } catch (error: any) {
    sendError(res, 'Không thể xóa lớp đã có sinh viên hoặc phiên điểm danh', 400);
  }
};

// -----------------------------------------------------------------------------
// Enrollments (Ghi danh sinh viên vào lớp)
// -----------------------------------------------------------------------------
export const addStudentToSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: classSectionId } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      sendError(res, 'Vui lòng cung cấp mã định danh sinh viên (studentId)', 400);
      return;
    }

    // Check student role
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== UserRole.STUDENT) {
      sendError(res, 'Người dùng không phải là sinh viên hợp lệ', 400);
      return;
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        classSectionId,
        status: EnrollmentStatus.ENROLLED,
      },
      include: {
        student: {
          select: { id: true, fullName: true, studentCode: true, email: true },
        },
      },
    });

    sendSuccess(res, 'Thêm sinh viên vào lớp học phần thành công', enrollment, 201);
  } catch (error: any) {
    sendError(res, 'Sinh viên đã có tên trong danh sách lớp này', 400);
  }
};

export const removeStudentFromSection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: classSectionId, studentId } = req.params;

    await prisma.enrollment.delete({
      where: {
        unique_student_section: {
          studentId,
          classSectionId,
        },
      },
    });

    sendSuccess(res, 'Đã xóa sinh viên khỏi lớp học phần thành công');
  } catch (error: any) {
    sendError(res, 'Không tìm thấy thông tin ghi danh để xóa', 404);
  }
};
