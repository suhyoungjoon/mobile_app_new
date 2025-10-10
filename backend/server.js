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
const aiLearningRoutes = require('./routes/ai-learning');
const azureAIRoutes = require('./routes/azure-ai'); // NEW: Azure OpenAI
const uploadRoutes = require('./routes/upload');
const reportsRoutes = require('./routes/reports');
const smsRoutes = require('./routes/sms');

const app = express();

// CORS configuration - must be before helmet
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000', 
      'http://127.0.0.1:3000', 
      'http://localhost:8080', 
      'http://127.0.0.1:8080',
      'file://'
    ];
    
    // Allow all Vercel deployment URLs
    const isVercelApp = origin && origin.includes('.vercel.app');
    
    if (!origin || allowedOrigins.includes(origin) || isVercelApp) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));

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
app.use('/api/ai-learning', aiLearningRoutes);
app.use('/api/azure-ai', azureAIRoutes); // NEW: Azure OpenAI
app.use('/api/upload', uploadRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sms', smsRoutes);

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
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      cases: '/api/cases',
      defects: '/api/defects',
      defectCategories: '/api/defect-categories',
      aiLearning: '/api/ai-learning',
      upload: '/api/upload',
      reports: '/api/reports',
      sms: '/api/sms'
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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;
