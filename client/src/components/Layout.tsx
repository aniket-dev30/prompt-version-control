import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const GitBranchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
)

const DashboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
  </svg>
)

const PromptsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

const PlaygroundIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const NAV_ITEMS = [
  { path: '/dashboard',  label: 'Dashboard',  icon: <DashboardIcon /> },
  { path: '/prompts',    label: 'Prompts',    icon: <PromptsIcon /> },
  { path: '/playground', label: 'Playground', icon: <PlaygroundIcon /> },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brandRow}>
          <GitBranchIcon />
          <span style={styles.brandText}>PromptOps AI</span>
        </div>

        <nav style={styles.nav}>
          {NAV_ITEMS.map(item => {
            const active = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  ...styles.navItem,
                  background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: active ? '#818cf8' : '#9ca3af',
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userRow}>
            <div style={styles.avatar}>{initials}</div>
            <div style={styles.userInfo}>
              <p style={styles.userName}>{user?.name || 'User'}</p>
              <p style={styles.userEmail}>{user?.email || ''}</p>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
          >
            <LogoutIcon /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0a0a0f',
  },
  sidebar: {
    width: '230px',
    flexShrink: 0,
    background: '#0e0e15',
    borderRight: '1px solid #1e1e2e',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 1rem',
    boxSizing: 'border-box',
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#818cf8',
    padding: '0 0.5rem',
    marginBottom: '2rem',
  },
  brandText: {
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    fontSize: '0.88rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
  },
  sidebarFooter: {
    borderTop: '1px solid #1e1e2e',
    paddingTop: '1rem',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0 0.5rem',
    marginBottom: '0.75rem',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#6366f1',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userInfo: {
    overflow: 'hidden',
  },
  userName: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#e5e7eb',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userEmail: {
    fontSize: '0.72rem',
    color: '#6b7280',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: '#6b7280',
    fontSize: '0.82rem',
    padding: '0.5rem 0.5rem',
    cursor: 'pointer',
    transition: 'color 0.15s',
  },
  main: {
    flex: 1,
    minWidth: 0,
    padding: '2rem',
    boxSizing: 'border-box',
  },
}