'use client'

import { useState, useEffect, useRef } from 'react'
import { getFeed, postFeed, updateFeed, deleteFeed, uploadFeedMedia, getInterviews, createMeeting, updateMeeting, getMeetings, sendMeetingBot, transcribeAudio } from '@/lib/api'
import { FEED_TYPES, getFeedType, timeAgo } from '@/lib/constants'
import RichEditor, { RichContent } from '@/components/RichEditor'
import { useAuth } from '@/lib/auth-context'

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
  const { displayName } = useAuth()
  const [feed, setFeed] = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [view, setView] = useState('active')
  const [author, setAuthor] = useState(displayName || 'Wes')
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
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingOrganizer, setMeetingOrganizer] = useState('Wes')
  const [creatingMeeting, setCreatingMeeting] = useState(false)
  const [addingTranscriptTo, setAddingTranscriptTo] = useState(null)
  const [meetingTranscript, setMeetingTranscript] = useState('')
  const [meetingDuration, setMeetingDuration] = useState('')
  const [meetingParticipants, setMeetingParticipants] = useState(['Wes', 'Gibb'])
  const [processingTranscript, setProcessingTranscript] = useState(false)
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

  async function handleCreateMeeting(e) {
    e.preventDefault()
    if (!meetingTitle.trim()) return
    setCreatingMeeting(true)
    try {
      const res = await createMeeting({ title: meetingTitle.trim(), organizer: meetingOrganizer })
      if (res.success && res.data.meet_link) {
        window.open(res.data.meet_link, '_blank')
      }
      setMeetingTitle('')
      setShowMeetingModal(false)
      await loadFeed()
    } finally { setCreatingMeeting(false) }
  }

  async function handleAddMeetingTranscript(feedItemId) {
    if (!meetingTranscript.trim()) return
    setProcessingTranscript(true)
    try {
      const feedItem = feed.find(f => f.id === feedItemId)

      // Find the meeting record
      const meetingsRes = await getMeetings()
      const meetings = meetingsRes.data || []
      const meeting = meetings.find(m => feedItem?.text?.includes(m.title))

      let summary = ''
      const participants = meetingParticipants.join(', ')
      const duration = meetingDuration || 'Unknown'

      if (meeting) {
        const res = await updateMeeting(meeting.id, {
          transcript: meetingTranscript.trim(),
          status: 'completed',
        })
        summary = res.data?.parsed_summary || ''
      }

      // Build rich meeting recap for the feed post
      const meetingMeta = `Participants: ${participants} | Duration: ${duration}`
      const fullSummary = summary
        ? `${meetingMeta}\n\n${summary}`
        : `${meetingMeta}\n\nTranscript uploaded (${meetingTranscript.trim().split(/\s+/).length} words)`

      // Update the original feed post with summary + store transcript in text
      await updateFeed(feedItemId, {
        summary: fullSummary,
        text: feedItem.text,
      })

      setMeetingTranscript('')
      setMeetingDuration('')
      setAddingTranscriptTo(null)
      await loadFeed()
    } finally { setProcessingTranscript(false) }
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

  // Filter + search + sort
  let filtered = feed
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(f =>
      f.text?.toLowerCase().includes(q) ||
      f.author?.toLowerCase().includes(q) ||
      f.summary?.toLowerCase().includes(q)
    )
  }
  if (filterType !== 'all') {
    filtered = filtered.filter(f => f.type === filterType)
  }
  if (sortOrder === 'oldest') {
    filtered = [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }

  const pinned = filtered.filter(f => f.pinned)
  const unpinned = filtered.filter(f => !f.pinned)

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
    const [editing, setEditing] = useState(false)
    const [editText, setEditText] = useState(item.text)
    const [savingEdit, setSavingEdit] = useState(false)

    async function handleSaveEdit() {
      if (!editText.trim()) return
      setSavingEdit(true)
      try {
        await updateFeed(item.id, { text: editText })
        setEditing(false)
        await loadFeed()
      } finally { setSavingEdit(false) }
    }

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
            {item.edited_at && (
              <span className="text-text-tertiary text-[10px] italic">
                edited {new Date(item.edited_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
          </div>
          {editing ? (
            <div className="mt-1.5 space-y-2">
              <RichEditor content={editText} onChange={setEditText} placeholder="Edit your post..." />
              <div className="flex gap-2">
                <button onClick={handleSaveEdit} disabled={savingEdit || !editText.trim()}
                  className="text-xs px-3 py-1.5 bg-accent text-white rounded-full font-medium disabled:opacity-40">
                  {savingEdit ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setEditText(item.text) }}
                  className="text-xs text-text-tertiary hover:text-text transition">Cancel</button>
              </div>
            </div>
          ) : item.text?.startsWith('<') ? (
            <div className="mt-1.5"><RichContent html={item.text} /></div>
          ) : (
            <p className="text-sm text-text mt-1.5 whitespace-pre-wrap"><TaggedText text={item.text} /></p>
          )}

          {/* Meeting-specific UI */}
          {item.type === 'meeting' && (
            <div className="mt-2 space-y-2">
              {/* Meet link — show when no summary yet */}
              {!item.summary && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href="https://meet.google.com/new" target="_blank" rel="noopener"
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition font-medium">
                      📞 Join Google Meet
                    </a>
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                      🤖 Bot will auto-join & record
                    </span>
                  </div>
                </div>
              )}

              {/* Meeting recap — show after transcript is processed */}
              {item.summary && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">Meeting Recap</div>
                    <span className="text-[10px] text-indigo-400 bg-indigo-100 px-2 py-0.5 rounded-full">Completed</span>
                  </div>
                  <div className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{item.summary}</div>
                </div>
              )}

              {/* Post-meeting form */}
              {!item.summary && addingTranscriptTo !== item.id && (
                <button onClick={() => { setAddingTranscriptTo(item.id); setMeetingTranscript(''); setMeetingDuration('') }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 transition font-medium">
                  Meeting done? Add recap →
                </button>
              )}
              {addingTranscriptTo === item.id && (
                <div className="bg-card-hover border border-border rounded-lg p-3 space-y-3">
                  <div className="text-xs font-semibold text-text">Post-Meeting Recap</div>

                  {/* Participants */}
                  <div>
                    <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Participants</label>
                    <div className="flex gap-1.5">
                      {['Wes', 'Gibb'].map(p => (
                        <button key={p} type="button" onClick={() => {
                          setMeetingParticipants(prev =>
                            prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                          )
                        }}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                            meetingParticipants.includes(p)
                              ? (p === 'Wes' ? 'bg-wes text-white border-wes' : 'bg-gibb text-white border-gibb')
                              : 'bg-white border-border text-text-tertiary'
                          }`}>{p}</button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Call Duration</label>
                    <input value={meetingDuration} onChange={e => setMeetingDuration(e.target.value)}
                      placeholder="e.g. 45 min" className="!text-xs" />
                  </div>

                  {/* Transcript — upload audio or paste */}
                  <div>
                    <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Transcript</label>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-xs px-3 py-1.5 rounded-full bg-card border border-border text-text-secondary hover:bg-white hover:border-accent hover:text-accent transition cursor-pointer font-medium">
                        🎙️ Upload recording
                        <input type="file" className="hidden" accept="audio/*,video/*,.mp3,.m4a,.wav,.mp4,.webm"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setProcessingTranscript(true)
                            try {
                              const res = await transcribeAudio(file)
                              if (res.success) {
                                setMeetingTranscript(res.transcript)
                                if (res.duration) setMeetingDuration(res.duration)
                              }
                            } catch (err) { alert('Transcription failed: ' + err.message) }
                            finally { setProcessingTranscript(false) }
                          }} />
                      </label>
                      <span className="text-[10px] text-text-tertiary">or paste below</span>
                    </div>
                    <textarea value={meetingTranscript} onChange={e => setMeetingTranscript(e.target.value)}
                      rows={6} placeholder="Paste the full meeting transcript here..." className="resize-none text-xs" />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => handleAddMeetingTranscript(item.id)}
                      disabled={processingTranscript || !meetingTranscript.trim()}
                      className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition disabled:opacity-40">
                      {processingTranscript ? 'Generating summary...' : 'Process & Post Recap'}
                    </button>
                    <button onClick={() => setAddingTranscriptTo(null)}
                      className="text-xs text-text-tertiary hover:text-text transition">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <MediaPreview item={item} />
          {item.linked_interview_id && (
            <span className="text-xs text-blue-600 mt-1 inline-block">
              Linked: {interviews.find(i => i.id === item.linked_interview_id)?.company || 'Interview'}
            </span>
          )}
          {!selectMode && !editing && (
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => { setEditing(true); setEditText(item.text) }}
                className="text-[11px] text-text-tertiary hover:text-text transition">
                Edit
              </button>
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
            <>
              <button onClick={() => setShowMeetingModal(true)}
                className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition font-medium">
                📞 Create Meeting
              </button>
              <button onClick={() => setSelectMode(true)}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">
                Select
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search feed..." className="!rounded-full" />

        <div className="flex items-center gap-2 flex-wrap">
          {/* View tabs */}
          <div className="flex gap-1">
            {[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
              { value: 'all', label: 'All' },
            ].map(v => (
              <button key={v.value} onClick={() => { setView(v.value); setSelectedPosts(new Set()) }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  view === v.value ? 'bg-accent text-white' : 'text-text-secondary hover:bg-card-hover'
                }`}>
                {v.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Type filter */}
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="!w-auto !rounded-full text-xs !py-1.5">
            <option value="all">All types</option>
            {FEED_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
            ))}
          </select>

          {/* Sort */}
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}
            className="!w-auto !rounded-full text-xs !py-1.5">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>

          {(searchQuery || filterType !== 'all') && (
            <button onClick={() => { setSearchQuery(''); setFilterType('all') }}
              className="text-xs text-text-tertiary hover:text-text transition">
              Clear filters
            </button>
          )}
        </div>
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

          <RichEditor content={text} onChange={setText}
            placeholder="What's on your mind? Use @Wes or @Gibb to tag" />

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

      {/* Meeting creation modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowMeetingModal(false)}>
          <div className="bg-white rounded-xl border border-border shadow-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">Create Meeting</h3>
              <button onClick={() => setShowMeetingModal(false)} className="text-text-tertiary hover:text-text text-lg">&times;</button>
            </div>
            <form onSubmit={handleCreateMeeting} className="space-y-3">
              <div className="flex gap-2">
                {['Wes', 'Gibb'].map(a => (
                  <button key={a} type="button" onClick={() => setMeetingOrganizer(a)}
                    className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all active:scale-[0.97] ${
                      meetingOrganizer === a
                        ? (a === 'Wes' ? 'bg-wes text-white' : 'bg-gibb text-white')
                        : 'bg-card-hover border border-border text-text-secondary'
                    }`}>{a}</button>
                ))}
              </div>
              <input value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)}
                placeholder="Meeting title — e.g. Weekly sync" />
              <button type="submit" disabled={creatingMeeting || !meetingTitle.trim()}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-all active:scale-[0.97] disabled:opacity-40">
                {creatingMeeting ? 'Creating...' : 'Create & Open Google Meet'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
