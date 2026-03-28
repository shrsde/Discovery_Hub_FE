'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getDocuments, createDocument, uploadDocument, deleteDocument, getProjects } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { timeAgo } from '@/lib/constants'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const TYPE_ICONS = {
  'application/vnd.google-apps.document': { icon: '◈', label: 'Doc', color: 'text-blue-600 bg-blue-50' },
  'application/vnd.google-apps.spreadsheet': { icon: '⬡', label: 'Sheet', color: 'text-green-600 bg-green-50' },
}

export default function DocumentsPage() {
  const { displayName } = useAuth()
  const [documents, setDocuments] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterProject, setFilterProject] = useState('all')
  const [form, setForm] = useState({ title: '', type: 'doc', project_id: '' })
  const fileRef = useRef(null)

  async function load() {
    const [docRes, projRes] = await Promise.all([getDocuments(), getProjects()])
    setDocuments(docRes.data || [])
    setProjects(projRes.data || [])
  }

  useEffect(() => {
    setMounted(true)
    load().finally(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setCreating(true)
    try {
      await createDocument({
        title: form.title.trim(),
        type: form.type,
        created_by: displayName || 'Wes',
        project_id: form.project_id || null,
      })
      setForm({ title: '', type: 'doc', project_id: '' })
      setShowCreate(false)
      await load()
    } finally { setCreating(false) }
  }

  async function handleUpload(e) {
    const file = e.target?.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadDocument(file, file.name, displayName || 'Wes', null)
      await load()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this document?')) return
    await deleteDocument(id)
    await load()
  }

  let filtered = documents
  if (filterProject !== 'all') {
    filtered = filtered.filter(d => d.project_id === filterProject)
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(d => d.title?.toLowerCase().includes(q) || d.notes?.toLowerCase().includes(q))
  }

  if (!mounted || loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-card-hover rounded-xl w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-card-hover rounded-2xl" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Documents</h1>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" className="hidden"
            accept=".doc,.docx,.txt,.md,.html,.rtf,.pdf,.xlsx,.xls,.csv,.tsv"
            onChange={handleUpload} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="text-xs px-3 py-1.5 rounded-full glass-subtle text-text-secondary hover:text-text transition border border-[rgba(0,0,0,0.08)] font-medium">
            {uploading ? 'Uploading...' : '+ Upload'}
          </button>
          <button onClick={() => setShowCreate(true)}
            className="text-xs px-4 py-2 rounded-full bg-accent text-white hover:bg-accent-light transition-all duration-200 active:scale-[0.97] font-semibold shadow-sm">
            + New Doc
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search documents..." className="!rounded-full flex-1 !text-xs" />
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="!w-auto !rounded-full text-xs !py-1.5 glass-subtle !border-[rgba(0,0,0,0.08)]">
          <option value="all">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.title}</option>)}
        </select>
      </div>

      {/* Document grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3 glyph">◈</div>
          <div className="text-text-secondary text-sm">No documents yet</div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setShowCreate(true)}
              className="text-xs px-4 py-2 rounded-full bg-accent text-white hover:bg-accent-light transition-all font-semibold">
              Create a Doc
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="text-xs px-4 py-2 rounded-full glass-subtle text-text-secondary hover:text-text transition border border-[rgba(0,0,0,0.08)] font-medium">
              Upload a file
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(doc => {
            const meta = TYPE_ICONS[doc.google_mime_type] || TYPE_ICONS['application/vnd.google-apps.document']
            const project = projects.find(p => p.id === doc.project_id)
            return (
              <div key={doc.id} className="glass rounded-2xl p-4 card-lift group">
                <Link href={`/documents/${doc.id}`} className="block">
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg glyph shrink-0 ${meta.color}`}>
                      {meta.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text text-sm truncate">{doc.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-text-tertiary">{meta.label}</span>
                        <span className="text-[10px] text-text-tertiary">{timeAgo(doc.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                  {project && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full glass-subtle text-text-secondary border border-[rgba(0,0,0,0.06)]">
                      {project.icon} {project.title}
                    </span>
                  )}
                  {doc.notes && <p className="text-xs text-text-tertiary mt-2 line-clamp-2">{doc.notes}</p>}
                </Link>
                <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={doc.web_view_url} target="_blank" rel="noopener"
                    className="text-[10px] text-accent hover:underline">Open in Google</a>
                  <button onClick={() => handleDelete(doc.id)}
                    className="text-[10px] text-text-tertiary hover:text-red-500 transition ml-auto">Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-strong rounded-2xl border-0 shadow-xl w-full max-w-sm p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-text tracking-tight">New Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Document title" autoFocus />
            <div className="flex gap-2">
              {[{ value: 'doc', label: '◈ Document' }, { value: 'sheet', label: '⬡ Spreadsheet' }].map(t => (
                <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
                    form.type === t.value ? 'bg-accent text-white' : 'glass-subtle text-text-secondary'
                  }`}>{t.label}</button>
              ))}
            </div>
            <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
              className="!w-full !rounded-full text-xs !py-1.5">
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.title}</option>)}
            </select>
            <button type="submit" disabled={creating || !form.title.trim()}
              className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all disabled:opacity-40">
              {creating ? 'Creating...' : `Create ${form.type === 'sheet' ? 'Spreadsheet' : 'Document'}`}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
