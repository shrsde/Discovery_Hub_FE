'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getDocument, updateDocument, deleteDocument, getProjects } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { timeAgo } from '@/lib/constants'

const TYPE_ICONS = {
  'application/vnd.google-apps.document': { icon: '◈', label: 'Google Doc', color: 'text-blue-600' },
  'application/vnd.google-apps.spreadsheet': { icon: '⬡', label: 'Google Sheet', color: 'text-green-600' },
}

export default function DocumentEditorPage({ params }) {
  const { id } = params
  const router = useRouter()
  const { displayName } = useAuth()
  const [doc, setDoc] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  async function load() {
    const [docRes, projRes] = await Promise.all([getDocument(id), getProjects()])
    const d = docRes.data
    setDoc(d)
    setTitle(d?.title || '')
    setNotes(d?.notes || '')
    setTags(d?.tags || [])
    setProjectId(d?.project_id || '')
    setProjects(projRes.data || [])
  }

  useEffect(() => {
    setMounted(true)
    load().finally(() => setLoading(false))
  }, [id])

  const save = useCallback(async (updates) => {
    setSaving(true)
    setSaved(false)
    try {
      await updateDocument(id, updates)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }, [id])

  async function handleSaveNotes() {
    await save({ notes, tags, title, project_id: projectId || null })
  }

  async function handleAddTag(e) {
    e.preventDefault()
    if (!tagInput.trim() || tags.includes(tagInput.trim())) return
    const newTags = [...tags, tagInput.trim()]
    setTags(newTags)
    setTagInput('')
    await save({ tags: newTags })
  }

  function removeTag(tag) {
    const newTags = tags.filter(t => t !== tag)
    setTags(newTags)
    save({ tags: newTags })
  }

  async function handleDelete() {
    if (!confirm('Delete this document? It will also be removed from Google Drive.')) return
    await deleteDocument(id)
    router.push('/documents')
  }

  if (!mounted || loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-card-hover rounded-xl w-48" />
      <div className="h-[70vh] bg-card-hover rounded-2xl" />
    </div>
  )

  if (!doc) return <div className="text-center py-20 text-text-secondary">Document not found</div>

  const meta = TYPE_ICONS[doc.google_mime_type] || TYPE_ICONS['application/vnd.google-apps.document']
  const project = projects.find(p => p.id === doc.project_id)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/documents')} className="text-text-secondary text-sm hover:text-text transition">&larr; Docs</button>
          <span className={`glyph text-lg ${meta.color}`}>{meta.icon}</span>
          <h1 className="text-lg font-semibold text-text truncate">{doc.title}</h1>
          <span className="text-[10px] text-text-tertiary">{meta.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-[11px] px-2.5 py-1 rounded-full glass-subtle text-text-secondary hover:text-text transition border border-[rgba(0,0,0,0.08)]">
            {sidebarOpen ? 'Hide Panel' : 'Show Panel'}
          </button>
          <a href={doc.web_view_url} target="_blank" rel="noopener"
            className="text-[11px] px-2.5 py-1 rounded-full glass-subtle text-accent hover:text-accent-light transition border border-accent/20 font-medium">
            Open in Google
          </a>
        </div>
      </div>

      {/* Editor + Sidebar */}
      <div className="flex gap-4" style={{ height: 'calc(100vh - 160px)' }}>
        {/* Google Docs/Sheets iframe */}
        <div className="flex-1 min-w-0 glass rounded-2xl overflow-hidden">
          <iframe
            src={doc.embed_url}
            className="w-full h-full border-0"
            allow="clipboard-read; clipboard-write"
            title={doc.title}
          />
        </div>

        {/* Annotations sidebar */}
        {sidebarOpen && (
          <div className="w-72 shrink-0 space-y-3 overflow-y-auto">
            {/* Title edit */}
            <div className="glass rounded-xl p-3 space-y-2">
              <div className="section-label text-[9px]">Title</div>
              <input value={title} onChange={e => setTitle(e.target.value)}
                onBlur={() => title !== doc.title && save({ title })}
                className="!text-sm !font-semibold" />
            </div>

            {/* Project link */}
            <div className="glass rounded-xl p-3 space-y-2">
              <div className="section-label text-[9px]">Project</div>
              <select value={projectId} onChange={e => { setProjectId(e.target.value); save({ project_id: e.target.value || null }) }}
                className="!w-full !rounded-lg text-xs !py-1.5">
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.title}</option>)}
              </select>
              {project && (
                <a href={`/projects`} className="text-[10px] text-accent hover:underline">View project</a>
              )}
            </div>

            {/* Notes */}
            <div className="glass rounded-xl p-3 space-y-2">
              <div className="section-label text-[9px]">Notes</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                onBlur={() => notes !== doc.notes && save({ notes })}
                placeholder="Add notes about this document..."
                rows={5} className="resize-none text-xs" />
            </div>

            {/* Tags */}
            <div className="glass rounded-xl p-3 space-y-2">
              <div className="section-label text-[9px]">Tags</div>
              <div className="flex flex-wrap gap-1">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition">×</button>
                  </span>
                ))}
              </div>
              <form onSubmit={handleAddTag} className="flex gap-1">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  placeholder="Add tag..." className="!text-xs flex-1" />
                <button type="submit" className="text-[10px] px-2 py-1 rounded-lg glass-subtle text-accent font-medium">Add</button>
              </form>
            </div>

            {/* Metadata */}
            <div className="glass rounded-xl p-3 space-y-1.5">
              <div className="section-label text-[9px]">Details</div>
              <div className="text-[10px] text-text-tertiary">Created by {doc.created_by}</div>
              <div className="text-[10px] text-text-tertiary">Created {timeAgo(doc.created_at)}</div>
              {doc.original_filename && (
                <div className="text-[10px] text-text-tertiary">Original: {doc.original_filename}</div>
              )}
              {saving && <div className="text-[10px] text-accent">Saving...</div>}
              {saved && <div className="text-[10px] text-green-600">Saved</div>}
            </div>

            {/* Delete */}
            <button onClick={handleDelete}
              className="w-full text-xs py-2 rounded-xl text-red-500 hover:bg-red-50 transition font-medium">
              Delete Document
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
