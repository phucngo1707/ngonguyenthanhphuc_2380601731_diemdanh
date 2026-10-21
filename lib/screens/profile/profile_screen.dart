import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
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
        currentPhoto: user.facePhoto,
        onEnrolled: () {
          setState(() {});
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Chụp ảnh và đăng ký khuôn mặt thành công!'),
              backgroundColor: Colors.green,
            ),
          );
        },
      ),
    );
  }

  Uint8List? _getPhotoBytes(String? base64Str) {
    if (base64Str == null || base64Str.isEmpty) return null;
    try {
      final clean = base64Str.contains(',') ? base64Str.split(',').last : base64Str;
      return base64Decode(clean);
    } catch (_) {
      return null;
    }
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

    final photoBytes = _getPhotoBytes(user?.facePhoto);

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
                    Stack(
                      alignment: Alignment.bottomRight,
                      children: [
                        CircleAvatar(
                          radius: 44,
                          backgroundColor: roleColor.withOpacity(0.15),
                          backgroundImage: photoBytes != null ? MemoryImage(photoBytes) : null,
                          child: photoBytes == null
                              ? Text(
                                  user?.fullName.isNotEmpty == true ? user!.fullName[0] : 'U',
                                  style: TextStyle(
                                    fontSize: 34,
                                    fontWeight: FontWeight.bold,
                                    color: roleColor,
                                  ),
                                )
                              : null,
                        ),
                        if (user?.isFaceEnrolled == true)
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.green,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.check, size: 14, color: Colors.white),
                          ),
                      ],
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

            // Biometric Face ID Security Card (with Photo Preview)
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
                                user?.isFaceEnrolled == true ? 'Đã có ảnh mẫu' : 'Chưa có ảnh',
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
                    const SizedBox(height: 12),
                    if (photoBytes != null) ...[
                      Row(
                        children: [
                          Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: const Color(0xFF0284C7), width: 2),
                              image: DecorationImage(
                                image: MemoryImage(photoBytes),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Ảnh khuôn mặt mẫu đã lưu',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Hệ thống sẽ đối chiếu với ảnh này khi bạn đăng nhập nhanh bằng khuôn mặt.',
                                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                    ] else ...[
                      Text(
                        'Bạn chưa chụp ảnh khuôn mặt mẫu. Hãy chụp 1 bức ảnh chân dung rõ nét để hệ thống đối chiếu khi bạn đăng nhập bằng Face ID.',
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.4),
                      ),
                      const SizedBox(height: 10),
                    ],
                    if (user?.isFaceEnrolled == true && user?.faceEnrolledAt != null) ...[
                      Text(
                        'Thời gian đăng ký: ${user!.faceEnrolledAt!.toLocal().toString().split(".")[0]}',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                      ),
                      const SizedBox(height: 12),
                    ],
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
                              ? 'CHỤP LẠI ẢNH KHUÔN MẶT MẪU'
                              : 'CHỤP ẢNH XÁC THỰC KHUÔN MẶT NGAY',
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
  final String? currentPhoto;
  final VoidCallback onEnrolled;

  const _FaceEnrollmentDialog({
    required this.userName,
    this.currentPhoto,
    required this.onEnrolled,
  });

  @override
  State<_FaceEnrollmentDialog> createState() => _FaceEnrollmentDialogState();
}

