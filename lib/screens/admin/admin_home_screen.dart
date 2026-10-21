import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/class_model.dart';
import '../../models/user_model.dart';
import '../login_screen.dart';
import '../profile/profile_screen.dart';

class AdminHomeScreen extends StatefulWidget {
  const AdminHomeScreen({super.key});

  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> {
  int _currentIndex = 0;
  bool _isLoading = true;
  List<ClassModel> _classes = [];
  List<UserModel> _users = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final classRes = await ApiService.get('/classes');
      final userRes = await ApiService.get('/users');

      if (mounted) {
        setState(() {
          if (classRes['data'] != null) {
            _classes = (classRes['data'] as List)
                .map((e) => ClassModel.fromJson(e))
                .toList();
          }
          if (userRes['data'] != null) {
            _users = (userRes['data'] as List)
                .map((e) => UserModel.fromJson(e))
                .toList();
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi tải dữ liệu: $e')),
        );
      }
    }
  }

  void _showCreateClassDialog() {
    final codeCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final subjectCtrl = TextEditingController();
    final roomCtrl = TextEditingController(text: 'P.A1-302');
    final scheduleCtrl = TextEditingController(text: 'Thứ 2 (07:30 - 11:00)');
    String? selectedTeacherId = _users.where((u) => u.role == 'TEACHER').isNotEmpty
        ? _users.firstWhere((u) => u.role == 'TEACHER').id
        : null;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Thêm Lớp Học Phần Mới'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: codeCtrl,
                  decoration: const InputDecoration(labelText: 'Mã Lớp (VD: 261IT3101_03)'),
                ),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Tên Lớp Học Phần'),
                ),
                TextField(
                  controller: subjectCtrl,
                  decoration: const InputDecoration(labelText: 'Tên Môn Học'),
                ),
                TextField(
                  controller: roomCtrl,
                  decoration: const InputDecoration(labelText: 'Phòng Học'),
                ),
                TextField(
                  controller: scheduleCtrl,
                  decoration: const InputDecoration(labelText: 'Lịch Học'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: selectedTeacherId,
                  decoration: const InputDecoration(labelText: 'Giảng viên phụ trách'),
                  items: _users.where((u) => u.role == 'TEACHER').map((u) {
                    return DropdownMenuItem(value: u.id, child: Text(u.fullName));
                  }).toList(),
                  onChanged: (val) => setDialogState(() => selectedTeacherId = val),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
            ElevatedButton(
              onPressed: () async {
                if (codeCtrl.text.isEmpty || nameCtrl.text.isEmpty || selectedTeacherId == null) {
                  return;
                }
                try {
                  await ApiService.post('/classes', {
                    'code': codeCtrl.text.trim(),
                    'name': nameCtrl.text.trim(),
                    'subjectName': subjectCtrl.text.trim(),
                    'teacherId': selectedTeacherId,
                    'room': roomCtrl.text.trim(),
                    'schedule': scheduleCtrl.text.trim(),
                  });
                  Navigator.pop(ctx);
                  _loadData();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Tạo lớp học phần thành công!')),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Lỗi: $e')),
                  );
                }
              },
              child: const Text('Tạo Lớp'),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateUserDialog() {
    final usernameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final passCtrl = TextEditingController(text: 'Prime@123');
    final nameCtrl = TextEditingController();
    final codeCtrl = TextEditingController();
    String role = 'STUDENT';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Tạo Tài Khoản Mới'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  value: role,
                  decoration: const InputDecoration(labelText: 'Vai trò'),
                  items: const [
                    DropdownMenuItem(value: 'STUDENT', child: Text('Sinh viên')),
                    DropdownMenuItem(value: 'TEACHER', child: Text('Giảng viên')),
                    DropdownMenuItem(value: 'ADMIN', child: Text('Quản trị viên')),
                  ],
                  onChanged: (val) => setDialogState(() => role = val!),
                ),
                TextField(
                  controller: usernameCtrl,
                  decoration: const InputDecoration(labelText: 'Tên đăng nhập'),
                ),
                TextField(
                  controller: emailCtrl,
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Họ và tên'),
                ),
                TextField(
                  controller: codeCtrl,
                  decoration: InputDecoration(
                    labelText: role == 'STUDENT' ? 'MSSV' : 'Mã Giảng viên',
                  ),
                ),
                TextField(
                  controller: passCtrl,
                  decoration: const InputDecoration(labelText: 'Mật khẩu'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
            ElevatedButton(
              onPressed: () async {
                try {
                  await ApiService.post('/users', {
                    'username': usernameCtrl.text.trim(),
                    'email': emailCtrl.text.trim(),
                    'password': passCtrl.text,
                    'fullName': nameCtrl.text.trim(),
                    'role': role,
                    'studentCode': role == 'STUDENT' ? codeCtrl.text.trim() : null,
                    'teacherCode': role == 'TEACHER' ? codeCtrl.text.trim() : null,
                  });
                  Navigator.pop(ctx);
                  _loadData();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Tạo tài khoản thành công!')),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Lỗi: $e')),
                  );
                }
              },
              child: const Text('Lưu'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('GIÁO VỤ / QUẢN TRỊ VIÊN'),
        backgroundColor: const Color(0xFF1A237E),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
          IconButton(
            icon: const Icon(Icons.account_circle),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfileScreen()),
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _currentIndex == 0
              ? _buildClassesTab()
              : _currentIndex == 1
                  ? _buildUsersTab()
                  : _buildStatsTab(),
      floatingActionButton: _currentIndex == 0
          ? FloatingActionButton.extended(
              backgroundColor: const Color(0xFF1A237E),
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Thêm Lớp', style: TextStyle(color: Colors.white)),
              onPressed: _showCreateClassDialog,
            )
          : _currentIndex == 1
              ? FloatingActionButton.extended(
                  backgroundColor: const Color(0xFF1A237E),
                  icon: const Icon(Icons.person_add, color: Colors.white),
                  label: const Text('Thêm Người Dùng', style: TextStyle(color: Colors.white)),
                  onPressed: _showCreateUserDialog,
                )
              : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.class_outlined),
            selectedIcon: Icon(Icons.class_),
            label: 'Lớp Học Phần',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people),
            label: 'Người Dùng',
          ),
          NavigationDestination(
            icon: Icon(Icons.analytics_outlined),
            selectedIcon: Icon(Icons.analytics),
            label: 'Thống Kê',
          ),
        ],
      ),
    );
  }

  Widget _buildClassesTab() {
    if (_classes.isEmpty) {
      return const Center(child: Text('Chưa có lớp học phần nào'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _classes.length,
      itemBuilder: (ctx, i) {
        final c = _classes[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.indigo.shade50,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        c.code,
                        style: const TextStyle(
                          color: Color(0xFF1A237E),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Text(
                      '${c.studentCount} sinh viên',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  c.name,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Môn học: ${c.subjectName}',
                  style: const TextStyle(fontSize: 14, color: Colors.black87),
                ),
                const Divider(height: 16),
                Row(
                  children: [
                    const Icon(Icons.person, size: 16, color: Colors.indigo),
                    const SizedBox(width: 4),
                    Text(c.teacherName ?? 'Chưa phân công', style: const TextStyle(fontSize: 13)),
                    const Spacer(),
                    const Icon(Icons.meeting_room, size: 16, color: Colors.indigo),
                    const SizedBox(width: 4),
                    Text(c.room ?? 'N/A', style: const TextStyle(fontSize: 13)),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildUsersTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _users.length,
      itemBuilder: (ctx, i) {
        final u = _users[i];
        Color roleColor = Colors.teal;
        String roleLabel = 'Sinh viên';

        if (u.role == 'ADMIN') {
          roleColor = Colors.purple;
          roleLabel = 'Giáo vụ';
        } else if (u.role == 'TEACHER') {
          roleColor = Colors.blue;
          roleLabel = 'Giảng viên';
        }

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: roleColor.withOpacity(0.15),
              child: Icon(Icons.person, color: roleColor),
            ),
            title: Text(u.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('${u.email} • ${u.studentCode ?? u.teacherCode ?? ""}'),
            trailing: Chip(
              label: Text(roleLabel, style: TextStyle(color: roleColor, fontSize: 11)),
              backgroundColor: roleColor.withOpacity(0.1),
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildStatCard('Tổng số Lớp Học Phần', '${_classes.length}', Icons.class_, Colors.indigo),
          const SizedBox(height: 12),
          _buildStatCard('Tổng số Người Dùng', '${_users.length}', Icons.people, Colors.blue),
          const SizedBox(height: 12),
          _buildStatCard('Sinh Viên', '${_users.where((u) => u.role == "STUDENT").length}', Icons.school, Colors.teal),
          const SizedBox(height: 12),
          _buildStatCard('Giảng Viên', '${_users.where((u) => u.role == "TEACHER").length}', Icons.badge, Colors.orange),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String count, IconData icon, Color color) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 32),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 14, color: Colors.grey)),
                const SizedBox(height: 4),
                Text(count, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
