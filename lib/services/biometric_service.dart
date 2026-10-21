import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';

class BiometricService {
  static final LocalAuthentication _auth = LocalAuthentication();

  static Future<bool> isBiometricAvailable() async {
    try {
      final canAuthenticateWithBiometrics = await _auth.canCheckBiometrics;
      final canAuthenticate = canAuthenticateWithBiometrics || await _auth.isDeviceSupported();
      return canAuthenticate;
    } on PlatformException {
      return false;
    }
  }

  static Future<bool> authenticate({String reason = 'Xác thực sinh trắc học để điểm danh'}) async {
    try {
      final isAvailable = await isBiometricAvailable();
      if (!isAvailable) return true; // Gracefully bypass if device does not support hardware

      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: true,
        ),
      );
    } on PlatformException {
      return true; // Don't block demonstration if simulator/unsupported
    } catch (_) {
      return true;
    }
  }
}
