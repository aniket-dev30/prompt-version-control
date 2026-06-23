'use strict';

const { query, getClient } = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Create Version ────────────────────────────────────────────────────────────

const createVersion = async (req, res) => {
  const client = await getClient();
  try {
    const { promptId }                                          = req.params;
    const { system_prompt, user_prompt, commit_message,
            model, temperature, max_tokens, variables }        = req.body;
    const userId                                               = req.user.id;

    await client.query('BEGIN');

    // Verify prompt ownership
    const promptCheck = await client.query(
      'SELECT id FROM prompts WHERE id = $1 AND user_id = $2',
      [promptId, userId]
    );
    if (promptCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    // Get next version number atomically
    const versionResult = await client.query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
       FROM prompt_versions WHERE prompt_id = $1`,
      [promptId]
    );
    const nextVersion = versionResult.rows[0].next_version;

    // Insert new version
    const result = await client.query(
      `INSERT INTO prompt_versions
         (prompt_id, version_number, system_prompt, user_prompt,
          commit_message, model, temperature, max_tokens, variables)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        promptId,
        nextVersion,
        system_prompt?.trim() || null,
        user_prompt.trim(),
        commit_message?.trim() || null,
        model          || 'gemini-3.1-flash-lite',
        temperature    ?? 0.7,
        max_tokens     || 1000,
        variables      || {},
      ]
    );

    // Update prompt's updated_at
    await client.query(
      'UPDATE prompts SET updated_at = NOW() WHERE id = $1',
      [promptId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: `Version ${nextVersion} created successfully.`,
      version: result.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Create version error:', err.message);
    res.status(500).json({ error: 'Failed to create version.' });
  } finally {
    client.release();
  }
};

// ── Get All Versions for a Prompt ─────────────────────────────────────────────

const getVersions = async (req, res) => {
  try {
    const { promptId } = req.params;
    const userId       = req.user.id;

    // Verify access
    const promptCheck = await query(
      `SELECT id FROM prompts
       WHERE id = $1 AND (user_id = $2 OR is_public = TRUE)`,
      [promptId, userId]
    );
    if (promptCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    const result = await query(
      `SELECT
         id, version_number, system_prompt, user_prompt,
         commit_message, model, temperature, max_tokens,
         variables, created_at
       FROM prompt_versions
       WHERE prompt_id = $1
       ORDER BY version_number DESC`,
      [promptId]
    );

    res.json({ versions: result.rows });
  } catch (err) {
    console.error('❌ Get versions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch versions.' });
  }
};

// ── Get Single Version ────────────────────────────────────────────────────────

const getVersion = async (req, res) => {
  try {
    const { promptId, versionNumber } = req.params;
    const userId                      = req.user.id;

    // Verify access
    const promptCheck = await query(
      `SELECT id FROM prompts
       WHERE id = $1 AND (user_id = $2 OR is_public = TRUE)`,
      [promptId, userId]
    );
    if (promptCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    const result = await query(
      `SELECT * FROM prompt_versions
       WHERE prompt_id = $1 AND version_number = $2`,
      [promptId, parseInt(versionNumber)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Version not found.' });
    }

    res.json({ version: result.rows[0] });
  } catch (err) {
    console.error('❌ Get version error:', err.message);
    res.status(500).json({ error: 'Failed to fetch version.' });
  }
};

// ── Diff Two Versions ─────────────────────────────────────────────────────────

const diffVersions = async (req, res) => {
  try {
    const { promptId }  = req.params;
    const { v1, v2 }    = req.query;
    const userId        = req.user.id;

    if (!v1 || !v2) {
      return res.status(400).json({ error: 'Query params v1 and v2 are required.' });
    }

    if (v1 === v2) {
      return res.status(400).json({ error: 'v1 and v2 must be different versions.' });
    }

    // Verify access
    const promptCheck = await query(
      `SELECT id FROM prompts
       WHERE id = $1 AND (user_id = $2 OR is_public = TRUE)`,
      [promptId, userId]
    );
    if (promptCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    // Fetch both versions in one query
    const result = await query(
      `SELECT version_number, system_prompt, user_prompt,
              commit_message, model, temperature, max_tokens, variables
       FROM prompt_versions
       WHERE prompt_id = $1 AND version_number IN ($2, $3)
       ORDER BY version_number ASC`,
      [promptId, parseInt(v1), parseInt(v2)]
    );

    if (result.rowCount < 2) {
      return res.status(404).json({ error: 'One or both versions not found.' });
    }

    const [older, newer] = result.rows[0].version_number === parseInt(v1)
      ? [result.rows[0], result.rows[1]]
      : [result.rows[1], result.rows[0]];

    // Build field-by-field diff
    const fields = ['system_prompt', 'user_prompt', 'model', 'temperature', 'max_tokens'];
    const diff   = {};

    fields.forEach(field => {
      const oldVal = older[field];
      const newVal = newer[field];
      const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
      diff[field] = {
        changed,
        v1: oldVal,
        v2: newVal,
      };
    });

    // Variables diff
    const oldVars = older.variables || {};
    const newVars = newer.variables || {};
    const allKeys = new Set([...Object.keys(oldVars), ...Object.keys(newVars)]);
    const varDiff = {};
    allKeys.forEach(key => {
      varDiff[key] = {
        changed: JSON.stringify(oldVars[key]) !== JSON.stringify(newVars[key]),
        v1: oldVars[key] ?? null,
        v2: newVars[key] ?? null,
      };
    });

    res.json({
      prompt_id: promptId,
      v1: parseInt(v1),
      v2: parseInt(v2),
      diff,
      variables_diff: varDiff,
      commit_messages: {
        v1: older.commit_message,
        v2: newer.commit_message,
      },
    });
  } catch (err) {
    console.error('❌ Diff versions error:', err.message);
    res.status(500).json({ error: 'Failed to diff versions.' });
  }
};

// ── Generate AI changelog from a diff ─────────────────────────────────────────

const generateChangelog = async (req, res) => {
  try {
    const { promptId }  = req.params;
    const { v1, v2 }    = req.query;
    const userId        = req.user.id;

    if (!v1 || !v2) {
      return res.status(400).json({ error: 'Query params v1 and v2 are required.' });
    }

    // Verify access
    const promptCheck = await query(
      `SELECT id FROM prompts
       WHERE id = $1 AND (user_id = $2 OR is_public = TRUE)`,
      [promptId, userId]
    );
    if (promptCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    // Fetch both versions
    const result = await query(
      `SELECT version_number, system_prompt, user_prompt,
              commit_message, model, temperature, max_tokens, variables
       FROM prompt_versions
       WHERE prompt_id = $1 AND version_number IN ($2, $3)
       ORDER BY version_number ASC`,
      [promptId, parseInt(v1), parseInt(v2)]
    );

    if (result.rowCount < 2) {
      return res.status(404).json({ error: 'One or both versions not found.' });
    }

    const [older, newer] = result.rows[0].version_number === parseInt(v1)
      ? [result.rows[0], result.rows[1]]
      : [result.rows[1], result.rows[0]];

    const changelogPrompt = `You are a technical writer summarizing changes between two versions of an AI prompt, like a git changelog.

VERSION ${older.version_number} (OLDER):
System: ${older.system_prompt || '(none)'}
User: ${older.user_prompt}
Temperature: ${older.temperature}, Max tokens: ${older.max_tokens}

VERSION ${newer.version_number} (NEWER):
System: ${newer.system_prompt || '(none)'}
User: ${newer.user_prompt}
Temperature: ${newer.temperature}, Max tokens: ${newer.max_tokens}

Write a 2-3 sentence changelog summary describing what changed and why it likely improves (or changes) the prompt's behavior. Be specific about the actual differences. Do not use markdown formatting, just plain text.

Respond with ONLY valid JSON, no markdown, no extra text:
{
  "summary": "<2-3 sentence changelog summary>",
  "impact": "<one short phrase describing the expected effect, e.g. 'More consistent, formal tone'>"
}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { temperature: 0.4, maxOutputTokens: 300 },
    });

    const geminiResult = await model.generateContent(changelogPrompt);
    let rawText = geminiResult.response.text();

    rawText = rawText.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const start = rawText.indexOf('{');
    const end   = rawText.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return res.status(502).json({ error: 'Changelog service returned an unreadable response.' });
    }

    const parsed = JSON.parse(rawText.slice(start, end + 1));

    res.json({
      v1: older.version_number,
      v2: newer.version_number,
      summary: String(parsed.summary || ''),
      impact: String(parsed.impact || ''),
    });
  } catch (err) {
    console.error('❌ Generate changelog error:', err.message);

    if (err.message?.includes('API_KEY')) {
      return res.status(401).json({ error: 'Invalid Gemini API key.' });
    }
    if (err.message?.includes('quota')) {
      return res.status(429).json({ error: 'Gemini API quota exceeded.' });
    }

    res.status(500).json({ error: 'Failed to generate changelog. Please try again.' });
  }
};
// ── RAG-based prompt improvement suggestions ──────────────────────────────────

const suggestImprovements = async (req, res) => {
  try {
    const { promptId } = req.params;
    const { draft_system_prompt, draft_user_prompt, retrieved_examples } = req.body;
    const userId = req.user.id;

    if (!draft_user_prompt || !draft_user_prompt.trim()) {
      return res.status(400).json({ error: 'draft_user_prompt is required.' });
    }

    // Verify access (promptId may be a real prompt being edited, or omitted for brand new prompts)
    if (promptId && promptId !== 'new') {
      const promptCheck = await query(
        `SELECT id FROM prompts WHERE id = $1 AND (user_id = $2 OR is_public = TRUE)`,
        [promptId, userId]
      );
      if (promptCheck.rowCount === 0) {
        return res.status(404).json({ error: 'Prompt not found or access denied.' });
      }
    }

    // Validate retrieved_examples shape (sent from frontend after client-side retrieval)
    const examples = Array.isArray(retrieved_examples) ? retrieved_examples.slice(0, 3) : [];

    const examplesText = examples.length > 0
      ? examples.map((ex, i) =>
          `EXAMPLE ${i + 1} (similarity: ${Math.round((ex.score || 0) * 100)}%):\n` +
          `Prompt name: ${ex.name || 'Untitled'}\n` +
          `System: ${ex.system_prompt || '(none)'}\n` +
          `User: ${ex.user_prompt || ''}`
        ).join('\n\n')
      : 'No similar past prompts were found.';

    const ragPrompt = `You are an expert prompt engineer helping a user improve a draft prompt by learning from their own past prompt-writing patterns.

DRAFT PROMPT BEING WRITTEN:
System: ${draft_system_prompt || '(none)'}
User: ${draft_user_prompt}

RETRIEVED SIMILAR PROMPTS FROM THE USER'S OWN HISTORY:
${examplesText}

Based on patterns you notice in the user's past prompts (e.g. how they specify tone, constraints, output format, or variables), suggest 2-4 specific, actionable improvements to the draft prompt. Reference the retrieved examples when relevant. Do not rewrite the whole prompt — give targeted suggestions.

Respond with ONLY valid JSON, no markdown, no extra text:
{
  "suggestions": [
    { "suggestion": "<specific actionable suggestion>", "based_on": "<which example or pattern this came from, or 'general best practice' if none>" }
  ]
}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
    });

    const geminiResult = await model.generateContent(ragPrompt);
    let rawText = geminiResult.response.text();

    rawText = rawText.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const start = rawText.indexOf('{');
    const end   = rawText.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return res.status(502).json({ error: 'Suggestion service returned an unreadable response.' });
    }

    const parsed = JSON.parse(rawText.slice(start, end + 1));
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 5) : [];

    res.json({
      suggestions: suggestions.map(s => ({
        suggestion: String(s.suggestion || ''),
        based_on: String(s.based_on || 'general best practice'),
      })),
      retrieved_count: examples.length,
    });
  } catch (err) {
    console.error('❌ Suggest improvements error:', err.message);

    if (err.message?.includes('API_KEY')) {
      return res.status(401).json({ error: 'Invalid Gemini API key.' });
    }
    if (err.message?.includes('quota')) {
      return res.status(429).json({ error: 'Gemini API quota exceeded.' });
    }

    res.status(500).json({ error: 'Failed to generate suggestions. Please try again.' });
  }
};

// ── Delete a version ──────────────────────────────────────────────────────────

const deleteVersion = async (req, res) => {
  try {
    const { promptId, versionNumber } = req.params;
    const userId = req.user.id;

    // Verify ownership (only the owner can delete versions, not shared/view users)
    const promptCheck = await query(
      'SELECT id FROM prompts WHERE id = $1 AND user_id = $2',
      [promptId, userId]
    );
    if (promptCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    // Prevent deleting the last remaining version
    const countResult = await query(
      'SELECT COUNT(*) FROM prompt_versions WHERE prompt_id = $1',
      [promptId]
    );
    if (parseInt(countResult.rows[0].count) <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only remaining version. Delete the prompt instead.' });
    }

    const result = await query(
      'DELETE FROM prompt_versions WHERE prompt_id = $1 AND version_number = $2 RETURNING id',
      [promptId, parseInt(versionNumber)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Version not found.' });
    }

    res.json({ message: `Version ${versionNumber} deleted successfully.` });
  } catch (err) {
    console.error('❌ Delete version error:', err.message);
    res.status(500).json({ error: 'Failed to delete version.' });
  }
};

module.exports = { createVersion, getVersions, getVersion, diffVersions, deleteVersion, generateChangelog, suggestImprovements };