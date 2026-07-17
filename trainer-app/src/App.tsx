import { AuthProvider, useAuth } from './lib/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'

function AppShell() {
  const { session, loading } = useAuth()

  if (loading) return null
  return session ? <HomePage /> : <AuthPage />
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

export default App
