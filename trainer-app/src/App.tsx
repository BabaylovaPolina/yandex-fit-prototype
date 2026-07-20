import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { ClientsListPage } from './pages/ClientsListPage'
import { AddClientPage } from './pages/AddClientPage'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { WorkoutFormPage } from './pages/WorkoutFormPage'
import { WorkoutViewPage } from './pages/WorkoutViewPage'
import { LiveWorkoutPage } from './pages/LiveWorkoutPage'
import { ExerciseHistoryPage } from './pages/ExerciseHistoryPage'
import { SchedulePage } from './pages/SchedulePage'
import { PickClientPage } from './pages/PickClientPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ProgressFormPage } from './pages/ProgressFormPage'
import { TabBar, type TabKey } from './components/TabBar'
import { ClientCardPage } from './pages/ClientCardPage'
import { ProfilePage } from './pages/ProfilePage'
import { getClient, type Client } from './api/clients'
import type { InputKind } from './api/exercises'

type View =
  | { name: 'list' }
  | { name: 'add-client' }
  | { name: 'edit-client'; client: Client }
  | { name: 'client-detail'; client: Client }
  | {
      name: 'workout-view'
      client: Client
      workoutId: number
      returnTo: 'client-detail' | 'schedule'
    }
  | {
      name: 'live-workout'
      client: Client
      workoutId: number
      returnTo: 'client-detail' | 'schedule'
    }
  | {
      name: 'exercise-history'
      client: Client
      workoutId: number
      exerciseId: number
      exerciseName: string
      inputKind: InputKind
      returnTo: 'client-detail' | 'schedule'
    }
  | {
      name: 'workout-form'
      client: Client
      workoutId?: number
      copyFromWorkoutId?: number
      workoutDate?: string
      returnTo: 'client-detail' | 'schedule' | 'workout-view'
    }
  | { name: 'schedule' }
  | { name: 'pick-client'; workoutDate: string }
  | { name: 'analytics' }
  | { name: 'progress-form'; clientId: number; date?: string }
  | { name: 'profile' }

function tabViewFor(tab: TabKey): View {
  if (tab === 'schedule') return { name: 'schedule' }
  if (tab === 'analytics') return { name: 'analytics' }
  if (tab === 'profile') return { name: 'profile' }
  return { name: 'list' }
}

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
          setView({ name: 'workout-view', client: view.client, workoutId, returnTo: 'client-detail' })
        }
        onCopyWorkout={(workoutId) =>
          setView({
            name: 'workout-form',
            client: view.client,
            copyFromWorkoutId: workoutId,
            returnTo: 'client-detail',
          })
        }
      />
    )
  }

  if (view.name === 'workout-view') {
    const { client, workoutId, returnTo } = view
    return (
      <WorkoutViewPage
        key={workoutId}
        workoutId={workoutId}
        onBack={() => setView(returnTo === 'schedule' ? { name: 'schedule' } : { name: 'client-detail', client })}
        onEdit={() =>
          setView({ name: 'workout-form', client, workoutId, returnTo: 'workout-view' })
        }
        onStart={() => setView({ name: 'live-workout', client, workoutId, returnTo })}
        onDeleted={() => {
          setWorkoutsRefreshKey((key) => key + 1)
          setView(returnTo === 'schedule' ? { name: 'schedule' } : { name: 'client-detail', client })
        }}
        onOpenExerciseHistory={(exerciseId, exerciseName, inputKind) =>
          setView({
            name: 'exercise-history',
            client,
            workoutId,
            exerciseId,
            exerciseName,
            inputKind,
            returnTo,
          })
        }
      />
    )
  }

  if (view.name === 'exercise-history') {
    const { client, workoutId, exerciseId, exerciseName, inputKind, returnTo } = view
    return (
      <ExerciseHistoryPage
        clientId={client.id}
        exerciseId={exerciseId}
        exerciseName={exerciseName}
        inputKind={inputKind}
        onBack={() => setView({ name: 'workout-view', client, workoutId, returnTo })}
      />
    )
  }

  if (view.name === 'live-workout') {
    const { client, workoutId, returnTo } = view
    return (
      <LiveWorkoutPage
        key={workoutId}
        workoutId={workoutId}
        onFinished={() => {
          setWorkoutsRefreshKey((key) => key + 1)
          setView({ name: 'workout-view', client, workoutId, returnTo })
        }}
        onCancel={() => setView({ name: 'workout-view', client, workoutId, returnTo })}
      />
    )
  }

  if (view.name === 'workout-form') {
    const { client, workoutId, copyFromWorkoutId, workoutDate, returnTo } = view
    const backView: View =
      returnTo === 'workout-view' && workoutId !== undefined
        ? { name: 'workout-view', client, workoutId, returnTo: 'client-detail' }
        : returnTo === 'schedule'
          ? { name: 'schedule' }
          : { name: 'client-detail', client }
    return (
      <WorkoutFormPage
        clientId={client.id}
        workoutId={workoutId}
        copyFromWorkoutId={copyFromWorkoutId}
        initialDate={workoutDate}
        onSaved={() => {
          setWorkoutsRefreshKey((key) => key + 1)
          setView(backView)
        }}
        onCancel={() => setView(backView)}
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
        <TabBar active="analytics" onSelectTab={(tab) => setView(tabViewFor(tab))} />
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
        <TabBar active="schedule" onSelectTab={(tab) => setView(tabViewFor(tab))} />
      </>
    )
  }

  if (view.name === 'profile') {
    return (
      <>
        <ProfilePage />
        <TabBar active="profile" onSelectTab={(tab) => setView(tabViewFor(tab))} />
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
      <TabBar active="clients" onSelectTab={(tab) => setView(tabViewFor(tab))} />
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
