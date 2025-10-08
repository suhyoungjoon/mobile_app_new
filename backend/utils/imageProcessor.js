// Image processing utilities
const sharp = require('sharp');
const path = require('path');

class ImageProcessor {
  constructor() {
    this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
    this.defaultQuality = 85;
    this.maxWidth = 1200;
    this.maxHeight = 1200;
    this.thumbnailSize = 200;
  }

  async processImage(inputBuffer, options = {}) {
    const {
      width = this.maxWidth,
      height = this.maxHeight,
      quality = this.defaultQuality,
      format = 'jpeg'
    } = options;

    try {
      const processor = sharp(inputBuffer);
      
      // Get image metadata
      const metadata = await processor.metadata();
      
      // Resize if needed
      if (metadata.width > width || metadata.height > height) {
        processor.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert to specified format
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          return await processor.jpeg({ quality }).toBuffer();
        case 'png':
          return await processor.png({ quality }).toBuffer();
        case 'webp':
          return await processor.webp({ quality }).toBuffer();
        default:
          return await processor.jpeg({ quality }).toBuffer();
      }
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  async generateThumbnail(inputBuffer, size = this.thumbnailSize) {
    try {
      return await sharp(inputBuffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 70 })
        .toBuffer();
    } catch (error) {
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  async getImageMetadata(inputBuffer) {
    try {
      const metadata = await sharp(inputBuffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: inputBuffer.length,
        hasAlpha: metadata.hasAlpha,
        density: metadata.density
      };
    } catch (error) {
      throw new Error(`Metadata extraction failed: ${error.message}`);
    }
  }

  async validateImage(inputBuffer) {
    try {
      const metadata = await this.getImageMetadata(inputBuffer);
      
      // Check format
      if (!this.supportedFormats.includes(metadata.format)) {
        throw new Error(`Unsupported image format: ${metadata.format}`);
      }

      // Check dimensions
      if (metadata.width < 10 || metadata.height < 10) {
        throw new Error('Image dimensions too small');
      }

      if (metadata.width > 10000 || metadata.height > 10000) {
        throw new Error('Image dimensions too large');
      }

      return true;
    } catch (error) {
      throw new Error(`Image validation failed: ${error.message}`);
    }
  }

  async createWatermark(inputBuffer, watermarkText = 'InsightI') {
    try {
      // Create watermark
      const watermarkSvg = `
        <svg width="200" height="50">
          <text x="10" y="30" font-family="Arial" font-size="16" fill="rgba(255,255,255,0.7)">
            ${watermarkText}
          </text>
        </svg>
      `;

      const watermarkBuffer = Buffer.from(watermarkSvg);

      return await sharp(inputBuffer)
        .composite([{
          input: watermarkBuffer,
          gravity: 'southeast',
          blend: 'over'
        }])
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (error) {
      throw new Error(`Watermark creation failed: ${error.message}`);
    }
  }
}

module.exports = new ImageProcessor();
