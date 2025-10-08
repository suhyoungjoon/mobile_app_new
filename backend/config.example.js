// Example configuration file
// Copy this to config.js and modify as needed

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'insighti_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '' // Set your PostgreSQL password here
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'insighti-super-secret-jwt-key-2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '3d'
  },
  
  // File Upload
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: process.env.MAX_FILE_SIZE || 5242880 // 5MB
  },
  
  // SMS Configuration
  sms: {
    serviceId: process.env.SMS_SERVICE_ID || 'your-service-id',
    accessKey: process.env.SMS_ACCESS_KEY || 'your-access-key',
    secretKey: process.env.SMS_SECRET_KEY || 'your-secret-key',
    fromNumber: process.env.SMS_FROM_NUMBER || '01012345678'
  }
};
