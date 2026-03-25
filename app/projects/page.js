'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getProjects, createProject } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { timeAgo } from '@/lib/constants'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const PROJECT_COLORS = ['blue', 'green', 'amber', 'red', 'purple', 'peach']
const PROJECT_ICONS = ['◈', '◇', '◆', '⬡', '▸', '◎', '△', '◉']
const COLOR_MAP = {
  blue: 'from-blue-500/10 to-blue-600/5 border-blue-300/40',
  green: 'from-green-500/10 to-green-600/5 border-green-300/40',
  amber: 'from-amber-500/10 to-amber-600/5 border-amber-300/40',
  red: 'from-red-500/10 to-red-600/5 border-red-300/40',
  purple: 'from-purple-500/10 to-purple-600/5 border-purple-300/40',
  peach: 'from-orange-500/10 to-orange-600/5 border-orange-300/40',
}
const ICON_COLOR_MAP = {
  blue: 'text-blue-600 bg-blue-100',
  green: 'text-green-600 bg-green-100',
  amber: 'text-amber-600 bg-amber-100',
  red: 'text-red-600 bg-red-100',
  purple: 'text-purple-600 bg-purple-100',
  peach: 'text-orange-600 bg-orange-100',
}

export default function ProjectsPage() {
  const { displayName } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', summary: '', description: '', public_url: '', icon: '◈', color: 'blue' })

  async function load() {
    const res = await getProjects()
    setProjects(res.data || [])
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setCreating(true)
    try {
      await createProject({ ...form, created_by: displayName || 'Wes' })
      setForm({ title: '', summary: '', description: '', public_url: '', icon: '◈', color: 'blue' })
      setShowCreate(false)
      await load()
    } finally { setCreating(false) }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4 animate-pulse">
      <div className="h-8 bg-card-hover rounded-xl w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass rounded-2xl p-5 space-y-3">
            <div className="h-10 w-10 bg-card-hover rounded-xl" />
            <div className="h-5 bg-card-hover rounded w-32" />
            <div className="h-3 bg-card-hover rounded w-full" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text">Projects</h1>
        <button onClick={() => setShowCreate(true)}
          className="text-xs px-4 py-2 rounded-full bg-accent text-white hover:bg-accent-light transition-all duration-200 active:scale-[0.97] font-semibold shadow-sm">
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3 glyph">◈</div>
          <div className="text-text-secondary text-sm">No projects yet</div>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 text-xs px-4 py-2 rounded-full bg-accent text-white hover:bg-accent-light transition-all font-semibold">
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <Link key={p.id} href={`/projects/${p.id}`}
              className={`glass rounded-2xl p-5 card-lift border bg-gradient-to-br ${COLOR_MAP[p.color] || COLOR_MAP.blue}`}>
              <div className="flex items-start justify-between mb-3">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg glyph ${ICON_COLOR_MAP[p.color] || ICON_COLOR_MAP.blue}`}>
                  {p.icon || '◈'}
                </span>
                <span className="text-[10px] text-text-tertiary">{timeAgo(p.updated_at)}</span>
              </div>
              <h3 className="font-semibold text-text text-sm mb-1">{p.title}</h3>
              {p.summary && <p className="text-xs text-text-secondary line-clamp-2 mb-2">{p.summary}</p>}
              <div className="flex items-center gap-2 mt-auto">
                <span className="text-[10px] text-text-tertiary">{p.item_count || 0} items</span>
                {p.public_url && <span className="text-[10px] text-accent">Has link</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-strong rounded-2xl border-0 shadow-xl w-full max-w-md p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-text tracking-tight">New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Project title" autoFocus />
            <input value={form.public_url} onChange={e => setForm(f => ({ ...f, public_url: e.target.value }))}
              placeholder="Public URL (optional)" type="url" />
            <input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              placeholder="Brief summary" />
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)" rows={3} className="resize-none" />

            <div>
              <div className="section-label mb-1.5">Icon</div>
              <div className="flex gap-1.5">
                {PROJECT_ICONS.map(icon => (
                  <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center glyph text-sm transition-all ${
                      form.icon === icon ? 'bg-accent text-white' : 'glass-subtle text-text-secondary hover:bg-white/60'
                    }`}>{icon}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="section-label mb-1.5">Color</div>
              <div className="flex gap-1.5">
                {PROJECT_COLORS.map(color => (
                  <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      form.color === color ? 'ring-2 ring-accent ring-offset-1' : ''
                    }`}
                    style={{ background: { blue: '#3b82f6', green: '#16a34a', amber: '#f59e0b', red: '#ef4444', purple: '#8b5cf6', peach: '#f97316' }[color] + '30' }} />
                ))}
              </div>
            </div>

            <button type="submit" disabled={creating || !form.title.trim()}
              className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all duration-200 active:scale-[0.97] disabled:opacity-40">
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
