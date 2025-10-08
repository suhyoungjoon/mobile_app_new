// API client for backend integration
class APIClient {
  constructor() {
    this.baseURL = 'http://localhost:3000/api';
    this.token = localStorage.getItem('insighti_token');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    localStorage.setItem('insighti_token', token);
  }

  // Clear authentication token
  clearToken() {
    this.token = null;
    localStorage.removeItem('insighti_token');
  }

  // Make HTTP request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add authorization header if token exists
    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    const timeoutMs = options.timeoutMs || 15000;
    const retries = options.retries ?? 2;

    const doFetch = async (attempt) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(url, { ...config, signal: controller.signal });
        clearTimeout(id);
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          const err = new Error(`HTTP ${resp.status}: ${text}`);
          err.status = resp.status;
          throw err;
        }
        return await resp.json();
      } catch (err) {
        clearTimeout(id);
        const isRetryable = (!err.status || err.status >= 500) && attempt < retries;
        if (isRetryable) {
          const backoff = 500 * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, backoff));
          return doFetch(attempt + 1);
        }
        throw err;
      }
    };

    return doFetch(0);
  }

  // Authentication
  async login(loginData) {
    const response = await this.request('/auth/session', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });
    
    this.setToken(response.token);
    return response;
  }

  // Cases
  async getCases() {
    return await this.request('/cases');
  }

  async createCase(caseData) {
    return await this.request('/cases', {
      method: 'POST',
      body: JSON.stringify(caseData)
    });
  }

  // Defects
  async createDefect(defectData) {
    return await this.request('/defects', {
      method: 'POST',
      body: JSON.stringify(defectData)
    });
  }

  // File upload
  async uploadPhoto(file, type = 'near') {
    const compressImage = (file, maxSize = 1400, quality = 0.8) => new Promise((resolve, reject) => {
      try {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (!blob) return reject(new Error('이미지 압축 실패'));
            const compressed = new File([blob], file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '.jpg'), { type: 'image/jpeg' });
            resolve(compressed);
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = url;
      } catch (e) { reject(e); }
    });

    const optimizedFile = await compressImage(file);
    const formData = new FormData();
    formData.append('photo', optimizedFile);

    const response = await fetch(`${this.baseURL}/upload/photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  // Reports
  async getReportPreview() {
    return await this.request('/reports/preview');
  }

  async generateReport(caseId) {
    return await this.request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ case_id: caseId })
    });
  }

  async sendReport(caseId) {
    return await this.request('/reports/send', {
      method: 'POST',
      body: JSON.stringify({ case_id: caseId })
    });
  }

  // SMS
  async sendSMS(to, message) {
    return await this.request('/sms/send', {
      method: 'POST',
      body: JSON.stringify({ to, message })
    });
  }

  async getSMSStatus() {
    return await this.request('/sms/status');
  }

  async validatePhone(phone) {
    return await this.request('/sms/validate', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
  }
}

// Global API client instance
const api = new APIClient();
