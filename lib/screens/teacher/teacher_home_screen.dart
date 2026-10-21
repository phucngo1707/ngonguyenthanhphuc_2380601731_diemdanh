import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/class_model.dart';
import '../../models/session_model.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../profile/profile_screen.dart';
import 'qr_display_screen.dart';
import 'session_attendance_screen.dart';
import 'review_leaves_screen.dart';

class TeacherHomeScreen extends StatefulWidget {
  const TeacherHomeScreen({Key? key}) : super(key: key);

  @override
  State<TeacherHomeScreen> createState() => _TeacherHomeScreenState();
}

class _TeacherHomeScreenState extends State<TeacherHomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<ClassModel> _classes = [];
  List<SessionModel> _sessions = [];
  bool _isLoadingClasses = true;
  bool _isLoadingSessions = true;
  String? _classError;
  String? _sessionError;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadData() {
    _fetchClasses();
    _fetchSessions();
  }

  Future<void> _fetchClasses() async {
    setState(() => _isLoadingClasses = true);
    try {
      final res = await ApiService.get('/classes');
      if (mounted && res['data'] != null) {
        final list = (res['data'] as List).map((i) => ClassModel.fromJson(i)).toList();
        setState(() {
          _classes = list;
          _isLoadingClasses = false;
          _classError = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _classError = e.toString().replaceAll('Exception: ', '');
          _isLoadingClasses = false;
        });
      }
    }
  }

  Future<void> _fetchSessions() async {
    setState(() => _isLoadingSessions = true);
    try {
      final res = await ApiService.get('/attendance-sessions');
      if (mounted && res['data'] != null) {
        final list = (res['data'] as List).map((i) => SessionModel.fromJson(i)).toList();
        setState(() {
          _sessions = list;
          _isLoadingSessions = false;
          _sessionError = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _sessionError = e.toString().replaceAll('Exception: ', '');
          _isLoadingSessions = false;
        });
      }
    }
  }

  Future<void> _createSessionDialog({ClassModel? defaultClass}) async {
    if (_classes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không có lớp học phần nào để mở điểm danh.')),
      );
      return;
    }

    ClassModel selectedClass = defaultClass ?? _classes.first;
    final titleController = TextEditingController(
      text: 'Điểm danh buổi học - ${selectedClass.name}',
    );
    final durationController = TextEditingController(text: '15');

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Mở phiên điểm danh mới'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<ClassModel>(
                  value: selectedClass,
                  decoration: const InputDecoration(
                    labelText: 'Chọn lớp học phần',
                    border: OutlineInputBorder(),
                  ),
                  items: _classes.map((c) {
                    return DropdownMenuItem(
                      value: c,
                      child: Text('${c.code} - ${c.name}'),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setDialogState(() {
                        selectedClass = val;
                        titleController.text = 'Điểm danh buổi học - ${val.name}';
                      });
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: titleController,
                  decoration: const InputDecoration(
                    labelText: 'Tiêu đề phiên điểm danh',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: durationController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Thời lượng (phút)',
                    hintText: 'Mặc định 15 phút',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E3A8A),
                foregroundColor: Colors.white,
              ),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Tạo & Mở phiên'),
            ),
          ],
        ),
      ),
    );

    if (result == true) {
      try {
        final duration = int.tryParse(durationController.text.trim()) ?? 15;
        final res = await ApiService.post('/attendance-sessions', {
          'classId': selectedClass.id,
          'title': titleController.text.trim(),
          'durationMinutes': duration,
        });

        if (mounted && res['data'] != null) {
          final newSession = SessionModel.fromJson(res['data']);
          _fetchSessions();
          // Navigate directly to QR display screen
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => QrDisplayScreen(session: newSession),
            ),
          ).then((_) => _fetchSessions());
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Lỗi: ${e.toString().replaceAll('Exception: ', '')}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  Future<void> _updateSessionStatus(SessionModel session, String status) async {
    try {
      await ApiService.patch('/attendance-sessions/${session.id}/status', {
        'status': status,
      });
      _fetchSessions();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Cập nhật trạng thái phiên thành $status thành công'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'PRIME • Giảng viên',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              user?.fullName ?? 'Giảng viên',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Làm mới dữ liệu',
            onPressed: _loadData,
          ),
          IconButton(
            icon: const Icon(Icons.account_circle),
            tooltip: 'Hồ sơ cá nhân',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfileScreen()),
              );
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(icon: Icon(Icons.class_outlined), text: 'Lớp học'),
            Tab(icon: Icon(Icons.qr_code), text: 'Phiên điểm danh'),
            Tab(icon: Icon(Icons.assignment_turned_in), text: 'Duyệt đơn'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildClassesTab(),
          _buildSessionsTab(),
          const ReviewLeavesScreen(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Mở phiên điểm danh'),
        onPressed: () => _createSessionDialog(),
      ),
    );
  }

  Widget _buildClassesTab() {
    if (_isLoadingClasses) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_classError != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 48),
            const SizedBox(height: 8),
            Text(_classError!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: _fetchClasses, child: const Text('Thử lại')),
          ],
        ),
      );
    }
    if (_classes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.class_outlined, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text('Chưa có lớp học phần nào được phân công', style: TextStyle(color: Colors.grey.shade600)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _classes.length,
      itemBuilder: (context, index) {
        final c = _classes[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E3A8A).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        c.code,
                        style: const TextStyle(
                          color: Color(0xFF1E3A8A),
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    Row(
                      children: [
                        const Icon(Icons.people_outline, size: 16, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(
                          '${c.studentCount} SV',
                          style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  c.name,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                Text(
                  c.subjectName,
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.room_outlined, size: 16, color: Colors.grey.shade600),
                    const SizedBox(width: 4),
                    Text(c.room ?? 'Chưa xếp phòng', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                    const SizedBox(width: 16),
                    Icon(Icons.schedule, size: 16, color: Colors.grey.shade600),
                    const SizedBox(width: 4),
                    Text(c.schedule ?? 'Linh hoạt', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  ],
                ),
                const Divider(height: 20),
                Align(
                  alignment: Alignment.centerRight,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E3A8A),
                      foregroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.qr_code, size: 18),
                    label: const Text('Mở điểm danh lớp này'),
                    onPressed: () => _createSessionDialog(defaultClass: c),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSessionsTab() {
    if (_isLoadingSessions) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_sessionError != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 48),
            const SizedBox(height: 8),
            Text(_sessionError!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: _fetchSessions, child: const Text('Thử lại')),
          ],
        ),
      );
    }
    if (_sessions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.qr_code_2_outlined, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text('Chưa có phiên điểm danh nào', style: TextStyle(color: Colors.grey.shade600)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _sessions.length,
      itemBuilder: (context, index) {
        final session = _sessions[index];
        final isActive = session.status == 'ACTIVE' && DateTime.now().isBefore(session.endTime);

        Color badgeColor = Colors.grey;
        String badgeText = 'ĐÃ ĐÓNG';
        if (isActive) {
          badgeColor = Colors.green;
          badgeText = 'ĐANG MỞ';
        } else if (session.status == 'PENDING') {
          badgeColor = Colors.orange;
          badgeText = 'CHỜ MỞ';
        }

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        session.title,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: badgeColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: badgeColor),
                      ),
                      child: Text(
                        badgeText,
                        style: TextStyle(color: badgeColor, fontWeight: FontWeight.bold, fontSize: 11),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${session.className ?? "Lớp học phần"} • Mã phiên: ${session.sessionCode}',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                ),
                const SizedBox(height: 4),
                Text(
                  'Bắt đầu: ${session.startTime.hour.toString().padLeft(2, '0')}:${session.startTime.minute.toString().padLeft(2, '0')} - Kết thúc: ${session.endTime.hour.toString().padLeft(2, '0')}:${session.endTime.minute.toString().padLeft(2, '0')} (${session.durationMinutes} phút)',
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                ),
                const Divider(height: 20),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (isActive) ...[
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E3A8A),
                          foregroundColor: Colors.white,
                        ),
                        icon: const Icon(Icons.qr_code, size: 18),
                        label: const Text('Xem QR Code Động'),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => QrDisplayScreen(session: session),
                            ),
                          ).then((_) => _fetchSessions());
                        },
                      ),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                        icon: const Icon(Icons.stop, size: 18),
                        label: const Text('Đóng phiên'),
                        onPressed: () => _updateSessionStatus(session, 'CLOSED'),
                      ),
                    ],
                    if (session.status == 'PENDING') ...[
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                        ),
                        icon: const Icon(Icons.play_arrow, size: 18),
                        label: const Text('Mở phiên'),
                        onPressed: () => _updateSessionStatus(session, 'ACTIVE'),
                      ),
                    ],
                    OutlinedButton.icon(
                      icon: const Icon(Icons.list_alt, size: 18),
                      label: const Text('Bản ghi điểm danh'),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => SessionAttendanceScreen(session: session),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
