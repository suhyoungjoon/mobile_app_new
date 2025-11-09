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
  huggingfaceTask: 'image-classification', // image-classification | object-detection | image-to-text | visual-question-answering
  huggingfacePrompt:
    'Describe any visible building defects such as cracks, water leaks, mold, or safety issues in this photo.',
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

    let result;
    try {
      result = await pool.query(
        `SELECT mode,
                provider,
                azure_enabled AS "azureEnabled",
                local_enabled AS "localEnabled",
                azure_fallback_threshold AS "azureFallbackThreshold",
                local_base_confidence AS "localBaseConfidence",
                max_detections AS "maxDetections",
                huggingface_enabled AS "huggingfaceEnabled",
                huggingface_model AS "huggingfaceModel",
                huggingface_task AS "huggingfaceTask",
                huggingface_prompt AS "huggingfacePrompt",
                rules,
                updated_at AS "updatedAt"
         FROM ai_detection_settings
         ORDER BY id DESC
         LIMIT 1`
      );
    } catch (error) {
      if (error.code === '42P01') {
        await this.ensureTable();
        result = await pool.query(
          `SELECT mode,
                  provider,
                  azure_enabled AS "azureEnabled",
                  local_enabled AS "localEnabled",
                  azure_fallback_threshold AS "azureFallbackThreshold",
                  local_base_confidence AS "localBaseConfidence",
                  max_detections AS "maxDetections",
                  huggingface_enabled AS "huggingfaceEnabled",
                  huggingface_model AS "huggingfaceModel",
                  huggingface_task AS "huggingfaceTask",
                  huggingface_prompt AS "huggingfacePrompt",
                  rules,
                  updated_at AS "updatedAt"
           FROM ai_detection_settings
           ORDER BY id DESC
           LIMIT 1`
        );
      } else {
        throw error;
      }
    }

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
    await this.ensureTable();
    const settings = { ...DEFAULT_SETTINGS, ...newSettings };

    await pool.query(
      `INSERT INTO ai_detection_settings
        (id, mode, provider, azure_enabled, local_enabled, azure_fallback_threshold, local_base_confidence, max_detections, huggingface_enabled, huggingface_model, huggingface_task, huggingface_prompt, rules, updated_at)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
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
         huggingface_task = EXCLUDED.huggingface_task,
         huggingface_prompt = EXCLUDED.huggingface_prompt,
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
        settings.huggingfaceTask,
        settings.huggingfacePrompt,
        settings.rules
      ]
    );

    this.cache = settings;
    this.cacheTimestamp = Date.now();
    return this.cache;
  }

  async ensureTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_detection_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        mode TEXT NOT NULL DEFAULT 'hybrid',
        provider TEXT NOT NULL DEFAULT 'azure',
        azure_enabled BOOLEAN NOT NULL DEFAULT true,
        local_enabled BOOLEAN NOT NULL DEFAULT true,
        azure_fallback_threshold REAL NOT NULL DEFAULT 0.8,
        local_base_confidence REAL NOT NULL DEFAULT 0.65,
        max_detections INTEGER NOT NULL DEFAULT 3,
        huggingface_enabled BOOLEAN NOT NULL DEFAULT false,
        huggingface_model TEXT DEFAULT 'microsoft/resnet-50',
        huggingface_task TEXT DEFAULT 'image-classification',
        huggingface_prompt TEXT,
        rules JSONB,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE ai_detection_settings ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'hybrid';`);
    await pool.query(`ALTER TABLE ai_detection_settings ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'azure';`);
    await pool.query(`ALTER TABLE ai_detection_settings ADD COLUMN IF NOT EXISTS azure_enabled BOOLEAN NOT NULL DEFAULT true;`);
    await pool.query(`ALTER TABLE ai_detection_settings ADD COLUMN IF NOT EXISTS local_enabled BOOLEAN NOT NULL DEFAULT true;`);
    await pool.query(`ALTER TABLE ai_detection_settings ADD COLUMN IF NOT EXISTS azure_fallback_threshold REAL NOT NULL DEFAULT 0.8;`);
    await pool.query(`ALTER TABLE ai_detection_settings ADD COLUMN IF NOT EXISTS local_base_confidence REAL NOT NULL DEFAULT 0.65;`);
    await pool.query(`ALTER TABLE ai_detection_settings ADD COLUMN IF NOT EXISTS max_detections INTEGER NOT NULL DEFAULT 3;`);
    await pool.query(`ALTER TABLE ai_detection_settings ADD COLUMN IF NOT EXISTS huggingface_enabled BOOLEAN NOT NULL DEFAULT false;`);
    await pool.query(`ALTER TABLE ai_detection_settings ADD COLUMN IF NOT EXISTS huggingface_model TEXT DEFAULT 'microsoft/resnet-50';`);
    await pool.query(`ALTER TABLE ai_detection_settings ADD COLUMN IF NOT EXISTS huggingface_task TEXT DEFAULT 'image-classification';`);
    await pool.query(`ALTER TABLE ai_detection_settings ADD COLUMN IF NOT EXISTS huggingface_prompt TEXT;`);
    await pool.query(`ALTER TABLE ai_detection_settings ADD COLUMN IF NOT EXISTS rules JSONB;`);
    await pool.query(`ALTER TABLE ai_detection_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);

    await pool.query(`
      INSERT INTO ai_detection_settings (id)
      VALUES (1)
      ON CONFLICT (id) DO NOTHING;
    `);
  }
}

module.exports = new AiDetectionSettingsService();

