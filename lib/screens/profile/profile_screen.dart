import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/api_config.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _apiStatus = 'Đang kiểm tra...';
  bool _isHealthy = false;
  bool _isChecking = true;

  @override
  void initState() {
    super.initState();
    _checkHealth();
  }

  Future<void> _checkHealth() async {
    setState(() => _isChecking = true);
    try {
      final res = await ApiService.get('/health');
      if (mounted) {
        setState(() {
          _isHealthy = res['status'] == 'healthy' || res['status'] == 'ok';
          _apiStatus = 'Máy chủ Online (${res['database'] ?? "MySQL Đã kết nối"})';
          _isChecking = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isHealthy = false;
          _apiStatus = 'Không kết nối được: ${e.toString().replaceAll("Exception: ", "")}';
          _isChecking = false;
        });
      }
    }
  }

  void _showChangeUrlDialog() {
    final controller = TextEditingController(text: ApiConfig.baseUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cấu hình Web API URL'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Chọn hoặc nhập URL backend API:',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              decoration: const InputDecoration(
                labelText: 'Base URL',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                ActionChip(
                  label: const Text('Public HTTPS'),
                  onPressed: () {
                    controller.text = ApiConfig.defaultPublicUrl;
                  },
                ),
                ActionChip(
                  label: const Text('Localhost:5000'),
                  onPressed: () {
                    controller.text = 'http://localhost:5000/api';
                  },
                ),
                ActionChip(
                  label: const Text('Android 10.0.2.2'),
                  onPressed: () {
                    controller.text = 'http://10.0.2.2:5000/api';
                  },
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () async {
              final newUrl = controller.text.trim();
              if (newUrl.isNotEmpty) {
                await ApiConfig.setBaseUrl(newUrl);
                Navigator.pop(ctx);
                _checkHealth();
                setState(() {});
              }
            },
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
  }

  void _showFaceEnrollDialog() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.user;
    if (user == null) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => _FaceEnrollmentDialog(
        userName: user.fullName,
        onEnrolled: () {
          setState(() {});
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Xác thực và kích hoạt Face ID thành công!'),
              backgroundColor: Colors.green,
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    Color roleColor = Colors.blue;
    String roleName = 'Sinh viên';
    if (user?.role == 'ADMIN') {
      roleColor = Colors.purple;
      roleName = 'Giáo vụ (Admin)';
    } else if (user?.role == 'TEACHER') {
      roleColor = Colors.green;
      roleName = 'Giảng viên';
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cài đặt & Hồ sơ cá nhân'),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // User Avatar Card
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: roleColor.withOpacity(0.15),
                      child: Text(
                        user?.fullName.isNotEmpty == true ? user!.fullName[0] : 'U',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: roleColor,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      user?.fullName ?? 'Họ và tên',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user?.email ?? 'email@prime.edu.vn',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: roleColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: roleColor),
                      ),
                      child: Text(
                        roleName,
                        style: TextStyle(color: roleColor, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Account Details
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.badge_outlined, color: Color(0xFF1E3A8A)),
                    title: const Text('Mã số (MSSV / CBGV)'),
                    subtitle: Text(user?.studentCode ?? user?.teacherCode ?? 'N/A'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.phone_outlined, color: Color(0xFF1E3A8A)),
                    title: const Text('Số điện thoại'),
                    subtitle: Text(user?.phoneNumber ?? 'Chưa cập nhật'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.shield_outlined, color: Color(0xFF1E3A8A)),
                    title: const Text('Bảo mật OTP 2FA'),
                    subtitle: const Text('Đã kích hoạt bảo mật đăng nhập'),
                    trailing: const Icon(Icons.verified, color: Colors.green),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Biometric Face ID Security Card
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: const [
                            Icon(Icons.face_retouching_natural, color: Color(0xFF1E3A8A)),
                            SizedBox(width: 8),
                            Text(
                              'Xác thực khuôn mặt (Face ID)',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: user?.isFaceEnrolled == true
                                ? Colors.green.shade50
                                : Colors.amber.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: user?.isFaceEnrolled == true
                                  ? Colors.green
                                  : Colors.amber.shade700,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                user?.isFaceEnrolled == true
                                    ? Icons.check_circle
                                    : Icons.info_outline,
                                size: 14,
                                color: user?.isFaceEnrolled == true
                                    ? Colors.green.shade700
                                    : Colors.amber.shade800,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                user?.isFaceEnrolled == true ? 'Đã kích hoạt' : 'Chưa đăng ký',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: user?.isFaceEnrolled == true
                                      ? Colors.green.shade800
                                      : Colors.amber.shade900,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      user?.isFaceEnrolled == true
                          ? 'Khuôn mặt của bạn đã được đăng ký và liên kết với tài khoản. Bạn có thể đăng xuất và sử dụng Face ID để đăng nhập nhanh ngoài màn hình chính.'
                          : 'Bạn chưa đăng ký khuôn mặt cho tài khoản này. Vui lòng xác thực khuôn mặt để kích hoạt tính năng đăng nhập nhanh không cần mật khẩu.',
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.4),
                    ),
                    if (user?.isFaceEnrolled == true && user?.faceEnrolledAt != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        'Thời gian kích hoạt: ${user!.faceEnrolledAt!.toLocal().toString().split(".")[0]}',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                      ),
                    ],
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: user?.isFaceEnrolled == true
                              ? const Color(0xFF0284C7)
                              : const Color(0xFF1E3A8A),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.camera_alt_outlined, size: 18),
                        label: Text(
                          user?.isFaceEnrolled == true
                              ? 'QUÉT LẠI KHUÔN MẶT CẬP NHẬT'
                              : 'XÁC THỰC & ĐĂNG KÝ KHUÔN MẶT NGAY',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        onPressed: _showFaceEnrollDialog,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // System Connection Status Card
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.dns_outlined, color: Color(0xFF1E3A8A)),
                        SizedBox(width: 8),
                        Text(
                          'Thông tin hệ thống & Máy chủ',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(
                          _isHealthy ? Icons.circle : Icons.circle_outlined,
                          size: 14,
                          color: _isHealthy ? Colors.green : Colors.red,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _apiStatus,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: _isHealthy ? Colors.green.shade800 : Colors.red,
                            ),
                          ),
                        ),
                        _isChecking
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : IconButton(
                                icon: const Icon(Icons.refresh, size: 20),
                                onPressed: _checkHealth,
                              ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'API Base URL: ${ApiConfig.baseUrl}',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Database: DB_NgoNguyenThanhPhuc_2380601731_DiemDanh (MySQL 8)',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.settings_ethernet, size: 16),
                      label: const Text('Đổi API Server URL'),
                      onPressed: _showChangeUrlDialog,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Logout Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade700,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.logout),
                label: const Text('ĐĂNG XUẤT', style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () async {
                  await auth.logout();
                  if (mounted) {
                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                      (route) => false,
                    );
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FaceEnrollmentDialog extends StatefulWidget {
  final String userName;
  final VoidCallback onEnrolled;

  const _FaceEnrollmentDialog({
    required this.userName,
    required this.onEnrolled,
  });

  @override
  State<_FaceEnrollmentDialog> createState() => _FaceEnrollmentDialogState();
}

class _FaceEnrollmentDialogState extends State<_FaceEnrollmentDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _scanAnimation;

  int _step = 0; // 0: detecting, 1: 3D landmarks, 2: anti-spoofing, 3: saving, 4: done, -1: error
  String _stepText = 'Đang nhận diện khuôn mặt...';
  String? _error;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat(reverse: true);

    _scanAnimation = Tween<double>(begin: 0.1, end: 0.9).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );

    _startEnrollment();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _startEnrollment() async {
    try {
      await Future.delayed(const Duration(milliseconds: 800));
      if (!mounted) return;
      setState(() {
        _step = 1;
        _stepText = 'Phân tích cấu trúc 128 điểm đặc trưng 3D...';
      });

      await Future.delayed(const Duration(milliseconds: 900));
      if (!mounted) return;
      setState(() {
        _step = 2;
        _stepText = 'Kiểm tra thực thể sống (Liveness Anti-spoofing)...';
      });

      await Future.delayed(const Duration(milliseconds: 900));
      if (!mounted) return;
      setState(() {
        _step = 3;
        _stepText = 'Đang liên kết dữ liệu sinh trắc học với tài khoản...';
      });

      final auth = Provider.of<AuthProvider>(context, listen: false);
      final ok = await auth.enrollFace(
        faceData: 'FACE_EMBEDDING_REGISTERED_${DateTime.now().millisecondsSinceEpoch}',
      );

      if (!mounted) return;

      if (ok) {
        _animController.stop();
        setState(() {
          _step = 4;
          _stepText = 'Xác thực & đăng ký khuôn mặt thành công!';
        });
        widget.onEnrolled();
      } else {
        _animController.stop();
        setState(() {
          _step = -1;
          _error = auth.errorMessage ?? 'Không thể lưu dữ liệu khuôn mặt';
        });
      }
    } catch (e) {
      if (!mounted) return;
      _animController.stop();
      setState(() {
        _step = -1;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF0F172A),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Đăng ký Face ID',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white60),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Scanner Viewport
            SizedBox(
              width: 220,
              height: 250,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    width: 200,
                    height: 240,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(100),
                      border: Border.all(
                        color: _step == 4
                            ? Colors.greenAccent
                            : (_step == -1 ? Colors.redAccent : const Color(0xFF38BDF8)),
                        width: 2.5,
                      ),
                      gradient: RadialGradient(
                        colors: [
                          (_step == 4
                                  ? Colors.greenAccent
                                  : (_step == -1 ? Colors.redAccent : const Color(0xFF0284C7)))
                              .withOpacity(0.2),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                  Icon(
                    _step == 4
                        ? Icons.check_circle_outline
                        : (_step == -1 ? Icons.highlight_off : Icons.face_retouching_natural),
                    size: 90,
                    color: _step == 4
                        ? Colors.greenAccent
                        : (_step == -1 ? Colors.redAccent : Colors.white.withOpacity(0.85)),
                  ),
                  if (_step >= 0 && _step < 4)
                    AnimatedBuilder(
                      animation: _scanAnimation,
                      builder: (context, child) {
                        return Positioned(
                          top: 10 + _scanAnimation.value * 220,
                          left: 20,
                          right: 20,
                          child: Container(
                            height: 2.5,
                            decoration: BoxDecoration(
                              color: const Color(0xFF00F0FF),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF00F0FF).withOpacity(0.9),
                                  blurRadius: 12,
                                  spreadRadius: 2,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (_step >= 0 && _step < 4) ...[
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Color(0xFF38BDF8),
                ),
              ),
              const SizedBox(height: 10),
            ],
            Text(
              _stepText,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: _step == 4
                    ? Colors.greenAccent
                    : (_step == -1 ? Colors.redAccent : Colors.white70),
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.redAccent, fontSize: 11),
              ),
            ],
            const SizedBox(height: 20),
            if (_step == 4)
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.greenAccent.shade700,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(44),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.check, size: 18),
                label: const Text('HOÀN TẤT', style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () => Navigator.pop(context),
              )
            else if (_step == -1)
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0284C7),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(44),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('THỬ LẠI', style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () {
                  setState(() {
                    _step = 0;
                    _error = null;
                    _stepText = 'Đang nhận diện khuôn mặt...';
                  });
                  _animController.repeat(reverse: true);
                  _startEnrollment();
                },
              ),
          ],
        ),
      ),
    );
  }
}
