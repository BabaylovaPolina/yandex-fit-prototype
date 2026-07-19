export type TabKey = 'clients' | 'schedule' | 'analytics' | 'profile'

const TABS: { key: TabKey; icon: string; label: string; enabled: boolean }[] = [
  { key: 'clients', icon: '👥', label: 'Клиенты', enabled: true },
  { key: 'schedule', icon: '📅', label: 'Расписание', enabled: false },
  { key: 'analytics', icon: '📊', label: 'Аналитика', enabled: false },
  { key: 'profile', icon: '⚙️', label: 'Профиль', enabled: false },
]

type Props = {
  active: TabKey
}

export function TabBar({ active }: Props) {
  return (
    <div className="tab-bar">
      {TABS.map((tab) => (
        <div
          key={tab.key}
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
        </div>
      ))}
    </div>
  )
}
