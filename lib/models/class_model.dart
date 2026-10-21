class ClassModel {
  final String id;
  final String code;
  final String name;
  final String subjectName;
  final String teacherId;
  final String? teacherName;
  final String? room;
  final String? schedule;
  final String semester;
  final int studentCount;

  ClassModel({
    required this.id,
    required this.code,
    required this.name,
    required this.subjectName,
    required this.teacherId,
    this.teacherName,
    this.room,
    this.schedule,
    required this.semester,
    this.studentCount = 0,
  });

  factory ClassModel.fromJson(Map<String, dynamic> json) {
    return ClassModel(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      name: json['name'] ?? '',
      subjectName: json['subjectName'] ?? json['subject_name'] ?? '',
      teacherId: json['teacherId'] ?? json['teacher_id'] ?? '',
      teacherName: json['teacher'] != null ? json['teacher']['fullName'] : null,
      room: json['room'] ?? 'P.A1-301',
      schedule: json['schedule'] ?? 'Thứ 2 (07:30 - 11:00)',
      semester: json['semester'] ?? 'HK1-2025-2026',
      studentCount: json['_count'] != null ? (json['_count']['enrollments'] ?? 0) : 0,
    );
  }
}
