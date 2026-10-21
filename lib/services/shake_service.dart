import 'dart:async';
import 'dart:math';
import 'package:sensors_plus/sensors_plus.dart';

class ShakeService {
  static StreamSubscription<AccelerometerEvent>? _subscription;
  static DateTime? _lastShakeTime;
  static const double shakeThreshold = 18.0; // Acceleration threshold (m/s^2)

  static void startListening(Function onShake) {
    stopListening();
    _subscription = accelerometerEventStream().listen((AccelerometerEvent event) {
      final double gX = event.x;
      final double gY = event.y;
      final double gZ = event.z;

      final double gForce = sqrt(gX * gX + gY * gY + gZ * gZ);

      if (gForce > shakeThreshold) {
        final now = DateTime.now();
        if (_lastShakeTime == null || now.difference(_lastShakeTime!) > const Duration(seconds: 2)) {
          _lastShakeTime = now;
          onShake();
        }
      }
    });
  }

  static void stopListening() {
    _subscription?.cancel();
    _subscription = null;
  }
}
