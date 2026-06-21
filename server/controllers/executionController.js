'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { query, getClient }   = require('../config/db');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Helper: interpolate variables into prompt text ────────────────────────────

const interpolate = (text, variables) => {
  if (!text) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
};

// ── Helper: extract variables from prompt text ────────────────────────────────

const extractVariables = (text) => {
  if (!text) return [];
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
};

// ── Execute a prompt version ──────────────────────────────────────────────────

const executeVersion = async (req, res) => {
  try {
    const { promptId, versionNumber } = req.params;
    const { input_variables = {}, model } = req.body;
    const userId = req.user.id;

    // Verify prompt access
    const promptCheck = await query(
      `SELECT id FROM prompts
       WHERE id = $1 AND (user_id = $2 OR is_public = TRUE)`,
      [promptId, userId]
    );
    if (promptCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    // Fetch the version
    const versionResult = await query(
      `SELECT * FROM prompt_versions
       WHERE prompt_id = $1 AND version_number = $2`,
      [promptId, parseInt(versionNumber)]
    );
    if (versionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Version not found.' });
    }

    const version = versionResult.rows[0];

    // Check all required variables are provided
    const requiredVars = extractVariables(version.user_prompt)
      .concat(extractVariables(version.system_prompt));
    const missingVars  = requiredVars.filter(v => !(v in input_variables));
    if (missingVars.length > 0) {
      return res.status(400).json({
        error:    'Missing required variables.',
        missing:  missingVars,
        required: [...new Set(requiredVars)],
      });
    }

    // Interpolate variables
    const finalSystemPrompt = interpolate(version.system_prompt, input_variables);
    const finalUserPrompt   = interpolate(version.user_prompt,   input_variables);

    // Select model
    const modelName = model || 'gemini-3.1-flash-lite';
    // Call Gemini API
    const startTime    = Date.now();
    const geminiModel  = genAI.getGenerativeModel({
      model: modelName,
      ...(finalSystemPrompt && {
        systemInstruction: finalSystemPrompt,
      }),
      generationConfig: {
        temperature: parseFloat(version.temperature),
        maxOutputTokens: version.max_tokens,
      },
    });

    const geminiResult = await geminiModel.generateContent(finalUserPrompt);
    const latencyMs    = Date.now() - startTime;
    const outputText   = geminiResult.response.text();

    // Token usage (Gemini provides this)
    const usageMetadata = geminiResult.response.usageMetadata || {};
    const inputTokens   = usageMetadata.promptTokenCount     || null;
    const outputTokens  = usageMetadata.candidatesTokenCount || null;

    // Save output to database
    const savedOutput = await query(
      `INSERT INTO prompt_outputs
         (version_id, input_variables, output_text, input_tokens, output_tokens, latency_ms, model)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [
        version.id,
        input_variables,
        outputText,
        inputTokens,
        outputTokens,
        latencyMs,
        modelName,
      ]
    );

    res.json({
      output_id:       savedOutput.rows[0].id,
      output_text:     outputText,
      model:           modelName,
      latency_ms:      latencyMs,
      input_tokens:    inputTokens,
      output_tokens:   outputTokens,
      created_at:      savedOutput.rows[0].created_at,
      interpolated: {
        system_prompt: finalSystemPrompt,
        user_prompt:   finalUserPrompt,
      },
    });
  } catch (err) {
    console.error('❌ Execute version error:', err.message);

    // Gemini-specific errors
    if (err.message?.includes('API_KEY')) {
      return res.status(401).json({ error: 'Invalid Gemini API key.' });
    }
    if (err.message?.includes('quota')) {
      return res.status(429).json({ error: 'Gemini API quota exceeded.' });
    }

    res.status(500).json({ error: 'Execution failed. Please try again.' });
  }
};

// ── Get outputs for a version ─────────────────────────────────────────────────

const getOutputs = async (req, res) => {
  try {
    const { promptId, versionNumber } = req.params;
    const userId = req.user.id;

    // Verify access
    const promptCheck = await query(
      `SELECT id FROM prompts
       WHERE id = $1 AND (user_id = $2 OR is_public = TRUE)`,
      [promptId, userId]
    );
    if (promptCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    // Get version id
    const versionResult = await query(
      `SELECT id FROM prompt_versions
       WHERE prompt_id = $1 AND version_number = $2`,
      [promptId, parseInt(versionNumber)]
    );
    if (versionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Version not found.' });
    }

    const outputs = await query(
      `SELECT id, input_variables, output_text, input_tokens,
              output_tokens, latency_ms, model, created_at
       FROM prompt_outputs
       WHERE version_id = $1
       ORDER BY created_at DESC`,
      [versionResult.rows[0].id]
    );

    res.json({ outputs: outputs.rows });
  } catch (err) {
    console.error('❌ Get outputs error:', err.message);
    res.status(500).json({ error: 'Failed to fetch outputs.' });
  }
};

module.exports = { executeVersion, getOutputs };