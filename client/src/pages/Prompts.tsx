import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promptsAPI } from '../lib/api'
import { findSimilar } from '../lib/embeddings'

// ── Icons ──────────────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const SparklesIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v4M3 12h4M12 17v4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
)
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)
const GlobeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
  </svg>
)
const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const LayersIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
  </svg>
)
const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// ── Types ──────────────────────────────────────────────────────────────────────

interface PromptItem {
  id: string
  name: string
  description: string | null
  tags: string[]
  is_public: boolean
  created_at: string
  updated_at: string
  version_count: number
  latest_version: number | null
}

// ── Time formatting ────────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateString).toLocaleDateString()
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Prompts() {
  const navigate    = useNavigate()
  const queryClient  = useQueryClient()

  const [search, setSearch]         = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PromptItem | null>(null)
  const [similarTarget, setSimilarTarget] = useState<PromptItem | null>(null)

  // ── Fetch prompts ──────────────────────────────────────────────────────────
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['prompts', search],
    queryFn: () => promptsAPI.getAll({ search: search || undefined, limit: 50 }),
  })

  const prompts: PromptItem[] = data?.data?.prompts || []

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => promptsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
      setDeleteTarget(null)
    },
  })

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Prompts</h1>
          <p style={styles.subtitle}>
            {prompts.length} {prompts.length === 1 ? 'prompt' : 'prompts'} in your workspace
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={styles.createBtn}
          onMouseEnter={e => (e.currentTarget.style.background = '#4f46e5')}
          onMouseLeave={e => (e.currentTarget.style.background = '#6366f1')}
        >
          <PlusIcon /> New prompt
        </button>
      </div>

      {/* Search */}
      <div style={styles.searchWrapper}>
        <span style={styles.searchIcon}><SearchIcon /></span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search prompts by name or description…"
          style={styles.searchInput}
          onFocus={e => (e.target.style.borderColor = '#6366f1')}
          onBlur={e => (e.target.style.borderColor = '#1e1e2e')}
        />
      </div>

      {/* Content states */}
      {isLoading && (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>Loading prompts…</p>
        </div>
      )}

      {isError && (
        <div style={styles.errorBox}>
          {(error as any)?.response?.data?.error || 'Failed to load prompts. Please try again.'}
        </div>
      )}

      {!isLoading && !isError && prompts.length === 0 && (
        <div style={styles.emptyState}>
          <LayersIcon />
          <p style={styles.emptyTitle}>No prompts yet</p>
          <p style={styles.emptyText}>Create your first prompt to start versioning it like code.</p>
          <button onClick={() => setShowCreateModal(true)} style={styles.emptyCreateBtn}>
            <PlusIcon /> New prompt
          </button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && prompts.length > 0 && (
        <div style={styles.grid}>
          {prompts.map(prompt => (
            <div
              key={prompt.id}
              style={styles.card}
              onClick={() => navigate(`/prompts/${prompt.id}`)}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#3f3f52'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#1e1e2e'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{prompt.name}</h3>
                <div style={styles.cardHeaderRight}>
                  <span style={{
                    ...styles.visibilityBadge,
                    color: prompt.is_public ? '#34d399' : '#9ca3af',
                    background: prompt.is_public ? 'rgba(52,211,153,0.1)' : 'rgba(156,163,175,0.1)',
                  }}>
                    {prompt.is_public ? <GlobeIcon /> : <LockIcon />}
                    {prompt.is_public ? 'Public' : 'Private'}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setSimilarTarget(prompt) }}
                    style={styles.similarBtn}
                    aria-label="Find similar prompts"
                    onMouseEnter={e => (e.currentTarget.style.color = '#818cf8')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                  >
                    <SparklesIcon />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(prompt) }}
                    style={styles.deleteBtn}
                    aria-label="Delete prompt"
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>

              <p style={styles.cardDesc}>
                {prompt.description || 'No description provided.'}
              </p>

              {prompt.tags.length > 0 && (
                <div style={styles.tagRow}>
                  {prompt.tags.slice(0, 4).map(tag => (
                    <span key={tag} style={styles.tag}>{tag}</span>
                  ))}
                  {prompt.tags.length > 4 && (
                    <span style={styles.tag}>+{prompt.tags.length - 4}</span>
                  )}
                </div>
              )}

              <div style={styles.cardFooter}>
                <span style={styles.versionBadge}>
                  <LayersIcon />
                  {prompt.version_count === 0
                    ? 'No versions'
                    : `v${prompt.latest_version} · ${prompt.version_count} version${prompt.version_count > 1 ? 's' : ''}`}
                </span>
                <span style={styles.timeText}>{timeAgo(prompt.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreatePromptModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => {
            setShowCreateModal(false)
            queryClient.invalidateQueries({ queryKey: ['prompts'] })
            navigate(`/prompts/${id}`)
          }}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.confirmTitle}>Delete "{deleteTarget.name}"?</h3>
            <p style={styles.confirmText}>
              This will permanently delete the prompt and all {deleteTarget.version_count} version
              {deleteTarget.version_count !== 1 ? 's' : ''}. This cannot be undone.
            </p>
            {deleteMutation.isError && (
              <div style={styles.errorBox}>
                {(deleteMutation.error as any)?.response?.data?.error || 'Failed to delete prompt.'}
              </div>
            )}
            <div style={styles.confirmActions}>
              <button onClick={() => setDeleteTarget(null)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                style={styles.dangerBtn}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Find similar prompts modal */}
      {similarTarget && (
        <SimilarPromptsModal
          target={similarTarget}
          allPrompts={prompts}
          onClose={() => setSimilarTarget(null)}
          onNavigate={(promptId) => {
            setSimilarTarget(null)
            navigate(`/prompts/${promptId}`)
          }}
        />
      )}
    </div>
  )
}

// ── Create Prompt Modal ─────────────────────────────────────────────────────────

function CreatePromptModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput]     = useState('')
  const [isPublic, setIsPublic]       = useState(false)
  const [error, setError]             = useState('')

  const createMutation = useMutation({
    mutationFn: () => promptsAPI.create({
      name: name.trim(),
      description: description.trim() || undefined,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      is_public: isPublic,
    }),
    onSuccess: (res) => onCreated(res.data.prompt.id),
    onError: (err: any) => {
      setError(err?.response?.data?.error || 'Failed to create prompt.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Prompt name is required.')
      return
    }
    setError('')
    createMutation.mutate()
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>New prompt</h3>
          <button onClick={onClose} style={styles.closeBtn}><XIcon /></button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Customer Support Bot"
              autoFocus
              style={styles.input}
              onFocus={e => {
                e.target.style.borderColor = '#6366f1'
                e.target.style.background = '#252530'
                e.target.style.color = '#ffffff'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#2d2d38'
                e.target.style.background = '#1a1a22'
                e.target.style.color = '#ffffff'
              }}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this prompt do?"
              rows={3}
              style={{ ...styles.input, resize: 'vertical', fontFamily: 'inherit' }}
              onFocus={e => {
                e.target.style.borderColor = '#6366f1'
                e.target.style.background = '#252530'
                e.target.style.color = '#ffffff'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#2d2d38'
                e.target.style.background = '#1a1a22'
                e.target.style.color = '#ffffff'
              }}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="support, customer, email"
              style={styles.input}
              onFocus={e => {
                e.target.style.borderColor = '#6366f1'
                e.target.style.background = '#252530'
                e.target.style.color = '#ffffff'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#2d2d38'
                e.target.style.background = '#1a1a22'
                e.target.style.color = '#ffffff'
              }}
            />
          </div>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkboxLabel}>Make this prompt public</span>
          </label>

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={styles.primaryBtn}
            >
              {createMutation.isPending ? 'Creating…' : 'Create prompt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Find Similar Prompts Modal ──────────────────────────────────────────────────

interface SimilarPromptDisplay extends PromptItem {
  score: number
}

function SimilarPromptsModal({ target, allPrompts, onClose, onNavigate }: {
  target: PromptItem
  allPrompts: PromptItem[]
  onClose: () => void
  onNavigate: (promptId: string) => void
}) {
  const [results, setResults] = useState<SimilarPromptDisplay[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingStage, setLoadingStage] = useState('Loading embedding model…')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const others = allPrompts.filter(p => p.id !== target.id)

        if (others.length === 0) {
          if (!cancelled) {
            setResults([])
            setIsLoading(false)
          }
          return
        }

        setLoadingStage('Loading embedding model… (first time may take a few seconds)')

        const targetText = `${target.name}. ${target.description || ''}`
        const candidates = others.map(p => ({
          id: p.id,
          text: `${p.name}. ${p.description || ''}`,
        }))

        setLoadingStage('Computing similarity…')
        const similarities = await findSimilar(targetText, candidates)

        if (cancelled) return

        const merged: SimilarPromptDisplay[] = similarities
          .map(s => {
            const prompt = others.find(p => p.id === s.id)
            return prompt ? { ...prompt, score: s.score } : null
          })
          .filter((p): p is SimilarPromptDisplay => p !== null)
          .slice(0, 5)

        setResults(merged)
        setIsLoading(false)
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to compute similarity. Please try again.')
          setIsLoading(false)
        }
      }
    }

    run()
    return () => { cancelled = true }
  }, [target.id, allPrompts])

  const scoreColor = (score: number) => {
    if (score >= 0.7) return '#34d399'
    if (score >= 0.5) return '#fbbf24'
    return '#6b7280'
  }

  const scoreLabel = (score: number) => {
    if (score >= 0.7) return 'Very similar'
    if (score >= 0.5) return 'Somewhat similar'
    return 'Loosely related'
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.similarModal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>Similar to "{target.name}"</h3>
            <p style={styles.similarSubtitle}>
              Computed locally in your browser using sentence embeddings — no API call.
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}><XIcon /></button>
        </div>

        {isLoading && (
          <div style={styles.similarLoading}>
            <p style={styles.similarLoadingText}>{loadingStage}</p>
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}

        {!isLoading && !error && results && results.length === 0 && (
          <p style={styles.similarEmptyText}>
            You need at least one other prompt to compare against.
          </p>
        )}

        {!isLoading && !error && results && results.length > 0 && (
          <div style={styles.similarList}>
            {results.map(r => (
              <button
                key={r.id}
                onClick={() => onNavigate(r.id)}
                style={styles.similarItem}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#3f3f52')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e2e')}
              >
                <div style={styles.similarItemTop}>
                  <span style={styles.similarItemName}>{r.name}</span>
                  <span style={{ ...styles.similarScoreBadge, color: scoreColor(r.score) }}>
                    {Math.round(r.score * 100)}%
                  </span>
                </div>
                <p style={styles.similarItemDesc}>
                  {r.description || 'No description provided.'}
                </p>
                <span style={{ ...styles.similarScoreLabel, color: scoreColor(r.score) }}>
                  {scoreLabel(r.score)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1200px' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem',
  },
  title: { fontSize: '1.6rem', fontWeight: 700, color: '#f1f1f3', margin: '0 0 0.25rem' },
  subtitle: { fontSize: '0.85rem', color: '#6b7280', margin: 0 },
  createBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px',
    padding: '0.65rem 1.1rem', fontSize: '0.88rem', fontWeight: 600,
    cursor: 'pointer', transition: 'background 0.2s', whiteSpace: 'nowrap',
  },
  searchWrapper: { position: 'relative', marginBottom: '1.5rem', maxWidth: '420px' },
  searchIcon: {
    position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)',
    color: '#6b7280', display: 'flex',
  },
  searchInput: {
    width: '100%', background: '#13131a', border: '1px solid #1e1e2e', borderRadius: '8px',
    padding: '0.65rem 1rem 0.65rem 2.5rem', color: '#f1f1f3', fontSize: '0.88rem',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem',
  },
  card: {
    position: 'relative', background: '#13131a', border: '1px solid #1e1e2e', borderRadius: '12px',
    padding: '1.25rem', cursor: 'pointer', transition: 'border-color 0.2s, transform 0.15s',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: '0.5rem', marginBottom: '0.5rem',
  },
  cardHeaderRight: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0,
  },
  cardTitle: { fontSize: '1rem', fontWeight: 600, color: '#f1f1f3', margin: 0, minWidth: 0 },
  visibilityBadge: {
    display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 600,
    padding: '0.2rem 0.5rem', borderRadius: '999px', whiteSpace: 'nowrap', flexShrink: 0,
  },
  similarBtn: {
    background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer',
    padding: '2px', display: 'flex', transition: 'color 0.15s', flexShrink: 0,
  },
  deleteBtn: {
    background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer',
    padding: '2px', display: 'flex', transition: 'color 0.15s', flexShrink: 0,
  },
  cardDesc: {
    fontSize: '0.82rem', color: '#9ca3af', margin: '0 0 0.85rem', lineHeight: 1.45,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
    minHeight: '2.3em',
  },
  tagRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' },
  tag: {
    fontSize: '0.7rem', color: '#818cf8', background: 'rgba(99,102,241,0.1)',
    padding: '0.2rem 0.55rem', borderRadius: '999px', fontWeight: 500,
  },
  cardFooter: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: '0.75rem', borderTop: '1px solid #1e1e2e',
  },
  versionBadge: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem', color: '#6b7280' },
  timeText: { fontSize: '0.74rem', color: '#4b5563' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '4rem 2rem', color: '#6b7280', textAlign: 'center',
  },
  emptyTitle: { fontSize: '1.05rem', fontWeight: 600, color: '#9ca3af', margin: '1rem 0 0.4rem' },
  emptyText: { fontSize: '0.85rem', margin: 0, maxWidth: '320px' },
  emptyCreateBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#6366f1', color: '#fff',
    border: 'none', borderRadius: '8px', padding: '0.6rem 1.1rem', fontSize: '0.85rem',
    fontWeight: 600, cursor: 'pointer', marginTop: '1.25rem',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
    padding: '0.7rem 1rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.85rem',
  },

  // Modal
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50,
  },
  modal: {
    width: '100%', maxWidth: '440px', background: '#13131a', border: '1px solid #1e1e2e',
    borderRadius: '14px', padding: '1.5rem', boxSizing: 'border-box',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' },
  modalTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#f1f1f3', margin: 0 },
  closeBtn: { background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', display: 'flex' },
  fieldGroup: { marginBottom: '1rem' },
  label: {
    display: 'block', color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600,
    letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.4rem',
  },
  input: {
    width: '100%', background: '#1a1a22', border: '1px solid #2d2d38', borderRadius: '8px',
    padding: '0.65rem 0.9rem', color: '#ffffff', fontSize: '0.88rem', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s, background-color 0.2s',
  },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', cursor: 'pointer' },
  checkbox: { width: '15px', height: '15px', accentColor: '#6366f1', cursor: 'pointer' },
  checkboxLabel: { fontSize: '0.85rem', color: '#9ca3af' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' },
  cancelBtn: {
    background: 'transparent', border: '1px solid #1e1e2e', color: '#9ca3af', borderRadius: '8px',
    padding: '0.6rem 1.1rem', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
  },
  primaryBtn: {
    background: '#6366f1', border: 'none', color: '#fff', borderRadius: '8px',
    padding: '0.6rem 1.1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
  },
  dangerBtn: {
    background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px',
    padding: '0.6rem 1.1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
  },
  confirmModal: {
    width: '100%', maxWidth: '400px', background: '#13131a', border: '1px solid #1e1e2e',
    borderRadius: '14px', padding: '1.5rem', boxSizing: 'border-box',
  },
  confirmTitle: { fontSize: '1.05rem', fontWeight: 700, color: '#f1f1f3', margin: '0 0 0.6rem' },
  confirmText: { fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.5, margin: '0 0 1.25rem' },
  confirmActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' },

  // Similar prompts modal
  similarModal: {
    width: '100%', maxWidth: '480px', background: '#13131a', border: '1px solid #1e1e2e',
    borderRadius: '14px', padding: '1.5rem', boxSizing: 'border-box', maxHeight: '85vh', overflowY: 'auto',
  },
  similarSubtitle: { fontSize: '0.76rem', color: '#6b7280', margin: '0.3rem 0 0', maxWidth: '320px' },
  similarLoading: { padding: '2.5rem 1rem', textAlign: 'center' },
  similarLoadingText: { fontSize: '0.85rem', color: '#9ca3af', margin: 0 },
  similarEmptyText: { fontSize: '0.85rem', color: '#6b7280', textAlign: 'center', padding: '2rem 1rem' },
  similarList: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  similarItem: {
    textAlign: 'left', width: '100%', background: '#0a0a0f', border: '1px solid #1e1e2e',
    borderRadius: '10px', padding: '0.85rem', cursor: 'pointer', transition: 'border-color 0.15s',
  },
  similarItemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' },
  similarItemName: { fontSize: '0.88rem', fontWeight: 600, color: '#e5e7eb' },
  similarScoreBadge: { fontSize: '0.8rem', fontWeight: 700, fontFamily: 'monospace' },
  similarItemDesc: {
    fontSize: '0.78rem', color: '#9ca3af', margin: '0 0 0.4rem', lineHeight: 1.4,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  similarScoreLabel: { fontSize: '0.7rem', fontWeight: 600 },
}