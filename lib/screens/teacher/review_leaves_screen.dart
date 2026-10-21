import 'package:flutter/material.dart';
import '../../models/leave_request_model.dart';
import '../../services/api_service.dart';

class ReviewLeavesScreen extends StatefulWidget {
  const ReviewLeavesScreen({Key? key}) : super(key: key);

  @override
  State<ReviewLeavesScreen> createState() => _ReviewLeavesScreenState();
}

class _ReviewLeavesScreenState extends State<ReviewLeavesScreen> {
  List<LeaveRequestModel> _requests = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchRequests();
  }

  Future<void> _fetchRequests() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.get('/leave-requests');
      if (mounted && res['data'] != null) {
        final list = (res['data'] as List)
            .map((item) => LeaveRequestModel.fromJson(item))
            .toList();
        setState(() {
          _requests = list;
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

  Future<void> _reviewRequest(LeaveRequestModel req, String newStatus) async {
    final noteController = TextEditingController();
    final isApproved = newStatus == 'APPROVED';

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isApproved ? 'Duyệt đơn xin nghỉ phép' : 'Từ chối đơn xin nghỉ'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Sinh viên: ${req.studentName ?? "N/A"} (${req.studentCode ?? "N/A"})'),
            const SizedBox(height: 8),
            Text('Lý do: ${req.reason}'),
            const SizedBox(height: 12),
            TextField(
              controller: noteController,
              decoration: const InputDecoration(
                labelText: 'Ghi chú phê duyệt của Giảng viên',
                hintText: 'Nhập ghi chú phản hồi cho sinh viên...',
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
            style: ElevatedButton.styleFrom(
              backgroundColor: isApproved ? Colors.green : Colors.red,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(isApproved ? 'Xác nhận duyệt' : 'Xác nhận từ chối'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await ApiService.patch('/leave-requests/${req.id}/review', {
          'status': newStatus,
          'reviewNotes': noteController.text.trim(),
        });
        _fetchRequests();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(isApproved ? 'Đã duyệt đơn nghỉ phép' : 'Đã từ chối đơn nghỉ phép'),
              backgroundColor: isApproved ? Colors.green : Colors.orange,
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
        title: const Text('Duyệt đơn xin nghỉ phép'),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchRequests,
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
                        onPressed: _fetchRequests,
                        child: const Text('Thử lại'),
                      ),
                    ],
                  ),
                )
              : _requests.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.assignment_turned_in_outlined, size: 64, color: Colors.grey.shade400),
                          const SizedBox(height: 12),
                          Text(
                            'Chưa có đơn xin nghỉ phép nào',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _requests.length,
                      itemBuilder: (context, index) {
                        final req = _requests[index];
                        final isPending = req.status == 'PENDING';
                        final isApproved = req.status == 'APPROVED';
                        Color statusColor = Colors.orange;
                        String statusText = 'Chờ duyệt';
                        if (isApproved) {
                          statusColor = Colors.green;
                          statusText = 'Đã duyệt';
                        } else if (req.status == 'REJECTED') {
                          statusColor = Colors.red;
                          statusText = 'Bị từ chối';
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
                                        req.studentName ?? 'Sinh viên',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                      ),
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
                                        style: TextStyle(
                                          color: statusColor,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'MSSV: ${req.studentCode ?? "N/A"} • Lớp: ${req.className ?? "Lớp học phần"}',
                                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                                ),
                                const Divider(height: 16),
                                Text(
                                  'Thời gian nghỉ: ${req.startDate.day}/${req.startDate.month}/${req.startDate.year} → ${req.endDate.day}/${req.endDate.month}/${req.endDate.year}',
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                ),
                                const SizedBox(height: 4),
                                Text('Lý do: ${req.reason}'),
                                if (req.ocrText != null && req.ocrText!.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: Colors.indigo.shade50,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Colors.indigo.shade200),
                                    ),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Icon(Icons.document_scanner, size: 16, color: Colors.indigo),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Text(
                                            'Văn bản OCR nhận diện: ${req.ocrText}',
                                            style: const TextStyle(fontSize: 12, color: Colors.indigo),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                                if (req.reviewNotes != null && req.reviewNotes!.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    'Ghi chú phê duyệt: ${req.reviewNotes}',
                                    style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic, color: Colors.grey),
                                  ),
                                ],
                                if (isPending) ...[
                                  const SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      OutlinedButton.icon(
                                        icon: const Icon(Icons.close, color: Colors.red, size: 18),
                                        label: const Text('Từ chối', style: TextStyle(color: Colors.red)),
                                        onPressed: () => _reviewRequest(req, 'REJECTED'),
                                      ),
                                      const SizedBox(width: 12),
                                      ElevatedButton.icon(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.green,
                                          foregroundColor: Colors.white,
                                        ),
                                        icon: const Icon(Icons.check, size: 18),
                                        label: const Text('Duyệt đơn'),
                                        onPressed: () => _reviewRequest(req, 'APPROVED'),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
