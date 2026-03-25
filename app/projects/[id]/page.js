'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProject, updateProject, deleteProject, addProjectItem, removeProjectItem } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { timeAgo } from '@/lib/constants'
import { RichContent } from '@/components/RichEditor'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const ICON_COLOR_MAP = {
  blue: 'text-blue-600 bg-blue-100',
  green: 'text-green-600 bg-green-100',
  amber: 'text-amber-600 bg-amber-100',
  red: 'text-red-600 bg-red-100',
  purple: 'text-purple-600 bg-purple-100',
  peach: 'text-orange-600 bg-orange-100',
}

const TYPE_LABELS = {
  feed: { label: 'Feed Post', icon: '◈', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  interview: { label: 'Interview', icon: '◇', color: 'text-green-600 bg-green-50 border-green-200' },
  meeting: { label: 'Meeting', icon: '◎', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  document: { label: 'Document', icon: '◆', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  link: { label: 'Link', icon: '▸', color: 'text-purple-600 bg-purple-50 border-purple-200' },
}

export default function ProjectDetailPage({ params }) {
  const { id } = params
  const router = useRouter()
  const { displayName } = useAuth()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [showAddLink, setShowAddLink] = useState(false)
  const [linkForm, setLinkForm] = useState({ title: '', url: '', notes: '' })
  const [addingLink, setAddingLink] = useState(false)
  const [filter, setFilter] = useState('all')

  async function load() {
    const res = await getProject(id)
    setProject(res.data)
    setEditForm({ title: res.data?.title, summary: res.data?.summary, description: res.data?.description, public_url: res.data?.public_url })
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      await updateProject(id, editForm)
      setEditing(false)
      await load()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirm('Delete this project and all its linked items?')) return
    await deleteProject(id)
    router.push('/projects')
  }

  async function handleRemoveItem(itemId) {
    await removeProjectItem(itemId)
    await load()
  }

  async function handleAddLink(e) {
    e.preventDefault()
    if (!linkForm.title.trim() && !linkForm.url.trim()) return
    setAddingLink(true)
    try {
      await addProjectItem(id, {
        item_type: 'link',
        title: linkForm.title.trim(),
        url: linkForm.url.trim(),
        notes: linkForm.notes.trim(),
        added_by: displayName || 'Wes',
      })
      setLinkForm({ title: '', url: '', notes: '' })
      setShowAddLink(false)
      await load()
    } finally { setAddingLink(false) }
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4 animate-pulse">
      <div className="h-8 bg-card-hover rounded-xl w-48" />
      <div className="glass rounded-2xl p-6 space-y-3">
        <div className="h-12 w-12 bg-card-hover rounded-xl" />
        <div className="h-6 bg-card-hover rounded w-64" />
        <div className="h-4 bg-card-hover rounded w-full" />
      </div>
    </div>
  )

  if (!project) return <div className="text-center py-20 text-text-secondary">Project not found</div>

  const items = project.items || []
  const filteredItems = filter === 'all' ? items : items.filter(i => i.item_type === filter)
  const typeCounts = {}
  for (const i of items) { typeCounts[i.item_type] = (typeCounts[i.item_type] || 0) + 1 }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/projects')} className="text-text-secondary text-sm hover:text-text transition">&larr; Projects</button>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(!editing)}
            className="text-xs px-3 py-1.5 rounded-full glass-subtle text-text-secondary hover:text-text transition-colors border border-[rgba(0,0,0,0.08)]">
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button onClick={handleDelete}
            className="text-xs px-3 py-1.5 rounded-full text-red-500 hover:bg-red-50 transition-colors">
            Delete
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="glass rounded-2xl p-6">
        {editing ? (
          <div className="space-y-3">
            <input value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Project title" className="text-lg font-semibold" />
            <input value={editForm.public_url || ''} onChange={e => setEditForm(f => ({ ...f, public_url: e.target.value }))}
              placeholder="Public URL" type="url" />
            <input value={editForm.summary || ''} onChange={e => setEditForm(f => ({ ...f, summary: e.target.value }))}
              placeholder="Brief summary" />
            <textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description" rows={4} className="resize-none" />
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all disabled:opacity-40">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-4 mb-3">
              <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl glyph shrink-0 ${ICON_COLOR_MAP[project.color] || ICON_COLOR_MAP.blue}`}>
                {project.icon || '◈'}
              </span>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-text">{project.title}</h1>
                {project.summary && <p className="text-sm text-text-secondary mt-0.5">{project.summary}</p>}
              </div>
            </div>
            {project.public_url && (
              <a href={project.public_url} target="_blank" rel="noopener"
                className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline mb-3">
                <span className="glyph">▸</span> {project.public_url}
              </a>
            )}
            {project.description && (
              <p className="text-sm text-text-secondary leading-relaxed mt-2">{project.description}</p>
            )}
          </>
        )}
      </div>

      {/* Actions + Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setShowAddLink(true)}
          className="text-xs px-3 py-1.5 rounded-full bg-accent text-white hover:bg-accent-light transition-all font-medium">
          + Add Link
        </button>
        <div className="flex gap-1 ml-auto">
          <button onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              filter === 'all' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-card-hover'
            }`}>All ({items.length})</button>
          {Object.entries(typeCounts).map(([t, count]) => {
            const meta = TYPE_LABELS[t] || { label: t, icon: '◈' }
            return (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  filter === t ? 'bg-accent text-white' : 'text-text-secondary hover:bg-card-hover'
                }`}>{meta.icon} {meta.label} ({count})</button>
            )
          })}
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-text-tertiary text-sm">
            No items yet. Add feed posts, interviews, meetings, or links to this project.
          </div>
        ) : filteredItems.map(item => {
          const meta = TYPE_LABELS[item.item_type] || { label: item.item_type, icon: '◈', color: 'text-text-secondary bg-card-hover border-border' }
          const source = item.source

          return (
            <div key={item.id} className="glass rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 mt-0.5 ${meta.color}`}>
                  {meta.icon} {meta.label}
                </span>
                <div className="flex-1 min-w-0">
                  {/* Feed post */}
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
                      </div>
                    </div>
                  )}

                  {/* Interview */}
                  {item.item_type === 'interview' && source && (
                    <div>
                      <Link href={`/interviews/${item.item_id}`} className="font-semibold text-sm text-text hover:text-accent transition">
                        {source.interviewee_name || 'Unknown'} <span className="text-text-secondary font-normal">at</span> {source.company || 'Unknown'}
                      </Link>
                      {source.role && <p className="text-xs text-text-secondary mt-0.5">{source.role}</p>}
                      {source.biggest_signal && <p className="text-xs text-green-700 mt-1">{source.biggest_signal}</p>}
                    </div>
                  )}

                  {/* Meeting */}
                  {item.item_type === 'meeting' && source && (
                    <div>
                      <span className="font-semibold text-sm text-text">{source.title}</span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-tertiary">
                        <span className={`tag ${source.status === 'completed' ? 'tag-green' : 'tag-blue'}`}>{source.status}</span>
                        {source.scheduled_at && <span>{new Date(source.scheduled_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  )}

                  {/* Link or Document */}
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

                  {/* Fallback for missing source */}
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
