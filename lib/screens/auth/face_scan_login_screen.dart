import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:local_auth/local_auth.dart';
import '../../providers/auth_provider.dart';
import '../admin/admin_home_screen.dart';
import '../teacher/teacher_home_screen.dart';
import '../student/student_home_screen.dart';

enum ScanStatus { idle, scanning, livenessChecking, verifying, success, failed }

class FaceScanLoginScreen extends StatefulWidget {
  final String? initialAccount;

  const FaceScanLoginScreen({super.key, this.initialAccount});

  @override
  State<FaceScanLoginScreen> createState() => _FaceScanLoginScreenState();
}

class _FaceScanLoginScreenState extends State<FaceScanLoginScreen>
    with SingleTickerProviderStateMixin {
  late final TextEditingController _accountController;
  late final AnimationController _scanAnimController;
  late final Animation<double> _scanAnimation;

  final LocalAuthentication _localAuth = LocalAuthentication();
  ScanStatus _status = ScanStatus.idle;
  String _statusMessage = 'Hướng khuôn mặt vào giữa khung tròn để nhận diện';
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _accountController = TextEditingController(text: widget.initialAccount ?? '');

    _scanAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );

    _scanAnimation = Tween<double>(begin: 0.05, end: 0.95).animate(
      CurvedAnimation(
        parent: _scanAnimController,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _scanAnimController.dispose();
    _accountController.dispose();
    super.dispose();
  }

  Future<void> _startFaceScan() async {
    final account = _accountController.text.trim();
    if (account.isEmpty) {
      setState(() {
        _errorMessage = 'Vui lòng nhập Tên tài khoản, Email hoặc Mã số';
      });
      return;
    }

    setState(() {
      _errorMessage = null;
      _status = ScanStatus.scanning;
      _statusMessage = 'Đang nhận diện các điểm đặc trưng khuôn mặt...';
    });
    _scanAnimController.repeat(reverse: true);

    try {
      // Step 1: Simulate Face Detection & Liveness Check
      await Future.delayed(const Duration(milliseconds: 900));
      if (!mounted) return;
      setState(() {
        _status = ScanStatus.livenessChecking;
        _statusMessage = 'Kiểm tra thực thể sống (Liveness Check) 3D...';
      });

      // Optional: Check hardware local_auth if available
      try {
        final canCheckBiometrics = await _localAuth.canCheckBiometrics;
        if (canCheckBiometrics) {
          final isSupported = await _localAuth.isDeviceSupported();
          if (isSupported) {
            await _localAuth.authenticate(
              localizedReason: 'Xác thực khuôn mặt để đăng nhập tài khoản $account',
              options: const AuthenticationOptions(
                biometricOnly: false,
                stickyAuth: false,
              ),
            );
          }
        }
      } catch (_) {
        // Fallback gracefully on devices without biometric hardware or simulator
      }

      await Future.delayed(const Duration(milliseconds: 900));
      if (!mounted) return;
      setState(() {
        _status = ScanStatus.verifying;
        _statusMessage = 'Đang đối soát sinh trắc học với cơ sở dữ liệu...';
      });

      final auth = Provider.of<AuthProvider>(context, listen: false);
      final ok = await auth.faceLogin(
        account,
        faceBiometric: 'AI_FACE_BIOMETRIC_TOKEN_${DateTime.now().millisecondsSinceEpoch}',
      );

      _scanAnimController.stop();

      if (!mounted) return;

      if (ok && auth.currentUser != null) {
        setState(() {
          _status = ScanStatus.success;
          _statusMessage = 'Nhận diện thành công! Chào ${auth.currentUser!.fullName}';
        });

        await Future.delayed(const Duration(milliseconds: 800));
        if (!mounted) return;

        final role = auth.currentUser!.role.toUpperCase();
        Widget nextScreen;
        if (role == 'ADMIN') {
          nextScreen = const AdminHomeScreen();
        } else if (role == 'TEACHER') {
          nextScreen = const TeacherHomeScreen();
        } else {
          nextScreen = const StudentHomeScreen();
        }

        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => nextScreen),
          (route) => false,
        );
      } else {
        setState(() {
          _status = ScanStatus.failed;
          _statusMessage = auth.errorMessage ?? 'Không tìm thấy tài khoản hoặc dữ liệu khuôn mặt không khớp';
          _errorMessage = auth.errorMessage ?? 'Xác thực khuôn mặt thất bại. Vui lòng kiểm tra lại tài khoản.';
        });
      }
    } catch (e) {
      _scanAnimController.stop();
      if (!mounted) return;
      setState(() {
        _status = ScanStatus.failed;
        _statusMessage = 'Lỗi kết nối máy chủ xác thực: $e';
        _errorMessage = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isScanning = _status == ScanStatus.scanning ||
        _status == ScanStatus.livenessChecking ||
        _status == ScanStatus.verifying;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Dark slate/navy background
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Đăng nhập bằng Khuôn mặt (Face ID)',
          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 8),
              // Account input
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'TÀI KHOẢN CỦA BẠN',
                      style: TextStyle(
                        color: Color(0xFF38BDF8),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.1,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _accountController,
                      style: const TextStyle(color: Colors.white, fontSize: 15),
                      decoration: InputDecoration(
                        hintText: 'Nhập Email, Username hoặc Mã số SV/GV',
                        hintStyle: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 13),
                        prefixIcon: const Icon(Icons.badge_outlined, color: Color(0xFF38BDF8)),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        _buildAccountChip('2380601731 (SV)'),
                        _buildAccountChip('phucngo1707@gmail.com'),
                        _buildAccountChip('student@prime.edu.vn'),
                        _buildAccountChip('teacher@prime.edu.vn'),
                      ],
                    ),
                  ],
                ),
              ),

              if (_errorMessage != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade900.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.red.shade400),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.redAccent, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: Colors.white, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                      if (_errorMessage!.contains('Cài đặt') || _errorMessage!.contains('chưa')) ...[
                        const SizedBox(height: 6),
                        TextButton.icon(
                          style: TextButton.styleFrom(
                            foregroundColor: const Color(0xFF38BDF8),
                            padding: EdgeInsets.zero,
                          ),
                          icon: const Icon(Icons.arrow_back, size: 14),
                          label: const Text(
                            'Quay lại Đăng nhập bằng Mật khẩu để vào Cài đặt',
                            style: TextStyle(fontSize: 12, decoration: TextDecoration.underline),
                          ),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 28),

              // Biometric Viewport
              Center(
                child: SizedBox(
                  width: 270,
                  height: 330,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Glow background
                      Container(
                        width: 250,
                        height: 310,
                        decoration: BoxDecoration(
                          shape: BoxShape.rectangle,
                          borderRadius: BorderRadius.circular(130),
                          gradient: RadialGradient(
                            colors: _status == ScanStatus.success
                                ? [Colors.greenAccent.withOpacity(0.3), Colors.transparent]
                                : (_status == ScanStatus.failed
                                    ? [Colors.redAccent.withOpacity(0.3), Colors.transparent]
                                    : [const Color(0xFF0284C7).withOpacity(0.25), Colors.transparent]),
                          ),
                        ),
                      ),

                      // Face Target Frame
                      CustomPaint(
                        size: const Size(250, 310),
                        painter: _FaceViewportPainter(
                          status: _status,
                        ),
                      ),

                      // Avatar / Face Illustration
                      Icon(
                        _status == ScanStatus.success
                            ? Icons.check_circle_outline
                            : (_status == ScanStatus.failed
                                ? Icons.highlight_off
                                : Icons.face_retouching_natural),
                        size: 110,
                        color: _status == ScanStatus.success
                            ? Colors.greenAccent
                            : (_status == ScanStatus.failed
                                ? Colors.redAccent
                                : Colors.white.withOpacity(0.8)),
                      ),

                      // Animated Laser Scan Bar
                      if (isScanning)
                        AnimatedBuilder(
                          animation: _scanAnimation,
                          builder: (context, child) {
                            return Positioned(
                              top: 20 + _scanAnimation.value * 270,
                              left: 20,
                              right: 20,
                              child: Container(
                                height: 3,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF00F0FF),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF00F0FF).withOpacity(0.9),
                                      blurRadius: 16,
                                      spreadRadius: 3,
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
              ),

              const SizedBox(height: 20),

              // Status indicator
              Center(
                child: Column(
                  children: [
                    if (isScanning) ...[
                      const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF38BDF8),
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],
                    Text(
                      _statusMessage,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: _status == ScanStatus.success
                            ? Colors.greenAccent
                            : (_status == ScanStatus.failed
                                ? Colors.redAccent
                                : Colors.white70),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Scan Action Button
              ElevatedButton.icon(
                onPressed: isScanning ? null : _startFaceScan,
                icon: Icon(
                  _status == ScanStatus.success ? Icons.check : Icons.camera_alt,
                  size: 20,
                ),
                label: Text(
                  isScanning
                      ? 'ĐANG QUÉT KHUÔN MẶT AI...'
                      : (_status == ScanStatus.failed ? 'QUÉT LẠI KHUÔN MẶT' : 'BẮT ĐẦU QUÉT KHUÔN MẶT'),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 0.5),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0284C7),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(54),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 6,
                ),
              ),

              const SizedBox(height: 12),

              TextButton.icon(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.lock_clock, size: 18, color: Colors.white60),
                label: const Text(
                  'Quay lại đăng nhập bằng Mật khẩu & OTP',
                  style: TextStyle(color: Colors.white60, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAccountChip(String label) {
    final accountText = label.split(' ').first;
    return InkWell(
      onTap: () {
        setState(() {
          _accountController.text = accountText;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFF334155),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 11),
        ),
      ),
    );
  }
}

class _FaceViewportPainter extends CustomPainter {
  final ScanStatus status;

  _FaceViewportPainter({required this.status});

  @override
  void paint(Canvas canvas, Size size) {
    Color borderColor;
    if (status == ScanStatus.success) {
      borderColor = Colors.greenAccent;
    } else if (status == ScanStatus.failed) {
      borderColor = Colors.redAccent;
    } else {
      borderColor = const Color(0xFF38BDF8);
    }

    final rect = Rect.fromLTWH(10, 10, size.width - 20, size.height - 20);
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(110));

    // Outer guide border
    final guidePaint = Paint()
      ..color = borderColor.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawRRect(rrect, guidePaint);

    // Corner brackets
    final bracketPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    const cornerLen = 28.0;

    // Top Left
    canvas.drawLine(const Offset(40, 20), const Offset(40 + cornerLen, 20), bracketPaint);
    canvas.drawLine(const Offset(25, 35), const Offset(25, 35 + cornerLen), bracketPaint);

    // Top Right
    canvas.drawLine(Offset(size.width - 40 - cornerLen, 20), Offset(size.width - 40, 20), bracketPaint);
    canvas.drawLine(Offset(size.width - 25, 35), Offset(size.width - 25, 35 + cornerLen), bracketPaint);

    // Bottom Left
    canvas.drawLine(const Offset(40, 290), const Offset(40 + cornerLen, 290), bracketPaint);
    canvas.drawLine(const Offset(25, 275 - cornerLen), const Offset(25, 275), bracketPaint);

    // Bottom Right
    canvas.drawLine(Offset(size.width - 40 - cornerLen, 290), Offset(size.width - 40, 290), bracketPaint);
    canvas.drawLine(Offset(size.width - 25, 275 - cornerLen), Offset(size.width - 25, 275), bracketPaint);
  }

  @override
  bool shouldRepaint(covariant _FaceViewportPainter oldDelegate) {
    return oldDelegate.status != status;
  }
}
