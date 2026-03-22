'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getIndex, getIndexFolders, createIndexFolder, createIndexEntry, updateIndexEntry, updateIndexFolder, deleteIndexEntry, deleteIndexFolder } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { timeAgo } from '@/lib/constants'
import RichEditor, { RichContent } from '@/components/RichEditor'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const FOLDER_COLORS = ['blue', 'green', 'amber', 'red', 'purple', 'peach']
const FOLDER_ICONS = ['◈', '◇', '◆', '⬡', '▸', '◎', '△', '◉']
const SOURCE_LABELS = { feed: 'Feed Post', interview: 'Interview', meeting: 'Meeting', manual: 'Manual' }

export default function TheIndexPage() {
  const { displayName } = useAuth()
  const [entries, setEntries] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFolder, setActiveFolder] = useState(null) // null = all
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [expandedEntry, setExpandedEntry] = useState(null)

  // New folder form
  const [folderName, setFolderName] = useState('')
  const [folderDesc, setFolderDesc] = useState('')
  const [folderIcon, setFolderIcon] = useState('◈')
  const [folderColor, setFolderColor] = useState('blue')

  // New entry form
  const [entryTitle, setEntryTitle] = useState('')
  const [entryBody, setEntryBody] = useState('')
  const [entryTags, setEntryTags] = useState('')

  async function load() {
    const folderId = activeFolder
    const res = folderId
      ? await getIndex(folderId)
      : await getIndex()
    setEntries(folderId ? (res.data || []) : (res.entries || []))
    if (!folderId) setFolders(res.folders || [])
  }

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [activeFolder])

  async function handleCreateFolder(e) {
    e.preventDefault()
    if (!folderName.trim()) return
    await createIndexFolder({ name: folderName.trim(), description: folderDesc.trim(), icon: folderIcon, color: folderColor })
    setFolderName(''); setFolderDesc(''); setFolderIcon('◈'); setFolderColor('blue')
    setShowNewFolder(false)
    // Reload folders
    const fRes = await getIndexFolders()
    setFolders(fRes.data || [])
  }

  async function handleCreateEntry(e) {
    e.preventDefault()
    if (!entryTitle.trim()) return
    await createIndexEntry({
      title: entryTitle.trim(),
      body: entryBody.trim(),
      folder_id: activeFolder,
      tags: entryTags ? entryTags.split(',').map(t => t.trim()).filter(Boolean) : [],
      author: displayName || 'Wes',
      source_type: 'manual',
    })
    setEntryTitle(''); setEntryBody(''); setEntryTags('')
    setShowNewEntry(false)
    await load()
  }

  async function handleUpdateEntry(id, updates) {
    await updateIndexEntry(id, updates)
    await load()
    setEditingEntry(null)
  }

  async function handleDeleteEntry(id) {
    if (!confirm('Remove this from the index?')) return
    await deleteIndexEntry(id)
    await load()
  }

  async function handleDeleteFolder(id) {
    if (!confirm('Delete this folder? Entries will be moved to uncategorized.')) return
    await deleteIndexFolder(id)
    setActiveFolder(null)
    const fRes = await getIndexFolders()
    setFolders(fRes.data || [])
    await load()
  }

  async function handleMoveEntry(entryId, folderId) {
    await updateIndexEntry(entryId, { folder_id: folderId })
    await load()
  }

  async function handlePinEntry(id, pinned) {
    await updateIndexEntry(id, { pinned: !pinned })
    await load()
  }

  // Filter
  let filtered = entries
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.body?.toLowerCase().includes(q) ||
      e.tags?.some(t => t.toLowerCase().includes(q))
    )
  }

  const pinnedEntries = filtered.filter(e => e.pinned)
  const unpinnedEntries = filtered.filter(e => !e.pinned)
  const activeF = folders.find(f => f.id === activeFolder)

  // Count entries per folder
  const folderCounts = {}
  entries.forEach(e => {
    const fid = e.folder_id || 'uncategorized'
    folderCounts[fid] = (folderCounts[fid] || 0) + 1
  })

  if (loading) return <div className="text-text-tertiary text-center py-20">Loading...</div>

  return (
    <div>
      {/* Header */}
      <div className="sticky top-14 z-30 bg-[#fafafa] pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text flex items-center gap-2">
            <span className="glyph glyph-float">⬡</span> The Index
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewFolder(true)}
              className="text-xs px-3 py-1.5 rounded-full glass-subtle text-text-secondary hover:text-text transition-colors duration-200">
              + Folder
            </button>
            <button onClick={() => setShowNewEntry(true)}
              className="text-xs px-4 py-2 rounded-full bg-accent text-white hover:bg-accent-light transition-all duration-200 active:scale-[0.97] font-semibold shadow-sm">
              + New Entry
            </button>
          </div>
        </div>

        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search the index..." className="!rounded-full !text-xs" />
      </div>

      <div className="flex gap-6">
        {/* Folder sidebar */}
        <div className="hidden md:block w-44 shrink-0">
          <div className="sticky top-40 space-y-1">
            <button onClick={() => setActiveFolder(null)}
              className={`w-full text-left px-3 py-2 rounded-xl transition-colors duration-200 flex items-center gap-2 ${
                !activeFolder ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/40'
              }`}>
              <span className="text-sm">⬡</span>
              <div>
                <div className="text-[11px] font-semibold">All Entries</div>
                <div className="text-[10px] opacity-70">{entries.length} items</div>
              </div>
            </button>

            {folders.map(f => (
              <button key={f.id} onClick={() => setActiveFolder(f.id)}
                className={`w-full text-left px-3 py-2 rounded-xl transition-colors duration-200 flex items-center gap-2 group ${
                  activeFolder === f.id ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/40'
                }`}>
                <span className="text-sm">{f.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold truncate">{f.name}</div>
                  <div className="text-[10px] opacity-70">{folderCounts[f.id] || 0} items</div>
                </div>
              </button>
            ))}

            <div className="h-px bg-[rgba(0,0,0,0.06)] my-2" />
            <button onClick={() => setShowNewFolder(true)}
              className="w-full text-left px-3 py-2 rounded-xl text-text-tertiary hover:text-text hover:bg-white/40 transition-colors duration-200 text-[11px]">
              + New Folder
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Active folder header */}
          {activeF && (
            <div className="glass rounded-2xl p-4 flex items-center justify-between gradient-bg-blue gradient-blue">
              <div className="flex items-center gap-2">
                <span className="glyph text-xl">{activeF.icon}</span>
                <div>
                  <h2 className="text-sm font-semibold text-text">{activeF.name}</h2>
                  {activeF.description && <p className="text-xs text-text-secondary">{activeF.description}</p>}
                </div>
              </div>
              <button onClick={() => handleDeleteFolder(activeF.id)}
                className="text-xs text-text-tertiary hover:text-red-500 transition-colors duration-200">
                Delete Folder
              </button>
            </div>
          )}

          {/* Pinned */}
          {pinnedEntries.length > 0 && (
            <div>
              <div className="section-label mb-2 flex items-center gap-1.5">
                <span className="glyph">&#x25C6;</span> Pinned
              </div>
              <div className="space-y-2">
                {pinnedEntries.map(entry => (
                  <IndexCard key={entry.id} entry={entry} folders={folders}
                    expanded={expandedEntry === entry.id}
                    onToggle={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                    onPin={() => handlePinEntry(entry.id, entry.pinned)}
                    onDelete={() => handleDeleteEntry(entry.id)}
                    onMove={(fid) => handleMoveEntry(entry.id, fid)}
                    onEdit={() => setEditingEntry(entry)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Entries */}
          <div className="space-y-2">
            {unpinnedEntries.map(entry => (
              <IndexCard key={entry.id} entry={entry} folders={folders}
                expanded={expandedEntry === entry.id}
                onToggle={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                onPin={() => handlePinEntry(entry.id, entry.pinned)}
                onDelete={() => handleDeleteEntry(entry.id)}
                onMove={(fid) => handleMoveEntry(entry.id, fid)}
                onEdit={() => setEditingEntry(entry)}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center">
              <div className="glyph text-2xl text-text-tertiary mb-2">⬡</div>
              <p className="text-sm text-text-tertiary">
                {searchQuery ? 'No matching entries.' : activeFolder ? 'This folder is empty. Index posts and interviews here.' : 'The index is empty. Start indexing feed posts and interviews.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="glass-strong rounded-2xl border-0 shadow-xl max-w-sm p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold text-text flex items-center gap-2">
                <span className="glyph">◈</span> New Folder
              </DialogTitle>
            </DialogHeader>
          </div>
          <form onSubmit={handleCreateFolder} className="px-5 pb-5 space-y-4">
            <div>
              <label className="section-label block mb-1.5">Name</label>
              <input value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="e.g. Pain Points, Competitors" />
            </div>
            <div>
              <label className="section-label block mb-1.5">Description</label>
              <input value={folderDesc} onChange={e => setFolderDesc(e.target.value)} placeholder="What goes in this folder?" />
            </div>
            <div>
              <label className="section-label block mb-1.5">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {FOLDER_ICONS.map(i => (
                  <button key={i} type="button" onClick={() => setFolderIcon(i)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-200 ${
                      folderIcon === i ? 'bg-accent text-white' : 'glass-subtle text-text-secondary'
                    }`}>{i}</button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={!folderName.trim()}
              className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all duration-200 active:scale-[0.97] disabled:opacity-40">
              Create Folder
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Entry Dialog */}
      <Dialog open={showNewEntry} onOpenChange={setShowNewEntry}>
        <DialogContent className="glass-strong rounded-2xl border-0 shadow-xl max-w-md p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold text-text flex items-center gap-2">
                <span className="glyph">⬡</span> New Index Entry
              </DialogTitle>
            </DialogHeader>
          </div>
          <form onSubmit={handleCreateEntry} className="px-5 pb-5 space-y-4">
            <div>
              <label className="section-label block mb-1.5">Title</label>
              <input value={entryTitle} onChange={e => setEntryTitle(e.target.value)} placeholder="Entry title..." />
            </div>
            <div>
              <label className="section-label block mb-1.5">Body</label>
              <RichEditor content={entryBody} onChange={setEntryBody} placeholder="Write or paste content..." />
            </div>
            {folders.length > 0 && (
              <div>
                <label className="section-label block mb-1.5">Folder</label>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setActiveFolder(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      !activeFolder ? 'bg-accent text-white' : 'glass-subtle text-text-secondary'
                    }`}>Uncategorized</button>
                  {folders.map(f => (
                    <button key={f.id} type="button" onClick={() => setActiveFolder(f.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        activeFolder === f.id ? 'bg-accent text-white' : 'glass-subtle text-text-secondary'
                      }`}>{f.icon} {f.name}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="section-label block mb-1.5">Tags</label>
              <input value={entryTags} onChange={e => setEntryTags(e.target.value)} placeholder="comma-separated tags" />
            </div>
            <button type="submit" disabled={!entryTitle.trim()}
              className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all duration-200 active:scale-[0.97] disabled:opacity-40">
              Add to Index
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      {editingEntry && (
        <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
          <DialogContent className="glass-strong rounded-2xl border-0 shadow-xl max-w-md p-0 overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold text-text">Edit Entry</DialogTitle>
              </DialogHeader>
            </div>
            <EditEntryForm entry={editingEntry} folders={folders} onSave={handleUpdateEntry} onClose={() => setEditingEntry(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function EditEntryForm({ entry, folders, onSave, onClose }) {
  const [title, setTitle] = useState(entry.title)
  const [body, setBody] = useState(entry.body || '')
  const [folderId, setFolderId] = useState(entry.folder_id)
  const [tags, setTags] = useState((entry.tags || []).join(', '))
  const [saving, setSaving] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await onSave(entry.id, {
      title, body, folder_id: folderId,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    })
    setSaving(false)
    onClose()
  }

  return (
    <form onSubmit={handleSave} className="px-5 pb-5 space-y-4">
      <div>
        <label className="section-label block mb-1.5">Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="section-label block mb-1.5">Body</label>
        <RichEditor content={body} onChange={setBody} placeholder="Content..." />
      </div>
      <div>
        <label className="section-label block mb-1.5">Folder</label>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setFolderId(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${!folderId ? 'bg-accent text-white' : 'glass-subtle text-text-secondary'}`}>None</button>
          {folders.map(f => (
            <button key={f.id} type="button" onClick={() => setFolderId(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${folderId === f.id ? 'bg-accent text-white' : 'glass-subtle text-text-secondary'}`}>{f.icon} {f.name}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="section-label block mb-1.5">Tags</label>
        <input value={tags} onChange={e => setTags(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving || !title.trim()}
          className="flex-1 py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all disabled:opacity-40">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onClose} className="text-xs text-text-tertiary hover:text-text transition">Cancel</button>
      </div>
    </form>
  )
}

function IndexCard({ entry, folders, expanded, onToggle, onPin, onDelete, onMove, onEdit }) {
  const sourceLabel = SOURCE_LABELS[entry.source_type] || 'Manual'
  const folder = folders.find(f => f.id === entry.folder_id)
  const sourceLink = entry.source_type === 'feed' ? `/feed?thread=${entry.source_id}`
    : entry.source_type === 'interview' ? `/interviews/${entry.source_id}`
    : null

  return (
    <div className={`glass rounded-2xl p-4 card-lift ${entry.pinned ? 'gradient-amber' : ''}`}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="glyph text-text-tertiary text-sm mt-1 hover:text-text transition-colors shrink-0">
          {expanded ? '&#x25BC;' : '&#x25B6;'}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text text-sm">{entry.title}</span>
            <span className="tag tag-primary">{sourceLabel}</span>
            {folder && <span className={`tag tag-${folder.color || 'blue'}`}>{folder.icon} {folder.name}</span>}
            {entry.pinned && <span className="text-xs text-amber-600 flex items-center gap-1"><span className="glyph">&#x25C6;</span></span>}
            <span className="text-text-tertiary text-xs ml-auto">{timeAgo(entry.updated_at || entry.created_at)}</span>
          </div>

          {/* Tags */}
          {entry.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {entry.tags.map(t => <span key={t} className="tag tag-blue text-[8px]">{t}</span>)}
            </div>
          )}

          {/* Preview when collapsed */}
          {!expanded && entry.body && (
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">
              {entry.body.replace(/<[^>]*>/g, '').slice(0, 150)}
            </p>
          )}

          {/* Expanded body */}
          {expanded && (
            <div className="mt-3 animate-in">
              {entry.body?.startsWith('<') ? (
                <div className="text-sm"><RichContent html={entry.body} /></div>
              ) : (
                <p className="text-sm text-text whitespace-pre-wrap">{entry.body}</p>
              )}

              {sourceLink && (
                <Link href={sourceLink} className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-3">
                  View source →
                </Link>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[rgba(0,0,0,0.04)]">
            <button onClick={onEdit} className="text-[11px] text-text-tertiary hover:text-text transition">Edit</button>
            <button onClick={onPin} className="text-[11px] text-text-tertiary hover:text-text transition">{entry.pinned ? 'Unpin' : 'Pin'}</button>
            {folders.length > 0 && (
              <select onChange={e => { if (e.target.value) onMove(e.target.value === 'none' ? null : e.target.value); e.target.value = '' }}
                className="!w-auto !rounded-full !text-[11px] !py-0.5 !px-2 !bg-transparent !border-0 text-text-tertiary" defaultValue="">
                <option value="" disabled>Move to...</option>
                <option value="none">Uncategorized</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
              </select>
            )}
            <button onClick={onDelete} className="text-[11px] text-text-tertiary hover:text-red-500 transition ml-auto">Remove</button>
          </div>
        </div>
      </div>
    </div>
  )
}
