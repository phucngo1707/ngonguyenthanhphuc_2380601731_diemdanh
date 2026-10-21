class SessionModel {
  final String id;
  final String classId;
  final String teacherId;
  final String sessionCode;
  final String title;
  final DateTime startTime;
  final DateTime endTime;
  final String status; // PENDING, ACTIVE, CLOSED, CANCELLED
  final int durationMinutes;
  final String? className;
  final String? classCode;
  final int attendeeCount;

  SessionModel({
    required this.id,
    required this.classId,
    required this.teacherId,
    required this.sessionCode,
    required this.title,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.durationMinutes,
    this.className,
    this.classCode,
    this.attendeeCount = 0,
  });

  bool get isActive => status == 'ACTIVE' && DateTime.now().isBefore(endTime);

  factory SessionModel.fromJson(Map<String, dynamic> json) {
    return SessionModel(
      id: json['id'] ?? '',
      classId: json['classId'] ?? json['class_id'] ?? '',
      teacherId: json['teacherId'] ?? json['teacher_id'] ?? '',
      sessionCode: json['sessionCode'] ?? json['session_code'] ?? '',
      title: json['title'] ?? '',
      startTime: DateTime.parse(json['startTime'] ?? json['start_time']),
      endTime: DateTime.parse(json['endTime'] ?? json['end_time']),
      status: json['status'] ?? 'PENDING',
      durationMinutes: json['durationMinutes'] ?? json['duration_minutes'] ?? 15,
      className: json['class'] != null ? json['class']['name'] : null,
      classCode: json['class'] != null ? json['class']['code'] : null,
      attendeeCount: json['_count'] != null ? (json['_count']['records'] ?? 0) : 0,
    );
  }
}
