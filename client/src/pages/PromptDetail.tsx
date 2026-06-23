import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api, { promptsAPI, versionsAPI, executionAPI, evaluationAPI } from '../lib/api'

// ── Icons ──────────────────────────────────────────────────────────────────────

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
)
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const GlobeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
  </svg>
)
const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

// ── Types ──────────────────────────────────────────────────────────────────────

export interface VersionItem {
  id: string
  version_number: number
  system_prompt: string | null
  user_prompt: string
  commit_message: string | null
  model: string
  temperature: string
  max_tokens: number
  variables: Record<string, string>
  created_at: string
}

interface PromptData {
  id: string
  name: string
  description: string | null
  tags: string[]
  is_public: boolean
  created_at: string
  updated_at: string
  versions: VersionItem[] | null
}

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

export default function PromptDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [showNewVersionForm, setShowNewVersionForm] = useState(false)
  const [deleteVersionTarget, setDeleteVersionTarget] = useState<VersionItem | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['prompt', id],
    queryFn: () => promptsAPI.getOne(id!),
    enabled: !!id,
  })

  const prompt: PromptData | undefined = data?.data?.prompt
  const versions = prompt?.versions || []

  const deleteVersionMutation = useMutation({
    mutationFn: (versionNumber: number) => versionsAPI.delete(prompt!.id, versionNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt', id] })
      setSelectedVersion(null) // reset to default (latest)
      setDeleteVersionTarget(null)
    },
  })

  // Default to latest version once loaded
  const activeVersionNumber = selectedVersion ?? versions[0]?.version_number ?? null
  const activeVersion = versions.find(v => v.version_number === activeVersionNumber) || null

  if (isLoading) {
    return <div style={styles.loadingState}>Loading prompt…</div>
  }

  if (isError || !prompt) {
    return (
      <div style={styles.errorState}>
        <p>{(error as any)?.response?.data?.error || 'Prompt not found.'}</p>
        <Link to="/prompts" style={styles.backLink}>← Back to prompts</Link>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Back link */}
      <Link to="/prompts" style={styles.backLink}>
        <ArrowLeftIcon /> Back to prompts
      </Link>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>{prompt.name}</h1>
            <span style={{
              ...styles.visibilityBadge,
              color: prompt.is_public ? '#34d399' : '#9ca3af',
              background: prompt.is_public ? 'rgba(52,211,153,0.1)' : 'rgba(156,163,175,0.1)',
            }}>
              {prompt.is_public ? <GlobeIcon /> : <LockIcon />}
              {prompt.is_public ? 'Public' : 'Private'}
            </span>
          </div>
          {prompt.description && <p style={styles.description}>{prompt.description}</p>}
          {prompt.tags.length > 0 && (
            <div style={styles.tagRow}>
              {prompt.tags.map(tag => <span key={tag} style={styles.tag}>{tag}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Main layout: sidebar + panel */}
      <div style={styles.layout}>
        {/* Version sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <span style={styles.sidebarTitle}>Versions ({versions.length})</span>
            <button
              onClick={() => setShowNewVersionForm(true)}
              style={styles.newVersionBtn}
              onMouseEnter={e => (e.currentTarget.style.background = '#4f46e5')}
              onMouseLeave={e => (e.currentTarget.style.background = '#6366f1')}
            >
              <PlusIcon /> New
            </button>
          </div>

          {versions.length === 0 ? (
            <p style={styles.noVersionsText}>No versions yet. Create your first one.</p>
          ) : (
            <div style={styles.versionList}>
              {versions.map(v => (
                <div
                  key={v.id}
                  style={{
                    ...styles.versionItem,
                    background: v.version_number === activeVersionNumber ? 'rgba(99,102,241,0.12)' : 'transparent',
                    borderColor: v.version_number === activeVersionNumber ? '#6366f1' : '#1e1e2e',
                    position: 'relative',
                  }}
                >
                  <button
                    onClick={() => setSelectedVersion(v.version_number)}
                    style={styles.versionItemClickArea}
                  >
                    <div style={styles.versionItemTop}>
                      <span style={{
                        ...styles.versionNumber,
                        color: v.version_number === activeVersionNumber ? '#818cf8' : '#e5e7eb',
                      }}>
                        v{v.version_number}
                      </span>
                      {v.version_number === versions[0].version_number && (
                        <span style={styles.latestBadge}>latest</span>
                      )}
                    </div>
                    <p style={styles.versionCommit}>
                      {v.commit_message || 'No commit message'}
                    </p>
                    <span style={styles.versionTime}>
                      <ClockIcon /> {timeAgo(v.created_at)}
                    </span>
                  </button>
                  {versions.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteVersionTarget(v) }}
                      style={styles.versionDeleteBtn}
                      aria-label={`Delete version ${v.version_number}`}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main panel */}
        <div style={styles.mainPanel}>
          {activeVersion ? (
            <VersionDetailPanel
              promptId={prompt.id}
              version={activeVersion}
              allVersions={versions}
              onVersionCreated={() => {
                queryClient.invalidateQueries({ queryKey: ['prompt', id] })
                setShowNewVersionForm(false)
              }}
            />
          ) : (
            <div style={styles.emptyPanel}>
              <p>Create your first version to get started.</p>
              <button onClick={() => setShowNewVersionForm(true)} style={styles.primaryBtn}>
                <PlusIcon /> Create version
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New version modal */}
      {showNewVersionForm && (
        <NewVersionModal
          promptId={prompt.id}
          baseVersion={activeVersion}
          onClose={() => setShowNewVersionForm(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['prompt', id] })
            setShowNewVersionForm(false)
            setSelectedVersion(null) // will default to new latest
          }}
        />
      )}

      {/* Delete version confirmation modal */}
      {deleteVersionTarget && (
        <div style={styles.modalOverlay} onClick={() => setDeleteVersionTarget(null)}>
          <div style={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.confirmTitle}>Delete v{deleteVersionTarget.version_number}?</h3>
            <p style={styles.confirmText}>
              This will permanently delete this version, its evaluation score, and any saved
              execution outputs. This cannot be undone.
            </p>
            {deleteVersionMutation.isError && (
              <div style={styles.errorBox}>
                {(deleteVersionMutation.error as any)?.response?.data?.error || 'Failed to delete version.'}
              </div>
            )}
            <div style={styles.modalActions}>
              <button onClick={() => setDeleteVersionTarget(null)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={() => deleteVersionMutation.mutate(deleteVersionTarget.version_number)}
                disabled={deleteVersionMutation.isPending}
                style={styles.dangerBtn}
              >
                {deleteVersionMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── New Version Modal ──────────────────────────────────────────────────────────

interface NewVersionModalProps {
  promptId: string
  baseVersion: VersionItem | null
  onClose: () => void
  onCreated: () => void
}

function NewVersionModal({ promptId, baseVersion, onClose, onCreated }: NewVersionModalProps) {
  const [systemPrompt, setSystemPrompt] = useState(baseVersion?.system_prompt || '')
  const [userPrompt, setUserPrompt] = useState(baseVersion?.user_prompt || '')
  const [commitMessage, setCommitMessage] = useState('')
  const [model, setModel] = useState(baseVersion?.model || 'gemini-3.1-flash-lite')
  const [temperature, setTemperature] = useState(baseVersion?.temperature || '0.7')
  const [maxTokens, setMaxTokens] = useState(baseVersion?.max_tokens || 1000)
  const [variables, setVariables] = useState<Record<string, string>>(baseVersion?.variables || {})
  const [varInput, setVarInput] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState('')
  const [error, setError] = useState('') 

  const queryClient = useQueryClient()
  const handleGetSuggestions = async () => {
  console.log('Get Suggestions clicked')
  setSuggestionsLoading(true)
  setSuggestionsError('')

  try {
    const allVersionsRes = await versionsAPI.getAll(promptId)
    console.log('Versions response', allVersionsRes)

    const allVersions = allVersionsRes.data.versions || []

    console.log('1 - Before import')

    const { embedText, cosineSimilarity } = await import('../lib/embeddings')

    console.log('2 - Import successful')

    const draftText = `System: ${systemPrompt}\nUser: ${userPrompt}`

    console.log('3 - Before embedding')

    const draftVector = await embedText(draftText)

    console.log('4 - Draft embedding complete')

    
    // Score all versions and get top 3
    const scored = await Promise.all(
      allVersions.map(async (v: any) => {
        const vText = `System: ${v.system_prompt || ''}\nUser: ${v.user_prompt}`
        const vVector = await embedText(vText)
        return { ...v, score: cosineSimilarity(draftVector, vVector) }
      })
    )
    
    const similar = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
    
    // Call backend
    const res = await api.post(
  `/prompts/${promptId}/suggest-improvements`,
  {
    draft_system_prompt: systemPrompt.trim() || undefined,
    draft_user_prompt: userPrompt.trim(),
    retrieved_examples: similar.map(v => ({
      id: v.id,
      name: `v${v.version_number}`,
      system_prompt: v.system_prompt,
      user_prompt: v.user_prompt,
      score: v.score
    }))
  }
)
console.log('Suggestions Data', res.data)

setSuggestions(res.data.suggestions || [])
setShowSuggestions(true)
  } catch (err: any) {
  console.error('Suggestion Error:', err)
  console.error('Response:', err?.response?.data)

  setSuggestionsError(
    err?.response?.data?.error ||
    err?.message ||
    'Error fetching suggestions'
  )
} finally {
    setSuggestionsLoading(false)
  }
}

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!userPrompt.trim()) {
        setError('User prompt is required')
        return
      }
      return versionsAPI.create(promptId, {
        system_prompt: systemPrompt.trim() || undefined,
        user_prompt: userPrompt.trim(),
        commit_message: commitMessage.trim() || undefined,
        model,
        temperature: parseFloat(temperature),
        max_tokens: parseInt(maxTokens.toString()),
        variables: Object.keys(variables).length > 0 ? variables : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt', promptId] })
      onCreated()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create version')
    },
  })

  const handleAddVariable = () => {
    if (varInput.trim()) {
      setVariables(prev => ({ ...prev, [varInput]: '' }))
      setVarInput('')
    }
  }

  const handleRemoveVariable = (key: string) => {
    setVariables(prev => {
      const newVars = { ...prev }
      delete newVars[key]
      return newVars
    })
  }

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }))
  }
  console.log("Suggestions state:", suggestions);

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h2 style={styles.modalTitle}>
          {baseVersion ? `Create v${baseVersion.version_number + 1}` : 'Create new version'}
        </h2>

        {error && <div style={styles.errorBox}>{error}</div>}

        <div style={styles.fieldGroup}>
          <label style={styles.label}>System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="Optional system prompt for the model…"
            style={{ ...styles.input, minHeight: '100px', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' } as React.CSSProperties}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>User Prompt *</label>
          <textarea
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            placeholder="Main prompt for the model…"
            style={{ ...styles.input, minHeight: '120px', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' } as React.CSSProperties}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Commit Message</label>
          <input
            type="text"
            value={commitMessage}
            onChange={e => setCommitMessage(e.target.value)}
            placeholder="Describe changes in this version…"
            style={styles.input}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Model</label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              style={styles.input}
            >
              <option>gemini-3.1-flash-lite</option>
              <option>gemini-3.1-flash</option>
              <option>gemini-3.1-pro</option>
              <option>gemini-3.5-sonnet</option>
            </select>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Temperature</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={e => setTemperature(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Max Tokens</label>
            <input
              type="number"
              min="1"
              value={maxTokens}
              onChange={e => setMaxTokens(parseInt(e.target.value))}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Variables</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <input
              type="text"
              value={varInput}
              onChange={e => setVarInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddVariable()}
              placeholder="Add variable name…"
              style={styles.input}
            />
            <button
              onClick={handleAddVariable}
              style={{
                ...styles.primaryBtn,
                padding: '0.65rem 1rem',
                margin: 0,
              }}
            >
              Add
            </button>
          </div>
          {Object.keys(variables).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(variables).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#818cf8', fontFamily: 'monospace', flex: 1 }}>
                    {`{{${key}}}`}
                  </span>
                  <input
                    type="text"
                    value={val}
                    onChange={e => handleVariableChange(key, e.target.value)}
                    placeholder="default value"
                    style={{ ...styles.input, fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                  />
                  <button
                    onClick={() => handleRemoveVariable(key)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      padding: '0.4rem',
                      fontSize: '0.9rem',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {showSuggestions && (
  <div style={{
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '1rem'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <h3 style={{ margin: 0, color: '#f3f4f6', fontSize: '0.9rem' }}>
        💡 AI Suggestions Based on Your Patterns
      </h3>
      <button
        onClick={() => setShowSuggestions(false)}
        style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
      >
        ✕
      </button>
    </div>
    
    {suggestions.length > 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {suggestions.map((s, i) => (
          <div key={i} style={{
            backgroundColor: '#111827',
            padding: '0.75rem',
            borderRadius: '0.4rem',
            borderLeft: '3px solid #818cf8'
          }}>
<h4 style={{
  margin: '0 0 0.5rem 0',
  color: '#818cf8',
  fontSize: '0.85rem'
}}>
  {s.title}
</h4>

<p style={{
  margin: 0,
  color: '#e5e7eb',
  fontSize: '0.8rem',
  whiteSpace: 'pre-wrap'
}}>
  {s.explanation}
</p>
          </div>
        ))}
      </div>
    ) : suggestionsError ? (
      <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.8rem' }}>{suggestionsError}</p>
    ) : (
      <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.8rem' }}>
        Click the button above to get suggestions.
      </p>
    )}
  </div>
)}
        <div style={{ ...styles.modalActions, marginBottom: '1rem' }}>
  <button
    onClick={handleGetSuggestions}
    disabled={suggestionsLoading || !userPrompt.trim()}
    style={{
      ...styles.primaryBtn,
      backgroundColor: '#6366f1',
      opacity: suggestionsLoading || !userPrompt.trim() ? 0.6 : 1,
      cursor: suggestionsLoading || !userPrompt.trim() ? 'not-allowed' : 'pointer'
    }}
  >
    {suggestionsLoading ? '⏳ Getting suggestions…' : '✨ Get AI Suggestions'}
  </button>
</div>

        <div style={styles.modalActions}>
          <button
            onClick={onClose}
            style={styles.cancelBtn}
          >
            Cancel
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            style={{
              ...styles.primaryBtn,
              opacity: createMutation.isPending ? 0.6 : 1,
              cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {createMutation.isPending ? 'Creating…' : 'Create version'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Version Detail Panel (with tabs) ──────────────────────────────────────────

function VersionDetailPanel({ promptId, version, allVersions }: {
  promptId: string
  version: VersionItem
  allVersions: VersionItem[]
  onVersionCreated: () => void
}) {
  const [activeTab, setActiveTab] = useState<'detail' | 'execute' | 'diff' | 'evaluate'>('detail')
  const [compareWith, setCompareWith] = useState<number | null>(null)

  const otherVersions = allVersions.filter(v => v.version_number !== version.version_number)

  return (
    <div>
      {/* Tabs */}
      <div style={panelStyles.tabRow}>
        <button
          onClick={() => setActiveTab('detail')}
          style={{ ...panelStyles.tab, ...(activeTab === 'detail' ? panelStyles.tabActive : {}) }}
        >
          Detail
        </button>
        <button
          onClick={() => setActiveTab('execute')}
          style={{ ...panelStyles.tab, ...(activeTab === 'execute' ? panelStyles.tabActive : {}) }}
        >
          Execute
        </button>
        <button
          onClick={() => setActiveTab('evaluate')}
          style={{ ...panelStyles.tab, ...(activeTab === 'evaluate' ? panelStyles.tabActive : {}) }}
        >
          Evaluate
        </button>
        {otherVersions.length > 0 && (
          <button
            onClick={() => { setActiveTab('diff'); if (!compareWith) setCompareWith(otherVersions[0].version_number) }}
            style={{ ...panelStyles.tab, ...(activeTab === 'diff' ? panelStyles.tabActive : {}) }}
          >
            Compare
          </button>
        )}
      </div>

      {activeTab === 'detail' && <DetailTab version={version} />}
      {activeTab === 'execute' && <ExecuteTab promptId={promptId} version={version} />}
      {activeTab === 'evaluate' && <EvaluateTab promptId={promptId} version={version} />}
      {activeTab === 'diff' && (
        <DiffTab
          promptId={promptId}
          currentVersion={version}
          otherVersions={otherVersions}
          compareWith={compareWith}
          setCompareWith={setCompareWith}
        />
      )}
    </div>
  )
}

// ── Detail Tab ───────────────────────────────────────────────────────────────────

function DetailTab({ version }: { version: VersionItem }) {
  const varKeys = Object.keys(version.variables || {})

  return (
    <div>
      <div style={panelStyles.metaRow}>
        <MetaItem label="Model" value={version.model} />
        <MetaItem label="Temperature" value={version.temperature} />
        <MetaItem label="Max tokens" value={String(version.max_tokens)} />
      </div>

      {version.system_prompt && (
        <div style={panelStyles.promptBlock}>
          <span style={panelStyles.promptLabel}>System prompt</span>
          <pre style={panelStyles.promptText}>{version.system_prompt}</pre>
        </div>
      )}

      <div style={panelStyles.promptBlock}>
        <span style={panelStyles.promptLabel}>User prompt</span>
        <pre style={panelStyles.promptText}>{version.user_prompt}</pre>
      </div>

      {varKeys.length > 0 && (
        <div style={panelStyles.promptBlock}>
          <span style={panelStyles.promptLabel}>Variables</span>
          <div style={panelStyles.varRow}>
            {varKeys.map(k => (
              <span key={k} style={panelStyles.varPill}>{`{{${k}}}`}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={panelStyles.metaItem}>
      <span style={panelStyles.metaLabel}>{label}</span>
      <span style={panelStyles.metaValue}>{value}</span>
    </div>
  )
}

// ── Execute Tab ──────────────────────────────────────────────────────────────────

function ExecuteTab({ promptId, version }: { promptId: string; version: VersionItem }) {
  const varKeys = Object.keys(version.variables || {})
  const [values, setValues] = useState<Record<string, string>>(
    varKeys.reduce((acc, k) => ({ ...acc, [k]: '' }), {})
  )
  const [result, setResult] = useState<{
    output_text: string
    latency_ms: number
    input_tokens: number | null
    output_tokens: number | null
  } | null>(null)
  const [error, setError] = useState('')

  const executeMutation = useMutation({
    mutationFn: () => executionAPI.execute(promptId, version.version_number, { input_variables: values }),
    onSuccess: (res) => {
      setResult(res.data)
      setError('')
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || 'Execution failed. Please try again.')
      setResult(null)
    },
  })

  const handleRun = () => {
    const missing = varKeys.filter(k => !values[k]?.trim())
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(', ')}`)
      return
    }
    setError('')
    executeMutation.mutate()
  }

  return (
    <div>
      {varKeys.length > 0 && (
        <div style={panelStyles.varInputGroup}>
          {varKeys.map(k => (
            <div key={k} style={panelStyles.fieldGroup}>
              <label style={panelStyles.label}>{`{{${k}}}`}</label>
              <input
                type="text"
                value={values[k]}
                onChange={e => setValues(prev => ({ ...prev, [k]: e.target.value }))}
                placeholder={`Enter value for ${k}`}
                style={panelStyles.input}
              />
            </div>
          ))}
        </div>
      )}

      {error && <div style={panelStyles.errorBox}>{error}</div>}

      <button
        onClick={handleRun}
        disabled={executeMutation.isPending}
        style={panelStyles.runBtn}
      >
        {executeMutation.isPending ? 'Running…' : 'Run with Gemini →'}
      </button>

      {executeMutation.isPending && (
        <p style={panelStyles.pendingText}>Calling Gemini API — this can take a few seconds…</p>
      )}

      {result && (
        <div style={panelStyles.resultBox}>
          <div style={panelStyles.resultMeta}>
            <span>⚡ {result.latency_ms}ms</span>
            {result.input_tokens != null && <span>↑ {result.input_tokens} tokens</span>}
            {result.output_tokens != null && <span>↓ {result.output_tokens} tokens</span>}
          </div>
          <pre style={panelStyles.resultText}>{result.output_text}</pre>
        </div>
      )}
    </div>
  )
}

// ── Evaluate Tab ─────────────────────────────────────────────────────────────────

interface EvaluationCriterion {
  score: number
  note: string
}

interface EvaluationData {
  total_score: number
  criteria: {
    clarity: EvaluationCriterion
    specificity: EvaluationCriterion
    structure: EvaluationCriterion
    safety: EvaluationCriterion
  }
  strengths: string[]
  improvements: string[]
  evaluated_at: string
}

function EvaluateTab({ promptId, version }: { promptId: string; version: VersionItem }) {
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  // Try to load a previously saved evaluation on mount
  const { data: savedData, isLoading: isLoadingSaved } = useQuery({
    queryKey: ['evaluation', promptId, version.version_number],
    queryFn: () => evaluationAPI.getSaved(promptId, version.version_number),
    enabled: !loaded,
  })

  if (!loaded && savedData !== undefined) {
    const saved = savedData?.data?.evaluation
    if (saved && !evaluation) setEvaluation(saved)
    setLoaded(true)
  }

  const evaluateMutation = useMutation({
    mutationFn: () => evaluationAPI.evaluate(promptId, version.version_number),
    onSuccess: (res) => {
      setEvaluation(res.data.evaluation)
      setError('')
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || 'Evaluation failed. Please try again.')
    },
  })

  const scoreColor = (score: number) => {
    if (score >= 80) return '#34d399'
    if (score >= 60) return '#fbbf24'
    return '#f87171'
  }

  const CRITERIA_LABELS: Record<string, string> = {
    clarity: 'Clarity',
    specificity: 'Specificity',
    structure: 'Structure',
    safety: 'Safety',
  }

  return (
    <div>
      <div style={panelStyles.evalHeader}>
        <div>
          <p style={panelStyles.evalHeaderTitle}>AI quality scoring</p>
          <p style={panelStyles.evalHeaderSubtitle}>
            Gemini evaluates this prompt on clarity, specificity, structure, and safety.
          </p>
        </div>
        <button
          onClick={() => evaluateMutation.mutate()}
          disabled={evaluateMutation.isPending}
          style={panelStyles.runBtn}
        >
          {evaluateMutation.isPending
            ? 'Evaluating…'
            : evaluation ? 'Re-evaluate' : 'Run evaluation →'}
        </button>
      </div>

      {error && <div style={panelStyles.errorBox}>{error}</div>}

      {isLoadingSaved && !evaluation && (
        <p style={panelStyles.pendingText}>Checking for a saved evaluation…</p>
      )}

      {evaluateMutation.isPending && (
        <p style={panelStyles.pendingText}>Calling Gemini to evaluate this prompt…</p>
      )}

      {evaluation && (
        <div style={panelStyles.evalContainer}>
          {/* Score circle + summary */}
          <div style={panelStyles.scoreRow}>
            <div style={{
              ...panelStyles.scoreCircle,
              borderColor: scoreColor(evaluation.total_score),
            }}>
              <span style={{ ...panelStyles.scoreNumber, color: scoreColor(evaluation.total_score) }}>
                {evaluation.total_score}
              </span>
              <span style={panelStyles.scoreMax}>/100</span>
            </div>
            <div style={panelStyles.criteriaList}>
              {Object.entries(evaluation.criteria).map(([key, c]) => (
                <div key={key} style={panelStyles.criterionRow}>
                  <div style={panelStyles.criterionTop}>
                    <span style={panelStyles.criterionLabel}>{CRITERIA_LABELS[key] || key}</span>
                    <span style={{ ...panelStyles.criterionScore, color: scoreColor(c.score * 4) }}>
                      {c.score}/25
                    </span>
                  </div>
                  <div style={panelStyles.criterionBarTrack}>
                    <div style={{
                      ...panelStyles.criterionBarFill,
                      width: `${(c.score / 25) * 100}%`,
                      background: scoreColor(c.score * 4),
                    }} />
                  </div>
                  <p style={panelStyles.criterionNote}>{c.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths and improvements */}
          <div style={panelStyles.feedbackGrid}>
            {evaluation.strengths.length > 0 && (
              <div style={panelStyles.feedbackBlock}>
                <span style={{ ...panelStyles.feedbackLabel, color: '#34d399' }}>✓ Strengths</span>
                <ul style={panelStyles.feedbackList}>
                  {evaluation.strengths.map((s, i) => (
                    <li key={i} style={panelStyles.feedbackItem}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {evaluation.improvements.length > 0 && (
              <div style={panelStyles.feedbackBlock}>
                <span style={{ ...panelStyles.feedbackLabel, color: '#fbbf24' }}>✗ Improvements</span>
                <ul style={panelStyles.feedbackList}>
                  {evaluation.improvements.map((s, i) => (
                    <li key={i} style={panelStyles.feedbackItem}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p style={panelStyles.evalTimestamp}>
            Last evaluated {new Date(evaluation.evaluated_at).toLocaleString()}
          </p>
        </div>
      )}

      {!evaluation && !evaluateMutation.isPending && !isLoadingSaved && (
        <div style={panelStyles.evalEmptyState}>
          <p style={panelStyles.emptyText}>No evaluation yet for this version.</p>
        </div>
      )}
    </div>
  )
}

// ── Diff Tab ─────────────────────────────────────────────────────────────────────

interface DiffField {
  changed: boolean
  v1: string | number | null
  v2: string | number | null
}

interface DiffResponse {
  v1: number
  v2: number
  diff: Record<string, DiffField>
  variables_diff: Record<string, DiffField>
}

function DiffTab({ promptId, currentVersion, otherVersions, compareWith, setCompareWith }: {
  promptId: string
  currentVersion: VersionItem
  otherVersions: VersionItem[]
  compareWith: number | null
  setCompareWith: (n: number) => void
}) {
  const [changelog, setChangelog] = useState<{ summary: string; impact: string } | null>(null)
  const [changelogError, setChangelogError] = useState('')

  const v1 = Math.min(currentVersion.version_number, compareWith || 0)
  const v2 = Math.max(currentVersion.version_number, compareWith || 0)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['diff', promptId, v1, v2],
    queryFn: () => versionsAPI.diff(promptId, v1, v2),
    enabled: !!compareWith && compareWith !== currentVersion.version_number,
  })

  const changelogMutation = useMutation({
    mutationFn: () => versionsAPI.changelog(promptId, v1, v2),
    onSuccess: (res) => {
      setChangelog(res.data)
      setChangelogError('')
    },
    onError: (err: any) => {
      setChangelogError(err?.response?.data?.error || 'Failed to generate changelog.')
    },
  })

  const diffData: DiffResponse | undefined = data?.data

  const FIELD_LABELS: Record<string, string> = {
    system_prompt: 'System prompt',
    user_prompt: 'User prompt',
    model: 'Model',
    temperature: 'Temperature',
    max_tokens: 'Max tokens',
  }

  const handleCompareChange = (newCompareWith: number) => {
    setCompareWith(newCompareWith)
    setChangelog(null)
    setChangelogError('')
  }

  return (
    <div>
      <div style={panelStyles.fieldGroup}>
        <label style={panelStyles.label}>Compare v{currentVersion.version_number} with</label>
        <select
          value={compareWith ?? ''}
          onChange={e => handleCompareChange(Number(e.target.value))}
          style={panelStyles.select}
        >
          {otherVersions.map(v => (
            <option key={v.version_number} value={v.version_number}>
              Version {v.version_number} {v.commit_message ? `— ${v.commit_message}` : ''}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p style={panelStyles.pendingText}>Loading diff…</p>}
      {isError && <div style={panelStyles.errorBox}>Failed to load diff.</div>}

      {diffData && (
        <>
          {/* AI Changelog section */}
          <div style={panelStyles.changelogBlock}>
            <div style={panelStyles.changelogHeader}>
              <div>
                <p style={panelStyles.changelogTitle}>AI-generated changelog</p>
                <p style={panelStyles.changelogSubtitle}>
                  Gemini summarizes what changed between v{diffData.v1} and v{diffData.v2}.
                </p>
              </div>
              <button
                onClick={() => changelogMutation.mutate()}
                disabled={changelogMutation.isPending}
                style={panelStyles.changelogBtn}
              >
                {changelogMutation.isPending
                  ? 'Generating…'
                  : changelog ? 'Regenerate' : 'Generate →'}
              </button>
            </div>

            {changelogError && <div style={panelStyles.errorBox}>{changelogError}</div>}

            {changelogMutation.isPending && (
              <p style={panelStyles.pendingText}>Calling Gemini to write the changelog…</p>
            )}

            {changelog && (
              <div style={panelStyles.changelogResult}>
                <p style={panelStyles.changelogSummary}>{changelog.summary}</p>
                <div style={panelStyles.changelogImpactRow}>
                  <span style={panelStyles.changelogImpactLabel}>Expected impact</span>
                  <span style={panelStyles.changelogImpactValue}>{changelog.impact}</span>
                </div>
              </div>
            )}
          </div>

          {/* Field-by-field diff */}
          <div style={panelStyles.diffContainer}>
            {Object.entries(diffData.diff).map(([field, info]) => (
              <div key={field} style={panelStyles.diffBlock}>
                <div style={panelStyles.diffFieldHeader}>
                  <span style={panelStyles.diffFieldLabel}>{FIELD_LABELS[field] || field}</span>
                  {info.changed
                    ? <span style={panelStyles.changedBadge}>changed</span>
                    : <span style={panelStyles.unchangedBadge}>unchanged</span>}
                </div>
                {info.changed ? (
                  <div style={panelStyles.diffSides}>
                    <div style={panelStyles.diffSideOld}>
                      <span style={panelStyles.diffSideLabel}>v{diffData.v1}</span>
                      <pre style={panelStyles.diffText}>{String(info.v1 ?? '—')}</pre>
                    </div>
                    <div style={panelStyles.diffSideNew}>
                      <span style={panelStyles.diffSideLabel}>v{diffData.v2}</span>
                      <pre style={panelStyles.diffText}>{String(info.v2 ?? '—')}</pre>
                    </div>
                  </div>
                ) : (
                  <pre style={panelStyles.diffTextMuted}>{String(info.v1 ?? '—')}</pre>
                )}
              </div>
            ))}

            {Object.keys(diffData.variables_diff).length > 0 && (
              <div style={panelStyles.diffBlock}>
                <div style={panelStyles.diffFieldHeader}>
                  <span style={panelStyles.diffFieldLabel}>Variables</span>
                </div>
                <div style={panelStyles.varDiffGrid}>
                  {Object.entries(diffData.variables_diff).map(([key, info]) => (
                    <div key={key} style={{
                      ...panelStyles.varDiffPill,
                      borderColor: info.changed ? '#f59e0b' : '#1e1e2e',
                      color: info.changed ? '#fbbf24' : '#6b7280',
                    }}>
                      {`{{${key}}}`} {info.changed && '•'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const panelStyles: Record<string, React.CSSProperties> = {
  tabRow: { display: 'flex', gap: '0.4rem', borderBottom: '1px solid #1e1e2e', marginBottom: '1.25rem' },
  tab: {
    background: 'transparent', border: 'none', color: '#6b7280', fontSize: '0.85rem',
    fontWeight: 600, padding: '0.6rem 0.2rem', cursor: 'pointer', borderBottom: '2px solid transparent',
    marginRight: '1rem',
  },
  tabActive: { color: '#818cf8', borderBottomColor: '#6366f1' },
  metaRow: { display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  metaItem: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  metaLabel: { fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' },
  metaValue: { fontSize: '0.85rem', color: '#e5e7eb', fontWeight: 600, fontFamily: 'monospace' },
  promptBlock: { marginBottom: '1.1rem' },
  promptLabel: {
    display: 'block', fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase',
    letterSpacing: '0.04em', marginBottom: '0.4rem', fontWeight: 600,
  },
  promptText: {
    background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '0.85rem',
    color: '#e5e7eb', fontSize: '0.85rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap',
    margin: 0, lineHeight: 1.5,
  },
  varRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  varPill: {
    fontSize: '0.75rem', color: '#818cf8', background: 'rgba(99,102,241,0.1)',
    padding: '0.25rem 0.6rem', borderRadius: '999px', fontFamily: 'monospace',
  },
  varInputGroup: { marginBottom: '1rem' },
  fieldGroup: { marginBottom: '0.85rem' },
  label: {
    display: 'block', color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600,
    letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.4rem',
  },
  input: {
    width: '100%', background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '8px',
    padding: '0.6rem 0.85rem', color: '#f1f1f3', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
  },
  select: {
    width: '100%', background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '8px',
    padding: '0.6rem 0.85rem', color: '#f1f1f3', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
    padding: '0.7rem 1rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.85rem',
  },
  runBtn: {
    background: '#6366f1', border: 'none', color: '#fff', borderRadius: '8px',
    padding: '0.7rem 1.3rem', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
  },
  pendingText: { fontSize: '0.8rem', color: '#6b7280', marginTop: '0.6rem' },
  resultBox: {
    marginTop: '1.25rem', background: '#0a0a0f', border: '1px solid #1e1e2e',
    borderRadius: '10px', padding: '1rem',
  },
  resultMeta: {
    display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#6b7280',
    marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #1e1e2e',
  },
  resultText: {
    color: '#e5e7eb', fontSize: '0.85rem', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6,
    fontFamily: 'inherit', maxHeight: '400px', overflowY: 'auto',
  },
  evalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  evalHeaderTitle: { fontSize: '0.95rem', fontWeight: 600, color: '#e5e7eb', margin: '0 0 0.25rem' },
  evalHeaderSubtitle: { fontSize: '0.8rem', color: '#6b7280', margin: 0, maxWidth: '360px' },
  evalContainer: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  scoreRow: { display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' },
  scoreCircle: {
    width: '100px', height: '100px', borderRadius: '50%', border: '4px solid',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, background: '#0a0a0f',
  },
  scoreNumber: { fontSize: '1.8rem', fontWeight: 700, lineHeight: 1 },
  scoreMax: { fontSize: '0.7rem', color: '#6b7280' },
  criteriaList: { flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  criterionRow: {},
  criterionTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' },
  criterionLabel: { fontSize: '0.8rem', fontWeight: 600, color: '#e5e7eb' },
  criterionScore: { fontSize: '0.78rem', fontWeight: 600, fontFamily: 'monospace' },
  criterionBarTrack: { width: '100%', height: '5px', background: '#1e1e2e', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.3rem' },
  criterionBarFill: { height: '100%', borderRadius: '999px', transition: 'width 0.3s' },
  criterionNote: { fontSize: '0.75rem', color: '#6b7280', margin: 0, lineHeight: 1.4 },
  feedbackGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  feedbackBlock: { background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '10px', padding: '0.9rem' },
  feedbackLabel: { fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' },
  feedbackList: { margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  feedbackItem: { fontSize: '0.78rem', color: '#9ca3af', lineHeight: 1.4 },
  evalTimestamp: { fontSize: '0.72rem', color: '#4b5563', margin: 0 },
  evalEmptyState: { padding: '2rem', textAlign: 'center' },
  emptyText: { fontSize: '0.85rem', color: '#6b7280', margin: 0 },
  diffContainer: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  diffBlock: { background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '10px', padding: '0.9rem' },
  diffFieldHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' },
  diffFieldLabel: { fontSize: '0.8rem', fontWeight: 600, color: '#e5e7eb' },
  changedBadge: {
    fontSize: '0.65rem', color: '#fbbf24', background: 'rgba(251,191,36,0.1)',
    padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600,
  },
  unchangedBadge: {
    fontSize: '0.65rem', color: '#6b7280', background: 'rgba(107,114,128,0.1)',
    padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600,
  },
  diffSides: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' },
  diffSideOld: { background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '0.6rem' },
  diffSideNew: { background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '6px', padding: '0.6rem' },
  diffSideLabel: { fontSize: '0.68rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '0.3rem' },
  diffText: { fontSize: '0.78rem', color: '#e5e7eb', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace' },
  diffTextMuted: { fontSize: '0.78rem', color: '#6b7280', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace' },
  varDiffGrid: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  varDiffPill: {
    fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '999px',
    border: '1px solid', fontFamily: 'monospace',
  },
  changelogBlock: {
    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: '12px', padding: '1.1rem', marginBottom: '1.25rem',
  },
  changelogHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' },
  changelogTitle: { fontSize: '0.9rem', fontWeight: 600, color: '#e5e7eb', margin: '0 0 0.2rem' },
  changelogSubtitle: { fontSize: '0.78rem', color: '#6b7280', margin: 0 },
  changelogBtn: {
    background: '#6366f1', border: 'none', color: '#fff', borderRadius: '7px',
    padding: '0.5rem 0.9rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
  },
  changelogResult: { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(99,102,241,0.2)' },
  changelogSummary: { fontSize: '0.85rem', color: '#e5e7eb', lineHeight: 1.6, margin: '0 0 0.85rem' },
  changelogImpactRow: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  changelogImpactLabel: {
    fontSize: '0.68rem', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600,
  },
  changelogImpactValue: {
    fontSize: '0.8rem', color: '#34d399', fontWeight: 600,
  },
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1300px' },
  backLink: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#6b7280',
    fontSize: '0.82rem', textDecoration: 'none', marginBottom: '1.25rem',
  },
  loadingState: { color: '#6b7280', padding: '3rem', textAlign: 'center' },
  errorState: { color: '#f87171', padding: '3rem', textAlign: 'center' },
  header: { marginBottom: '1.5rem' },
  titleRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' },
  title: { fontSize: '1.5rem', fontWeight: 700, color: '#f1f1f3', margin: 0 },
  visibilityBadge: {
    display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 600,
    padding: '0.2rem 0.55rem', borderRadius: '999px',
  },
  description: { fontSize: '0.88rem', color: '#9ca3af', margin: '0 0 0.6rem' },
  tagRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  tag: {
    fontSize: '0.7rem', color: '#818cf8', background: 'rgba(99,102,241,0.1)',
    padding: '0.2rem 0.55rem', borderRadius: '999px', fontWeight: 500,
  },
  layout: { display: 'flex', gap: '1.25rem', alignItems: 'flex-start' },
  sidebar: {
    width: '260px', flexShrink: 0, background: '#13131a', border: '1px solid #1e1e2e',
    borderRadius: '12px', padding: '1rem',
  },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' },
  sidebarTitle: { fontSize: '0.78rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' },
  newVersionBtn: {
    display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#6366f1', color: '#fff',
    border: 'none', borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.75rem',
    fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
  },
  noVersionsText: { fontSize: '0.82rem', color: '#6b7280', textAlign: 'center', padding: '1rem 0' },
  versionList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  versionItem: {
    textAlign: 'left', background: 'transparent', border: '1px solid #1e1e2e', borderRadius: '8px',
    padding: '0.65rem 0.75rem', cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
  },
  versionItemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' },
  versionNumber: { fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' },
  latestBadge: {
    fontSize: '0.62rem', color: '#34d399', background: 'rgba(52,211,153,0.1)',
    padding: '0.12rem 0.4rem', borderRadius: '999px', fontWeight: 600,
  },
  versionCommit: {
    fontSize: '0.78rem', color: '#9ca3af', margin: '0 0 0.35rem', lineHeight: 1.3,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  versionTime: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#4b5563' },
  versionItemClickArea: {
    width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
    padding: 0, cursor: 'pointer', paddingRight: '1.4rem',
  },
  versionDeleteBtn: {
    position: 'absolute', top: '0.6rem', right: '0.6rem', background: 'transparent',
    border: 'none', color: '#6b7280', cursor: 'pointer', padding: '2px',
    display: 'flex', transition: 'color 0.15s',
  },
  confirmModal: {
    width: '100%', maxWidth: '400px', background: '#13131a', border: '1px solid #1e1e2e',
    borderRadius: '14px', padding: '1.5rem', boxSizing: 'border-box',
  },
  confirmTitle: { fontSize: '1.05rem', fontWeight: 700, color: '#f1f1f3', margin: '0 0 0.6rem' },
  confirmText: { fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.5, margin: '0 0 1.25rem' },
  dangerBtn: {
    background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px',
    padding: '0.6rem 1.1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
  },
  mainPanel: {
    flex: 1, minWidth: 0, background: '#13131a', border: '1px solid #1e1e2e',
    borderRadius: '12px', padding: '1.5rem', minHeight: '400px',
  },
  emptyPanel: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100%', color: '#6b7280', gap: '1rem', padding: '3rem',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
    padding: '0.7rem 1rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.85rem',
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50,
  },
  modal: {
    width: '100%', maxWidth: '560px', background: '#13131a', border: '1px solid #1e1e2e',
    borderRadius: '14px', padding: '1.5rem', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto',
  },
  modalTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#f1f1f3', margin: '0 0 1.1rem' },
  fieldGroup: { marginBottom: '1rem' },
  label: {
    display: 'block', color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600,
    letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.4rem',
  },
  input: {
    width: '100%', background: '#0a0a0f', border: '1px solid #1e1e2e', borderRadius: '8px',
    padding: '0.65rem 0.9rem', color: '#f1f1f3', fontSize: '0.85rem', outline: 'none',
    boxSizing: 'border-box',
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' },
  cancelBtn: {
    background: 'transparent', border: '1px solid #1e1e2e', color: '#9ca3af', borderRadius: '8px',
    padding: '0.6rem 1.1rem', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
  },
  primaryBtn: {
    display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#6366f1', border: 'none',
    color: '#fff', borderRadius: '8px', padding: '0.6rem 1.1rem', fontSize: '0.85rem',
    fontWeight: 600, cursor: 'pointer',
  },
}