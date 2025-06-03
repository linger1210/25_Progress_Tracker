const fs = require('fs');
const path = require('path');

const envContent = `PORT=5000
MONGODB_URI=mongodb://localhost:27017/progress-tracker
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production`;

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log('⚠️  Please update the JWT_SECRET before deploying to production.');
} else {
  console.log('ℹ️  .env file already exists.');
}

// Create uploads directory if it doesn't exist
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath);
  console.log('✅ uploads directory created successfully!');
} 