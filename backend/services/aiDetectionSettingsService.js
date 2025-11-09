const pool = require('../database');

const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
const defaultProvider = HF_TOKEN ? 'huggingface' : 'azure';

const DEFAULT_SETTINGS = {
  mode: 'hybrid', // hybrid | azure | local | huggingface
  provider: defaultProvider, // azure | huggingface
  localEnabled: true,
  azureEnabled: defaultProvider !== 'huggingface',
  azureFallbackThreshold: 0.8,
  localBaseConfidence: 0.65,
  maxDetections: 3,
  huggingfaceEnabled: defaultProvider === 'huggingface',
  huggingfaceModel: 'microsoft/resnet-50',
  updatedAt: null,
  rules: null
};

class AiDetectionSettingsService {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = 0;
    this.cacheTTL = 60 * 1000; // 1분
  }

  async getSettings(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cache && now - this.cacheTimestamp < this.cacheTTL) {
      return this.cache;
    }

    const result = await pool.query(
      `SELECT mode,
              provider,
              azure_enabled AS "azureEnabled",
              local_enabled AS "localEnabled",
              azure_fallback_threshold AS "azureFallbackThreshold",
              local_base_confidence AS "localBaseConfidence",
              max_detections AS "maxDetections",
              huggingface_enabled AS "huggingfaceEnabled",
              huggingface_model AS "huggingfaceModel",
              rules,
              updated_at AS "updatedAt"
       FROM ai_detection_settings
       ORDER BY id DESC
       LIMIT 1`
    );

    let settings;

    if (result.rows.length === 0) {
      settings = await this.upsertSettings(DEFAULT_SETTINGS);
    } else {
      settings = { ...DEFAULT_SETTINGS, ...result.rows[0] };

      if (
        HF_TOKEN &&
        (settings.provider !== 'huggingface' || !settings.huggingfaceEnabled)
      ) {
        settings = await this.upsertSettings({
          ...settings,
          provider: 'huggingface',
          huggingfaceEnabled: true,
          huggingfaceModel: settings.huggingfaceModel || DEFAULT_SETTINGS.huggingfaceModel,
          azureEnabled: false,
          mode: settings.mode === 'azure' ? 'hybrid' : settings.mode
        });
      }
    }

    this.cache = settings;
    this.cacheTimestamp = now;
    return settings;
  }

  async upsertSettings(newSettings = {}) {
    const settings = { ...DEFAULT_SETTINGS, ...newSettings };

    await pool.query(
      `INSERT INTO ai_detection_settings
        (id, mode, provider, azure_enabled, local_enabled, azure_fallback_threshold, local_base_confidence, max_detections, huggingface_enabled, huggingface_model, rules, updated_at)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (id) DO UPDATE SET
         mode = EXCLUDED.mode,
         provider = EXCLUDED.provider,
         azure_enabled = EXCLUDED.azure_enabled,
         local_enabled = EXCLUDED.local_enabled,
         azure_fallback_threshold = EXCLUDED.azure_fallback_threshold,
         local_base_confidence = EXCLUDED.local_base_confidence,
         max_detections = EXCLUDED.max_detections,
         huggingface_enabled = EXCLUDED.huggingface_enabled,
         huggingface_model = EXCLUDED.huggingface_model,
         rules = EXCLUDED.rules,
         updated_at = NOW()`,
      [
        settings.mode,
        settings.provider,
        settings.azureEnabled,
        settings.localEnabled,
        settings.azureFallbackThreshold,
        settings.localBaseConfidence,
        settings.maxDetections,
        settings.huggingfaceEnabled,
        settings.huggingfaceModel,
        settings.rules
      ]
    );

    this.cache = settings;
    this.cacheTimestamp = Date.now();
    return this.cache;
  }
}

module.exports = new AiDetectionSettingsService();

