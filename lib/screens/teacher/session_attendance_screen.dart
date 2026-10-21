import 'package:flutter/material.dart';
import '../../models/session_model.dart';
import '../../models/attendance_record_model.dart';
import '../../services/api_service.dart';

class SessionAttendanceScreen extends StatefulWidget {
  final SessionModel session;

  const SessionAttendanceScreen({Key? key, required this.session}) : super(key: key);

  @override
  State<SessionAttendanceScreen> createState() => _SessionAttendanceScreenState();
}

class _SessionAttendanceScreenState extends State<SessionAttendanceScreen> {
  List<AttendanceRecordModel> _records = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchRecords();
  }

  Future<void> _fetchRecords() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.get('/attendance/session/${widget.session.id}');
      if (mounted && res['data'] != null) {
        final list = (res['data'] as List)
            .map((item) => AttendanceRecordModel.fromJson(item))
            .toList();
        setState(() {
          _records = list;
          _isLoading = false;
          _errorMessage = null;
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

  Future<void> _editStatus(AttendanceRecordModel record) async {
    String selectedStatus = record.status;
    final reasonController = TextEditingController(text: record.modifiedReason ?? '');

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Điều chỉnh điểm danh: ${record.studentName ?? "Sinh viên"}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('MSSV: ${record.studentCode ?? "N/A"}'),
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
                  labelText: 'Lý do chỉnh sửa (*)',
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
              child: const Text('Cập nhật'),
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
    return Scaffold(
      appBar: AppBar(
        title: Text('Bản ghi: ${widget.session.title}'),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchRecords,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red, size: 48),
                      const SizedBox(height: 8),
                      Text(_errorMessage!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: _fetchRecords,
                        child: const Text('Thử lại'),
                      ),
                    ],
                  ),
                )
              : _records.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.people_outline, size: 64, color: Colors.grey.shade400),
                          const SizedBox(height: 12),
                          Text(
                            'Chưa có bản ghi điểm danh nào trong phiên này',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _records.length,
                      itemBuilder: (context, index) {
                        final record = _records[index];
                        Color badgeColor = Colors.green;
                        String badgeText = 'Có mặt';
                        if (record.status == 'LATE') {
                          badgeColor = Colors.orange;
                          badgeText = 'Đi trễ';
                        } else if (record.status == 'EXCUSED') {
                          badgeColor = Colors.blue;
                          badgeText = 'Có phép';
                        } else if (record.status == 'ABSENT') {
                          badgeColor = Colors.red;
                          badgeText = 'Vắng';
                        }

                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
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
                                  'Giờ điểm danh: ${record.checkInTime.hour.toString().padLeft(2, '0')}:${record.checkInTime.minute.toString().padLeft(2, '0')}:${record.checkInTime.second.toString().padLeft(2, '0')}',
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
                                    style: TextStyle(
                                      color: badgeColor,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.edit, size: 20),
                                  tooltip: 'Chỉnh sửa điểm danh',
                                  onPressed: () => _editStatus(record),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
