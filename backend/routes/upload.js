// Enhanced file upload routes
const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const fileUploadService = require('../utils/fileUpload');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store in memory for processing

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get upload URL (for future use with cloud storage)
router.post('/url', authenticateToken, (req, res) => {
  try {
    const { type } = req.body;
    
    if (!type || !['near', 'far'].includes(type)) {
      return res.status(400).json({ error: 'Invalid photo type' });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    res.json({
      url: `/api/upload/photo`,
      expires_at: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Upload URL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload and process photo
router.post('/photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file
    fileUploadService.validateFile(req.file);

    // Generate unique filename
    const fileName = fileUploadService.generateFileName(req.file.originalname);
    
    // Process image (resize, optimize)
    const processedBuffer = await fileUploadService.processImage(req.file.buffer, {
      width: 1200,
      height: 1200,
      quality: 85
    });

    // Generate thumbnail
    const thumbnailBuffer = await fileUploadService.generateThumbnail(req.file.buffer, 200);

    // Save files
    await fileUploadService.saveFile(processedBuffer, fileName);
    await fileUploadService.saveThumbnail(thumbnailBuffer, fileName);

    // Return file information
    res.json({
      key: fileName,
      url: fileUploadService.getFileUrl(fileName),
      thumbnail_url: fileUploadService.getThumbnailUrl(fileName),
      size: processedBuffer.length,
      original_size: req.file.size,
      mimetype: 'image/jpeg'
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete photo
router.delete('/photo/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const success = await fileUploadService.deleteFile(filename);
    
    if (success) {
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }

  } catch (error) {
    console.error('Photo deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get photo info
router.get('/photo/:filename', authenticateToken, (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const fileUrl = fileUploadService.getFileUrl(filename);
    const thumbnailUrl = fileUploadService.getThumbnailUrl(filename);

    res.json({
      filename,
      url: fileUrl,
      thumbnail_url: thumbnailUrl
    });

  } catch (error) {
    console.error('Photo info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
