import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { ClientsListPage } from './pages/ClientsListPage'
import { AddClientPage } from './pages/AddClientPage'

function TrainerHome() {
  const [view, setView] = useState<'list' | 'add'>('list')
  const [refreshKey, setRefreshKey] = useState(0)

  if (view === 'add') {
    return (
      <AddClientPage
        onSaved={() => {
          setRefreshKey((key) => key + 1)
          setView('list')
        }}
        onCancel={() => setView('list')}
      />
    )
  }

  return <ClientsListPage onAddClient={() => setView('add')} refreshKey={refreshKey} />
}

function AppShell() {
  const { session, loading } = useAuth()

  if (loading) return null
  return session ? <TrainerHome /> : <AuthPage />
}

function App() {
  return (
    <AuthProvider>
      <div className="phone-frame">
        <AppShell />
      </div>
    </AuthProvider>
  )
}

export default App
