import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiService {
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  static Future<Map<String, String>> _getHeaders({bool isMultipart = false}) async {
    final token = await getToken();
    final headers = <String, String>{
      'Bypass-Tunnel-Reminder': 'true', // Required for localtunnel HTTPS URLs
    };

    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  static Future<dynamic> get(String endpoint) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
      final headers = await _getHeaders();
      final response = await http.get(url, headers: headers).timeout(
        const Duration(seconds: 15),
      );
      return _processResponse(response);
    } catch (e) {
      throw Exception('Lỗi kết nối mạng: $e');
    }
  }

  static Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
      final headers = await _getHeaders();
      final response = await http
          .post(url, headers: headers, body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
      return _processResponse(response);
    } catch (e) {
      throw Exception('Lỗi kết nối mạng: $e');
    }
  }

  static Future<dynamic> put(String endpoint, Map<String, dynamic> body) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
      final headers = await _getHeaders();
      final response = await http
          .put(url, headers: headers, body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
      return _processResponse(response);
    } catch (e) {
      throw Exception('Lỗi kết nối mạng: $e');
    }
  }

  static Future<dynamic> patch(String endpoint, Map<String, dynamic> body) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
      final headers = await _getHeaders();
      final response = await http
          .patch(url, headers: headers, body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
      return _processResponse(response);
    } catch (e) {
      throw Exception('Lỗi kết nối mạng: $e');
    }
  }

  static Future<dynamic> delete(String endpoint) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
      final headers = await _getHeaders();
      final response = await http.delete(url, headers: headers).timeout(
        const Duration(seconds: 15),
      );
      return _processResponse(response);
    } catch (e) {
      throw Exception('Lỗi kết nối mạng: $e');
    }
  }

  static Future<dynamic> postMultipart(
    String endpoint,
    Map<String, String> fields, {
    String? filePath,
    String fileFieldName = 'attachment',
  }) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
      final token = await getToken();
      final request = http.MultipartRequest('POST', url);

      request.headers['Bypass-Tunnel-Reminder'] = 'true';
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      fields.forEach((key, value) {
        request.fields[key] = value;
      });

      if (filePath != null && filePath.isNotEmpty) {
        request.files.add(await http.MultipartFile.fromPath(fileFieldName, filePath));
      }

      final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
      final response = await http.Response.fromStream(streamedResponse);
      return _processResponse(response);
    } catch (e) {
      throw Exception('Lỗi gửi dữ liệu tệp: $e');
    }
  }

  static dynamic _processResponse(http.Response response) {
    dynamic json;
    try {
      json = jsonDecode(utf8.decode(response.bodyBytes));
    } catch (e) {
      throw Exception('Định dạng phản hồi không hợp lệ (${response.statusCode})');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json;
    } else {
      final message = json is Map && json['message'] != null
          ? json['message']
          : 'Yêu cầu thất bại với mã lỗi ${response.statusCode}';
      throw Exception(message);
    }
  }
}
