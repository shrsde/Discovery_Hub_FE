'use client'

import { useState, useEffect, useRef } from 'react'
import { getFeed, postFeed, updateFeed, deleteFeed, uploadFeedMedia, getInterviews } from '@/lib/api'
import { FEED_TYPES, getFeedType, timeAgo } from '@/lib/constants'

function VideoEmbed({ url }) {
  let embedUrl = null
  if (url.includes('youtube.com/watch')) {
    const id = new URL(url).searchParams.get('v')
    if (id) embedUrl = `https://www.youtube.com/embed/${id}`
  } else if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0]
    if (id) embedUrl = `https://www.youtube.com/embed/${id}`
  } else if (url.includes('vimeo.com/')) {
    const id = url.split('vimeo.com/')[1]?.split('?')[0]
    if (id) embedUrl = `https://player.vimeo.com/video/${id}`
  } else if (url.includes('loom.com/share/')) {
    const id = url.split('loom.com/share/')[1]?.split('?')[0]
    if (id) embedUrl = `https://www.loom.com/embed/${id}`
  }
  if (!embedUrl) return <a href={url} target="_blank" rel="noopener" className="text-blue-600 text-xs underline">{url}</a>
  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-border aspect-video">
      <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
    </div>
  )
}

function MediaPreview({ item }) {
  const [expanded, setExpanded] = useState(false)
  if (!item.media_url && !item.media_type) return null

  if (item.media_type === 'video_link') {
    return (
      <div>
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 hover:underline mt-1">
          {expanded ? 'Hide video' : 'Show video'}
        </button>
        {expanded && <VideoEmbed url={item.media_url} />}
      </div>
    )
  }

  if (item.media_type === 'image') {
    return (
      <div>
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 hover:underline mt-1">
          {expanded ? 'Hide image' : `Show image: ${item.media_name || 'attachment'}`}
        </button>
        {expanded && (
          <div className="mt-2 rounded-lg overflow-hidden border border-border">
            <img src={item.media_url} alt={item.media_name} className="max-w-full max-h-80 object-contain" />
          </div>
        )}
      </div>
    )
  }

  if (item.media_type === 'video') {
    return (
      <div>
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 hover:underline mt-1">
          {expanded ? 'Hide video' : `Show video: ${item.media_name || 'attachment'}`}
        </button>
        {expanded && (
          <div className="mt-2 rounded-lg overflow-hidden border border-border">
            <video src={item.media_url} controls className="max-w-full max-h-80" />
          </div>
        )}
      </div>
    )
  }

  if (item.media_type === 'document') {
    return (
      <a href={item.media_url} target="_blank" rel="noopener"
        className="mt-2 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-100 transition w-fit">
        <span>📄</span> {item.media_name || 'Download document'}
      </a>
    )
  }

  return null
}

