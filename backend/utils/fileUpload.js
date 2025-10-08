// File upload utilities
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class FileUploadService {
  constructor() {
    this.uploadDir = config.upload.dir;
    this.thumbDir = path.join(this.uploadDir, 'thumbs');
    this.ensureDirectories();
  }

  ensureDirectories() {
    // Create upload directories if they don't exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.thumbDir)) {
      fs.mkdirSync(this.thumbDir, { recursive: true });
    }
  }

  generateFileName(originalName) {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const uuid = uuidv4();
    return `${baseName}-${uuid}${ext}`;
  }

  async processImage(filePath, options = {}) {
    const {
      width = 1200,
      height = 1200,
      quality = 80,
      format = 'jpeg'
    } = options;

    try {
      const processedBuffer = await sharp(filePath)
        .resize(width, height, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality })
        .toBuffer();

      return processedBuffer;
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error('Failed to process image');
    }
  }

  async generateThumbnail(filePath, size = 200) {
    try {
      const thumbnailBuffer = await sharp(filePath)
        .resize(size, size, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 70 })
        .toBuffer();

      return thumbnailBuffer;
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  async saveFile(buffer, fileName) {
    const filePath = path.join(this.uploadDir, fileName);
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  }

  async saveThumbnail(buffer, fileName) {
    const thumbPath = path.join(this.thumbDir, `thumb-${fileName}`);
    await fs.promises.writeFile(thumbPath, buffer);
    return thumbPath;
  }

  getFileUrl(fileName) {
    return `/uploads/${fileName}`;
  }

  getThumbnailUrl(fileName) {
    return `/uploads/thumbs/thumb-${fileName}`;
  }

  async deleteFile(fileName) {
    try {
      const filePath = path.join(this.uploadDir, fileName);
      const thumbPath = path.join(this.thumbDir, `thumb-${fileName}`);
      
      // Delete original file
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      
      // Delete thumbnail
      if (fs.existsSync(thumbPath)) {
        await fs.promises.unlink(thumbPath);
      }
      
      return true;
    } catch (error) {
      console.error('File deletion error:', error);
      return false;
    }
  }

  validateFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = config.upload.maxFileSize; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    }

    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB.`);
    }

    return true;
  }
}

module.exports = new FileUploadService();
