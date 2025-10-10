// API client for backend integration
class APIClient {
  constructor() {
    // 환경에 따라 API URL 동적 설정
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    this.baseURL = isDevelopment 
      ? 'http://localhost:3000/api'
      : 'https://mobile-app-new.onrender.com/api'; // 무료 Render 도메인
    this.token = localStorage.getItem('insighti_token');
    console.log('API Base URL:', this.baseURL);
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

    // Render Free Tier Cold Start를 위해 타임아웃 증가
    const timeoutMs = options.timeoutMs || 30000; // 30초 (Cold Start 대응)
    const retries = options.retries ?? 3; // 재시도 3회

    const doFetch = async (attempt) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(url, { ...config, signal: controller.signal });
        clearTimeout(id);
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          
          // 401 또는 403 에러 시 토큰 만료로 간주
          if (resp.status === 401 || resp.status === 403) {
            console.warn('⚠️ 토큰이 만료되었습니다. 다시 로그인해주세요.');
            this.clearToken();
            
            // 로그인 화면으로 리다이렉트
            if (window.route) {
              window.route('login');
            }
            
            const err = new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
            err.status = resp.status;
            throw err;
          }
          
          const err = new Error(`HTTP ${resp.status}: ${text}`);
          err.status = resp.status;
          throw err;
        }
        return await resp.json();
      } catch (err) {
        clearTimeout(id);
        
        // 401/403 에러는 재시도하지 않음
        if (err.status === 401 || err.status === 403) {
          throw err;
        }
        
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

  // 하자 카테고리 관련 API 메서드들
  
  // 모든 하자 카테고리 목록 조회
  async getDefectCategories() {
    return await this.request('/defect-categories');
  }

  // 카테고리별 하자 목록 조회
  async getDefectCategoriesByCategory(category) {
    return await this.request(`/defect-categories/category/${category}`);
  }

  // 특정 하자 카테고리 상세 정보 조회 (동영상 포함)
  async getDefectCategoryDetail(id) {
    return await this.request(`/defect-categories/${id}`);
  }

  // 하자 카테고리 검색
  async searchDefectCategories(keyword) {
    return await this.request(`/defect-categories/search/${keyword}`);
  }

  // 하자 카테고리별 동영상 목록 조회
  async getDefectVideos(categoryId) {
    return await this.request(`/defect-categories/${categoryId}/videos`);
  }

  // AI 학습 관련 API 메서드들
  
  // AI 예측 결과 저장
  async saveAIPrediction(imagePath, predictions, photoType) {
    return await this.request('/ai-learning/predict', {
      method: 'POST',
      body: JSON.stringify({
        imagePath,
        predictions,
        photoType
      })
    });
  }

  // 사용자 피드백 전송
  async sendAIFeedback(feedbacks) {
    return await this.request('/ai-learning/feedback', {
      method: 'POST',
      body: JSON.stringify({ feedbacks })
    });
  }

  // AI 성능 통계 조회
  async getAIPerformance() {
    return await this.request('/ai-learning/performance');
  }

  // 하자별 AI 성능 분석
  async getAIPerformanceByDefect() {
    return await this.request('/ai-learning/performance-by-defect');
  }

  // 학습 데이터 조회
  async getTrainingData(limit = 100, offset = 0) {
    return await this.request(`/ai-learning/training-data?limit=${limit}&offset=${offset}`);
  }

  // 실시간 AI 감지
  async detectDefectsWithAI(imageBase64, imageType = 'jpeg') {
    return await this.request('/ai-learning/detect', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        imageType
      })
    });
  }

  // Azure OpenAI로 하자 이미지 분석
  async analyzeDefectWithAzureAI(imageBase64, photoType = 'near') {
    return await this.request('/azure-ai/analyze-defect', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        photoType
      })
    });
  }

  // Azure OpenAI 하자 상담
  async consultDefect(question, defectType = null, context = null) {
    return await this.request('/azure-ai/consult', {
      method: 'POST',
      body: JSON.stringify({
        question,
        defectType,
        context
      })
    });
  }

  // Azure OpenAI 연결 상태 확인
  async checkAzureAIStatus() {
    return await this.request('/azure-ai/status');
  }
}

// Global API client instance
const api = new APIClient();
