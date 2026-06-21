import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { promptsAPI, versionsAPI, executionAPI } from '../lib/api'

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

interface VersionItem {
  id: string
  version_number: number
  user_prompt: string
  system_prompt: string
  commit_message?: string
  model: string
  temperature: number
  max_tokens: number
  variables: Record<string, string>
  created_at: string
}

interface ExecutionResult {
  output_text: string
  model: string
  latency_ms: number
  input_tokens: number | null
  output_tokens: number | null
}

const CompareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7h6M3 17h6M14 4l-3 16M17 7h4M17 17h4" />
  </svg>
)

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export default function Playground() {
  const [leftPromptId, setLeftPromptId] = useState<string | null>(null)
  const [rightPromptId, setRightPromptId] = useState<string | null>(null)
  const [leftVersion, setLeftVersion] = useState<number | null>(null)
  const [rightVersion, setRightVersion] = useState<number | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [leftResult, setLeftResult] = useState<ExecutionResult | null>(null)
  const [rightResult, setRightResult] = useState<ExecutionResult | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executeError, setExecuteError] = useState('')

  // Fetch all prompts
  const { data: promptsData } = useQuery({
    queryKey: ['playground', 'prompts'],
    queryFn: () => promptsAPI.getAll({ limit: 100 }),
  })

  const prompts: PromptItem[] = promptsData?.data?.prompts || []

  // Fetch versions for left prompt
  const { data: leftVersionsData } = useQuery({
    queryKey: ['playground', 'versions', leftPromptId],
    queryFn: () => leftPromptId ? versionsAPI.getAll(leftPromptId) : Promise.resolve(null),
    enabled: !!leftPromptId,
  })

  // Fetch versions for right prompt
  const { data: rightVersionsData } = useQuery({
    queryKey: ['playground', 'versions', rightPromptId],
    queryFn: () => rightPromptId ? versionsAPI.getAll(rightPromptId) : Promise.resolve(null),
    enabled: !!rightPromptId,
  })

  // Fetch left version details
  const { data: leftVersionDetails } = useQuery({
    queryKey: ['playground', 'version', leftPromptId, leftVersion],
    queryFn: () => leftPromptId && leftVersion ? versionsAPI.getOne(leftPromptId, leftVersion) : Promise.resolve(null),
    enabled: !!leftPromptId && !!leftVersion,
  })

  // Fetch right version details
  const { data: rightVersionDetails } = useQuery({
    queryKey: ['playground', 'version', rightPromptId, rightVersion],
    queryFn: () => rightPromptId && rightVersion ? versionsAPI.getOne(rightPromptId, rightVersion) : Promise.resolve(null),
    enabled: !!rightPromptId && !!rightVersion,
  })

  const leftVersions = leftVersionsData?.data?.versions || []
  const rightVersions = rightVersionsData?.data?.versions || []
  const leftVersion_: VersionItem | null = leftVersionDetails?.data?.version || null
  const rightVersion_: VersionItem | null = rightVersionDetails?.data?.version || null

  // ── Execute mutations — fixed to match backend's flat response shape ────────

  const executeLeft = useMutation({
    mutationFn: async () => {
      if (!leftPromptId || !leftVersion) return null
      const res = await executionAPI.execute(leftPromptId, leftVersion, {
        input_variables: variables,
      })
      return res.data as ExecutionResult
    },
    onSuccess: (data) => {
      if (data) setLeftResult(data)
    },
  })

  const executeRight = useMutation({
    mutationFn: async () => {
      if (!rightPromptId || !rightVersion) return null
      const res = await executionAPI.execute(rightPromptId, rightVersion, {
        input_variables: variables,
      })
      return res.data as ExecutionResult
    },
    onSuccess: (data) => {
      if (data) setRightResult(data)
    },
  })

  const handleExecute = async () => {
    setExecuteError('')
    setIsExecuting(true)
    try {
      const results = await Promise.allSettled([
        executeLeft.mutateAsync(),
        executeRight.mutateAsync(),
      ])

      const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
      if (failures.length > 0) {
        const firstError = failures[0].reason
        setExecuteError(
          firstError?.response?.data?.error || 'One or both executions failed. Please try again.'
        )
      }
    } finally {
      setIsExecuting(false)
    }
  }

  const allVarKeys = Array.from(new Set([
    ...(leftVersion_?.variables ? Object.keys(leftVersion_.variables) : []),
    ...(rightVersion_?.variables ? Object.keys(rightVersion_.variables) : []),
  ]))

  const leftPrompt = prompts.find(p => p.id === leftPromptId)
  const rightPrompt = prompts.find(p => p.id === rightPromptId)

  const canExecute = !!leftVersion_ && !!rightVersion_ &&
    allVarKeys.every(key => values_ok(variables[key]))

  function values_ok(value: string | undefined) {
    return value !== undefined && value.trim().length > 0
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Prompt Playground</h1>
          <p style={styles.subtitle}>Compare two prompts side-by-side and evaluate their outputs</p>
        </div>
      </div>

      {/* Selection panel */}
      <div style={styles.selectionPanel}>
        <div style={styles.selectionRow}>
          <div style={styles.selectionGroup}>
            <label style={styles.label}>Left prompt</label>
            <select
              value={leftPromptId || ''}
              onChange={e => {
                setLeftPromptId(e.target.value || null)
                setLeftVersion(null)
                setLeftResult(null)
                setExecuteError('')
              }}
              style={styles.select}
            >
              <option value="">Select a prompt…</option>
              {prompts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {leftPrompt && (
              <div>
                <label style={styles.label}>Version</label>
                <select
                  value={leftVersion || ''}
                  onChange={e => {
                    setLeftVersion(Number(e.target.value) || null)
                    setLeftResult(null)
                    setExecuteError('')
                  }}
                  style={styles.select}
                >
                  <option value="">Select version…</option>
                  {leftVersions.map((v: VersionItem) => (
                    <option key={v.id} value={v.version_number}>
                      v{v.version_number} {v.commit_message ? `— ${v.commit_message}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={styles.centerIcon}><CompareIcon /></div>

          <div style={styles.selectionGroup}>
            <label style={styles.label}>Right prompt</label>
            <select
              value={rightPromptId || ''}
              onChange={e => {
                setRightPromptId(e.target.value || null)
                setRightVersion(null)
                setRightResult(null)
                setExecuteError('')
              }}
              style={styles.select}
            >
              <option value="">Select a prompt…</option>
              {prompts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {rightPrompt && (
              <div>
                <label style={styles.label}>Version</label>
                <select
                  value={rightVersion || ''}
                  onChange={e => {
                    setRightVersion(Number(e.target.value) || null)
                    setRightResult(null)
                    setExecuteError('')
                  }}
                  style={styles.select}
                >
                  <option value="">Select version…</option>
                  {rightVersions.map((v: VersionItem) => (
                    <option key={v.id} value={v.version_number}>
                      v{v.version_number} {v.commit_message ? `— ${v.commit_message}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {leftVersion_ && rightVersion_ && (
        <>
          {/* Variables panel */}
          {allVarKeys.length > 0 && (
            <div style={styles.varPanel}>
              <h3 style={styles.panelTitle}>Input variables</h3>
              <p style={styles.panelSubtitle}>
                These values are shared across both prompts when executed.
              </p>
              <div style={styles.varGrid}>
                {allVarKeys.map(key => (
                  <div key={key} style={styles.varField}>
                    <label style={styles.label}>{`{{${key}}}`}</label>
                    <input
                      type="text"
                      value={variables[key] || ''}
                      onChange={e => setVariables(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={`Enter value for {{${key}}}`}
                      style={styles.input}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {executeError && <div style={styles.errorBox}>{executeError}</div>}

          {/* Execute button */}
          <div style={styles.actionRow}>
            <button
              onClick={handleExecute}
              disabled={isExecuting || executeLeft.isPending || executeRight.isPending || !canExecute}
              style={{
                ...styles.executeBtn,
                background: isExecuting || executeLeft.isPending || executeRight.isPending || !canExecute
                  ? '#4338ca'
                  : '#6366f1',
                cursor: isExecuting || executeLeft.isPending || executeRight.isPending || !canExecute
                  ? 'not-allowed'
                  : 'pointer',
              }}
            >
              <PlayIcon /> {isExecuting ? 'Executing…' : 'Execute both'}
            </button>
            {!canExecute && allVarKeys.length > 0 && (
              <span style={styles.hintText}>Fill in all variables to execute.</span>
            )}
          </div>

          {/* Results panel */}
          <div style={styles.resultsGrid}>
            {/* Left result */}
            <div style={styles.resultPanel}>
              <div style={styles.resultHeader}>
                <h3 style={styles.resultTitle}>{leftPrompt?.name} v{leftVersion}</h3>
                {leftResult && (
                  <button
                    onClick={() => setLeftResult(null)}
                    style={styles.clearBtn}
                    aria-label="Clear"
                  >
                    <XIcon />
                  </button>
                )}
              </div>
              {executeLeft.isPending ? (
                <div style={styles.emptyResult}>
                  <p style={styles.emptyText}>Running…</p>
                </div>
              ) : leftResult ? (
                <div>
                  <div style={styles.resultMeta}>
                    <span>{leftResult.model}</span>
                    {leftResult.input_tokens != null && <span>↑ {leftResult.input_tokens} tok</span>}
                    {leftResult.output_tokens != null && <span>↓ {leftResult.output_tokens} tok</span>}
                    <span>{leftResult.latency_ms}ms</span>
                  </div>
                  <pre style={styles.resultOutput}>{leftResult.output_text}</pre>
                </div>
              ) : (
                <div style={styles.emptyResult}>
                  <p style={styles.emptyText}>Execute to see output</p>
                </div>
              )}
            </div>

            {/* Right result */}
            <div style={styles.resultPanel}>
              <div style={styles.resultHeader}>
                <h3 style={styles.resultTitle}>{rightPrompt?.name} v{rightVersion}</h3>
                {rightResult && (
                  <button
                    onClick={() => setRightResult(null)}
                    style={styles.clearBtn}
                    aria-label="Clear"
                  >
                    <XIcon />
                  </button>
                )}
              </div>
              {executeRight.isPending ? (
                <div style={styles.emptyResult}>
                  <p style={styles.emptyText}>Running…</p>
                </div>
              ) : rightResult ? (
                <div>
                  <div style={styles.resultMeta}>
                    <span>{rightResult.model}</span>
                    {rightResult.input_tokens != null && <span>↑ {rightResult.input_tokens} tok</span>}
                    {rightResult.output_tokens != null && <span>↓ {rightResult.output_tokens} tok</span>}
                    <span>{rightResult.latency_ms}ms</span>
                  </div>
                  <pre style={styles.resultOutput}>{rightResult.output_text}</pre>
                </div>
              ) : (
                <div style={styles.emptyResult}>
                  <p style={styles.emptyText}>Execute to see output</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {(!leftVersion_ || !rightVersion_) && (leftPromptId || rightPromptId) && (
        <div style={styles.infoBox}>
          {!leftVersion_ && leftPromptId && 'Select a version for the left prompt…'}
          {!rightVersion_ && rightPromptId && 'Select a version for the right prompt…'}
        </div>
      )}

      {!leftPromptId && !rightPromptId && (
        <div style={styles.emptyState}>
          <CompareIcon />
          <h2 style={styles.emptyTitle}>Get started</h2>
          <p style={styles.emptyText}>Select two prompts and their versions to compare them side-by-side.</p>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
    minHeight: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: '#e5e7eb',
    margin: '0 0 0.5rem',
    fontSize: '2rem',
    fontWeight: 700,
  },
  subtitle: {
    color: '#9ca3af',
    margin: 0,
  },
  selectionPanel: {
    background: '#121118',
    border: '1px solid #1e1e2e',
    borderRadius: '18px',
    padding: '1.5rem',
  },
  selectionRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '1.5rem',
    alignItems: 'flex-end',
  },
  selectionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  centerIcon: {
    width: '2.5rem',
    height: '2.5rem',
    display: 'grid',
    placeItems: 'center',
    background: '#6366f1',
    borderRadius: '10px',
    color: '#fff',
    marginBottom: '0.5rem',
  },
  label: {
    color: '#9ca3af',
    fontSize: '0.85rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  select: {
    width: '100%',
    background: '#0f0f16',
    border: '1px solid #1e1e2e',
    borderRadius: '10px',
    padding: '0.7rem 0.9rem',
    color: '#e5e7eb',
    fontSize: '0.9rem',
  },
  varPanel: {
    background: '#121118',
    border: '1px solid #1e1e2e',
    borderRadius: '18px',
    padding: '1.5rem',
  },
  panelTitle: {
    color: '#e5e7eb',
    margin: '0 0 0.4rem',
    fontSize: '1rem',
    fontWeight: 700,
  },
  panelSubtitle: {
    color: '#6b7280',
    margin: '0 0 1rem',
    fontSize: '0.82rem',
  },
  varGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
  },
  varField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  input: {
    width: '100%',
    background: '#0f0f16',
    border: '1px solid #1e1e2e',
    borderRadius: '10px',
    padding: '0.7rem 0.9rem',
    color: '#e5e7eb',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '10px',
    padding: '0.85rem 1.1rem',
    color: '#f87171',
    fontSize: '0.85rem',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  executeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    background: '#6366f1',
    border: 'none',
    color: '#fff',
    borderRadius: '10px',
    padding: '1rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  hintText: {
    color: '#6b7280',
    fontSize: '0.82rem',
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
  },
  resultPanel: {
    background: '#121118',
    border: '1px solid #1e1e2e',
    borderRadius: '18px',
    padding: '1.5rem',
    overflow: 'hidden',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #1e1e2e',
  },
  resultTitle: {
    color: '#e5e7eb',
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 700,
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '0.4rem',
  },
  resultMeta: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.8rem',
    color: '#9ca3af',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #1e1e2e',
  },
  resultOutput: {
    background: '#0f0f16',
    border: '1px solid #1e1e2e',
    borderRadius: '10px',
    padding: '1rem',
    color: '#e5e7eb',
    margin: 0,
    fontSize: '0.85rem',
    maxHeight: '400px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
  },
  emptyResult: {
    background: '#0f0f16',
    borderRadius: '10px',
    padding: '2rem',
    textAlign: 'center',
    border: '1px dashed #1e1e2e',
  },
  emptyText: {
    color: '#6b7280',
    margin: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 2rem',
  },
  emptyTitle: {
    color: '#e5e7eb',
    margin: '1rem 0 0.5rem',
    fontSize: '1.25rem',
  },
  infoBox: {
    padding: '1rem 1.25rem',
    borderRadius: '14px',
    background: '#0f172a',
    color: '#cbd5e1',
    border: '1px solid #1e293b',
  },
}