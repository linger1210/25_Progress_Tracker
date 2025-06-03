# Progress Tracking System

A mobile application for tracking progress in a metal manufacturing company. The system includes both a mobile app (React Native + Expo) and a backend server (Node.js + Express + MongoDB).

## Features

- Authentication system with login/register functionality
- Role-based access control
- Department-specific views and permissions
- Project lifecycle management through different stages:
  - Sales
  - DNE (Design)
  - Production
  - Installation
- Master Tracker for overall project monitoring
- Complaint management system
- File upload capabilities for project documentation

## Project Structure

```
.
├── backend/           # Node.js + Express backend
│   ├── models/       # MongoDB models
│   ├── routes/       # API routes
│   ├── middleware/   # Custom middleware
│   ├── uploads/      # File upload directory
│   └── server.js     # Main server file
│
└── mobile/           # React Native + Expo mobile app
    ├── src/
    │   ├── components/  # Reusable components
    │   ├── screens/     # Screen components
    │   ├── services/    # API services
    │   └── context/     # React Context
    └── App.js          # Root component
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Expo CLI
- iOS Simulator or Android Emulator

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   ```

4. Start the server:
   ```bash
   npm start
   ```

### Mobile App Setup

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update the API configuration in `src/services/api.js` with your backend URL

4. Start the Expo development server:
   ```bash
   npx expo start
   ```

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - User login
- GET /api/auth/me - Get current user

### Projects
- GET /api/projects - Get all projects
- POST /api/projects - Create new project
- PUT /api/projects/:id - Update project
- DELETE /api/projects/:id - Delete project

### Complaints
- GET /api/complaints - Get all complaints
- POST /api/complaints - Create new complaint
- PUT /api/complaints/:id - Update complaint
- DELETE /api/complaints/:id - Delete complaint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details 