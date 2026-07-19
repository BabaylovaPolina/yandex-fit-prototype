import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { ClientsListPage } from './pages/ClientsListPage'
import { AddClientPage } from './pages/AddClientPage'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { WorkoutFormPage } from './pages/WorkoutFormPage'
import type { Client } from './lib/clients'

type View =
  | { name: 'list' }
  | { name: 'add-client' }
  | { name: 'client-detail'; client: Client }
  | { name: 'workout-form'; client: Client; workoutId?: number }

function TrainerHome() {
  const [view, setView] = useState<View>({ name: 'list' })
  const [clientsRefreshKey, setClientsRefreshKey] = useState(0)
  const [workoutsRefreshKey, setWorkoutsRefreshKey] = useState(0)

  if (view.name === 'add-client') {
    return (
      <AddClientPage
        onSaved={() => {
          setClientsRefreshKey((key) => key + 1)
          setView({ name: 'list' })
        }}
        onCancel={() => setView({ name: 'list' })}
      />
    )
  }

  if (view.name === 'client-detail') {
    return (
      <ClientDetailPage
        key={workoutsRefreshKey}
        client={view.client}
        onBack={() => setView({ name: 'list' })}
        onAddWorkout={() => setView({ name: 'workout-form', client: view.client })}
        onOpenWorkout={(workoutId) =>
          setView({ name: 'workout-form', client: view.client, workoutId })
        }
      />
    )
  }

  if (view.name === 'workout-form') {
    return (
      <WorkoutFormPage
        clientId={view.client.id}
        workoutId={view.workoutId}
        onSaved={() => {
          setWorkoutsRefreshKey((key) => key + 1)
          setView({ name: 'client-detail', client: view.client })
        }}
        onCancel={() => setView({ name: 'client-detail', client: view.client })}
      />
    )
  }

  return (
    <ClientsListPage
      onAddClient={() => setView({ name: 'add-client' })}
      onOpenClient={(client) => setView({ name: 'client-detail', client })}
      refreshKey={clientsRefreshKey}
    />
  )
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
