// Main server file
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');

// Import routes
const authRoutes = require('./routes/auth');
const casesRoutes = require('./routes/cases');
const defectsRoutes = require('./routes/defects');
const defectCategoriesRoutes = require('./routes/defect-categories');
const inspectionsRoutes = require('./routes/inspections'); // NEW: Equipment inspections
const inspectorRegistrationRoutes = require('./routes/inspector-registration'); // NEW: Inspector registration
const pushNotificationRoutes = require('./routes/push-notifications'); // NEW: Push notifications
const youtubeSearchRoutes = require('./routes/youtube-search'); // NEW: YouTube 실시간 검색
const aiLearningRoutes = require('./routes/ai-learning');
const azureAIRoutes = require('./routes/azure-ai'); // NEW: Azure OpenAI
const uploadRoutes = require('./routes/upload');
const reportsRoutes = require('./routes/reports');
const smsRoutes = require('./routes/sms');
const adminRoutes = require('./routes/admin'); // NEW: Admin functions

const app = express();

// CORS configuration - must be before helmet
const corsOptions = {
  origin: (origin, callback) => {
    // 허용할 Origin 목록
    const allowedOrigins = [
      'http://localhost:3000', 
      'http://127.0.0.1:3000', 
      'http://localhost:8080', 
      'http://127.0.0.1:8080',
      'https://insighti.vercel.app',
      'https://*.vercel.app'
    ];
    
    // Vercel 도메인 체크
    const isVercelApp = origin && (
      origin.includes('.vercel.app') || 
      origin.includes('insighti.vercel.app')
    );
    
    // 개발 환경에서는 모든 origin 허용
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    
    // Origin이 없거나 (같은 도메인 요청, Postman 등) 허용된 origin인 경우
    if (!origin || allowedOrigins.some(allowed => origin.includes(allowed.replace('*.', ''))) || isVercelApp) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// OPTIONS 요청 명시적 처리 (CORS preflight) - 모든 경로에 대해
app.options('*', cors(corsOptions));

// HTTPS 강제 리다이렉트 (프로덕션 환경)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // X-Forwarded-Proto 헤더 확인 (Vercel, Render 등 프록시 환경)
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
  
  // HSTS 헤더 설정 (선택)
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (for uploaded images and reports)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/thumbs', express.static(path.join(__dirname, 'uploads', 'thumbs')));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/defects', defectsRoutes);
app.use('/api/defect-categories', defectCategoriesRoutes);
app.use('/api/inspections', inspectionsRoutes); // NEW: Equipment inspections
app.use('/api/inspector-registration', inspectorRegistrationRoutes); // NEW: Inspector registration
app.use('/api/push', pushNotificationRoutes); // NEW: Push notifications
app.use('/api/youtube', youtubeSearchRoutes); // NEW: YouTube 실시간 검색
app.use('/api/ai-learning', aiLearningRoutes);
app.use('/api/azure-ai', azureAIRoutes); // NEW: Azure OpenAI
app.use('/api/upload', uploadRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/admin', adminRoutes); // NEW: Admin functions

// Root endpoint (for Render health checks)
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'InsightI API Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'InsightI Pre/Post Inspection API',
    version: '2.5.0', // Updated version for YouTube integration
    endpoints: {
      auth: '/api/auth',
      cases: '/api/cases',
      defects: '/api/defects',
      defectCategories: '/api/defect-categories',
      inspections: '/api/inspections', // NEW: Equipment inspections
      inspectorRegistration: '/api/inspector-registration', // NEW: Inspector registration
      pushNotifications: '/api/push', // NEW: Push notifications
      youtubeSearch: '/api/youtube', // NEW: YouTube 실시간 검색
      aiLearning: '/api/ai-learning',
      azureAI: '/api/azure-ai',
      upload: '/api/upload',
      reports: '/api/reports',
      sms: '/api/sms',
      admin: '/api/admin'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = config.port;

// Start server with error handling
try {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`✅ Server is ready to accept connections`);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