function TaggedText({ text }) {
  if (!text) return null
  const parts = text.split(/(@Wes|@Gibb)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part === '@Wes') return <span key={i} className="font-semibold text-wes bg-wes/10 px-1 rounded">@Wes</span>
        if (part === '@Gibb') return <span key={i} className="font-semibold text-gibb bg-gibb/10 px-1 rounded">@Gibb</span>
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

export default function FeedPage() {
  const [feed, setFeed] = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [view, setView] = useState('active')
  const [author, setAuthor] = useState('Wes')
  const [type, setType] = useState('insight')
  const [text, setText] = useState('')
  const [linkedId, setLinkedId] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState(null)
  const [mediaName, setMediaName] = useState('')
  const [videoLink, setVideoLink] = useState('')
  const [showMediaOptions, setShowMediaOptions] = useState(false)
  const [selectedPosts, setSelectedPosts] = useState(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const fileInputRef = useRef(null)

  async function loadFeed() {
    const r = await getFeed(view)
    setFeed(r.data || [])
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      loadFeed(),
      getInterviews().then(r => setInterviews(r.data || [])),
    ]).finally(() => setLoading(false))
  }, [view])

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadFeedMedia(file)
      setMediaUrl(res.url)
      setMediaType(res.mediaType)
      setMediaName(res.mediaName)
      setShowMediaOptions(false)
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleAddVideoLink() {
    if (!videoLink.trim()) return
    setMediaUrl(videoLink.trim())
    setMediaType('video_link')
    setMediaName('')
    setVideoLink('')
    setShowMediaOptions(false)
  }

  function clearMedia() {
    setMediaUrl('')
    setMediaType(null)
    setMediaName('')
  }

  // Extract tags from text
  function extractTags(text) {
    const tags = []
    if (text.includes('@Wes')) tags.push('Wes')
    if (text.includes('@Gibb')) tags.push('Gibb')
    return tags
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!text.trim()) return
    setPosting(true)
    try {
      await postFeed({
        author, type, text: text.trim(),
        linkedInterviewId: linkedId || null,
        tags: extractTags(text),
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        media_name: mediaName || null,
      })
      setText('')
      setLinkedId('')
      clearMedia()
      await loadFeed()
    } finally { setPosting(false) }
  }

  async function handlePin(id, pinned) {
    await updateFeed(id, { pinned: !pinned })
    await loadFeed()
  }

  async function handleArchiveSelected() {
    for (const id of selectedPosts) {
      await updateFeed(id, { archived: true })
    }
    setSelectedPosts(new Set())
    setSelectMode(false)
    await loadFeed()
  }

  async function handleDeleteSelected() {
    if (!confirm(`Delete ${selectedPosts.size} post(s)? This cannot be undone.`)) return
    for (const id of selectedPosts) {
      await deleteFeed(id)
    }
    setSelectedPosts(new Set())
    setSelectMode(false)
    await loadFeed()
  }

  async function handleUnarchive(id) {
    await updateFeed(id, { archived: false })
    await loadFeed()
  }

  function toggleSelect(id) {
    const next = new Set(selectedPosts)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedPosts(next)
  }

  const pinned = feed.filter(f => f.pinned)
  const unpinned = feed.filter(f => !f.pinned)

  // Group unpinned by day
  const grouped = {}
  unpinned.forEach(item => {
    const day = new Date(item.created_at).toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric'
    })
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(item)
  })

  function FeedItem({ item }) {
    const ft = getFeedType(item.type)
    const isSelected = selectedPosts.has(item.id)
    const hasMentionForWes = (item.tags || []).includes('Wes')
    const hasMentionForGibb = (item.tags || []).includes('Gibb')

    return (
      <div className={`bg-card border rounded-lg p-4 flex items-start gap-3 shadow-sm transition-all ${
        isSelected ? 'border-accent ring-2 ring-accent/20' : item.pinned ? 'border-amber-300 bg-amber-50/50' : 'border-border'
      }`}>
        {selectMode && (
          <button onClick={() => toggleSelect(item.id)}
            className={`w-5 h-5 rounded border-2 shrink-0 mt-1 transition-all ${
              isSelected ? 'bg-accent border-accent' : 'border-border hover:border-accent'
            }`}>
            {isSelected && <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
          </button>
        )}
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 ${item.author === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
          {item.author?.[0]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ft.color}`}>{ft.emoji} {ft.label}</span>
            {item.pinned && <span className="text-xs text-amber-600">📌 Pinned</span>}
            {hasMentionForWes && <span className="text-[10px] px-1.5 py-0.5 rounded bg-wes/10 text-wes font-semibold">@Wes</span>}
            {hasMentionForGibb && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gibb/10 text-gibb font-semibold">@Gibb</span>}
            <span className="text-text-tertiary text-xs ml-auto">{timeAgo(item.created_at)}</span>
          </div>
          <p className="text-sm text-text mt-1.5 whitespace-pre-wrap"><TaggedText text={item.text} /></p>
          <MediaPreview item={item} />
          {item.linked_interview_id && (
            <span className="text-xs text-blue-600 mt-1 inline-block">
              Linked: {interviews.find(i => i.id === item.linked_interview_id)?.company || 'Interview'}
            </span>
          )}
          {!selectMode && (
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => handlePin(item.id, item.pinned)}
                className="text-[11px] text-text-tertiary hover:text-text transition">
                {item.pinned ? 'Unpin' : 'Pin'}
              </button>
              {view === 'archived' ? (
                <button onClick={() => handleUnarchive(item.id)}
                  className="text-[11px] text-text-tertiary hover:text-text transition">
                  Restore
                </button>
              ) : (
                <button onClick={async () => { await updateFeed(item.id, { archived: true }); await loadFeed() }}
                  className="text-[11px] text-text-tertiary hover:text-text transition">
                  Archive
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Feed</h1>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <span className="text-xs text-text-secondary">{selectedPosts.size} selected</span>
              {selectedPosts.size > 0 && (
                <>
                  <button onClick={handleArchiveSelected}
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">
                    Archive
                  </button>
                  <button onClick={handleDeleteSelected}
                    className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition">
                    Delete
                  </button>
                </>
              )}
              <button onClick={() => { setSelectMode(false); setSelectedPosts(new Set()) }}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setSelectMode(true)}
              className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">
              Select
            </button>
          )}
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1">
        {[
          { value: 'active', label: 'Active' },
          { value: 'archived', label: 'Archived' },
          { value: 'all', label: 'All' },
        ].map(v => (
          <button key={v.value} onClick={() => { setView(v.value); setSelectedPosts(new Set()) }}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              view === v.value ? 'bg-accent text-white' : 'text-text-secondary hover:bg-card-hover'
            }`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Composer (only show on active view) */}
      {view !== 'archived' && (
        <form onSubmit={handlePost} className="bg-card border border-border rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex gap-2">
            {['Wes', 'Gibb'].map(a => (
              <button key={a} type="button" onClick={() => setAuthor(a)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-[0.97] ${
                  author === a
                    ? (a === 'Wes' ? 'bg-wes text-white' : 'bg-gibb text-white')
                    : 'bg-transparent border border-border text-text-secondary hover:bg-card-hover'
                }`}>{a}</button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FEED_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${
                  type === t.value ? t.color : 'bg-transparent border-border text-text-tertiary hover:text-text-secondary'
                }`}>{t.emoji} {t.label}</button>
            ))}
          </div>

          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="What's on your mind? Use @Wes or @Gibb to tag" rows={3}
            className="resize-none" />

          {/* Media attachment preview */}
          {mediaUrl && (
            <div className="flex items-center gap-2 bg-card-hover rounded-lg px-3 py-2">
              <span className="text-sm">
                {mediaType === 'image' && '🖼️'}
                {mediaType === 'video' && '🎥'}
                {mediaType === 'video_link' && '🔗'}
                {mediaType === 'document' && '📄'}
              </span>
              <span className="text-xs text-text-secondary flex-1 truncate">
                {mediaName || mediaUrl}
              </span>
              <button type="button" onClick={clearMedia} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
          )}

          {/* Media options */}
          {!mediaUrl && (
            <div>
              {!showMediaOptions ? (
                <button type="button" onClick={() => setShowMediaOptions(true)}
                  className="text-xs text-text-tertiary hover:text-text-secondary transition">
                  + Add attachment (image, document, video link)
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <input ref={fileInputRef} type="file" className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    onChange={handleFileUpload} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">
                    {uploading ? 'Uploading...' : '📎 Upload file'}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <input value={videoLink} onChange={e => setVideoLink(e.target.value)}
                      placeholder="Paste YouTube/Vimeo/Loom link"
                      className="!w-52 text-xs" />
                    <button type="button" onClick={handleAddVideoLink} disabled={!videoLink.trim()}
                      className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition disabled:opacity-40">
                      Add
                    </button>
                  </div>
                  <button type="button" onClick={() => setShowMediaOptions(false)}
                    className="text-xs text-text-tertiary hover:text-text-secondary">Cancel</button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            {interviews.length > 0 && (
              <select value={linkedId} onChange={e => setLinkedId(e.target.value)}
                className="!w-auto text-xs !rounded-full">
                <option value="">Link interview (optional)</option>
                {interviews.map(i => (
                  <option key={i.id} value={i.id}>{i.company} — {i.interviewee_name}</option>
                ))}
              </select>
            )}
            <button type="submit" disabled={posting || !text.trim()}
              className="ml-auto px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all active:scale-[0.97] disabled:opacity-40 shadow-sm">
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-text-tertiary text-center py-10">Loading...</div>
      ) : (
        <>
          {/* Pinned section */}
          {pinned.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider mb-2">📌 Pinned</div>
              <div className="space-y-2">
                {pinned.map(item => <FeedItem key={item.id} item={item} />)}
              </div>
            </div>
          )}

          {/* Feed items grouped by day */}
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2 mt-4">{day}</div>
              <div className="space-y-2">
                {items.map(item => <FeedItem key={item.id} item={item} />)}
              </div>
            </div>
          ))}

          {feed.length === 0 && (
            <p className="text-text-tertiary text-center py-10">
              {view === 'archived' ? 'No archived posts.' : 'No posts yet. Start the conversation above.'}
            </p>
          )}
        </>
      )}
    </div>
  )
}
