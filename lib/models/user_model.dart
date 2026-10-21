class UserModel {
  final String id;
  final String username;
  final String email;
  final String fullName;
  final String role; // ADMIN, TEACHER, STUDENT
  final String? studentCode;
  final String? teacherCode;
  final String? phoneNumber;
  final bool isFaceEnrolled;
  final DateTime? faceEnrolledAt;

  UserModel({
    required this.id,
    required this.username,
    required this.email,
    required this.fullName,
    required this.role,
    this.studentCode,
    this.teacherCode,
    this.phoneNumber,
    this.isFaceEnrolled = false,
    this.faceEnrolledAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    DateTime? enrolledAt;
    if (json['faceEnrolledAt'] != null) {
      enrolledAt = DateTime.tryParse(json['faceEnrolledAt'].toString());
    } else if (json['face_enrolled_at'] != null) {
      enrolledAt = DateTime.tryParse(json['face_enrolled_at'].toString());
    }

    return UserModel(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      fullName: json['fullName'] ?? json['full_name'] ?? '',
      role: json['role'] ?? 'STUDENT',
      studentCode: json['studentCode'] ?? json['student_code'],
      teacherCode: json['teacherCode'] ?? json['teacher_code'],
      phoneNumber: json['phoneNumber'] ?? json['phone_number'],
      isFaceEnrolled: json['isFaceEnrolled'] == true || json['is_face_enrolled'] == true,
      faceEnrolledAt: enrolledAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'fullName': fullName,
      'role': role,
      'studentCode': studentCode,
      'teacherCode': teacherCode,
      'phoneNumber': phoneNumber,
      'isFaceEnrolled': isFaceEnrolled,
      'faceEnrolledAt': faceEnrolledAt?.toIso8601String(),
    };
  }
}
