// Simple configuration management
module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'insighti_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'insighti123'
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    expiresIn: process.env.JWT_EXPIRES_IN || '3d'
  },
  
  // File Upload
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: process.env.MAX_FILE_SIZE || 5242880 // 5MB
  },

  // Azure OpenAI
  azureOpenAI: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
  },

  // SMS (Twilio)
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER
  },

  // VAPID Keys for Push Notifications
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,

  // YouTube Data API v3
  youtubeApiKey: process.env.YOUTUBE_API_KEY
};
