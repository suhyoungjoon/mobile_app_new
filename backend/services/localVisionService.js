const sharp = require('sharp');

/**
 * 로컬 이미지 분석 서비스
 * - 이미지의 기본 통계(밝기, 대비, 색상 비율)를 분석하여
 *   간단한 규칙 기반 하자 유형을 추정합니다.
 * - 이 서비스는 Azure OpenAI를 사용하지 않는 환경을 위한
 *   기본 대체 기능으로 설계되었습니다.
 */
class LocalVisionService {
  constructor() {
    this.defaultRules = this._createDefaultRules();
    this.rules = [...this.defaultRules];
  }

  /**
   * 기본 규칙 세트 생성
   */
  _createDefaultRules() {
    return [
      {
        id: 'water-leak',
        label: '천장누수',
        description: '파란색/녹색 채널이 높고 대비가 낮은 경우 (물 얼룩 패턴)',
        severity: '심각',
        condition: ({ mean, stdDev }) =>
          mean.blue > mean.red + 10 && stdDev.blue < 25 && mean.blue > 110,
        recommendation: '누수 부위 확인 후 방수 처리 필요'
      },
      {
        id: 'mold',
        label: '욕실곰팡이',
        description: '채널 전반이 어둡고 대비가 낮은 경우 (곰팡이 얼룩 패턴)',
        severity: '보통',
        condition: ({ mean, stdDev }) =>
          mean.red < 90 && mean.green < 90 && mean.blue < 90 && stdDev.luminance < 20,
        recommendation: '세척 및 곰팡이 제거제 사용 권장'
      },
      {
        id: 'wall-crack',
        label: '벽균열',
        description: '밝은 배경에서 대비가 높은 경우 (균열 패턴)',
        severity: '심각',
        condition: ({ mean, stdDev }) =>
          mean.luminance > 140 && stdDev.luminance > 35,
        recommendation: '전문가 진단 후 보수 필요'
      },
      {
        id: 'paint-peel',
        label: '페인트벗겨짐',
        description: '밝기 변화 폭이 크고 빨간 채널이 높음',
        severity: '보통',
        condition: ({ mean, stdDev }) =>
          mean.red > mean.green + 5 && stdDev.luminance > 30,
        recommendation: '재도장 또는 부분 보수가 필요합니다'
      },
      {
        id: 'tile-crack',
        label: '타일균열',
        description: '밝기가 높고 대비가 높으며 청색 채널이 낮음',
        severity: '보통',
        condition: ({ mean, stdDev }) =>
          mean.luminance > 130 && stdDev.luminance > 40 && mean.blue < mean.red - 10,
        recommendation: '타일 교체 또는 보수 작업 검토'
      }
    ];
  }

  /**
   * 외부에서 규칙을 설정할 수 있도록 합니다.
   * @param {Array} customRules
   */
  setRules(customRules = []) {
    if (!Array.isArray(customRules) || customRules.length === 0) {
      this.rules = [...this.defaultRules];
      return;
    }

    this.rules = customRules.map((rule) => ({
      ...rule,
      condition: this._compileCondition(rule)
    }));
  }

  /**
   * JSON 규칙을 실행 가능한 condition 함수로 변환합니다.
   * 현재 버전에서는 간단한 비교 연산만 지원합니다.
   */
  _compileCondition(rule) {
    if (typeof rule.condition === 'function') {
      return rule.condition;
    }

    // JSON 기반 규칙: { metric: 'mean.red', operator: '>', value: 100 }
    if (rule.expression && Array.isArray(rule.expression)) {
      return (stats) => {
        return rule.expression.every((expr) => {
          const value = this._getStatValue(stats, expr.metric);
          const compareValue = expr.value;

          switch (expr.operator) {
            case '>':
              return value > compareValue;
            case '>=':
              return value >= compareValue;
            case '<':
              return value < compareValue;
            case '<=':
              return value <= compareValue;
            case 'between':
              return value >= expr.min && value <= expr.max;
            case 'difference_gt':
              return value - this._getStatValue(stats, expr.compareMetric) > compareValue;
            default:
              return false;
          }
        });
      };
    }

    // 기본적으로는 false 반환
    return () => false;
  }

  /**
   * 통계 객체에서 값을 추출합니다.
   */
  _getStatValue(stats, metric) {
    const parts = metric.split('.');
    let value = stats;

    for (const part of parts) {
      if (value && Object.prototype.hasOwnProperty.call(value, part)) {
        value = value[part];
      } else {
        return null;
      }
    }

    return value;
  }

  /**
   * 이미지 통계치를 계산합니다.
   */
  async _getImageStats(imageBase64) {
    const buffer = imageBase64.startsWith('data:')
      ? Buffer.from(imageBase64.split(',')[1], 'base64')
      : Buffer.from(imageBase64, 'base64');

    const stats = await sharp(buffer).stats();

    const mean = {
      red: stats.channels[0]?.mean || 0,
      green: stats.channels[1]?.mean || 0,
      blue: stats.channels[2]?.mean || 0,
      luminance: stats.channels[3]?.mean || (stats.channels[0]?.mean + stats.channels[1]?.mean + stats.channels[2]?.mean) / 3
    };

    const stdDev = {
      red: stats.channels[0]?.stdev || 0,
      green: stats.channels[1]?.stdev || 0,
      blue: stats.channels[2]?.stdev || 0,
      luminance: stats.channels[3]?.stdev || (stats.channels[0]?.stdev + stats.channels[1]?.stdev + stats.channels[2]?.stdev) / 3
    };

    const min = {
      red: stats.channels[0]?.min || 0,
      green: stats.channels[1]?.min || 0,
      blue: stats.channels[2]?.min || 0,
      luminance: stats.channels[3]?.min || 0
    };

    const max = {
      red: stats.channels[0]?.max || 0,
      green: stats.channels[1]?.max || 0,
      blue: stats.channels[2]?.max || 0,
      luminance: stats.channels[3]?.max || 0
    };

    return { mean, stdDev, min, max };
  }

  /**
   * 이미지 분석 실행
   */
  async analyze(imageBase64, options = {}) {
    const stats = await this._getImageStats(imageBase64);

    const matchedRules = this.rules
      .map((rule) => ({
        ...rule,
        matched: rule.condition(stats)
      }))
      .filter((rule) => rule.matched);

    if (matchedRules.length === 0) {
      return {
        success: true,
        source: 'local-rule',
        stats,
        detectedDefects: [],
        summary: '규칙에 일치하는 하자 유형을 찾지 못했습니다.',
        confidence: 0.4
      };
    }

    const detection = matchedRules.map((rule) => ({
      type: rule.label,
      confidence: options.baseConfidence || 0.65,
      severity: rule.severity || '보통',
      description: rule.description || '',
      recommendation: rule.recommendation || '',
      ruleId: rule.id
    }));

    return {
      success: true,
      source: 'local-rule',
      stats,
      detectedDefects: detection,
      summary: `${detection.length}개의 규칙이 일치했습니다.`,
      confidence: detection[0].confidence
    };
  }
}

module.exports = new LocalVisionService();

