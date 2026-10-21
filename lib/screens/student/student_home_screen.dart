import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/class_model.dart';
import '../../models/attendance_record_model.dart';
import '../../models/leave_request_model.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../services/shake_service.dart';
import '../profile/profile_screen.dart';
import 'qr_scanner_screen.dart';
import 'leave_request_screen.dart';

class StudentHomeScreen extends StatefulWidget {
  const StudentHomeScreen({Key? key}) : super(key: key);

  @override
  State<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends State<StudentHomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  List<ClassModel> _classes = [];
  List<AttendanceRecordModel> _history = [];
  List<LeaveRequestModel> _leaves = [];

  bool _isLoadingClasses = true;
  bool _isLoadingHistory = true;
  bool _isLoadingLeaves = true;
  bool _isScannerOpen = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    _loadAllData();
    _initShakeDetector();
  }

  @override
  void dispose() {
    ShakeService.stopListening();
    _tabController.dispose();
    super.dispose();
  }

  void _initShakeDetector() {
    // Feature D: Shake phone to open QR check-in
    ShakeService.startListening(() {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Phát hiện lắc điện thoại! Đang mở camera quét QR...'),
          duration: Duration(seconds: 1),
          backgroundColor: Color(0xFF1E3A8A),
        ),
      );
      _openQrScanner();
    });
  }

  void _loadAllData() {
    _fetchClasses();
    _fetchHistory();
    _fetchLeaves();
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
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingClasses = false);
    }
  }

  Future<void> _fetchHistory() async {
    setState(() => _isLoadingHistory = true);
    try {
      final res = await ApiService.get('/attendance/my-history');
      if (mounted && res['data'] != null) {
        final list = (res['data'] as List).map((i) => AttendanceRecordModel.fromJson(i)).toList();
        setState(() {
          _history = list;
          _isLoadingHistory = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingHistory = false);
    }
  }

  Future<void> _fetchLeaves() async {
    setState(() => _isLoadingLeaves = true);
    try {
      final res = await ApiService.get('/leave-requests');
      if (mounted && res['data'] != null) {
        final list = (res['data'] as List).map((i) => LeaveRequestModel.fromJson(i)).toList();
        setState(() {
          _leaves = list;
          _isLoadingLeaves = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingLeaves = false);
    }
  }

  void _openQrScanner() {
    if (_isScannerOpen) return;
    _isScannerOpen = true;

    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const QrScannerScreen()),
    ).then((result) {
      _isScannerOpen = false;
      if (result == true) {
        _fetchHistory();
      }
    });
  }

  void _showJoinClassDialog() {
    final codeController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: const [
              Icon(Icons.group_add, color: Color(0xFF1E3A8A)),
              SizedBox(width: 8),
              Text(
                'Tham Gia Lớp Học',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Nhập Mã lớp học phần (Class Code) do giảng viên cung cấp để ghi danh vào lớp:',
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: codeController,
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(
                  labelText: 'Mã lớp học *',
                  hintText: 'Ví dụ: PRIME_CNTT_01',
                  prefixIcon: const Icon(Icons.vpn_key_outlined),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: [
                  ActionChip(
                    avatar: const Icon(Icons.bolt, size: 16, color: Colors.amber),
                    label: const Text('PRIME_CNTT_01', style: TextStyle(fontSize: 12)),
                    onPressed: () {
                      setDialogState(() {
                        codeController.text = 'PRIME_CNTT_01';
                      });
                    },
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: isSubmitting ? null : () => Navigator.pop(ctx),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E3A8A),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final code = codeController.text.trim();
                      if (code.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Vui lòng nhập mã lớp học')),
                        );
                        return;
                      }

                      setDialogState(() => isSubmitting = true);
                      try {
                        final res = await ApiService.post('/classes/join', {'classCode': code});
                        if (!mounted) return;
                        Navigator.pop(ctx);
                        if (res['success'] == true) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(res['message'] ?? 'Tham gia lớp thành công!'),
                              backgroundColor: Colors.green,
                            ),
                          );
                          _fetchClasses();
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(res['message'] ?? 'Không thể tham gia lớp'),
                              backgroundColor: Colors.redAccent,
                            ),
                          );
                        }
                      } catch (e) {
                        if (!mounted) return;
                        setDialogState(() => isSubmitting = false);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(e.toString().replaceAll('Exception: ', '')),
                            backgroundColor: Colors.redAccent,
                          ),
                        );
                      }
                    },
              child: isSubmitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Tham gia'),
            ),
          ],
        ),
      ),
    );
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
              'PRIME • Sinh viên',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              '${user?.fullName ?? "Sinh viên"} (${user?.studentCode ?? "N/A"})',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.group_add),
            tooltip: 'Tham gia lớp học',
            onPressed: _showJoinClassDialog,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Làm mới',
            onPressed: _loadAllData,
          ),
          IconButton(
            icon: const Icon(Icons.account_circle),
            tooltip: 'Hồ sơ',
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
            Tab(icon: Icon(Icons.school_outlined), text: 'Lớp học'),
            Tab(icon: Icon(Icons.history), text: 'Lịch sử'),
            Tab(icon: Icon(Icons.note_alt_outlined), text: 'Đơn nghỉ'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Quick Action Banner: Shake & Check-in
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.indigo.shade50,
              border: Border(bottom: BorderSide(color: Colors.indigo.shade100)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E3A8A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.qr_code_scanner, size: 24),
                    label: const Text(
                      'QUÉT MÃ ĐIỂM DANH',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    onPressed: _openQrScanner,
                  ),
                ),
                const SizedBox(width: 12),
                Tooltip(
                  message: 'Lắc mạnh điện thoại để kích hoạt quét nhanh',
                  child: InkWell(
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Tính năng Lắc điện thoại (sensors_plus) đang sẵn sàng!')),
                      );
                    },
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.indigo.shade200),
                      ),
                      child: Column(
                        children: const [
                          Icon(Icons.vibration, color: Color(0xFF1E3A8A), size: 22),
                          Text('Lắc đt', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Main Tabs
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildClassesTab(),
                _buildHistoryTab(),
                _buildLeavesTab(),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: _tabController.index == 0
          ? FloatingActionButton.extended(
              backgroundColor: const Color(0xFF1E3A8A),
              foregroundColor: Colors.white,
              icon: const Icon(Icons.group_add),
              label: const Text('Tham gia lớp'),
              onPressed: _showJoinClassDialog,
            )
          : (_tabController.index == 2
              ? FloatingActionButton.extended(
                  backgroundColor: const Color(0xFF1E3A8A),
                  foregroundColor: Colors.white,
                  icon: const Icon(Icons.add),
                  label: const Text('Xin nghỉ phép'),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => LeaveRequestScreen(enrolledClasses: _classes),
                      ),
                    ).then((_) => _fetchLeaves());
                  },
                )
              : null),
    );
  }

  Widget _buildClassesTab() {
    if (_isLoadingClasses) return const Center(child: CircularProgressIndicator());
    if (_classes.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E3A8A).withOpacity(0.08),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.school_outlined, size: 64, color: Color(0xFF1E3A8A)),
              ),
              const SizedBox(height: 16),
              const Text(
                'Bạn chưa tham gia lớp học nào',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Nhập mã lớp do Giảng viên cung cấp để tham gia lớp học và điểm danh điểm danh GPS/QR/BLE.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _showJoinClassDialog,
                icon: const Icon(Icons.group_add),
                label: const Text('THAM GIA LỚP HỌC NGAY'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E3A8A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 3,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchClasses,
      child: ListView.builder(
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
                        style: const TextStyle(color: Color(0xFF1E3A8A), fontWeight: FontWeight.bold),
                      ),
                    ),
                    Text(
                      c.teacherName ?? 'Giảng viên',
                      style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(c.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text(c.subjectName, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.room_outlined, size: 16, color: Colors.grey.shade600),
                    const SizedBox(width: 4),
                    Text(c.room ?? 'Phòng học', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                    const SizedBox(width: 16),
                    Icon(Icons.schedule, size: 16, color: Colors.grey.shade600),
                    const SizedBox(width: 4),
                    Text(c.schedule ?? 'Lịch học', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    ),
  );
}

  Widget _buildHistoryTab() {
    if (_isLoadingHistory) return const Center(child: CircularProgressIndicator());
    if (_history.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history_toggle_off, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text('Bạn chưa có lượt điểm danh nào', style: TextStyle(color: Colors.grey.shade600)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _history.length,
      itemBuilder: (context, index) {
        final rec = _history[index];
        final isPresent = rec.status == 'PRESENT';
        final isLate = rec.status == 'LATE';
        final isExcused = rec.status == 'EXCUSED';

        Color badgeColor = Colors.green;
        String badgeText = 'Có mặt';
        if (isLate) {
          badgeColor = Colors.orange;
          badgeText = 'Đi trễ';
        } else if (isExcused) {
          badgeColor = Colors.blue;
          badgeText = 'Có phép';
        } else if (rec.status == 'ABSENT') {
          badgeColor = Colors.red;
          badgeText = 'Vắng';
        }

        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: badgeColor.withOpacity(0.15),
              child: Icon(
                isPresent ? Icons.check : (isLate ? Icons.access_time : Icons.close),
                color: badgeColor,
              ),
            ),
            title: Text(
              rec.sessionTitle ?? 'Phiên điểm danh',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(rec.className ?? 'Lớp học phần'),
                Text(
                  'Thời gian: ${rec.checkInTime.day}/${rec.checkInTime.month}/${rec.checkInTime.year} ${rec.checkInTime.hour.toString().padLeft(2, '0')}:${rec.checkInTime.minute.toString().padLeft(2, '0')}',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                if (rec.modifiedReason != null && rec.modifiedReason!.isNotEmpty)
                  Text(
                    'Ghi chú sửa: ${rec.modifiedReason}',
                    style: const TextStyle(fontSize: 12, color: Colors.deepPurple),
                  ),
              ],
            ),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: badgeColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: badgeColor),
              ),
              child: Text(
                badgeText,
                style: TextStyle(color: badgeColor, fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildLeavesTab() {
    if (_isLoadingLeaves) return const Center(child: CircularProgressIndicator());

    return Scaffold(
      body: _leaves.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.description_outlined, size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 12),
                  Text('Chưa có đơn xin nghỉ phép nào', style: TextStyle(color: Colors.grey.shade600)),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E3A8A),
                      foregroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.add),
                    label: const Text('Tạo đơn xin nghỉ'),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => LeaveRequestScreen(enrolledClasses: _classes),
                        ),
                      ).then((_) => _fetchLeaves());
                    },
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _leaves.length,
              itemBuilder: (context, index) {
                final item = _leaves[index];
                Color statusColor = Colors.orange;
                String statusText = 'Chờ duyệt';
                if (item.status == 'APPROVED') {
                  statusColor = Colors.green;
                  statusText = 'Đã duyệt';
                } else if (item.status == 'REJECTED') {
                  statusColor = Colors.red;
                  statusText = 'Bị từ chối';
                }

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              item.className ?? 'Lớp học phần',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: statusColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: statusColor),
                              ),
                              child: Text(
                                statusText,
                                style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Thời gian: ${item.startDate.day}/${item.startDate.month}/${item.startDate.year} → ${item.endDate.day}/${item.endDate.month}/${item.endDate.year}',
                          style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                        ),
                        const SizedBox(height: 6),
                        Text('Lý do: ${item.reason}'),
                        if (item.ocrText != null && item.ocrText!.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            'Minh chứng OCR: ${item.ocrText}',
                            style: const TextStyle(fontSize: 12, color: Colors.indigo, fontStyle: FontStyle.italic),
                          ),
                        ],
                        if (item.reviewNotes != null && item.reviewNotes!.isNotEmpty) ...[
                          const Divider(height: 16),
                          Text(
                            'Phản hồi từ GV: ${item.reviewNotes}',
                            style: const TextStyle(fontSize: 13, color: Colors.black87, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Tạo đơn xin nghỉ'),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => LeaveRequestScreen(enrolledClasses: _classes),
            ),
          ).then((_) => _fetchLeaves());
        },
      ),
    );
  }
}
