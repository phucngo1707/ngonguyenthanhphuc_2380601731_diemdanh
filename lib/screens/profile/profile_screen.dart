import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/api_config.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

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
        title: const Text('Hồ sơ cá nhân'),
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
                    subtitle: Text(user?.studentCode ?? 'N/A'),
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
                    title: const Text('Xác thực 3 bước OTP'),
                    subtitle: const Text('Đã kích hoạt bảo mật (Mã OTP demo: 123456)'),
                    trailing: const Icon(Icons.verified, color: Colors.green),
                  ),
                ],
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
