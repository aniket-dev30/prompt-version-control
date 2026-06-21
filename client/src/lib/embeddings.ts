// ── Semantic similarity using Transformers.js ─────────────────────────────────
// Runs entirely in the browser — no API calls, no server cost.
// Uses a small sentence-embedding model to convert text into vectors,
// then compares vectors using cosine similarity.

import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers'

// Disable local model lookup so it always fetches from the Hugging Face CDN.
env.allowLocalModels = false

let embedder: FeatureExtractionPipeline | null = null
let loadingPromise: Promise<FeatureExtractionPipeline> | null = null

/**
 * Lazily loads the embedding model. Only downloads once per session
 * (browser caches the model after first load).
 */
async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (embedder) return embedder

  if (!loadingPromise) {
    loadingPromise = pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { quantized: true }
    ) as Promise<FeatureExtractionPipeline>
  }

  embedder = await loadingPromise
  return embedder
}

/**
 * Converts a piece of text into a numeric embedding vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const model = await getEmbedder()
  const output = await model(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}

/**
 * Computes embeddings for multiple texts in one batch — more efficient
 * than calling embedText() in a loop.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const model = await getEmbedder()
  const results: number[][] = []

  for (const text of texts) {
    const output = await model(text, { pooling: 'mean', normalize: true })
    results.push(Array.from(output.data as Float32Array))
  }

  return results
}

/**
 * Cosine similarity between two vectors of the same length.
 * Returns a value between -1 and 1 (1 = identical, 0 = unrelated).
 * Since embeddings are normalized, this simplifies to a dot product.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must be the same length to compare.')
  }
  let dot = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
  }
  return dot
}

/**
 * Given a target text and a list of candidate {id, text} pairs,
 * returns candidates ranked by similarity (highest first).
 */
export interface SimilarityResult {
  id: string
  score: number
}

export async function findSimilar(
  targetText: string,
  candidates: { id: string; text: string }[],
  excludeId?: string
): Promise<SimilarityResult[]> {
  const targetVector = await embedText(targetText)

  const filtered = excludeId
    ? candidates.filter(c => c.id !== excludeId)
    : candidates

  const results: SimilarityResult[] = []

  for (const candidate of filtered) {
    const vector = await embedText(candidate.text)
    const score = cosineSimilarity(targetVector, vector)
    results.push({ id: candidate.id, score })
  }

  return results.sort((a, b) => b.score - a.score)
}