import { useState } from 'react'
import { Link } from 'react-router-dom'

const GitBranchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
)

const MailIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

export default function ForgotPassword() {
  const [email, setEmail]       = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    setError('')
    // NOTE: Password reset emails are not wired up yet.
    // This is a UI placeholder — no request is sent to the backend.
    setSubmitted(true)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brandRow}>
          <GitBranchIcon />
          <span style={styles.brandText}>PromptOps AI</span>
        </div>

        {!submitted ? (
          <>
            <h1 style={styles.heading}>Reset your password</h1>
            <p style={styles.subtext}>
              Enter the email associated with your account and we'll send you a reset link.
            </p>

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <div style={styles.fieldGroup}>
                <label htmlFor="email" style={styles.label}>Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (error) setError('') }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  style={styles.input}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e => (e.target.style.borderColor = '#1e1e2e')}
                />
              </div>

              <button type="submit" style={styles.submitBtn}
                onMouseEnter={e => (e.currentTarget.style.background = '#4f46e5')}
                onMouseLeave={e => (e.currentTarget.style.background = '#6366f1')}
              >
                Send reset link →
              </button>
            </form>
          </>
        ) : (
          <div style={styles.successState}>
            <div style={styles.iconCircle}><MailIcon /></div>
            <h1 style={styles.heading}>Check your email</h1>
            <p style={styles.subtext}>
              Password reset is not fully set up yet — this is a preview screen.
              In a complete version, a reset link would now be sent to <strong style={{ color: '#e5e7eb' }}>{email}</strong>.
            </p>
          </div>
        )}

        <p style={styles.footerText}>
          Remembered your password?{' '}
          <Link to="/login" style={styles.footerLink}>Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}

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
    maxWidth: '420px',
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
    marginBottom: '1.5rem',
  },
  brandText: {
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    letterSpacing: '0.08em',
    fontWeight: 600,
  },
  heading: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: '#f1f1f3',
    textAlign: 'center',
    margin: '0 0 0.5rem',
  },
  subtext: {
    fontSize: '0.85rem',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 1.5,
    margin: '0 0 1.5rem',
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
    marginBottom: '1.25rem',
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
  submitBtn: {
    width: '100%',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.78rem',
    fontSize: '0.92rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  successState: {
    textAlign: 'center',
  },
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(99,102,241,0.12)',
    color: '#818cf8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.25rem',
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