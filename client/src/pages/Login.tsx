import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../lib/api'
import { useAuthStore } from '../store/authStore'

// ── Inline SVG icons (no external icon library needed) ───────────────────────

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4 7 11 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
)

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.69-3.87-1.36-3.87-1.36-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.74.4-1.26.72-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.83 0c2.22-1.49 3.2-1.18 3.2-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.08.78 2.18 0 1.58-.01 2.84-.01 3.23 0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
  </svg>
)

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
  </svg>
)

const GitBranchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
)

const DiffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7h6M3 17h6M14 4l-3 16M17 7h4M17 17h4" />
  </svg>
)

const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v4M3 12h4M12 17v4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
)

const ChartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
)

// ── Feature preview data ──────────────────────────────────────────────────────

const FEATURES = [
  { icon: <GitBranchIcon />, title: 'Prompt Versioning', desc: 'Git-style history', color: '#818cf8' },
  { icon: <DiffIcon />,      title: 'Semantic Diff',      desc: 'Visual comparison', color: '#34d399' },
  { icon: <SparklesIcon />,  title: 'Prompt Evaluation',  desc: 'AI quality scoring', color: '#fbbf24' },
  { icon: <ChartIcon />,     title: 'Analytics Dashboard', desc: 'Token & latency stats', color: '#f87171' },
]

// ── Component ──────────────────────────────────────────────────────────────────

