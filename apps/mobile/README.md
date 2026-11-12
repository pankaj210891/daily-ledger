# Daily Ledger Mobile

Native iOS and Android app built with Expo and React Native. It uses the existing Daily Ledger API and MongoDB data.

## Run on iPhone

1. Install Expo Go from the App Store.
2. Copy .env.example to .env and set EXPO_PUBLIC_API_URL to the API host's LAN address, for example http://192.168.1.42:4000/api/v1.
3. Keep the iPhone and the development computer on the same Wi-Fi network. Make sure the API is running and reachable on port 4000.
4. From the repository root run npm run dev:mobile, then scan the QR code with the iPhone Camera or Expo Go.

For production, set EXPO_PUBLIC_API_URL to the public HTTPS API URL before building.

## Current native screens

- Email/password sign in, account creation, and password reset request.
- Overview with scheduled product charges, outstanding estimate, scheduled item count, calculated salary, and manual ledger totals.
- Scheduled deliveries with delivery-part recording.
- Monthly product bills.
- Staff directory, staff creation, and present/absent recording.
- Salary estimates based on the existing attendance and leave policies.
- Product/rate listing and manual household expense creation.

The refresh credential is stored with Expo SecureStore and rotated through the mobile auth endpoints. Access tokens remain in memory.
