# UTS Oculus Mobile App

A React Native mobile application for UTS students and staff to access university services, view schedules, and manage their digital student identity.

## Features

- User Authentication with UTS credentials
- Profile Management
- Class Schedule Viewing
- Virtual Student ID with QR Code
- Campus Announcements and Notifications
- Admin Dashboard for Content Management

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Firebase account and project

## Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/uts-oculus-mobile.git
cd uts-oculus-mobile
```

2. Install dependencies:
```bash
npm install
```

3. Create a Firebase project and enable the following services:
   - Authentication
   - Firestore
   - Storage

4. Create a `.env` file in the root directory with your Firebase configuration:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

## Running the App

1. Start the development server:
```bash
npm start
```

2. Run on iOS simulator:
```bash
npm run ios
```

3. Run on Android emulator:
```bash
npm run android
```

## Project Structure

```
uts-oculus-mobile/
├── app/                    # Main app screens and navigation
│   ├── (tabs)/            # Tab navigation screens
│   └── auth/              # Authentication screens
├── src/                   # Source code
│   ├── components/        # Reusable components
│   ├── config/           # Configuration files
│   ├── constants/        # Constants and theme
│   └── hooks/            # Custom React hooks
├── assets/               # Static assets
└── components/           # Shared components
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

- All sensitive data is stored securely in Firebase
- User authentication is handled through Firebase Auth
- Student data is encrypted and protected
- QR codes are generated securely for student ID verification

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact the UTS IT Support team or create an issue in the repository.
