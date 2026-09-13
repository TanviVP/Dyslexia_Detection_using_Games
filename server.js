const express = require("express");
const cors = require("cors");
const axios = require("axios");
const pgPool = require("./lib/postgres");
const validateDyslexiaPayload = require("./middleware/validateDyslexiaPayload");
const { estimateRiskFromSession } = require("./lib/dyslexiaRiskEstimate");
require("dotenv").config();

const app = express();
const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000";
const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS || 10000);

const buildErrorResponse = (error, details, code) => ({
  error,
  details,
  code,
});

app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/scores", require("./routes/scoreRoutes"));
app.use("/api/progress", require("./routes/progressRoutes"));
app.use("/api/parent", require("./routes/parentRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

async function ensureDyslexiaSessionColumns() {
  try {
    await pgPool.query(`
      ALTER TABLE dyslexia_sessions
        ADD COLUMN IF NOT EXISTS risk_score DOUBLE PRECISION;
      ALTER TABLE dyslexia_sessions
        ADD COLUMN IF NOT EXISTS ml_prediction INTEGER;
    `);
  } catch (err) {
    console.warn("[dyslexia_sessions] column ensure skipped:", err.message);
  }
}

async function migrateGameResultsScore() {
  try {
    await pgPool.query(`
      ALTER TABLE game_results
        ALTER COLUMN score TYPE NUMERIC(5,2);
    `);
    console.log("[game_results] score column migrated to NUMERIC(5,2)");
  } catch (err) {
    console.warn("[game_results] score column migration skipped:", err.message);
  }
}

app.post("/api/dyslexia/sessions", validateDyslexiaPayload, async (req, res) => {
  const payload = req.body;
  const requestId = `dys-db-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  try {
    const inferred = estimateRiskFromSession(payload);
    const risk =
      payload.risk != null && String(payload.risk).trim() !== ""
        ? String(payload.risk).trim()
        : inferred.risk;
    const risk_score =
      typeof payload.risk_score === "number" && Number.isFinite(payload.risk_score)
        ? payload.risk_score
        : inferred.risk_score;
    const ml_prediction =
      typeof payload.ml_prediction === "number" && Number.isInteger(payload.ml_prediction)
        ? payload.ml_prediction
        : inferred.ml_prediction;

    const query = `
      INSERT INTO dyslexia_sessions (
        session_id,
        user_id,
        game_type,
        difficulty,
        score,
        total,
        accuracy,
        fixation_mean_dur,
        regressions_count,
        reading_speed_wpm,
        risk,
        risk_score,
        ml_prediction,
        "timestamp"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14::timestamptz, NOW()))
      ON CONFLICT (session_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        game_type = EXCLUDED.game_type,
        difficulty = EXCLUDED.difficulty,
        score = EXCLUDED.score,
        total = EXCLUDED.total,
        accuracy = EXCLUDED.accuracy,
        fixation_mean_dur = EXCLUDED.fixation_mean_dur,
        regressions_count = EXCLUDED.regressions_count,
        reading_speed_wpm = EXCLUDED.reading_speed_wpm,
        risk = EXCLUDED.risk,
        risk_score = EXCLUDED.risk_score,
        ml_prediction = EXCLUDED.ml_prediction,
        "timestamp" = EXCLUDED."timestamp"
      RETURNING *
    `;

    const values = [
      payload.session_id,
      payload.user_id,
      payload.game_type,
      payload.difficulty,
      payload.score,
      payload.total,
      payload.accuracy,
      payload.fixation_stats.mean_duration,
      payload.regressions.count,
      payload.reading_speed_wpm,
      risk,
      risk_score,
      ml_prediction,
      payload.timestamp || null,
    ];

    const result = await pgPool.query(query, values);
    return res.status(200).json({
      ok: true,
      source: "postgres",
      session: result.rows[0] || null,
    });
  } catch (error) {
    console.error(`[${requestId}] /api/dyslexia/sessions db error:`, error.message);
    return res
      .status(500)
      .json(buildErrorResponse("Failed to save dyslexia session", error.message, "DB_ERROR"));
  }
});

app.post("/api/dyslexia/analyze", validateDyslexiaPayload, async (req, res) => {
  const requestId = `dys-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const startedAt = Date.now();
  console.info(`[${requestId}] received payload`, req.body);

  try {
    const mlResponse = await axios.post(`${ML_API_URL}/save-data`, req.body, {
      headers: { "Content-Type": "application/json" },
      timeout: ML_TIMEOUT_MS,
    });
    const latencyMs = Date.now() - startedAt;
    console.info(`[${requestId}] /api/dyslexia/analyze 200 ${latencyMs}ms`);
    console.info(`[${requestId}] forwarded to ${ML_API_URL}/save-data`, mlResponse.data);
    if (mlResponse?.data?.db_saved) {
      console.info(`[${requestId}] Saved to DB`);
    }

    return res.status(200).json(mlResponse.data);
  } catch (error) {
    const latencyMs = Date.now() - startedAt;

    if (error.response) {
      console.error(
        `[${requestId}] /api/dyslexia/analyze ${error.response.status} ${latencyMs}ms upstream_error`
      );
      return res.status(error.response.status).json({
        ...buildErrorResponse(
          "ML backend request failed",
          error.response.data,
          "ML_BACKEND_ERROR"
        ),
      });
    }

    if (error.code === "ECONNABORTED") {
      console.error(`[${requestId}] /api/dyslexia/analyze 504 ${latencyMs}ms timeout`);
      return res.status(504).json(
        buildErrorResponse(
          "ML backend timeout",
          `Timed out after ${ML_TIMEOUT_MS}ms`,
          "ML_TIMEOUT"
        )
      );
    }

    if (error.request || error.code === "ECONNREFUSED") {
      console.error(`[${requestId}] /api/dyslexia/analyze 502 ${latencyMs}ms unreachable`);
      return res.status(502).json({
        ...buildErrorResponse("ML backend unreachable", error.message, "ML_UNREACHABLE"),
      });
    }

    console.error(`[${requestId}] /api/dyslexia/analyze 500 ${latencyMs}ms internal_error`);
    return res.status(500).json({
      ...buildErrorResponse(
        "Failed to process dyslexia analysis request",
        error.message,
        "INTERNAL_ERROR"
      ),
    });
  }
});

app.get("/health", (_req, res) => res.status(200).json({ ok: true, ts: Date.now() }));

app.get("/api/dyslexia/health", async (_req, res) => {
  try {
    const response = await axios.get(`${ML_API_URL}/`, { timeout: 3000 });
    return res.status(200).json({
      ok: true,
      mlUrl: ML_API_URL,
      mlStatus: response.status,
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      mlUrl: ML_API_URL,
      error: "ML health check failed",
      details: error.message,
      code: "ML_HEALTHCHECK_FAILED",
    });
  }
});

app.get("/api/dyslexia/sessions/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId || !String(userId).trim()) {
    return res.status(400).json(
      buildErrorResponse("Invalid user ID", "userId is required", "VALIDATION_ERROR")
    );
  }

  try {
    const query = `
      SELECT *
      FROM dyslexia_sessions
      WHERE user_id = $1
      ORDER BY "timestamp" DESC
    `;
    const result = await pgPool.query(query, [userId]);
    const sessions = result.rows || [];
    return res.status(200).json({
      latest: sessions[0] || null,
      sessions,
    });
  } catch (error) {
    console.error("[/api/dyslexia/sessions/:userId] query error:", error.message);
    return res.status(500).json(
      buildErrorResponse("Failed to fetch dyslexia session", error.message, "DB_ERROR")
    );
  }
});

// 404 handler — returns JSON so frontend fetch() can parse it
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("[global error]", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

ensureDyslexiaSessionColumns()
  .then(() => migrateGameResultsScore())
  .finally(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
