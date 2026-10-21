import 'package:flutter_test/flutter_test.dart';
import 'package:appdiemdanh/main.dart';

void main() {
  testWidgets('App launches smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const PrimeAttendanceApp());
    expect(find.byType(PrimeAttendanceApp), findsOneWidget);
  });
}
