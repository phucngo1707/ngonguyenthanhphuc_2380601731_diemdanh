class AttendanceRecordModel {
  final String id;
  final String sessionId;
  final String studentId;
  final DateTime checkInTime;
  final String status; // PRESENT, LATE, ABSENT, EXCUSED
  final String method;
  final String? studentName;
  final String? studentCode;
  final String? sessionTitle;
  final String? className;
  final String? modifiedReason;

  AttendanceRecordModel({
    required this.id,
    required this.sessionId,
    required this.studentId,
    required this.checkInTime,
    required this.status,
    required this.method,
    this.studentName,
    this.studentCode,
    this.sessionTitle,
    this.className,
    this.modifiedReason,
  });

  factory AttendanceRecordModel.fromJson(Map<String, dynamic> json) {
    return AttendanceRecordModel(
      id: json['id'] ?? '',
      sessionId: json['sessionId'] ?? json['session_id'] ?? '',
      studentId: json['studentId'] ?? json['student_id'] ?? '',
      checkInTime: DateTime.parse(json['checkInTime'] ?? json['check_in_time']),
      status: json['status'] ?? 'PRESENT',
      method: json['method'] ?? 'DYNAMIC_QR',
      studentName: json['student'] != null ? json['student']['fullName'] : null,
      studentCode: json['student'] != null ? json['student']['studentCode'] : null,
      sessionTitle: json['session'] != null ? json['session']['title'] : null,
      className: json['session'] != null && json['session']['class'] != null
          ? json['session']['class']['name']
          : null,
      modifiedReason: json['modifiedReason'] ?? json['modified_reason'],
    );
  }
}
