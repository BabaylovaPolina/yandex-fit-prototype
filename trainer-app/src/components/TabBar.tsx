export type TabKey = 'clients' | 'schedule' | 'analytics' | 'profile'

const TABS: { key: TabKey; icon: string; label: string; enabled: boolean }[] = [
  { key: 'clients', icon: '👥', label: 'Клиенты', enabled: true },
  { key: 'schedule', icon: '📅', label: 'Расписание', enabled: true },
  { key: 'analytics', icon: '📊', label: 'Аналитика', enabled: true },
  { key: 'profile', icon: '⚙️', label: 'Профиль', enabled: false },
]

type Props = {
  active: TabKey
  onSelectTab: (tab: TabKey) => void
}

export function TabBar({ active, onSelectTab }: Props) {
  return (
    <div className="tab-bar">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          disabled={!tab.enabled}
          onClick={() => onSelectTab(tab.key)}
          className={
            tab.key === active
              ? 'tab active'
              : tab.enabled
                ? 'tab'
                : 'tab tab-disabled'
          }
        >
          <div className="tab-icon">{tab.icon}</div>
          <div className="tab-label">{tab.label}</div>
        </button>
      ))}
    </div>
  )
}
