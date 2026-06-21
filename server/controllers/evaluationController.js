'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { query } = require('../config/db');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Evaluation prompt template ────────────────────────────────────────────────

const buildEvaluationPrompt = (systemPrompt, userPrompt, variables) => {
  const varList = Object.keys(variables || {});
  return `You are an expert prompt engineer evaluating the quality of an AI prompt. Analyze the following prompt and score it.

${systemPrompt ? `SYSTEM PROMPT:\n${systemPrompt}\n\n` : ''}USER PROMPT:
${userPrompt}

${varList.length > 0 ? `VARIABLES USED: ${varList.join(', ')}\n\n` : ''}Evaluate this prompt on these 4 criteria, each scored 0-25 (total out of 100):
1. CLARITY — Is the objective clear and unambiguous?
2. SPECIFICITY — Does it specify format, length, tone, or constraints?
3. STRUCTURE — Is it well-organized and easy to follow?
4. SAFETY — Does it avoid ambiguity that could lead to harmful or off-target output?

Respond with ONLY valid JSON in this exact format, no markdown, no extra text:
{
  "total_score": <number 0-100>,
  "criteria": {
    "clarity": { "score": <0-25>, "note": "<one short sentence>" },
    "specificity": { "score": <0-25>, "note": "<one short sentence>" },
    "structure": { "score": <0-25>, "note": "<one short sentence>" },
    "safety": { "score": <0-25>, "note": "<one short sentence>" }
  },
  "strengths": ["<short phrase>", "<short phrase>"],
  "improvements": ["<short phrase>", "<short phrase>"]
}`;
};

// ── Parse Gemini's JSON response safely ───────────────────────────────────────

const parseEvaluationResponse = (rawText) => {
  let text = rawText.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No valid JSON object found in response.');
  }
  text = text.slice(start, end + 1);
  const parsed = JSON.parse(text);

  // Validate shape
  if (
    typeof parsed.total_score !== 'number' ||
    !parsed.criteria ||
    !parsed.criteria.clarity ||
    !parsed.criteria.specificity ||
    !parsed.criteria.structure ||
    !parsed.criteria.safety
  ) {
    throw new Error('Evaluation response missing required fields.');
  }

  return {
    total_score: Math.max(0, Math.min(100, Math.round(parsed.total_score))),
    criteria: {
      clarity:     { score: clampScore(parsed.criteria.clarity.score),     note: String(parsed.criteria.clarity.note || '') },
      specificity: { score: clampScore(parsed.criteria.specificity.score), note: String(parsed.criteria.specificity.note || '') },
      structure:   { score: clampScore(parsed.criteria.structure.score),   note: String(parsed.criteria.structure.note || '') },
      safety:      { score: clampScore(parsed.criteria.safety.score),      note: String(parsed.criteria.safety.note || '') },
    },
    strengths:    Array.isArray(parsed.strengths)    ? parsed.strengths.slice(0, 5).map(String)    : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 5).map(String) : [],
    evaluated_at: new Date().toISOString(),
  };
};

const clampScore = (n) => Math.max(0, Math.min(25, Math.round(Number(n) || 0)));

// ── Evaluate a prompt version ─────────────────────────────────────────────────

const evaluateVersion = async (req, res) => {
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

    // Fetch the version
    const versionResult = await query(
      `SELECT id, system_prompt, user_prompt, variables, evaluation_score
       FROM prompt_versions
       WHERE prompt_id = $1 AND version_number = $2`,
      [promptId, parseInt(versionNumber)]
    );
    if (versionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Version not found.' });
    }

    const version = versionResult.rows[0];

    // Build and call Gemini
    const evaluationPrompt = buildEvaluationPrompt(
      version.system_prompt,
      version.user_prompt,
      version.variables
    );

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
    });

    const result   = await model.generateContent(evaluationPrompt);
    const rawText  = result.response.text();

    let evaluation;
    try {
      evaluation = parseEvaluationResponse(rawText);
    } catch (parseErr) {
      console.error('❌ Evaluation parse error:', parseErr.message, '\nRaw:', rawText);
      return res.status(502).json({ error: 'Evaluation service returned an unreadable response. Please try again.' });
    }

    // Save evaluation to the version
    await query(
      `UPDATE prompt_versions SET evaluation_score = $1 WHERE id = $2`,
      [JSON.stringify(evaluation), version.id]
    );

    res.json({ evaluation });
  } catch (err) {
    console.error('❌ Evaluate version error:', err.message);

    if (err.message?.includes('API_KEY')) {
      return res.status(401).json({ error: 'Invalid Gemini API key.' });
    }
    if (err.message?.includes('quota')) {
      return res.status(429).json({ error: 'Gemini API quota exceeded.' });
    }

    res.status(500).json({ error: 'Evaluation failed. Please try again.' });
  }
};

// ── Get saved evaluation (no re-run) ──────────────────────────────────────────

const getEvaluation = async (req, res) => {
  try {
    const { promptId, versionNumber } = req.params;
    const userId = req.user.id;

    const promptCheck = await query(
      `SELECT id FROM prompts
       WHERE id = $1 AND (user_id = $2 OR is_public = TRUE)`,
      [promptId, userId]
    );
    if (promptCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    const result = await query(
      `SELECT evaluation_score FROM prompt_versions
       WHERE prompt_id = $1 AND version_number = $2`,
      [promptId, parseInt(versionNumber)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Version not found.' });
    }

    res.json({ evaluation: result.rows[0].evaluation_score });
  } catch (err) {
    console.error('❌ Get evaluation error:', err.message);
    res.status(500).json({ error: 'Failed to fetch evaluation.' });
  }
};

module.exports = { evaluateVersion, getEvaluation };