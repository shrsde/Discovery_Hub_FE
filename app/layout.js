'use client'

import "./globals.css"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { getNotifications, markNotificationsRead } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import AuthGate from "@/components/AuthGate"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CURRENT_VERSION } from "@/lib/versions"

const PRIMARY = [
  { href: '/feed', label: 'Feed' },
  { href: '/interviews', label: 'Interviews' },
  { href: '/projects', label: 'Projects' },
  { href: '/the-index', label: 'Index' },
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

function QuickPostModal({ open, onOpenChange, displayName }) {
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
      onOpenChange(false)
    } finally { setPosting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong rounded-2xl border-0 shadow-xl w-full max-w-md p-5 space-y-4">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-text tracking-tight">Quick Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handlePost} className="space-y-3">
          <textarea value={text} onChange={e => setText(e.target.value)}
            rows={4} placeholder="What's on your mind?" autoFocus
            className="resize-none !rounded-xl" />
          <div className="flex justify-end">
            <button type="submit" disabled={posting || !text.trim()}
              className="px-5 py-2 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all duration-200 active:scale-[0.97] disabled:opacity-40 shadow-sm">
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QuickMeetingModal({ open, onOpenChange, displayName }) {
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
      onOpenChange(false)
    } finally { setCreating(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong rounded-2xl border-0 shadow-xl w-full max-w-sm p-5 space-y-4">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-text tracking-tight">New Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Meeting title" autoFocus />
          <p className="text-[10px] text-text-tertiary">Google Meet link auto-generated. Recording bot joins and transcribes automatically.</p>
          <button type="submit" disabled={creating || !title.trim()}
            className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all duration-200 active:scale-[0.97] disabled:opacity-40">
            {creating ? 'Creating...' : 'Create Meeting'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
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
  const [navMounted, setNavMounted] = useState(false)

  useEffect(() => { setNavMounted(true) }, [])

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

    // Real-time notification subscription via Supabase
    let channel
    if (displayName) {
      channel = supabase
        .channel('notifications-realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient=eq.${displayName}`,
        }, () => {
          loadNotifications()
        })
        .subscribe()

      import('@/lib/push').then(({ registerPush }) => {
        registerPush(displayName).catch(console.error)
      })
    }

    // Fallback polling every 60s in case realtime drops
    const interval = setInterval(loadNotifications, 60000)

    return () => {
      clearInterval(interval)
      if (channel) supabase.removeChannel(channel)
    }
  }, [loadNotifications, displayName])

  async function handleMarkAllRead() {
    if (!displayName) return
    await markNotificationsRead(displayName)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const isActive = (href) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const moreActive = MORE.some(m => isActive(m.href))

  if (pathname === '/login') return <>{children}</>
  if (!user) return <>{children}</>

  return (
    <>
      {/* Mobile bottom nav — glass */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong md:hidden">
        <div className="flex justify-around items-center py-2">
          {MOBILE_NAV.slice(0, 2).map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors duration-200 ${isActive(href) ? 'text-accent font-semibold' : 'text-text-tertiary hover:text-text-secondary'}`}>
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
          <Link href="/feed"
            className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg -mt-4 active:scale-[0.93] transition-all duration-200">
            +
          </Link>
          {MOBILE_NAV.slice(2).map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors duration-200 ${isActive(href) ? 'text-accent font-semibold' : 'text-text-tertiary hover:text-text-secondary'}`}>
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop top nav — liquid glass */}
      <nav className="hidden md:block sticky top-0 z-50 border-b border-[rgba(255,255,255,0.4)] backdrop-blur-2xl bg-[rgba(250,250,250,0.55)] shadow-[0_1px_12px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.3)]">
        <div className="w-full max-w-[1100px] mx-auto px-6 flex items-center h-14">
          <Link href="/" className="shrink-0 mr-auto flex items-center gap-2.5">
            <span className="nav-logo text-text">THE<span className="text-text-tertiary/40 mx-[1px]">·</span>HUB</span>
            <span className="version-pill text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full">v{CURRENT_VERSION}</span>
          </Link>
          <div className="flex gap-1 items-center">
            {PRIMARY.map(({ href, label }) => (
              <Link key={href} href={href} prefetch={false}
                className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium uppercase tracking-nav transition-colors duration-200 ${isActive(href) ? 'bg-accent text-white' : 'text-text-tertiary hover:text-text'}`}>
                {label}
              </Link>
            ))}

            <DropdownMenu open={showMore} onOpenChange={setShowMore}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`group px-3 py-1.5 rounded-full text-[11.5px] font-medium uppercase tracking-nav transition-colors duration-200 ${moreActive ? 'bg-accent text-white' : 'text-text-tertiary hover:text-text'}`}>
                  More <span className={`inline-block transition-transform duration-300 ${showMore ? 'rotate-45' : 'group-hover:rotate-90'}`}>+</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-strong rounded-xl shadow-lg py-1 w-40 border-0">
                {MORE.map(({ href, label }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link href={href} prefetch={false}
                      className={`block px-3 py-2 text-sm transition-colors duration-200 ${isActive(href) ? 'text-accent font-medium' : 'text-text-secondary hover:text-text'}`}>
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="w-4" />

          {/* Profile avatar */}
          <DropdownMenu open={showUser} onOpenChange={setShowUser}>
            <DropdownMenuTrigger asChild>
              <button
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white transition-all duration-200 hover:ring-2 hover:ring-accent/20 relative ${displayName === 'Wes' ? 'bg-wes' : displayName === 'Gibb' ? 'bg-gibb' : 'bg-accent'}`}>
                {displayName?.[0] || '?'}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-strong rounded-xl shadow-xl w-72 overflow-hidden p-0 border-0">
              <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-text">{displayName}</div>
                  <div className="text-[11px] text-text-tertiary">{user?.email}</div>
                </div>
                <button onClick={() => { signOut(); setShowUser(false) }}
                  className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors duration-200">
                  Sign Out
                </button>
              </div>

              {unreadCount > 0 && (
                <div className="px-3 py-2 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between bg-blue-50/30">
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
                    <DropdownMenuItem key={n.id} asChild className="p-0 focus:bg-transparent">
                      <Link href="/feed" onClick={() => setShowUser(false)}
                        className={`block px-3 py-2.5 border-b border-[rgba(0,0,0,0.04)] text-xs hover:bg-white/40 transition-colors duration-200 ${!n.read ? 'bg-blue-50/20' : ''}`}>
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
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <main key={pathname} className="max-w-[1100px] mx-auto px-6 py-8 pb-24 md:pb-8">
        {navMounted ? children : (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-card-hover rounded-xl w-48" />
            <div className="h-24 bg-card-hover rounded-2xl" />
            {[1, 2, 3].map(i => (
              <div key={i} className="glass rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-card-hover rounded-full" />
                  <div className="h-4 bg-card-hover rounded w-32" />
                </div>
                <div className="h-4 bg-card-hover rounded w-full" />
                <div className="h-4 bg-card-hover rounded w-3/4" />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB — Desktop only */}
      <div className="hidden md:block fixed bottom-6 right-6 z-40">
        <Popover open={showFab} onOpenChange={setShowFab}>
          <PopoverTrigger asChild>
            <button
              className={`w-12 h-12 bg-accent text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:shadow-xl transition-all duration-200 active:scale-[0.93] ${showFab ? 'rotate-45' : ''}`}>
              +
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-auto p-0 bg-transparent border-none shadow-none">
            <div className="flex flex-col gap-2 items-end mb-2">
              <button onClick={() => { setShowQuickPost(true); setShowFab(false) }}
                className="flex items-center gap-2 glass-strong rounded-full pl-4 pr-3 py-2 shadow-lg hover:shadow-xl card-lift text-sm font-medium text-text border-0">
                New Post
                <span className="w-7 h-7 bg-accent text-white rounded-full flex items-center justify-center text-xs glyph">
                  ◈
                </span>
              </button>
              <button onClick={() => { setShowQuickMeeting(true); setShowFab(false) }}
                className="flex items-center gap-2 glass-strong rounded-full pl-4 pr-3 py-2 shadow-lg hover:shadow-xl card-lift text-sm font-medium text-text border-0">
                New Meeting
                <span className="w-7 h-7 bg-accent text-white rounded-full flex items-center justify-center text-xs glyph">
                  ◎
                </span>
              </button>
              <Link href="/interviews/new" onClick={() => setShowFab(false)}
                className="flex items-center gap-2 glass-strong rounded-full pl-4 pr-3 py-2 shadow-lg hover:shadow-xl card-lift text-sm font-medium text-text border-0">
                New Interview
                <span className="w-7 h-7 bg-accent text-white rounded-full flex items-center justify-center text-xs glyph">
                  ◇
                </span>
              </Link>
              <Link href="/projects" onClick={() => setShowFab(false)}
                className="flex items-center gap-2 glass-strong rounded-full pl-4 pr-3 py-2 shadow-lg hover:shadow-xl card-lift text-sm font-medium text-text border-0">
                New Project
                <span className="w-7 h-7 bg-accent text-white rounded-full flex items-center justify-center text-xs glyph">
                  ◆
                </span>
              </Link>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <QuickPostModal open={showQuickPost} onOpenChange={setShowQuickPost} displayName={displayName} />
      <QuickMeetingModal open={showQuickMeeting} onOpenChange={setShowQuickMeeting} displayName={displayName} />
    </>
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <title>THE HUB</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="font-sans min-h-full flex flex-col">
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
