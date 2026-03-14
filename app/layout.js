'use client'

import "./globals.css"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: '/', label: 'Dashboard', icon: '◉' },
  { href: '/feed', label: 'Feed', icon: '◈' },
  { href: '/sync', label: 'Sync', icon: '◆' },
  { href: '/interviews', label: 'Interviews', icon: '◇' },
  { href: '/digest', label: 'Digest', icon: '◎' },
  { href: '/search', label: 'Search', icon: '⌕' },
]

export default function RootLayout({ children }) {
  const pathname = usePathname()

  return (
    <html lang="en">
      <head>
        <title>Discovery Hub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="font-sans antialiased min-h-screen">
        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-[20px] border-t border-border md:hidden">
          <div className="flex justify-around py-2">
            {NAV.map(({ href, label, icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link key={href} href={href}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${active ? 'text-accent font-semibold' : 'text-text-tertiary hover:text-text-secondary'}`}>
                  <span className="text-lg">{icon}</span>
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Desktop top nav */}
        <nav className="hidden md:block sticky top-0 z-50 bg-[rgba(250,250,250,0.85)] backdrop-blur-[20px] border-b border-border">
          <div className="max-w-3xl mx-auto px-6 flex items-center h-16 gap-8">
            <Link href="/" className="font-semibold text-text tracking-tight text-base">
              Discovery Hub
            </Link>
            <div className="flex gap-1">
              {NAV.map(({ href, label }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
                return (
                  <Link key={href} href={href}
                    className={`px-3.5 py-1.5 rounded-full text-sm transition-all ${active ? 'bg-accent text-white font-medium' : 'text-text-secondary hover:bg-accent-bg'}`}>
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-8">
          {children}
        </main>
      </body>
    </html>
  )
}
