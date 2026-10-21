class UserModel {
  final String id;
  final String username;
  final String email;
  final String fullName;
  final String role; // ADMIN, TEACHER, STUDENT
  final String? studentCode;
  final String? teacherCode;
  final String? phoneNumber;

  UserModel({
    required this.id,
    required this.username,
    required this.email,
    required this.fullName,
    required this.role,
    this.studentCode,
    this.teacherCode,
    this.phoneNumber,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      fullName: json['fullName'] ?? json['full_name'] ?? '',
      role: json['role'] ?? 'STUDENT',
      studentCode: json['studentCode'] ?? json['student_code'],
      teacherCode: json['teacherCode'] ?? json['teacher_code'],
      phoneNumber: json['phoneNumber'] ?? json['phone_number'],
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
    };
  }
}
