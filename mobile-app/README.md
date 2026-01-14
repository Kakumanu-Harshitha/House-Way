# Houseway Mobile App

A comprehensive React Native mobile application for Houseway, a house designing company. This app provides role-based dashboards and functionality for clients, employees, vendors, and business owners.

## 🚀 Features

### Role-Based Access Control

- **Client Dashboard**: Project tracking, file uploads, communication with designers
- **Employee Dashboard**: Project management, material requests, progress updates
- **Vendor Dashboard**: Material requests, quotation management, purchase orders
- **Owner Dashboard**: Business analytics, user management, financial overview

### Core Functionality

- **Authentication**: JWT-based secure login/registration
- **Project Management**: Create, track, and manage house design projects
- **Material Requests**: Request and manage construction materials
- **Quotation System**: Vendor quotation submission and approval workflow
- **File Management**: Upload and organize project documents and images
- **Real-time Updates**: Live project status and progress tracking

### Modern UI/UX

- **3D Card Components**: Interactive cards with depth and animations
- **Animated Progress Circles**: Visual progress indicators
- **Gradient Backgrounds**: Beautiful color transitions
- **Responsive Design**: Optimized for all screen sizes

## 🛠 Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation 6
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Storage**: AsyncStorage
- **Testing**: Jest + React Native Testing Library
- **Styling**: StyleSheet with custom components

## 📱 Supported Platforms

- iOS (iPhone/iPad)
- Android
- Web (via Expo Web)

## 🏗 Project Structure

```
mobile-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Card3D.js       # 3D card component
│   │   ├── AnimatedProgressCircle.js
│   │   └── GradientBackground.js
│   ├── screens/            # Screen components
│   │   ├── auth/           # Authentication screens
│   │   ├── client/         # Client-specific screens
│   │   ├── employee/       # Employee-specific screens
│   │   ├── vendor/         # Vendor-specific screens
│   │   ├── owner/          # Owner-specific screens
│   │   ├── projects/       # Project management screens
│   │   ├── materials/      # Material request screens
│   │   ├── quotations/     # Quotation management screens
│   │   └── files/          # File management screens
│   ├── navigation/         # Navigation configuration
│   │   ├── AppNavigator.js
│   │   ├── AuthNavigator.js
│   │   ├── RoleBasedNavigator.js
│   │   └── [Role]Navigator.js
│   ├── context/            # React Context providers
│   │   └── AuthContext.js
│   ├── utils/              # Utility functions
│   │   ├── api.js          # API client configuration
│   │   ├── errorHandler.js # Error handling utilities
│   │   ├── validation.js   # Form validation utilities
│   │   └── animations.js   # Animation utilities
│   └── styles/             # Global styles
├── __tests__/              # Test files
├── assets/                 # Static assets
└── docs/                   # Documentation
```

## 🚀 Getting Started

### Backend URL configuration (important)

The app reads its API + Socket URLs from Expo public env vars:

- `EXPO_PUBLIC_API_URL` (can be `http://<host>:5000` or `http://<host>:5000/api`)
- `EXPO_PUBLIC_SOCKET_URL` (optional; defaults to the same host/port as the API)

If you run on a physical phone, you must point these to your computer's LAN IP.
Use [.env.example](.env.example) as a template.

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd houseway_project/mobile-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Install Expo CLI globally**

   ```bash
   npm install -g @expo/cli
   ```

4. **Start the development server**

   ```bash
   npm start
   # or
   expo start
   ```

5. **Run on specific platforms**

   ```bash
   # iOS Simulator
   npm run ios

   # Android Emulator
   npm run android

   # Web Browser
   npm run web
   ```

### Environment Setup

1. **Backend Configuration**

   - Ensure the backend server is running on `http://localhost:5000`
   - Update the API base URL in `src/utils/api.js` if needed

2. **Platform-specific Setup**
   - **iOS**: Requires Xcode and iOS Simulator
   - **Android**: Requires Android Studio and Android Emulator
   - **Web**: Runs in any modern web browser

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Structure

