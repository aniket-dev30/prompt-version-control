import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { promptsAPI } from '../lib/api'

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

function timeAgo(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const SparklesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v4M3 12h4M12 17v4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
)

const LayersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)

const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
  </svg>
)

const GitBranchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
)

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard', 'prompts'],
    queryFn: () => promptsAPI.getAll({ limit: 100 }),
  })

  const prompts: PromptItem[] = data?.data?.prompts || []

  const stats = useMemo(() => ({
    promptCount: prompts.length,
    versionCount: prompts.reduce((total, prompt) => total + prompt.version_count, 0),
    publicCount: prompts.filter(prompt => prompt.is_public).length,
    privateCount: prompts.filter(prompt => !prompt.is_public).length,
    latestUpdated: [...prompts].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
  }), [prompts])

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <p style={styles.overline}>Welcome back</p>
          <h1 style={styles.title}>Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p style={styles.subtitle}>A quick summary of your prompts, versions, and shared work.</p>
        </div>
        <button
          style={styles.primaryBtn}
          onClick={() => navigate('/prompts')}
          onMouseEnter={e => (e.currentTarget.style.background = '#4f46e5')}
          onMouseLeave={e => (e.currentTarget.style.background = '#6366f1')}
        >
          View prompts
        </button>
      </div>

      {isLoading && <div style={styles.infoBox}>Loading dashboard metrics…</div>}
      {isError && <div style={styles.errorBox}>{(error as any)?.response?.data?.error || 'Unable to load dashboard data.'}</div>}

      {!isLoading && !isError && (
        <>
          <div style={styles.statGrid}>
            <div style={{ ...styles.statCard, borderColor: '#4f46e5' }}>
              <div style={styles.statIcon}><ChartIcon /></div>
              <span style={styles.statLabel}>Prompts</span>
              <span style={styles.statValue}>{stats.promptCount}</span>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#22c55e' }}>
              <div style={styles.statIcon}><LayersIcon /></div>
              <span style={styles.statLabel}>Total versions</span>
              <span style={styles.statValue}>{stats.versionCount}</span>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#38bdf8' }}>
              <div style={styles.statIcon}><SparklesIcon /></div>
              <span style={styles.statLabel}>Public prompts</span>
              <span style={styles.statValue}>{stats.publicCount}</span>
            </div>
            <div style={{ ...styles.statCard, borderColor: '#f97316' }}>
              <div style={styles.statIcon}><GitBranchIcon /></div>
              <span style={styles.statLabel}>Private prompts</span>
              <span style={styles.statValue}>{stats.privateCount}</span>
            </div>
          </div>

          <div style={styles.sectionRow}>
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Latest updates</h2>
                <span style={styles.panelMeta}>{stats.promptCount} prompts tracked</span>
              </div>
              {stats.promptCount === 0 ? (
                <div style={styles.emptyState}>
                  <p style={styles.emptyTitle}>No prompt activity yet</p>
                  <p style={styles.emptyText}>Create a prompt to start versioning it like code.</p>
                </div>
              ) : (
                <div style={styles.updateList}>
                  {stats.latestUpdated.slice(0, 4).map(prompt => (
                    <button
                      key={prompt.id}
                      style={styles.updateItem}
                      onClick={() => navigate(`/prompts/${prompt.id}`)}
                    >
                      <div>
                        <p style={styles.updateTitle}>{prompt.name}</p>
                        <p style={styles.updateSubtitle}>{prompt.description || 'No description provided.'}</p>
                      </div>
                      <span style={styles.updateTime}>{timeAgo(prompt.updated_at)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Your workspace</h2>
                <span style={styles.panelMeta}>Insights at a glance</span>
              </div>
              <div style={styles.detailGrid}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Active prompts</span>
                  <span style={styles.detailValue}>{stats.promptCount}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Current versions</span>
                  <span style={styles.detailValue}>{stats.versionCount}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Public shareable</span>
                  <span style={styles.detailValue}>{stats.publicCount}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Private drafts</span>
                  <span style={styles.detailValue}>{stats.privateCount}</span>
                </div>
              </div>
            </div>
          </div>
        </>
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
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  overline: {
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: '#6b7280',
    fontSize: '0.75rem',
    margin: 0,
  },
  title: {
    color: '#e5e7eb',
    margin: '0.35rem 0 0.35rem',
    fontSize: '2rem',
    lineHeight: 1.1,
  },
  subtitle: {
    color: '#9ca3af',
    margin: 0,
    maxWidth: '760px',
  },
  primaryBtn: {
    background: '#6366f1',
    border: 'none',
    color: '#fff',
    borderRadius: '10px',
    padding: '0.95rem 1.4rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '1rem',
  },
  statCard: {
    background: '#121118',
    border: '1px solid #1e1e2e',
    borderRadius: '16px',
    padding: '1.35rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
    minHeight: '140px',
  },
  statIcon: {
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: '12px',
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(255,255,255,0.05)',
    color: '#c7d2fe',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: '0.82rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  statValue: {
    color: '#e5e7eb',
    fontSize: '2rem',
    fontWeight: 700,
  },
  sectionRow: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
    gap: '1rem',
  },
  panel: {
    background: '#121118',
    border: '1px solid #1e1e2e',
    borderRadius: '18px',
    padding: '1.5rem',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'center',
    marginBottom: '1.25rem',
  },
  panelTitle: {
    color: '#e5e7eb',
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 700,
  },
  panelMeta: {
    color: '#6b7280',
    fontSize: '0.85rem',
  },
  updateList: {
    display: 'grid',
    gap: '0.75rem',
  },
  updateItem: {
    width: '100%',
    textAlign: 'left',
    background: '#0f0f16',
    border: '1px solid #1e1e2e',
    borderRadius: '14px',
    padding: '1rem',
    color: 'inherit',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
  },
  updateTitle: {
    margin: 0,
    color: '#e5e7eb',
    fontWeight: 600,
  },
  updateSubtitle: {
    margin: '0.25rem 0 0',
    color: '#9ca3af',
    fontSize: '0.92rem',
    maxWidth: 'calc(100% - 90px)',
  },
  updateTime: {
    color: '#6b7280',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  },
  detailGrid: {
    display: 'grid',
    gap: '0.75rem',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'center',
    padding: '0.95rem 1rem',
    background: '#0f0f16',
    borderRadius: '12px',
    border: '1px solid #1e1e2e',
  },
  detailLabel: {
    color: '#9ca3af',
    fontSize: '0.9rem',
  },
  detailValue: {
    color: '#e5e7eb',
    fontWeight: 600,
  },
  emptyState: {
    padding: '2rem',
    borderRadius: '16px',
    border: '1px dashed #1e1e2e',
    textAlign: 'center',
    color: '#9ca3af',
  },
  emptyTitle: {
    margin: 0,
    color: '#e5e7eb',
    fontSize: '1rem',
    fontWeight: 600,
  },
  emptyText: {
    margin: '0.5rem 0 0',
    color: '#9ca3af',
  },
  infoBox: {
    padding: '1rem 1.25rem',
    borderRadius: '14px',
    background: '#0f172a',
    color: '#cbd5e1',
    border: '1px solid #1e293b',
  },
  errorBox: {
    padding: '1rem 1.25rem',
    borderRadius: '14px',
    background: 'rgba(239,68,68,0.1)',
    color: '#fca5a5',
    border: '1px solid rgba(239,68,68,0.3)',
  },
}
