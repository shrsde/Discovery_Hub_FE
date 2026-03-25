'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getProjects, getProject, createProject, addProjectItem, removeProjectItem } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { timeAgo } from '@/lib/constants'
import { RichContent } from '@/components/RichEditor'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const PROJECT_COLORS = ['blue', 'green', 'amber', 'red', 'purple', 'peach']
const PROJECT_ICONS = ['◈', '◇', '◆', '⬡', '▸', '◎', '△', '◉']
const COLOR_HEX = { blue: '#3b82f6', green: '#16a34a', amber: '#f59e0b', red: '#ef4444', purple: '#8b5cf6', peach: '#f97316' }
const ICON_COLOR_MAP = {
  blue: 'text-blue-600 bg-blue-100',
  green: 'text-green-600 bg-green-100',
  amber: 'text-amber-600 bg-amber-100',
  red: 'text-red-600 bg-red-100',
  purple: 'text-purple-600 bg-purple-100',
  peach: 'text-orange-600 bg-orange-100',
}
const TYPE_META = {
  feed: { label: 'Feed Post', icon: '◈', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  interview: { label: 'Interview', icon: '◇', color: 'text-green-600 bg-green-50 border-green-200' },
  meeting: { label: 'Meeting', icon: '◎', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  document: { label: 'Document', icon: '◆', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  link: { label: 'Link', icon: '▸', color: 'text-purple-600 bg-purple-50 border-purple-200' },
}

export default function ProjectsPage() {
  const { displayName } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeProject, setActiveProject] = useState(null)
  const [projectDetail, setProjectDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showAddLink, setShowAddLink] = useState(false)
  const [addingLink, setAddingLink] = useState(false)
  const [linkForm, setLinkForm] = useState({ title: '', url: '', notes: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [form, setForm] = useState({ title: '', summary: '', description: '', public_url: '', icon: '◈', color: 'blue' })

  async function loadProjects() {
    const res = await getProjects()
    setProjects(res.data || [])
  }

  async function loadDetail(id) {
    setLoadingDetail(true)
    try {
      const res = await getProject(id)
      setProjectDetail(res.data)
    } finally { setLoadingDetail(false) }
  }

  useEffect(() => {
    loadProjects().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeProject) loadDetail(activeProject)
    else setProjectDetail(null)
  }, [activeProject])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setCreating(true)
    try {
      const res = await createProject({ ...form, created_by: displayName || 'Wes' })
      setForm({ title: '', summary: '', description: '', public_url: '', icon: '◈', color: 'blue' })
      setShowCreate(false)
      await loadProjects()
      if (res?.data?.id) setActiveProject(res.data.id)
    } finally { setCreating(false) }
  }

  async function handleRemoveItem(itemId) {
    await removeProjectItem(itemId)
    if (activeProject) await loadDetail(activeProject)
    await loadProjects()
  }

  async function handleAddLink(e) {
    e.preventDefault()
    if (!linkForm.title.trim() && !linkForm.url.trim()) return
    setAddingLink(true)
    try {
      await addProjectItem(activeProject, {
        item_type: 'link',
        title: linkForm.title.trim(),
        url: linkForm.url.trim(),
        notes: linkForm.notes.trim(),
        added_by: displayName || 'Wes',
      })
      setLinkForm({ title: '', url: '', notes: '' })
      setShowAddLink(false)
      await loadDetail(activeProject)
      await loadProjects()
    } finally { setAddingLink(false) }
  }

  // Filter items
  const items = projectDetail?.items || []
  const q = searchQuery.toLowerCase()
  let filteredItems = items
  if (filterType !== 'all') {
    filteredItems = filteredItems.filter(i => i.item_type === filterType)
  }
  if (q) {
    filteredItems = filteredItems.filter(i => {
      const s = i.source
      const text = [i.title, i.url, i.notes, s?.text, s?.title, s?.interviewee_name, s?.company, s?.biggest_signal].filter(Boolean).join(' ').toLowerCase()
      return text.includes(q)
    })
  }

  const typeCounts = {}
  for (const i of items) { typeCounts[i.item_type] = (typeCounts[i.item_type] || 0) + 1 }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-card-hover rounded-xl w-48" />
      <div className="flex gap-6">
        <div className="w-40 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-card-hover rounded-xl" />)}</div>
        <div className="flex-1 space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-card-hover rounded-2xl" />)}</div>
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="sticky top-14 z-30 bg-[#fafafa] pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text">Projects</h1>
          <button onClick={() => setShowCreate(true)}
            className="text-xs px-4 py-2 rounded-full bg-accent text-white hover:bg-accent-light transition-all duration-200 active:scale-[0.97] font-semibold shadow-sm">
            + New Project
          </button>
        </div>

        {activeProject && (
          <div className="flex items-center gap-2 flex-wrap">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search items..." className="!rounded-full flex-1 !text-xs" />
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="!w-auto !rounded-full text-xs !py-1.5 glass-subtle !border-[rgba(0,0,0,0.08)]">
              <option value="all">All ({items.length})</option>
              {Object.entries(typeCounts).map(([t, count]) => {
                const meta = TYPE_META[t] || { label: t, icon: '◈' }
                return <option key={t} value={t}>{meta.icon} {meta.label} ({count})</option>
              })}
            </select>
            <button onClick={() => setShowAddLink(true)}
              className="text-xs px-3 py-1.5 rounded-full bg-accent text-white hover:bg-accent-light transition-all font-medium">
              + Add Link
            </button>
          </div>
        )}
      </div>

      {/* Main layout */}
      <div className="flex gap-6">
        {/* Project sidebar */}
        <div className="hidden md:block w-40 shrink-0">
          <div className="sticky top-40 space-y-1 max-h-[70vh] overflow-y-auto">
            <div className="section-label text-[9px] px-2 mb-1 flex items-center gap-1">
              <span className="glyph text-xs">◆</span> Projects
            </div>
            {projects.map(p => (
              <button key={p.id} onClick={() => setActiveProject(activeProject === p.id ? null : p.id)}
                className={`w-full text-left px-2 py-2 rounded-lg transition-colors duration-200 ${
                  activeProject === p.id ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/40'
                }`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm glyph ${activeProject === p.id ? '' : ''}`} style={{ color: activeProject === p.id ? 'white' : COLOR_HEX[p.color] }}>
                    {p.icon || '◈'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold truncate">{p.title}</div>
                    <div className={`text-[10px] ${activeProject === p.id ? 'text-white/70' : 'text-text-tertiary'}`}>{p.item_count || 0} items</div>
                  </div>
                </div>
              </button>
            ))}
            {projects.length === 0 && (
              <div className="text-[10px] text-text-tertiary px-2 py-4">No projects yet</div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Mobile project selector */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {projects.map(p => (
              <button key={p.id} onClick={() => setActiveProject(activeProject === p.id ? null : p.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeProject === p.id ? 'bg-accent text-white' : 'glass-subtle text-text-secondary'
                }`}>
                <span className="glyph mr-1">{p.icon}</span> {p.title}
              </button>
            ))}
          </div>

          {!activeProject ? (
            /* No project selected — show grid overview */
            projects.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-3 glyph">◆</div>
                <div className="text-text-secondary text-sm">No projects yet</div>
                <button onClick={() => setShowCreate(true)}
                  className="mt-4 text-xs px-4 py-2 rounded-full bg-accent text-white hover:bg-accent-light transition-all font-semibold">
                  Create your first project
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map(p => (
                  <button key={p.id} onClick={() => setActiveProject(p.id)}
                    className="w-full text-left glass rounded-2xl p-4 card-lift">
                    <div className="flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg glyph shrink-0 ${ICON_COLOR_MAP[p.color] || ICON_COLOR_MAP.blue}`}>
                        {p.icon || '◈'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text text-sm">{p.title}</h3>
                        {p.summary && <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">{p.summary}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-text">{p.item_count || 0}</div>
                        <div className="text-[10px] text-text-tertiary">items</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : loadingDetail ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-card-hover rounded-2xl" />)}
            </div>
          ) : (
            /* Selected project detail */
            <>
              {/* Project header card */}
              <div className="glass rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg glyph shrink-0 ${ICON_COLOR_MAP[projectDetail?.color] || ICON_COLOR_MAP.blue}`}>
                    {projectDetail?.icon || '◈'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-text">{projectDetail?.title}</h2>
                    {projectDetail?.summary && <p className="text-xs text-text-secondary mt-0.5">{projectDetail.summary}</p>}
                    {projectDetail?.description && <p className="text-xs text-text-tertiary mt-1 line-clamp-2">{projectDetail.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {projectDetail?.public_url && (
                      <a href={projectDetail.public_url} target="_blank" rel="noopener"
                        className="text-xs px-3 py-1.5 rounded-full glass-subtle text-accent hover:text-accent-light transition font-medium border border-accent/20">
                        Open Link
                      </a>
                    )}
                    <Link href={`/projects/${activeProject}`}
                      className="text-xs px-3 py-1.5 rounded-full glass-subtle text-text-secondary hover:text-text transition font-medium">
                      Edit
                    </Link>
                  </div>
                </div>
              </div>

              {/* Items */}
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-text-tertiary text-sm">
                  {items.length === 0 ? 'No items in this project yet. @mention this project in a feed post or use "Add to Project" to get started.' : 'No items match your search.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map(item => {
                    const meta = TYPE_META[item.item_type] || { label: item.item_type, icon: '◈', color: 'text-text-secondary bg-card-hover border-border' }
                    const source = item.source

                    return (
                      <div key={item.id} className="glass rounded-2xl p-4">
                        <div className="flex items-start gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 mt-0.5 ${meta.color}`}>
                            {meta.icon} {meta.label}
                          </span>
                          <div className="flex-1 min-w-0">
                            {item.item_type === 'feed' && source && (
                              <div>
                                {source.text?.startsWith('<') ? (
                                  <div className="text-sm line-clamp-3"><RichContent html={source.text} /></div>
                                ) : (
                                  <p className="text-sm text-text line-clamp-3">{source.text}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-text-tertiary">
                                  <span>{source.author}</span>
                                  <span>{timeAgo(source.created_at)}</span>
                                  {source.thread_tag && <span className="tag tag-blue text-[8px]">{source.thread_tag}</span>}
                                </div>
                              </div>
                            )}
                            {item.item_type === 'interview' && source && (
                              <div>
                                <Link href={`/interviews/${item.item_id}`} className="font-semibold text-sm text-text hover:text-accent transition">
                                  {source.interviewee_name || 'Unknown'} <span className="text-text-secondary font-normal">at</span> {source.company || 'Unknown'}
                                </Link>
                                {source.role && <p className="text-xs text-text-secondary mt-0.5">{source.role}</p>}
                                {source.biggest_signal && <p className="text-xs text-green-700 mt-1">{source.biggest_signal}</p>}
                              </div>
                            )}
                            {item.item_type === 'meeting' && source && (
                              <div>
                                <span className="font-semibold text-sm text-text">{source.title}</span>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-tertiary">
                                  <span className={`tag ${source.status === 'completed' ? 'tag-green' : 'tag-blue'}`}>{source.status}</span>
                                  {source.scheduled_at && <span>{new Date(source.scheduled_at).toLocaleDateString()}</span>}
                                </div>
                              </div>
                            )}
                            {(item.item_type === 'link' || item.item_type === 'document') && (
                              <div>
                                {item.url ? (
                                  <a href={item.url} target="_blank" rel="noopener" className="text-sm text-accent hover:underline font-medium">
                                    {item.title || item.url}
                                  </a>
                                ) : (
                                  <span className="text-sm font-medium text-text">{item.title}</span>
                                )}
                                {item.notes && <p className="text-xs text-text-secondary mt-0.5">{item.notes}</p>}
                              </div>
                            )}
                            {!source && item.item_type !== 'link' && item.item_type !== 'document' && (
                              <span className="text-xs text-text-tertiary italic">Item no longer available</span>
                            )}
                          </div>
                          <button onClick={() => handleRemoveItem(item.id)}
                            className="text-[10px] text-text-tertiary hover:text-red-500 transition shrink-0">Remove</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
                    style={{ background: COLOR_HEX[color] + '30' }} />
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

      {/* Add Link Dialog */}
      <Dialog open={showAddLink} onOpenChange={setShowAddLink}>
        <DialogContent className="glass-strong rounded-2xl border-0 shadow-xl w-full max-w-sm p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-text tracking-tight">Add Reference Link</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLink} className="space-y-3">
            <input value={linkForm.title} onChange={e => setLinkForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Title" autoFocus />
            <input value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))}
              placeholder="URL" type="url" />
            <input value={linkForm.notes} onChange={e => setLinkForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (optional)" />
            <button type="submit" disabled={addingLink || (!linkForm.title.trim() && !linkForm.url.trim())}
              className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all disabled:opacity-40">
              {addingLink ? 'Adding...' : 'Add Link'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
