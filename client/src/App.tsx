import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Prompts from './pages/Prompts'
import PromptDetail from './pages/PromptDetail'
import Playground from './pages/Playground'

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore(state => state.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

// Public route wrapper (redirect to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore(state => state.token)
  return !token ? <>{children}</> : <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* Protected routes — wrapped in Layout for sidebar/navbar */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard"   element={<Dashboard />} />
        <Route path="/prompts"     element={<Prompts />} />
        <Route path="/prompts/:id" element={<PromptDetail />} />
        <Route path="/playground" element={<Playground />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App