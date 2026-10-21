import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  // Default to localhost, with option to switch to public URL or custom IP in Settings
  static const String defaultLocalUrl = 'http://10.0.2.2:5000/api'; // Android emulator localhost alias
  static const String defaultWebUrl = 'http://localhost:5000/api';
  static const String defaultPublicUrl = 'https://reuters-julie-connectivity-incomplete.trycloudflare.com/api';

  static String baseUrl = defaultPublicUrl;

  static Future<void> loadBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('custom_api_url');
    if (saved != null && saved.isNotEmpty) {
      baseUrl = saved;
    } else {
      baseUrl = defaultPublicUrl;
    }
  }

  static Future<void> setBaseUrl(String newUrl) async {
    baseUrl = newUrl;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('custom_api_url', newUrl);
  }
}
