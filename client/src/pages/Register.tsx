import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../lib/api'
import { useAuthStore } from '../store/authStore'

// ── Inline SVG icons ───────────────────────────────────────────────────────────

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

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

// ── Password strength helper ──────────────────────────────────────────────────

interface PasswordCheck {
  label: string
  test: (pw: string) => boolean
}

const PASSWORD_CHECKS: PasswordCheck[] = [
  { label: 'At least 8 characters', test: pw => pw.length >= 8 },
  { label: 'One uppercase letter', test: pw => /[A-Z]/.test(pw) },
  { label: 'One number', test: pw => /[0-9]/.test(pw) },
]

// ── Component ──────────────────────────────────────────────────────────────────

export default function Register() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(state => state.setAuth)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword]               = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  const passwordChecksPassed = PASSWORD_CHECKS.every(c => c.test(form.password))
  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required.'
    if (form.name.trim().length < 2) return 'Name must be at least 2 characters.'
    if (!form.email.trim()) return 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Please enter a valid email.'
    if (!passwordChecksPassed) return 'Password does not meet the requirements below.'
    if (!passwordsMatch) return 'Passwords do not match.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await authAPI.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      setAuth(res.data.token, res.data.user)
      navigate('/dashboard')
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        (err?.response?.data?.details?.[0]?.message) ||
        (err?.code === 'ERR_NETWORK'
          ? 'Cannot reach server. Is the backend running?'
          : 'Registration failed. Please try again.')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthClick = (provider: string) => {
    setError(`${provider} sign-up is coming soon.`)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Brand */}
        <div style={styles.brandRow}>
          <GitBranchIcon />
          <span style={styles.brandText}>PromptOps AI</span>
        </div>

        <h1 style={styles.heading}>Create your workspace</h1>
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
            <label htmlFor="name" style={styles.label}>Full name</label>
            <input
              id="name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Jane Doe"
              autoComplete="name"
              required
              style={styles.input}
              onFocus={e => (e.target.style.borderColor = '#6366f1')}
              onBlur={e => (e.target.style.borderColor = '#1e1e2e')}
            />
          </div>

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
            <label htmlFor="password" style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
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

            {/* Password requirement checklist */}
            {form.password.length > 0 && (
              <div style={styles.checklist}>
                {PASSWORD_CHECKS.map(check => {
                  const passed = check.test(form.password)
                  return (
                    <div key={check.label} style={styles.checklistItem}>
                      <span style={{
                        ...styles.checklistIcon,
                        background: passed ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)',
                        color: passed ? '#22c55e' : '#6b7280',
                      }}>
                        {passed && <CheckIcon />}
                      </span>
                      <span style={{ color: passed ? '#9ca3af' : '#6b7280', fontSize: '0.78rem' }}>
                        {check.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="confirmPassword" style={styles.label}>Confirm password</label>
            <div style={styles.passwordWrapper}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                style={{
                  ...styles.input,
                  paddingRight: '2.75rem',
                  borderColor: form.confirmPassword.length > 0
                    ? (passwordsMatch ? '#1e1e2e' : 'rgba(239,68,68,0.5)')
                    : '#1e1e2e',
                }}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor =
                  form.confirmPassword.length > 0 && !passwordsMatch
                    ? 'rgba(239,68,68,0.5)'
                    : '#1e1e2e')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(prev => !prev)}
                style={styles.eyeButton}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {form.confirmPassword.length > 0 && !passwordsMatch && (
              <p style={styles.mismatchText}>Passwords do not match.</p>
            )}
          </div>

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
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>

        <p style={styles.footerText}>
          Already have an account?{' '}
          <Link to="/login" style={styles.footerLink}>Sign in</Link>
        </p>
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
  card: {
    width: '100%',
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
  label: {
    display: 'block',
    color: '#9ca3af',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: '0.4rem',
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
  checklist: {
    marginTop: '0.6rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  checklistItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  checklistIcon: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mismatchText: {
    color: '#f87171',
    fontSize: '0.75rem',
    marginTop: '0.4rem',
    marginBottom: 0,
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
    marginTop: '0.25rem',
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
}