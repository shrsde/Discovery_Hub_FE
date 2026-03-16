'use client'

import "./globals.css"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import AuthGate from "@/components/AuthGate"

const PRIMARY = [
  { href: '/', label: 'Dashboard' },
  { href: '/feed', label: 'Feed' },
  { href: '/interviews', label: 'Interviews' },
  { href: '/sync', label: 'Sync' },
  { href: '/digest', label: 'Digest' },
]

const MORE = [
  { href: '/search', label: 'Search' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/news', label: 'News' },
]

const MOBILE_NAV = [
  { href: '/', label: 'Home', icon: '◉' },
  { href: '/feed', label: 'Feed', icon: '◈' },
  { href: '/interviews', label: 'Interviews', icon: '◇' },
]

function NavShell({ children }) {
  const pathname = usePathname()
  const { user, displayName, signOut } = useAuth()
  const [showMore, setShowMore] = useState(false)
  const [showUser, setShowUser] = useState(false)

  const isActive = (href) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const moreActive = MORE.some(m => isActive(m.href))

  // Don't show nav on login page
  if (pathname === '/login') return <>{children}</>

  // Don't show nav if not logged in
  if (!user) return <>{children}</>

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-[20px] border-t border-border md:hidden">
        <div className="flex justify-around items-center py-2">
          {MOBILE_NAV.slice(0, 2).map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${isActive(href) ? 'text-accent font-semibold' : 'text-text-tertiary hover:text-text-secondary'}`}>
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
          <Link href="/feed"
            className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center text-xl font-bold shadow-sm -mt-4 active:scale-[0.93] transition-all">
            +
          </Link>
          {MOBILE_NAV.slice(2).map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${isActive(href) ? 'text-accent font-semibold' : 'text-text-tertiary hover:text-text-secondary'}`}>
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop top nav */}
      <nav className="hidden md:block sticky top-0 z-50 bg-[rgba(250,250,250,0.85)] backdrop-blur-[20px] border-b border-border">
        <div className="max-w-3xl mx-auto px-6 flex items-center h-14 gap-6">
          <Link href="/" className="font-semibold text-text tracking-tight text-base shrink-0">
            Discovery Hub
          </Link>
          <div className="flex gap-1 items-center flex-1">
            {PRIMARY.filter(p => p.href !== '/').map(({ href, label }) => (
              <Link key={href} href={href}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${isActive(href) ? 'bg-accent text-white font-medium' : 'text-text-secondary hover:bg-accent-bg'}`}>
                {label}
              </Link>
            ))}

            {/* More dropdown */}
            <div className="relative">
              <button onClick={() => setShowMore(!showMore)}
                className={`group px-3 py-1.5 rounded-full text-sm transition-all ${moreActive ? 'bg-accent text-white font-medium' : 'text-text-secondary hover:bg-accent-bg'}`}>
                More <span className={`inline-block transition-transform duration-300 ${showMore ? 'rotate-45' : 'group-hover:rotate-90'}`}>+</span>
              </button>
              {showMore && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg py-1 w-40 z-50">
                    {MORE.map(({ href, label }) => (
                      <Link key={href} href={href} onClick={() => setShowMore(false)}
                        className={`block px-3 py-2 text-sm transition-all ${isActive(href) ? 'bg-accent-bg text-accent font-medium' : 'text-text-secondary hover:bg-card-hover'}`}>
                        {label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User menu */}
          <div className="relative">
            <button onClick={() => setShowUser(!showUser)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all hover:ring-2 hover:ring-accent/30 ${displayName === 'Wes' ? 'bg-wes' : displayName === 'Gibb' ? 'bg-gibb' : 'bg-accent'}`}>
              {displayName?.[0] || '?'}
            </button>
            {showUser && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUser(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg py-1 w-40 z-50">
                  <div className="px-3 py-2 text-sm font-medium text-text border-b border-border">{displayName}</div>
                  <button onClick={() => { signOut(); setShowUser(false) }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* FAB — Desktop only */}
      <Link href="/feed"
        className="hidden md:flex fixed bottom-6 right-6 z-40 w-12 h-12 bg-accent text-white rounded-full shadow-lg items-center justify-center text-2xl hover:bg-accent-light transition-all active:scale-[0.93] hover:shadow-xl">
        +
      </Link>
    </>
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Discovery Hub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="font-sans antialiased min-h-screen">
        <AuthProvider>
          <AuthGate>
            <NavShell>
              {children}
            </NavShell>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  )
}
