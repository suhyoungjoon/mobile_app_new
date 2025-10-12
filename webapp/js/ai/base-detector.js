// 기본 디텍터 인터페이스 (추상 클래스)
class BaseDetector {
  constructor(name) {
    this.name = name;
    this.isLoaded = false;
    this.isLoading = false;
  }

  /**
   * 모델 로드 (추상 메서드)
   */
  async loadModel() {
    throw new Error('loadModel() must be implemented');
  }

  /**
   * 이미지 분석 (추상 메서드)
   * @param {File} imageFile - 분석할 이미지 파일
   * @returns {Promise<DetectionResult>}
   */
  async analyze(imageFile) {
    throw new Error('analyze() must be implemented');
  }

  /**
   * 모델 언로드
   */
  async unload() {
    this.isLoaded = false;
    console.log(`🗑️ ${this.name} 모델 언로드`);
  }
}

/**
 * 감지 결과 타입 정의
 * @typedef {Object} DetectionResult
 * @property {string} defectType - 하자 유형
 * @property {number} confidence - 신뢰도 (0-1)
 * @property {string} location - 위치
 * @property {string} severity - 심각도 (경미/보통/심각)
 * @property {string} description - 상세 설명
 * @property {string} source - 분석 출처 (local/cloud/mock)
 * @property {number} processingTime - 처리 시간 (ms)
 */

