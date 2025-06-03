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
- MongoDB Atlas account (recommended) or local MongoDB
- Expo CLI
- iOS Simulator or Android Emulator (or Expo Go app)

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

3. Create a `.env` file in the backend directory:
   ```
   PORT=3001
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_secure_jwt_secret_key
   NODE_ENV=development
   ```
   
   **Note:** Port 3001 is used instead of 5000 to avoid conflicts with macOS AirPlay service.

4. Start the server:
   ```bash
   npm start
   ```

   **Expected output:**
   ```
   Server running on port 3001
   MongoDB connected
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

3. Start the Expo development server:
   ```bash
   npx expo start
   ```

4. Use Expo Go app to scan QR code or press 'i' for iOS simulator

## Testing

### Backend API Testing

#### Prerequisites for Testing
- Backend server running on port 3001
- MongoDB Atlas connected
- Use Thunder Client (VS Code) or cURL for API testing

#### Test Scenarios

**1. User Registration**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "salesuser1",
    "password": "password123",
    "department": "Sales",
    "role": "sales"
  }'
```
**Expected:** 201 status with user data and JWT token

**2. User Login**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "salesuser1",
    "password": "password123"
  }'
```
**Expected:** 200 status with JWT token

**3. Get Current User (Protected Route)**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/auth/me
```
**Expected:** User profile data

**4. Create Project (Sales Department Only)**
```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SALES_TOKEN" \
  -d '{
    "projectName": "Test Manufacturing Project",
    "estimatedCompletionDate": "2024-12-31",
    "amount": 50000
  }'
```
**Expected:** New project with `currentStage: "DNE"`

**5. Get All Projects**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/projects
```
**Expected:** Array of projects

**6. DNE Stage Update (DNE Department Only)**
```bash
# First create DNE user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dneuser1",
    "password": "password123",
    "department": "DNE",
    "role": "designer"
  }'

# Then update project stage
curl -X POST http://localhost:3001/api/projects/PROJECT_ID/dne-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DNE_TOKEN" \
  -d '{"status": "partial_completed"}'
```

#### Thunder Client Testing Setup

1. **Create Environment:**
   ```json
   {
     "baseUrl": "http://localhost:3001/api",
     "token": ""
   }
   ```

2. **Test Collection:**
   - Register User: `POST {{baseUrl}}/auth/register`
   - Login User: `POST {{baseUrl}}/auth/login`
   - Get Profile: `GET {{baseUrl}}/auth/me`
   - Create Project: `POST {{baseUrl}}/projects`
   - Get Projects: `GET {{baseUrl}}/projects`

### Mobile App Testing

#### Test Scenarios

**1. Authentication Flow**
- [ ] Registration screen accepts valid input
- [ ] Login screen authenticates users
- [ ] Invalid credentials show error messages
- [ ] Successful login navigates to home screen

**2. Home Screen**
- [ ] All 6 buttons are visible and styled correctly:
  - Sales ✅
  - DNE ✅
  - Production ✅
  - Installation ✅
  - Master Tracker ✅
  - Complain ✅
- [ ] Navigation to each screen works

**3. Sales Screen**
- [ ] "Submit New Project" tab loads form
- [ ] Form validation works (required fields)
- [ ] Project submission succeeds
- [ ] "Project History" tab shows submitted projects
- [ ] Success/error messages display properly

**4. DNE Screen**
- [ ] "WIP Projects" tab shows projects in DNE stage
- [ ] Project status can be updated to "Partial Complete"/"Complete"
- [ ] "History" tab shows completed projects
- [ ] Status updates reflect in database

**5. API Integration**
- [ ] Mobile app connects to backend successfully
- [ ] Authentication tokens are stored and used
- [ ] API calls handle success/error responses
- [ ] Loading states display during API calls

### Tested User Roles

| Role | Department | Permissions |
|------|------------|-------------|
| sales | Sales | Create projects, view projects |
| designer | DNE | Update DNE stage, view projects |
| production_manager | Production | Manage production milestones |
| production_worker | Installation | Update installation status |
| admin | Management | Full access to all features |
| viewer | Any | Read-only access |

### Testing Checklist

#### Backend Tests ✅
- [x] Server starts on port 3001
- [x] MongoDB Atlas connection successful
- [x] User registration works for all departments
- [x] JWT authentication functional
- [x] Role-based access control enforced
- [x] Project creation (Sales users only)
- [x] Project stage updates (Department-specific)
- [x] Error handling for invalid requests
- [x] CORS configuration working

#### Mobile Tests ✅
- [x] Expo development server starts
- [x] App loads without crashes
- [x] API integration with backend
- [x] Authentication flow complete
- [x] Navigation between screens
- [x] Form submissions working

### Common Issues & Solutions

**Backend Issues:**
```bash
# Port conflict with macOS AirPlay (port 5000)
# Solution: Use port 3001 in .env file

# MongoDB connection fails
# Solution: Check MONGODB_URI in .env file

# 403 Forbidden errors
# Solution: Ensure correct user role/department for endpoint
```

**Mobile Issues:**
```bash
# Metro bundler issues
npx expo start --clear

# API connection fails
# Solution: Update mobile/src/services/api.js with correct backend URL
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login  
- `GET /api/auth/me` - Get current user (protected)

### Projects
- `GET /api/projects` - Get all projects (protected)
- `POST /api/projects` - Create new project (Sales only)
- `PUT /api/projects/:id` - Update project (protected)
- `POST /api/projects/:id/dne-update` - Update DNE stage (DNE only)
- `POST /api/projects/:id/production-update` - Update production (Production only)
- `DELETE /api/projects/:id` - Delete project (admin/creator only)

### Milestones
- `GET /api/milestones/project/:projectId` - Get project milestones
- `POST /api/milestones` - Create milestone (Production only)
- `PUT /api/milestones/:id` - Update milestone
- `POST /api/milestones/:id/photos` - Add milestone photos

### Complaints
- `GET /api/complaints` - Get all complaints (protected)
- `POST /api/complaints` - Create new complaint (protected)
- `PUT /api/complaints/:id` - Update complaint (protected)
- `DELETE /api/complaints/:id` - Delete complaint (admin/creator only)

### File Uploads
- `POST /api/uploads/single` - Upload single file (protected)
- `POST /api/uploads/multiple` - Upload multiple files (protected)

## Production Deployment

### Backend Deployment
1. Set environment variables on hosting platform
2. Use MongoDB Atlas for database
3. Configure HTTPS
4. Set secure JWT_SECRET

### Mobile Deployment
1. Use `expo build` for production builds
2. Update API_URL to production backend
3. Deploy to App Store/Google Play

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details 