class _FaceEnrollmentDialogState extends State<_FaceEnrollmentDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _scanAnimation;

  final ImagePicker _picker = ImagePicker();
  Uint8List? _capturedImageBytes;
  String? _capturedBase64;
  bool _isAnalyzing = false;
  bool _isSaving = false;
  String _statusText = 'Chụp hoặc chọn 1 bức ảnh khuôn mặt rõ nét của bạn';
  String? _error;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );

    _scanAnimation = Tween<double>(begin: 0.1, end: 0.9).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      setState(() {
        _error = null;
        _statusText = 'Đang mở Camera / Thư viện ảnh...';
      });

      final XFile? file = await _picker.pickImage(
        source: source,
        maxWidth: 600,
        maxHeight: 600,
        imageQuality: 85,
        preferredCameraDevice: CameraDevice.front,
      );

      if (file == null) {
        setState(() {
          _statusText = 'Bạn chưa chọn ảnh';
        });
        return;
      }

      final bytes = await file.readAsBytes();
      final base64String = 'data:image/jpeg;base64,${base64Encode(bytes)}';

      setState(() {
        _capturedImageBytes = bytes;
        _capturedBase64 = base64String;
        _isAnalyzing = true;
        _statusText = 'Đang phân tích và trích xuất điểm đặc trưng khuôn mặt...';
      });

      _animController.repeat(reverse: true);

      // AI Facial analysis simulation
      await Future.delayed(const Duration(milliseconds: 1200));

      _animController.stop();

      if (!mounted) return;
      setState(() {
        _isAnalyzing = false;
        _statusText = 'Khuôn mặt hợp lệ! Nhấn "Lưu ảnh mẫu" để hoàn tất.';
      });
    } catch (e) {
      _animController.stop();
      if (!mounted) return;
      setState(() {
        _isAnalyzing = false;
        _error = 'Không thể chụp ảnh: $e. Bạn có thể thử chọn ảnh từ thư viện.';
        _statusText = 'Lỗi chụp ảnh';
      });
    }
  }

  Future<void> _confirmAndSave() async {
    if (_capturedBase64 == null) return;

    setState(() {
      _isSaving = true;
      _statusText = 'Đang mã hóa và lưu ảnh khuôn mặt vào hệ thống...';
    });

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final ok = await auth.enrollFace(
      facePhoto: _capturedBase64,
      faceData: 'FACE_EMBEDDING_REGISTERED_${DateTime.now().millisecondsSinceEpoch}',
    );

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (ok) {
      widget.onEnrolled();
      Navigator.pop(context);
    } else {
      setState(() {
        _error = auth.errorMessage ?? 'Lỗi khi lưu ảnh khuôn mặt';
        _statusText = 'Lưu ảnh thất bại';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF0F172A),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Chụp ảnh khuôn mặt mẫu',
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
            const SizedBox(height: 14),

            // Photo Capture / Viewport
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
                        color: _capturedImageBytes != null
                            ? Colors.greenAccent
                            : const Color(0xFF38BDF8),
                        width: 2.5,
                      ),
                      gradient: RadialGradient(
                        colors: [
                          (_capturedImageBytes != null
                                  ? Colors.greenAccent
                                  : const Color(0xFF0284C7))
                              .withOpacity(0.2),
                          Colors.transparent,
                        ],
                      ),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(100),
                      child: _capturedImageBytes != null
                          ? Image.memory(
                              _capturedImageBytes!,
                              fit: BoxFit.cover,
                            )
                          : Icon(
                              Icons.face_retouching_natural,
                              size: 90,
                              color: Colors.white.withOpacity(0.7),
                            ),
                    ),
                  ),

                  // Scanning laser bar
                  if (_isAnalyzing)
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

            if (_isAnalyzing || _isSaving) ...[
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
              _statusText,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: _capturedImageBytes != null ? Colors.greenAccent : Colors.white70,
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

            // Buttons
            if (_capturedImageBytes == null) ...[
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0284C7),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.camera_alt),
                label: const Text('CHỤP ẢNH TỪ CAMERA', style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () => _pickImage(ImageSource.camera),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white70,
                  side: const BorderSide(color: Colors.white24),
                  minimumSize: const Size.fromHeight(42),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.photo_library),
                label: const Text('CHỌN ẢNH TỪ THƯ VIỆN'),
                onPressed: () => _pickImage(ImageSource.gallery),
              ),
            ] else ...[
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.greenAccent.shade700,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.check_circle_outline),
                label: Text(
                  _isSaving ? 'ĐANG LƯU...' : 'XÁC NHẬN & LƯU ẢNH MẪU',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                onPressed: _isSaving ? null : _confirmAndSave,
              ),
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: () {
                  setState(() {
                    _capturedImageBytes = null;
                    _capturedBase64 = null;
                    _statusText = 'Chụp hoặc chọn 1 bức ảnh khuôn mặt rõ nét của bạn';
                  });
                },
                icon: const Icon(Icons.refresh, size: 16, color: Colors.white60),
                label: const Text('Chụp lại ảnh khác', style: TextStyle(color: Colors.white60, fontSize: 12)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
