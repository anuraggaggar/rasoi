import { NavLink } from 'react-router-dom'
import { Home, BookOpen, Clock, Settings } from 'lucide-react'

const tabs = [
  { to: '/home',     icon: Home,     label: 'Home' },
  { to: '/library',  icon: BookOpen, label: 'Library' },
  { to: '/history',  icon: Clock,    label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-stone-200 bottom-nav z-50">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors min-h-[56px] justify-center
            ${isActive ? 'text-orange-600' : 'text-stone-400'}`
          }>
            <Icon size={22} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
