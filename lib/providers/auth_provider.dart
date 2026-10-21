import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  UserModel? _currentUser;
  String? _token;
  bool _isLoading = false;
  String? _errorMessage;

  UserModel? get currentUser => _currentUser;
  UserModel? get user => _currentUser;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _token != null && _currentUser != null;

  String? _currentSessionToken;
  String? _currentEmail;
  String? get currentSessionToken => _currentSessionToken;
  String? get currentEmail => _currentEmail;

  Future<bool> checkAuth() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');

    if (_token != null) {
      try {
        final res = await ApiService.get('/auth/me');
        if (res['success'] == true && res['data'] != null) {
          _currentUser = UserModel.fromJson(res['data']);
          notifyListeners();
          return true;
        }
      } catch (_) {
        await logout();
      }
    }
    return false;
  }

  // Step 1: Login with username/email and password
  Future<Map<String, dynamic>> login(String emailOrUsername, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/auth/login', {
        'emailOrUsername': emailOrUsername,
        'password': password,
      });

      _isLoading = false;
      if (res['success'] == true) {
        _currentSessionToken = res['data']['sessionToken'];
        _currentEmail = res['data']['email'];
        notifyListeners();
        return res['data'];
      } else {
        _errorMessage = res['message'] ?? 'Đăng nhập thất bại';
        notifyListeners();
        throw Exception(_errorMessage);
      }
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      rethrow;
    }
  }

  // Step 2 & 3: Verify OTP 6 digits
  Future<bool> verifyOtp(String otp) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/auth/verify-otp', {
        'sessionToken': _currentSessionToken,
        'email': _currentEmail,
        'otp': otp,
      });

      _isLoading = false;
      if (res['success'] == true && res['data'] != null) {
        _token = res['data']['token'];
        _currentUser = UserModel.fromJson(res['data']['user']);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', _token!);

        notifyListeners();
        return true;
      } else {
        _errorMessage = res['message'] ?? 'Mã OTP không hợp lệ';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      rethrow;
    }
  }

  // 1-Click Quick Demo Login for Lecturers
  Future<void> quickDemoLogin(String role) async {
    String username;
    String password;

    if (role == 'ADMIN') {
      username = 'admin@prime.edu.vn';
      password = 'Admin@123';
    } else if (role == 'TEACHER') {
      username = 'teacher@prime.edu.vn';
      password = 'Teacher@123';
    } else {
      username = 'student@prime.edu.vn';
      password = 'Student@123';
    }

    await login(username, password);
    await verifyOtp('123456');
  }

  // Biometric Face ID Quick Login
  Future<bool> faceLogin(String account, {String? faceBiometric}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/auth/face-login', {
        'account': account.trim(),
        'faceData': faceBiometric ?? 'biometric_verified_true',
      });

      _isLoading = false;
      if (res['success'] == true && res['data'] != null) {
        _token = res['data']['token'];
        _currentUser = UserModel.fromJson(res['data']['user']);

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', _token!);

        notifyListeners();
        return true;
      } else {
        _errorMessage = res['message'] ?? 'Xác thực khuôn mặt thất bại';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  // Enroll / Register Face Biometrics in Settings
  Future<bool> enrollFace({String? faceData}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/auth/enroll-face', {
        'faceData': faceData ?? 'face_vector_${DateTime.now().millisecondsSinceEpoch}',
      });

      _isLoading = false;
      if (res['success'] == true && res['data'] != null) {
        _currentUser = UserModel.fromJson(res['data']['user']);
        notifyListeners();
        return true;
      } else {
        _errorMessage = res['message'] ?? 'Đăng ký khuôn mặt thất bại';
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      if (_token != null) {
        await ApiService.post('/auth/logout', {});
      }
    } catch (_) {}

    _token = null;
    _currentUser = null;
    _currentSessionToken = null;
    _currentEmail = null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');

    notifyListeners();
  }

  // Register new student account
  Future<Map<String, dynamic>> register({
    required String fullName,
    required String email,
    required String studentCode,
    required String password,
    required String confirmPassword,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/auth/register', {
        'fullName': fullName,
        'email': email,
        'studentCode': studentCode,
        'password': password,
        'confirmPassword': confirmPassword,
      });

      _isLoading = false;
      notifyListeners();
      if (res['success'] == true) {
        return res['data'] ?? {};
      } else {
        _errorMessage = res['message'] ?? 'Đăng ký thất bại';
        throw Exception(_errorMessage);
      }
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      rethrow;
    }
  }

  // Verify registration email with OTP
  Future<bool> verifyEmail({required String email, required String otp}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/auth/verify-email', {
        'email': email,
        'otp': otp,
      });

      _isLoading = false;
      notifyListeners();
      if (res['success'] == true) {
        return true;
      } else {
        _errorMessage = res['message'] ?? 'Xác thực email thất bại';
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      rethrow;
    }
  }

  // Request Forgot Password OTP
  Future<bool> forgotPassword(String email) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/auth/forgot-password', {
        'email': email,
      });

      _isLoading = false;
      notifyListeners();
      return res['success'] == true;
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      rethrow;
    }
  }

  // Reset Password with OTP
  Future<bool> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
    required String confirmPassword,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiService.post('/auth/reset-password', {
        'email': email,
        'otp': otp,
        'newPassword': newPassword,
        'confirmPassword': confirmPassword,
      });

      _isLoading = false;
      notifyListeners();
      if (res['success'] == true) {
        return true;
      } else {
        _errorMessage = res['message'] ?? 'Đặt lại mật khẩu thất bại';
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      rethrow;
    }
  }
}

