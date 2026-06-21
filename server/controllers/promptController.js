'use strict';

const { query, getClient } = require('../config/db');

// ── Create Prompt ─────────────────────────────────────────────────────────────

const createPrompt = async (req, res) => {
  try {
    const { name, description, tags, is_public } = req.body;
    const userId = req.user.id;

    const result = await query(
      `INSERT INTO prompts (user_id, name, description, tags, is_public)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, tags, is_public, created_at`,
      [
        userId,
        name.trim(),
        description?.trim() || null,
        tags || [],
        is_public || false,
      ]
    );

    res.status(201).json({
      message: 'Prompt created successfully.',
      prompt: result.rows[0],
    });
  } catch (err) {
    console.error('❌ Create prompt error:', err.message);
    res.status(500).json({ error: 'Failed to create prompt.' });
  }
};

// ── Get All Prompts (for current user) ────────────────────────────────────────

const getPrompts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, tag, page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [userId];
    let whereClause = 'WHERE p.user_id = $1';

    // Optional search filter
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }

    // Optional tag filter
    if (tag) {
      params.push(tag);
      whereClause += ` AND $${params.length} = ANY(p.tags)`;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM prompts p ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get prompts with version count
    params.push(parseInt(limit), offset);
    const result = await query(
      `SELECT
         p.id, p.name, p.description, p.tags, p.is_public,
         p.created_at, p.updated_at,
         COUNT(pv.id)::int AS version_count,
         MAX(pv.version_number) AS latest_version
       FROM prompts p
       LEFT JOIN prompt_versions pv ON pv.prompt_id = p.id
       ${whereClause}
       GROUP BY p.id
       ORDER BY p.updated_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      prompts: result.rows,
      pagination: {
        total,
        page:        parseInt(page),
        limit:       parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('❌ Get prompts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch prompts.' });
  }
};

// ── Get Single Prompt ─────────────────────────────────────────────────────────

const getPrompt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      `SELECT
         p.id, p.name, p.description, p.tags, p.is_public,
         p.created_at, p.updated_at,
         json_agg(
           json_build_object(
             'id',             pv.id,
             'version_number', pv.version_number,
             'system_prompt',  pv.system_prompt,
             'user_prompt',    pv.user_prompt,
             'commit_message', pv.commit_message,
             'model',          pv.model,
             'temperature',    pv.temperature,
             'max_tokens',     pv.max_tokens,
             'variables',      pv.variables,
             'created_at',     pv.created_at
           ) ORDER BY pv.version_number DESC
         ) FILTER (WHERE pv.id IS NOT NULL) AS versions
       FROM prompts p
       LEFT JOIN prompt_versions pv ON pv.prompt_id = p.id
       WHERE p.id = $1
         AND (p.user_id = $2 OR p.is_public = TRUE)
       GROUP BY p.id`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found.' });
    }

    res.json({ prompt: result.rows[0] });
  } catch (err) {
    console.error('❌ Get prompt error:', err.message);
    res.status(500).json({ error: 'Failed to fetch prompt.' });
  }
};

// ── Update Prompt ─────────────────────────────────────────────────────────────

const updatePrompt = async (req, res) => {
  try {
    const { id }                           = req.params;
    const userId                           = req.user.id;
    const { name, description, tags, is_public } = req.body;

    // Verify ownership
    const existing = await query(
      'SELECT id FROM prompts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    const result = await query(
      `UPDATE prompts
       SET name        = COALESCE($1, name),
           description = COALESCE($2, description),
           tags        = COALESCE($3, tags),
           is_public   = COALESCE($4, is_public)
       WHERE id = $5 AND user_id = $6
       RETURNING id, name, description, tags, is_public, updated_at`,
      [
        name?.trim()        || null,
        description?.trim() || null,
        tags                || null,
        is_public ?? null,
        id,
        userId,
      ]
    );

    res.json({
      message: 'Prompt updated successfully.',
      prompt:  result.rows[0],
    });
  } catch (err) {
    console.error('❌ Update prompt error:', err.message);
    res.status(500).json({ error: 'Failed to update prompt.' });
  }
};

// ── Delete Prompt ─────────────────────────────────────────────────────────────

const deletePrompt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      'DELETE FROM prompts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prompt not found or access denied.' });
    }

    res.json({ message: 'Prompt deleted successfully.' });
  } catch (err) {
    console.error('❌ Delete prompt error:', err.message);
    res.status(500).json({ error: 'Failed to delete prompt.' });
  }
};

module.exports = {
  createPrompt,
  getPrompts,
  getPrompt,
  updatePrompt,
  deletePrompt,
};