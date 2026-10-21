class LeaveRequestModel {
  final String id;
  final String studentId;
  final String classId;
  final String reason;
  final String? ocrText;
  final String? attachmentUrl;
  final DateTime startDate;
  final DateTime endDate;
  final String status; // PENDING, APPROVED, REJECTED, CANCELLED
  final String? reviewNotes;
  final String? studentName;
  final String? studentCode;
  final String? className;

  LeaveRequestModel({
    required this.id,
    required this.studentId,
    required this.classId,
    required this.reason,
    this.ocrText,
    this.attachmentUrl,
    required this.startDate,
    required this.endDate,
    required this.status,
    this.reviewNotes,
    this.studentName,
    this.studentCode,
    this.className,
  });

  factory LeaveRequestModel.fromJson(Map<String, dynamic> json) {
    return LeaveRequestModel(
      id: json['id'] ?? '',
      studentId: json['studentId'] ?? json['student_id'] ?? '',
      classId: json['classId'] ?? json['class_id'] ?? '',
      reason: json['reason'] ?? '',
      ocrText: json['ocrText'] ?? json['ocr_text'],
      attachmentUrl: json['attachmentUrl'] ?? json['attachment_url'],
      startDate: DateTime.parse(json['startDate'] ?? json['start_date']),
      endDate: DateTime.parse(json['endDate'] ?? json['end_date']),
      status: json['status'] ?? 'PENDING',
      reviewNotes: json['reviewNotes'] ?? json['review_notes'],
      studentName: json['student'] != null ? json['student']['fullName'] : null,
      studentCode: json['student'] != null ? json['student']['studentCode'] : null,
      className: json['class'] != null ? json['class']['name'] : null,
    );
  }
}
