import { Link } from '@tanstack/react-router'
import React from 'react'

interface SidebarProps {
  children: React.ReactNode
  tenant: {
    id: string
    slug: string
    name: string
    status: string
    timezone: string
    locale: string
    logoUrl: string | null
    primaryColor: string
  }
  nav: { id: string; href: string; name: string; icon: string }[]
}

const Sidebar: React.FC<SidebarProps> = (props) => {
  return (
    <div className="grid grid-cols-[220px_1fr] h-[100dvh] overflow-hidden">
      <aside className="bg-accent p-4 overflow-y-auto min-h-0">
        <Link to="/app" className="font-semibold text-xl">
          {props.tenant.name}
        </Link>
        <div className="my-4">
          {props.nav.map((nav) => (
            <Link key={nav.id} to={nav.href} className="block">
              {nav.name}
            </Link>
          ))}
        </div>
      </aside>
      <main className="overflow-y-auto min-h-0">{props.children}</main>
    </div>
  )
}
export default Sidebar