- **Unit Tests**: Individual component and utility function tests
- **Integration Tests**: Screen and navigation flow tests
- **Snapshot Tests**: UI component rendering tests

### Test Files

- `__tests__/utils/` - Utility function tests
- `__tests__/components/` - Component tests
- `__tests__/screens/` - Screen tests

## 📚 API Integration

### Authentication Endpoints

```javascript
// Login
POST / api / auth / login;
Body: {
  email, password;
}

// Register Client
POST / api / auth / register - client;
Body: {
  firstName, lastName, email, password, phone;
}

// Get Profile
GET / api / auth / profile;
Headers: {
  Authorization: "Bearer <token>";
}
```

### Project Endpoints

```javascript
// Get Projects
GET /api/projects
Query: { client?, assignedTo?, status?, limit? }

// Create Project
POST /api/projects
Body: { title, description, client, budget, timeline, ... }

// Update Project
PUT /api/projects/:id
Body: { status?, progress?, ... }
```

### Material Request Endpoints

```javascript
// Get Material Requests
GET /api/material-requests
Query: { project?, status?, createdBy?, limit? }

// Create Material Request
POST /api/material-requests
Body: { project, description, items, priority, ... }
```

## 🎨 UI Components

### Card3D Component

```jsx
import Card3D from "../components/Card3D";

<Card3D
  colors={["#FF6B6B", "#4ECDC4"]}
  onPress={() => console.log("Pressed")}
  glowEffect={true}
  maxRotation={5}
>
  <Text>Card Content</Text>
</Card3D>;
```

### AnimatedProgressCircle Component

```jsx
import AnimatedProgressCircle from "../components/AnimatedProgressCircle";

<AnimatedProgressCircle
  size={100}
  progress={0.75}
  colors={["#4CAF50", "#45A049"]}
  strokeWidth={8}
  showPercentage={true}
/>;
```

## 🔐 Authentication Flow

1. **User Registration/Login**

   - Users register with role-specific forms
   - JWT tokens stored in AsyncStorage
   - Automatic token refresh handling

2. **Role-Based Navigation**

   - Different navigation stacks for each user role
   - Protected routes based on authentication status
   - Automatic logout on token expiration

3. **Permission Management**
   - Screen-level access control
   - Feature-level permission checks
   - API request authorization headers

## 🎯 User Roles & Permissions

### Client

- View assigned projects
- Upload project files
- Communicate with designers
- Track project progress

### Employee

- Manage assigned projects
- Create material requests
- Update project progress
- Upload site photos and documents

### Vendor

- View approved material requests
- Submit quotations
- Track quotation status
- Manage purchase orders

### Owner

- Access all system data
- Manage users and permissions
- View business analytics
- Financial reporting

## 🚀 Deployment

### Building for Production

```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android

# Build for Web
expo build:web
```

### App Store Deployment

1. **iOS App Store**

   - Build with `expo build:ios`
   - Upload to App Store Connect
   - Submit for review

2. **Google Play Store**

   - Build with `expo build:android`
   - Upload to Google Play Console
   - Submit for review

3. **Web Deployment**
   - Build with `expo build:web`
   - Deploy to hosting service (Netlify, Vercel, etc.)

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler issues**

   ```bash
   npx react-native start --reset-cache
   ```

2. **iOS build issues**

   ```bash
   cd ios && pod install && cd ..
   ```

3. **Android build issues**
   ```bash
   cd android && ./gradlew clean && cd ..
   ```

### Debug Mode

- Enable remote debugging in Expo DevTools
- Use React Native Debugger for advanced debugging
- Check console logs for error messages

## 📄 License

This project is proprietary software owned by Houseway Company. All rights reserved.

## 👥 Contributing

This is a private project. For internal development:

1. Create feature branches from `develop`
2. Follow the established code style
3. Write tests for new features
4. Submit pull requests for review

## 📞 Support

For technical support or questions:

- Internal Team: Contact the development team
- Documentation: Check the `/docs` folder for detailed guides
- Issues: Use the internal issue tracking system