export default function Login() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(state => state.setAuth)

  const [form, setForm]               = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe]   = useState(true)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.email.trim() || !form.password) {
      setError('Please fill in both email and password.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await authAPI.login({
        email: form.email.trim(),
        password: form.password,
      })
      setAuth(res.data.token, res.data.user)
      navigate('/dashboard')
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        (err?.code === 'ERR_NETWORK'
          ? 'Cannot reach server. Is the backend running?'
          : 'Login failed. Please try again.')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthClick = (provider: string) => {
    // Placeholder — OAuth flow not wired up yet.
    setError(`${provider} sign-in is coming soon.`)
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        {/* ── Auth card ──────────────────────────────────────────────────── */}
        <div style={styles.card}>
          {/* Brand */}
          <div style={styles.brandRow}>
            <GitBranchIcon />
            <span style={styles.brandText}>PromptOps AI</span>
          </div>

          <h1 style={styles.heading}>Version control for AI prompts</h1>
          <p style={styles.tagline}>Track&nbsp;•&nbsp;Compare&nbsp;•&nbsp;Optimize&nbsp;•&nbsp;Deploy</p>

          {/* OAuth buttons */}
          <div style={styles.oauthRow}>
            <button
              type="button"
              onClick={() => handleOAuthClick('GitHub')}
              style={styles.oauthBtn}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#3f3f52')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e2e')}
            >
              <GitHubIcon /> GitHub
            </button>
            <button
              type="button"
              onClick={() => handleOAuthClick('Google')}
              style={styles.oauthBtn}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#3f3f52')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e2e')}
            >
              <GoogleIcon /> Google
            </button>
          </div>

          {/* Divider */}
          <div style={styles.dividerRow}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or continue with email</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Error */}
          {error && <div style={styles.errorBox}>{error}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div style={styles.fieldGroup}>
              <label htmlFor="email" style={styles.label}>Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
                style={styles.input}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = '#1e1e2e')}
              />
            </div>

            <div style={styles.fieldGroup}>
              <div style={styles.labelRow}>
                <label htmlFor="password" style={styles.label}>Password</label>
                <Link to="/forgot-password" style={styles.forgotLink}>
                  Forgot password?
                </Link>
              </div>
              <div style={styles.passwordWrapper}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ ...styles.input, paddingRight: '2.75rem' }}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e => (e.target.style.borderColor = '#1e1e2e')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  style={styles.eyeButton}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <label style={styles.rememberRow}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.rememberText}>Remember me</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                background: loading ? '#4338ca' : '#6366f1',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => {
                if (!loading) e.currentTarget.style.background = '#4f46e5'
              }}
              onMouseLeave={e => {
                if (!loading) e.currentTarget.style.background = '#6366f1'
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <p style={styles.footerText}>
            No account?{' '}
            <Link to="/register" style={styles.footerLink}>Create one</Link>
          </p>
        </div>

        {/* ── Feature preview panel ─────────────────────────────────────── */}
        <div style={styles.featurePanel}>
          <p style={styles.featureHeading}>Feature preview</p>
          <div style={styles.featureList}>
            {FEATURES.map(f => (
              <div key={f.title} style={styles.featureItem}>
                <div style={{ ...styles.featureIcon, color: f.color }}>{f.icon}</div>
                <div>
                  <p style={styles.featureTitle}>{f.title}</p>
                  <p style={styles.featureDesc}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  wrapper: {
    width: '100%',
    maxWidth: '680px',
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    flex: '1 1 420px',
    maxWidth: '440px',
    background: '#13131a',
    border: '1px solid #1e1e2e',
    borderRadius: '16px',
    padding: '2.25rem',
    boxShadow: '0 0 40px rgba(99,102,241,0.08)',
    boxSizing: 'border-box',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: '#818cf8',
    marginBottom: '1rem',
  },
  brandText: {
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    letterSpacing: '0.08em',
    fontWeight: 600,
  },
  heading: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#f1f1f3',
    textAlign: 'center',
    margin: '0 0 0.35rem',
  },
  tagline: {
    fontFamily: 'monospace',
    fontSize: '0.78rem',
    color: '#6b7280',
    textAlign: 'center',
    margin: '0 0 1.5rem',
  },
  oauthRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.6rem',
    marginBottom: '1.25rem',
  },
  oauthBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    background: '#0a0a0f',
    border: '1px solid #1e1e2e',
    borderRadius: '8px',
    padding: '0.6rem',
    color: '#e5e7eb',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    marginBottom: '1.25rem',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#1e1e2e',
  },
  dividerText: {
    fontSize: '0.75rem',
    color: '#6b7280',
    whiteSpace: 'nowrap',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px',
    padding: '0.7rem 1rem',
    marginBottom: '1.1rem',
    color: '#f87171',
    fontSize: '0.85rem',
  },
  fieldGroup: {
    marginBottom: '1rem',
  },
  labelRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: '0.4rem',
  },
  label: {
    display: 'block',
    color: '#9ca3af',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  forgotLink: {
    color: '#818cf8',
    fontSize: '0.78rem',
    textDecoration: 'none',
  },
  input: {
    width: '100%',
    background: '#0a0a0f',
    border: '1px solid #1e1e2e',
    borderRadius: '8px',
    padding: '0.72rem 1rem',
    color: '#f1f1f3',
    fontSize: '0.92rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  rememberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    marginBottom: '1.4rem',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: {
    width: '15px',
    height: '15px',
    accentColor: '#6366f1',
    cursor: 'pointer',
  },
  rememberText: {
    fontSize: '0.85rem',
    color: '#9ca3af',
  },
  submitBtn: {
    width: '100%',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.78rem',
    fontSize: '0.92rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
    transition: 'background 0.2s',
  },
  footerText: {
    textAlign: 'center',
    marginTop: '1.4rem',
    color: '#6b7280',
    fontSize: '0.85rem',
  },
  footerLink: {
    color: '#818cf8',
    textDecoration: 'none',
    fontWeight: 500,
  },
  featurePanel: {
    flex: '0 0 200px',
    paddingTop: '0.25rem',
  },
  featureHeading: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: 600,
    margin: '0 0 0.75rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    background: '#13131a',
    border: '1px solid #1e1e2e',
    borderRadius: '10px',
    padding: '0.65rem 0.8rem',
  },
  featureIcon: {
    display: 'flex',
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#e5e7eb',
    margin: 0,
  },
  featureDesc: {
    fontSize: '0.72rem',
    color: '#6b7280',
    margin: '2px 0 0',
  },
}