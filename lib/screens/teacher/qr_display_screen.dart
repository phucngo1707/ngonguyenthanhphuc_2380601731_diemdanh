import 'dart:async';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../models/session_model.dart';
import '../../models/attendance_record_model.dart';
import '../../services/api_service.dart';

class QrDisplayScreen extends StatefulWidget {
  final SessionModel session;

  const QrDisplayScreen({Key? key, required this.session}) : super(key: key);

  @override
  State<QrDisplayScreen> createState() => _QrDisplayScreenState();
}

class _QrDisplayScreenState extends State<QrDisplayScreen> {
  String? _qrToken;
  bool _isLoading = true;
  String? _errorMessage;

  Timer? _countdownTimer;
  Timer? _recordsTimer;
  int _secondsLeft = 10;
  static const int _qrLifetimeSeconds = 10;

  List<AttendanceRecordModel> _records = [];
  bool _isLoadingRecords = false;

  @override
  void initState() {
    super.initState();
    _fetchQrToken();
    _fetchRecords();
    _startTimers();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _recordsTimer?.cancel();
    super.dispose();
  }

  void _startTimers() {
    // 1-second interval countdown for 10-second dynamic QR
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      setState(() {
        if (_secondsLeft > 1) {
          _secondsLeft--;
        } else {
          _secondsLeft = _qrLifetimeSeconds;
          _fetchQrToken();
        }
      });
    });

    // Refresh attendance records every 5 seconds
    _recordsTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (mounted) _fetchRecords(isBackground: true);
    });
  }

  Future<void> _fetchQrToken() async {
    try {
      final res = await ApiService.post(
        '/attendance-sessions/${widget.session.id}/generate-qr-token',
        {},
      );
      if (mounted && res['data'] != null) {
        setState(() {
          _qrToken = res['data']['token'];
          _errorMessage = null;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _fetchRecords({bool isBackground = false}) async {
    if (!isBackground) {
      setState(() => _isLoadingRecords = true);
    }
    try {
      final res = await ApiService.get('/attendance/session/${widget.session.id}');
      if (mounted && res['data'] != null) {
        final list = (res['data'] as List)
            .map((item) => AttendanceRecordModel.fromJson(item))
            .toList();
        setState(() {
          _records = list;
          _isLoadingRecords = false;
        });
      }
    } catch (e) {
      if (mounted && !isBackground) {
        setState(() => _isLoadingRecords = false);
      }
    }
  }

  Future<void> _closeSession() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Đóng phiên điểm danh?'),
        content: const Text(
          'Sau khi đóng, sinh viên sẽ không thể quét mã để điểm danh được nữa.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Đóng phiên'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await ApiService.patch('/attendance-sessions/${widget.session.id}/status', {
        'status': 'CLOSED',
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã đóng phiên điểm danh thành công'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
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

  Future<void> _updateStudentStatus(AttendanceRecordModel record) async {
    String selectedStatus = record.status;
    final reasonController = TextEditingController(text: record.modifiedReason ?? '');

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Sửa trạng thái: ${record.studentName ?? 'Sinh viên'}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('MSSV: ${record.studentCode ?? 'N/A'}'),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: selectedStatus,
                decoration: const InputDecoration(
                  labelText: 'Trạng thái điểm danh',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'PRESENT', child: Text('Có mặt (PRESENT)')),
                  DropdownMenuItem(value: 'LATE', child: Text('Đi trễ (LATE)')),
                  DropdownMenuItem(value: 'ABSENT', child: Text('Vắng (ABSENT)')),
                  DropdownMenuItem(value: 'EXCUSED', child: Text('Có phép (EXCUSED)')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setDialogState(() => selectedStatus = val);
                  }
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: reasonController,
                decoration: const InputDecoration(
                  labelText: 'Lý do chỉnh sửa',
                  hintText: 'Nhập lý do điều chỉnh...',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Lưu thay đổi'),
            ),
          ],
        ),
      ),
    );

    if (result == true) {
      try {
        await ApiService.put('/attendance/${record.id}', {
          'status': selectedStatus,
          'modifiedReason': reasonController.text.trim(),
        });
        _fetchRecords();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Cập nhật trạng thái điểm danh thành công'),
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
  }

  @override
  Widget build(BuildContext context) {
    final progress = _secondsLeft / _qrLifetimeSeconds;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.session.title),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.stop_circle_outlined),
            tooltip: 'Đóng phiên điểm danh',
            onPressed: _closeSession,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Session Info Card
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: const Color(0xFF1E3A8A).withOpacity(0.1),
                      child: const Icon(Icons.qr_code_2, color: Color(0xFF1E3A8A)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.session.className ?? 'Lớp học phần',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          Text(
                            'Mã phiên: ${widget.session.sessionCode}',
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.green),
                      ),
                      child: const Text(
                        'ĐANG MỞ',
                        style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Dynamic QR Anti-Cheat Card
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.shield_outlined, color: Color(0xFF1E3A8A), size: 20),
                        const SizedBox(width: 6),
                        const Text(
                          'Smart Anti-Cheat Dynamic QR',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E3A8A)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Tự động làm mới mỗi 10 giây kèm chữ ký HMAC-SHA256',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),

                    // Countdown progress bar
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 8,
                        backgroundColor: Colors.grey.shade200,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          _secondsLeft <= 3 ? Colors.red : const Color(0xFF1E3A8A),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Mã mới sau: $_secondsLeft giây',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _secondsLeft <= 3 ? Colors.red : Colors.grey.shade800,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.refresh, size: 20),
                          tooltip: 'Làm mới ngay',
                          onPressed: () {
                            setState(() => _secondsLeft = _qrLifetimeSeconds);
                            _fetchQrToken();
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // QR Display
                    if (_isLoading)
                      const SizedBox(
                        height: 220,
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else if (_errorMessage != null)
                      Container(
                        height: 220,
                        alignment: Alignment.center,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, color: Colors.red, size: 40),
                            const SizedBox(height: 8),
                            Text(
                              _errorMessage!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.red),
                            ),
                            const SizedBox(height: 8),
                            ElevatedButton(
                              onPressed: _fetchQrToken,
                              child: const Text('Thử lại'),
                            ),
                          ],
                        ),
                      )
                    else if (_qrToken != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade300, width: 2),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: QrImageView(
                          data: _qrToken!,
                          version: QrVersions.auto,
                          size: 240.0,
                          backgroundColor: Colors.white,
                          eyeStyle: const QrEyeStyle(
                            eyeShape: QrEyeShape.square,
                            color: Color(0xFF1E3A8A),
                          ),
                          dataModuleStyle: const QrDataModuleStyle(
                            dataModuleShape: QrDataModuleShape.square,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Live Attendance List Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.people, color: Color(0xFF1E3A8A)),
                    const SizedBox(width: 8),
                    Text(
                      'Sinh viên đã điểm danh (${_records.length})',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Tải lại danh sách',
                  onPressed: () => _fetchRecords(),
                ),
              ],
            ),
            const SizedBox(height: 8),

            if (_isLoadingRecords && _records.isEmpty)
              const Center(child: CircularProgressIndicator())
            else if (_records.isEmpty)
              Container(
                padding: const EdgeInsets.all(24),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    Icon(Icons.how_to_reg_outlined, size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 8),
                    Text(
                      'Chưa có sinh viên nào điểm danh',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ],
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _records.length,
                itemBuilder: (context, index) {
                  final record = _records[index];
                  final isLate = record.status == 'LATE';
                  final isExcused = record.status == 'EXCUSED';

                  Color badgeColor = Colors.green;
                  String badgeText = 'Có mặt';
                  if (isLate) {
                    badgeColor = Colors.orange;
                    badgeText = 'Đi trễ';
                  } else if (isExcused) {
                    badgeColor = Colors.blue;
                    badgeText = 'Có phép';
                  } else if (record.status == 'ABSENT') {
                    badgeColor = Colors.red;
                    badgeText = 'Vắng';
                  }

                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: badgeColor.withOpacity(0.15),
                        child: Text(
                          record.studentName != null && record.studentName!.isNotEmpty
                              ? record.studentName![0]
                              : 'S',
                          style: TextStyle(color: badgeColor, fontWeight: FontWeight.bold),
                        ),
                      ),
                      title: Text(
                        record.studentName ?? 'Sinh viên',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('MSSV: ${record.studentCode ?? 'N/A'}'),
                          Text(
                            'Giờ: ${record.checkInTime.hour.toString().padLeft(2, '0')}:${record.checkInTime.minute.toString().padLeft(2, '0')}:${record.checkInTime.second.toString().padLeft(2, '0')}',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          ),
                          if (record.modifiedReason != null && record.modifiedReason!.isNotEmpty)
                            Text(
                              'Lý do sửa: ${record.modifiedReason}',
                              style: const TextStyle(fontSize: 12, color: Colors.deepPurple),
                            ),
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: badgeColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: badgeColor),
                            ),
                            child: Text(
                              badgeText,
                              style: TextStyle(color: badgeColor, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit, size: 18),
                            tooltip: 'Chỉnh sửa trạng thái',
                            onPressed: () => _updateStudentStatus(record),
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
    );
  }
}
