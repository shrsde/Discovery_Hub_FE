'use client'

import "./globals.css"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { getNotifications, markNotificationsRead } from "@/lib/api"
import AuthGate from "@/components/AuthGate"

const PRIMARY = [
  { href: '/feed', label: 'Feed' },
  { href: '/interviews', label: 'Interviews' },
  { href: '/news', label: 'News' },
  { href: '/search', label: 'Search' },
]

const MORE = [
  { href: '/sync', label: 'Sync' },
  { href: '/digest', label: 'Digest' },
  { href: '/changelog', label: 'Changelog' },
]

const MOBILE_NAV = [
  { href: '/', label: 'Home', icon: '◉' },
  { href: '/feed', label: 'Feed', icon: '◈' },
  { href: '/interviews', label: 'Interviews', icon: '◇' },
]

function QuickPostModal({ onClose, displayName }) {
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)

  async function handlePost(e) {
    e.preventDefault()
    if (!text.trim()) return
    setPosting(true)
    try {
      const { postFeed } = await import('@/lib/api')
      const tags = []
      if (text.includes('@Wes')) tags.push('Wes')
      if (text.includes('@Gibb')) tags.push('Gibb')
      await postFeed({ author: displayName || 'Wes', type: 'insight', text, tags })
      onClose()
    } finally { setPosting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-border shadow-xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">Quick Post</h3>
          <button onClick={onClose} className="text-text-tertiary hover:text-text text-lg">&times;</button>
        </div>
        <form onSubmit={handlePost} className="space-y-3">
          <textarea value={text} onChange={e => setText(e.target.value)}
            rows={4} placeholder="What's on your mind?" autoFocus
            className="resize-none" />
          <div className="flex justify-end">
            <button type="submit" disabled={posting || !text.trim()}
              className="px-5 py-2 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all active:scale-[0.97] disabled:opacity-40 shadow-sm">
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QuickMeetingModal({ onClose, displayName }) {
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    try {
      const { createMeeting } = await import('@/lib/api')
      const res = await createMeeting({ title: title.trim(), organizer: displayName || 'Wes' })
      if (res.data?.meet_link && res.data.meet_link !== 'https://meet.google.com/new') {
        window.open(res.data.meet_link, '_blank')
      }
      onClose()
    } finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-border shadow-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">New Meeting</h3>
          <button onClick={onClose} className="text-text-tertiary hover:text-text text-lg">&times;</button>
        </div>
        <form onSubmit={handleCreate} className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Meeting title — e.g. Weekly sync" autoFocus />
          <p className="text-[10px] text-text-tertiary">A Google Meet link will be auto-generated and the recording bot will join automatically.</p>
          <button type="submit" disabled={creating || !title.trim()}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-all active:scale-[0.97] disabled:opacity-40">
            {creating ? 'Creating...' : 'Create Meeting'}
          </button>
        </form>
      </div>
    </div>
  )
}

function NavShell({ children }) {
  const pathname = usePathname()
  const { user, displayName, signOut } = useAuth()
  const [showMore, setShowMore] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const [showFab, setShowFab] = useState(false)
  const [showQuickPost, setShowQuickPost] = useState(false)
  const [showQuickMeeting, setShowQuickMeeting] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  const loadNotifications = useCallback(async () => {
    if (!displayName) return
    try {
      const res = await getNotifications(displayName)
      setNotifications(res.data || [])
    } catch (e) {
      console.error('Notification load failed:', e)
    }
  }, [displayName])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [loadNotifications])

  async function handleMarkAllRead() {
    if (!displayName) return
    await markNotificationsRead(displayName)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

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
        <div className="w-full px-8 flex items-center h-14">
          <Link href="/" className="text-xl tracking-tight shrink-0 mr-auto ml-4">
            <span className="font-black italic text-text">THE HUB</span>
          </Link>
          <div className="flex gap-1 items-center">
            {PRIMARY.map(({ href, label }) => (
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

          <div className="w-4" />

          {/* Profile avatar with notification badge */}
          <div className="relative">
            <button onClick={() => { setShowUser(!showUser); setShowNotifications(false) }}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white transition-all hover:ring-2 hover:ring-accent/30 relative ${displayName === 'Wes' ? 'bg-wes' : displayName === 'Gibb' ? 'bg-gibb' : 'bg-accent'}`}>
              {displayName?.[0] || '?'}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showUser && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUser(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg w-72 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-text">{displayName}</div>
                      <div className="text-[11px] text-text-tertiary">{user?.email}</div>
                    </div>
                    <button onClick={() => { signOut(); setShowUser(false) }}
                      className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition">
                      Sign Out
                    </button>
                  </div>

                  {/* Notifications */}
                  {unreadCount > 0 && (
                    <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-blue-50/50">
                      <span className="text-xs font-semibold text-text">{unreadCount} new mention{unreadCount > 1 ? 's' : ''}</span>
                      <button onClick={handleMarkAllRead} className="text-[10px] text-accent hover:underline">
                        Mark all read
                      </button>
                    </div>
                  )}
                  <div className="max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-text-tertiary text-center">No mentions yet</div>
                    ) : (
                      notifications.slice(0, 10).map(n => (
                        <Link key={n.id} href="/feed" onClick={() => setShowUser(false)}
                          className={`block px-3 py-2.5 border-b border-border-light text-xs hover:bg-card-hover transition ${!n.read ? 'bg-blue-50/30' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${n.author === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                              {n.author?.[0]}
                            </span>
                            <span className="text-text-secondary">
                              <span className="font-semibold text-text">{n.author}</span> mentioned you
                            </span>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-auto shrink-0" />}
                          </div>
                          {n.preview && (
                            <p className="text-text-tertiary mt-1 line-clamp-2 pl-7">{n.preview}</p>
                          )}
                        </Link>
                      ))
                    )}
                  </div>
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
      <div className="hidden md:block fixed bottom-6 right-6 z-40">
        {/* Expanded options */}
        {showFab && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowFab(false)} />
            <div className="absolute bottom-14 right-0 z-40 flex flex-col gap-2 items-end">
              <button onClick={() => { setShowQuickPost(true); setShowFab(false) }}
                className="flex items-center gap-2 bg-white border border-border rounded-full pl-4 pr-3 py-2 shadow-lg hover:shadow-xl hover:-translate-y-px transition-all text-sm font-medium text-text">
                New Post
                <span className="w-7 h-7 bg-accent text-white rounded-full flex items-center justify-center text-xs">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
                </span>
              </button>
              <button onClick={() => { setShowQuickMeeting(true); setShowFab(false) }}
                className="flex items-center gap-2 bg-white border border-border rounded-full pl-4 pr-3 py-2 shadow-lg hover:shadow-xl hover:-translate-y-px transition-all text-sm font-medium text-text">
                New Meeting
                <span className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                </span>
              </button>
              <Link href="/interviews/new" onClick={() => setShowFab(false)}
                className="flex items-center gap-2 bg-white border border-border rounded-full pl-4 pr-3 py-2 shadow-lg hover:shadow-xl hover:-translate-y-px transition-all text-sm font-medium text-text">
                New Interview
                <span className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
                </span>
              </Link>
            </div>
          </>
        )}

        {/* FAB button */}
        <button onClick={() => setShowFab(!showFab)}
          className={`w-12 h-12 bg-accent text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:shadow-xl transition-all active:scale-[0.93] ${showFab ? 'rotate-45' : ''}`}>
          +
        </button>
      </div>

      {/* Quick Post Modal */}
      {showQuickPost && (
        <QuickPostModal onClose={() => setShowQuickPost(false)} displayName={displayName} />
      )}

      {/* Quick Meeting Modal */}
      {showQuickMeeting && (
        <QuickMeetingModal onClose={() => setShowQuickMeeting(false)} displayName={displayName} />
      )}
    </>
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>THE HUB</title>
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
