import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { ClientsListPage } from './pages/ClientsListPage'
import { AddClientPage } from './pages/AddClientPage'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { WorkoutFormPage } from './pages/WorkoutFormPage'
import { SchedulePage } from './pages/SchedulePage'
import { PickClientPage } from './pages/PickClientPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ProgressFormPage } from './pages/ProgressFormPage'
import { TabBar } from './components/TabBar'
import { ClientCardPage } from './pages/ClientCardPage'
import { getClient, type Client } from './lib/clients'

type View =
  | { name: 'list' }
  | { name: 'add-client' }
  | { name: 'edit-client'; client: Client }
  | { name: 'client-detail'; client: Client }
  | {
      name: 'workout-form'
      client: Client
      workoutId?: number
      workoutDate?: string
      returnTo: 'client-detail' | 'schedule'
    }
  | { name: 'schedule' }
  | { name: 'pick-client'; workoutDate: string }
  | { name: 'analytics' }
  | { name: 'progress-form'; clientId: number; date?: string }

function TrainerHome() {
  const [view, setView] = useState<View>({ name: 'list' })
  const [clientsRefreshKey, setClientsRefreshKey] = useState(0)
  const [workoutsRefreshKey, setWorkoutsRefreshKey] = useState(0)
  const [clientLoadError, setClientLoadError] = useState<string | null>(null)

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

  if (view.name === 'edit-client') {
    return (
      <ClientCardPage
        client={view.client}
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
        onAddWorkout={() =>
          setView({ name: 'workout-form', client: view.client, returnTo: 'client-detail' })
        }
        onOpenWorkout={(workoutId) =>
          setView({ name: 'workout-form', client: view.client, workoutId, returnTo: 'client-detail' })
        }
      />
    )
  }

  if (view.name === 'workout-form') {
    const { client, workoutId, workoutDate, returnTo } = view
    return (
      <WorkoutFormPage
        clientId={client.id}
        workoutId={workoutId}
        initialDate={workoutDate}
        onSaved={() => {
          setWorkoutsRefreshKey((key) => key + 1)
          setView(returnTo === 'schedule' ? { name: 'schedule' } : { name: 'client-detail', client })
        }}
        onCancel={() =>
          setView(returnTo === 'schedule' ? { name: 'schedule' } : { name: 'client-detail', client })
        }
      />
    )
  }

  if (view.name === 'pick-client') {
    const { workoutDate } = view
    return (
      <PickClientPage
        onPick={(client) =>
          setView({ name: 'workout-form', client, workoutDate, returnTo: 'schedule' })
        }
        onCancel={() => setView({ name: 'schedule' })}
      />
    )
  }

  if (view.name === 'progress-form') {
    return (
      <ProgressFormPage
        clientId={view.clientId}
        initialDate={view.date}
        onSaved={() => {
          setWorkoutsRefreshKey((key) => key + 1)
          setView({ name: 'analytics' })
        }}
        onCancel={() => setView({ name: 'analytics' })}
      />
    )
  }

  if (view.name === 'analytics') {
    return (
      <>
        <AnalyticsPage
          key={workoutsRefreshKey}
          onAddProgress={(clientId) => setView({ name: 'progress-form', clientId })}
          refreshKey={workoutsRefreshKey}
        />
        <TabBar
          active="analytics"
          onSelectTab={(tab) => {
            if (tab === 'clients') {
              setView({ name: 'list' })
            } else if (tab === 'schedule') {
              setView({ name: 'schedule' })
            } else if (tab === 'analytics') {
              setView({ name: 'analytics' })
            }
          }}
        />
      </>
    )
  }

  if (view.name === 'schedule') {
    return (
      <>
        <SchedulePage
          key={workoutsRefreshKey}
          onAddWorkout={(dateKey) => setView({ name: 'pick-client', workoutDate: dateKey })}
          onOpenClient={(clientId) => {
            setClientLoadError(null)
            getClient(clientId)
              .then((client) => setView({ name: 'client-detail', client }))
              .catch((err) =>
                setClientLoadError(err instanceof Error ? err.message : 'Не удалось открыть клиента'),
              )
          }}
          refreshKey={workoutsRefreshKey}
        />
        {clientLoadError && <p className="auth-error">{clientLoadError}</p>}
        <TabBar
          active="schedule"
          onSelectTab={(tab) => {
            if (tab === 'clients') {
              setView({ name: 'list' })
            } else if (tab === 'schedule') {
              setView({ name: 'schedule' })
            } else if (tab === 'analytics') {
              setView({ name: 'analytics' })
            }
          }}
        />
      </>
    )
  }

  return (
    <>
      <ClientsListPage
        onAddClient={() => setView({ name: 'add-client' })}
        onOpenClient={(client) => setView({ name: 'client-detail', client })}
        onEditClient={(client) => setView({ name: 'edit-client', client })}
        refreshKey={clientsRefreshKey}
      />
      <TabBar
        active="clients"
        onSelectTab={(tab) => {
          if (tab === 'clients') {
            setView({ name: 'list' })
          } else if (tab === 'schedule') {
            setView({ name: 'schedule' })
          } else if (tab === 'analytics') {
            setView({ name: 'analytics' })
          }
        }}
      />
    </>
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
