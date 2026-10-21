import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../models/class_model.dart';
import '../../services/api_service.dart';
import '../../services/ocr_service.dart';

class LeaveRequestScreen extends StatefulWidget {
  final List<ClassModel> enrolledClasses;

  const LeaveRequestScreen({Key? key, required this.enrolledClasses}) : super(key: key);

  @override
  State<LeaveRequestScreen> createState() => _LeaveRequestScreenState();
}

class _LeaveRequestScreenState extends State<LeaveRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  final _picker = ImagePicker();

  ClassModel? _selectedClass;
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now();

  XFile? _selectedImage;
  String? _ocrExtractedText;
  bool _isOcrProcessing = false;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.enrolledClasses.isNotEmpty) {
      _selectedClass = widget.enrolledClasses.first;
    }
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(source: source, imageQuality: 85);
      if (picked != null) {
        setState(() {
          _selectedImage = picked;
          _ocrExtractedText = null;
        });
        // Auto-run OCR on image
        _runOcr(picked.path);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi chọn ảnh: $e')),
      );
    }
  }

  Future<void> _runOcr(String path) async {
    setState(() => _isOcrProcessing = true);
    try {
      final text = await OcrService.recognizeTextFromImage(path);
      if (mounted) {
        setState(() {
          _ocrExtractedText = text.trim();
          _isOcrProcessing = false;
        });

        if (text.trim().isNotEmpty) {
          // Pre-fill reason if currently empty, or prompt user
          if (_reasonController.text.trim().isEmpty) {
            _reasonController.text = text.trim();
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Đã nhận diện văn bản từ ảnh và tự động điền vào ô lý do.'),
                backgroundColor: Colors.green,
              ),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isOcrProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi OCR: ${e.toString().replaceAll("Exception: ", "")}')),
        );
      }
    }
  }

  Future<void> _submitRequest() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedClass == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn lớp học phần cần xin nghỉ')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final fields = {
        'classId': _selectedClass!.id,
        'reason': _reasonController.text.trim(),
        'startDate': _startDate.toIso8601String(),
        'endDate': _endDate.toIso8601String(),
        if (_ocrExtractedText != null && _ocrExtractedText!.isNotEmpty)
          'ocrText': _ocrExtractedText!,
      };

      if (_selectedImage != null) {
        await ApiService.postMultipart(
          '/leave-requests',
          fields,
          filePath: _selectedImage!.path,
          fileFieldName: 'attachment',
        );
      } else {
        await ApiService.post('/leave-requests', fields);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Gửi đơn xin nghỉ phép thành công!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString().replaceAll("Exception: ", "")}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tạo đơn xin nghỉ phép'),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
      ),
      body: widget.enrolledClasses.isEmpty
          ? const Center(child: Text('Bạn chưa đăng ký lớp học phần nào để xin nghỉ.'))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Class Selection
                    DropdownButtonFormField<ClassModel>(
                      value: _selectedClass,
                      decoration: const InputDecoration(
                        labelText: 'Chọn lớp học phần (*)',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.school),
                      ),
                      items: widget.enrolledClasses.map((c) {
                        return DropdownMenuItem(
                          value: c,
                          child: Text('${c.code} - ${c.name}'),
                        );
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedClass = val),
                    ),
                    const SizedBox(height: 16),

                    // Date Pickers
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: _startDate,
                                firstDate: DateTime.now().subtract(const Duration(days: 30)),
                                lastDate: DateTime.now().add(const Duration(days: 60)),
                              );
                              if (picked != null) {
                                setState(() {
                                  _startDate = picked;
                                  if (_endDate.isBefore(picked)) {
                                    _endDate = picked;
                                  }
                                });
                              }
                            },
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: 'Từ ngày',
                                border: OutlineInputBorder(),
                                prefixIcon: Icon(Icons.calendar_today),
                              ),
                              child: Text(
                                '${_startDate.day}/${_startDate.month}/${_startDate.year}',
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: _endDate,
                                firstDate: _startDate,
                                lastDate: DateTime.now().add(const Duration(days: 60)),
                              );
                              if (picked != null) {
                                setState(() => _endDate = picked);
                              }
                            },
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: 'Đến ngày',
                                border: OutlineInputBorder(),
                                prefixIcon: Icon(Icons.calendar_month),
                              ),
                              child: Text(
                                '${_endDate.day}/${_endDate.month}/${_endDate.year}',
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // OCR Document Scanner Card
                    Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      color: Colors.indigo.shade50,
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: const [
                                Icon(Icons.document_scanner, color: Color(0xFF1E3A8A)),
                                SizedBox(width: 8),
                                Text(
                                  'Chức năng OCR: Đính kèm minh chứng',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF1E3A8A),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Chụp hoặc tải ảnh giấy khám bệnh/giấy xác nhận. Google ML Kit sẽ tự động nhận diện chữ để gợi ý điền lý do.',
                              style: TextStyle(fontSize: 12, color: Colors.black87),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF1E3A8A),
                                    foregroundColor: Colors.white,
                                  ),
                                  icon: const Icon(Icons.photo_library, size: 18),
                                  label: const Text('Chọn ảnh'),
                                  onPressed: () => _pickImage(ImageSource.gallery),
                                ),
                                const SizedBox(width: 8),
                                OutlinedButton.icon(
                                  icon: const Icon(Icons.camera_alt, size: 18),
                                  label: const Text('Chụp ảnh'),
                                  onPressed: () => _pickImage(ImageSource.camera),
                                ),
                              ],
                            ),

                            if (_isOcrProcessing) ...[
                              const SizedBox(height: 12),
                              Row(
                                children: const [
                                  SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  ),
                                  SizedBox(width: 8),
                                  Text('Đang quét chữ từ tài liệu bằng Google ML Kit...'),
                                ],
                              ),
                            ],

                            if (_selectedImage != null) ...[
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Image.file(
                                      File(_selectedImage!.path),
                                      width: 60,
                                      height: 60,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _selectedImage!.name,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        if (_ocrExtractedText != null && _ocrExtractedText!.isNotEmpty)
                                          Text(
                                            'Đã nhận diện: ${_ocrExtractedText!.length} ký tự',
                                            style: const TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold),
                                          ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close, color: Colors.red),
                                    onPressed: () => setState(() {
                                      _selectedImage = null;
                                      _ocrExtractedText = null;
                                    }),
                                  ),
                                ],
                              ),
                            ],

                            if (_ocrExtractedText != null && _ocrExtractedText!.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.grey.shade300),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        const Text(
                                          'Kết quả nhận diện OCR:',
                                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                        ),
                                        TextButton(
                                          onPressed: () {
                                            _reasonController.text = _ocrExtractedText!;
                                          },
                                          child: const Text('Chép vào ô lý do', style: TextStyle(fontSize: 12)),
                                        ),
                                      ],
                                    ),
                                    Text(
                                      _ocrExtractedText!,
                                      style: TextStyle(fontSize: 12, color: Colors.grey.shade800),
                                      maxLines: 4,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Reason Field
                    TextFormField(
                      controller: _reasonController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Lý do xin nghỉ phép (*)',
                        hintText: 'Nhập chi tiết lý do hoặc dùng nội dung OCR nhận diện được ở trên...',
                        border: OutlineInputBorder(),
                        alignLabelWithHint: true,
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return 'Vui lòng nhập lý do xin nghỉ';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E3A8A),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: _isSubmitting ? null : _submitRequest,
                        child: _isSubmitting
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text('GỬI ĐƠN XIN NGHỈ', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
