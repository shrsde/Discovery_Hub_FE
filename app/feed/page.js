'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getFeed, postFeed, updateFeed, deleteFeed, uploadFeedMedia, getInterviews, createMeeting, updateMeeting, getMeetings, sendMeetingBot, transcribeAudio, getReplies, postReply, getLinkPreview, getNotifications, createIndexEntry } from '@/lib/api'
import { FEED_TYPES, getFeedType, timeAgo } from '@/lib/constants'
import RichEditor, { RichContent } from '@/components/RichEditor'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
            <img src={item.media_url} alt={item.media_name} className="w-full rounded-lg" />
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
        <span className="glyph">◈</span> {item.media_name || 'Download document'}
      </a>
    )
  }

  return null
}

// Extract URLs from text/html and show previews
function LinkPreviews({ text }) {
  const [previews, setPreviews] = useState([])
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    const plainText = (text || '').replace(/<[^>]*>/g, ' ')
    const urlRegex = /https?:\/\/[^\s<>"']+/g
    const urls = [...new Set(plainText.match(urlRegex) || [])]
      .filter(u => !u.includes('meet.google.com') && !u.includes('youtube.com') && !u.includes('youtu.be') && !u.includes('vimeo.com') && !u.includes('loom.com'))
      .slice(0, 3)

    if (urls.length === 0) return
    fetchedRef.current = true

    urls.forEach(async (url) => {
      try {
        const res = await getLinkPreview(url)
        if (res.success) {
          setPreviews(prev => [...prev, res.data])
        }
      } catch (e) { /* ignore failed previews */ }
    })
  }, [text])

  if (previews.length === 0) return null

  return (
    <div className="mt-2 space-y-2">
      {previews.map((p, i) => (
        <a key={i} href={p.url} target="_blank" rel="noopener"
          className="block glass-subtle rounded-xl overflow-hidden card-lift">
          <div className="flex">
            {p.image && (
              <div className="w-24 h-20 shrink-0 bg-card-hover overflow-hidden">
                <img src={p.image} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
              </div>
            )}
            <div className="p-2.5 min-w-0 flex-1">
              <div className="text-[10px] text-text-tertiary uppercase tracking-wide">{p.site_name}</div>
              <div className="text-xs font-semibold text-text line-clamp-1 mt-0.5">{p.title}</div>
              {p.description && <div className="text-[11px] text-text-secondary line-clamp-2 mt-0.5">{p.description}</div>}
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

// Thread/Replies component
function ThreadReplies({ feedId, displayName, initialCount }) {
  const [expanded, setExpanded] = useState(false)
  const [replies, setReplies] = useState([])
  const [replyText, setReplyText] = useState('')
  const [posting, setPosting] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const replyCount = replies.length || initialCount || 0

  async function loadReplies() {
    const res = await getReplies(feedId)
    setReplies(res.data || [])
  }

  useEffect(() => {
    if (expanded) loadReplies()
  }, [expanded])

  async function handleReply(e) {
    e.preventDefault()
    if (!replyText.trim()) return
    setPosting(true)
    try {
      await postReply(feedId, displayName || 'Wes', replyText.trim())
      setReplyText('')
      setShowComposer(false)
      await loadReplies()
    } finally { setPosting(false) }
  }

  function copyThreadLink() {
    const url = `${window.location.origin}/feed?thread=${feedId}`
    navigator.clipboard.writeText(url)
  }

  return (
    <>
      <button onClick={() => { setShowComposer(!showComposer); if (!expanded) setExpanded(true) }}
        className="text-[11px] text-text-tertiary hover:text-text transition-colors duration-200 flex items-center gap-1">
        <span className="glyph text-xs">&#x25E7;</span>
        {replyCount > 0 ? `${replyCount} repl${replyCount === 1 ? 'y' : 'ies'}` : 'Reply'}
      </button>
      <button onClick={copyThreadLink}
        className="text-[11px] text-text-tertiary hover:text-text transition-colors duration-200">
        Link
      </button>

      {expanded && (
        <div className="!flex-none w-full mt-2 pl-4 border-l-2 border-[rgba(0,0,0,0.06)] space-y-2" style={{ flexBasis: '100%' }}>
          {replies.map(r => (
            <div key={r.id} className="flex items-start gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5 ${r.author === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                {r.author?.[0]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text">{r.author}</span>
                  <span className="text-[10px] text-text-tertiary">{timeAgo(r.created_at)}</span>
                </div>
                {r.text?.startsWith('<') ? (
                  <div className="text-sm mt-0.5"><RichContent html={r.text} /></div>
                ) : (
                  <p className="text-sm text-text mt-0.5 whitespace-pre-wrap">{r.text}</p>
                )}
              </div>
            </div>
          ))}

          {showComposer && (
            <form onSubmit={handleReply} className="space-y-2 mt-2">
              <RichEditor content={replyText} onChange={setReplyText} placeholder="Write a reply..." />
              <div className="flex items-center gap-2">
                <button type="submit" disabled={posting || !replyText.trim()}
                  className="text-xs px-4 py-1.5 bg-accent text-white rounded-full font-medium disabled:opacity-40 transition-all duration-200">
                  {posting ? 'Replying...' : 'Reply'}
                </button>
                <button type="button" onClick={() => setShowComposer(false)}
                  className="text-xs text-text-tertiary hover:text-text transition-colors duration-200">Cancel</button>
              </div>
            </form>
          )}

        </div>
      )}
    </>
  )
}

// Active Threads sidebar section
function ActiveThreads({ feed, onThreadClick }) {
  const threads = feed
    .filter(f => (f.reply_count || 0) > 0)
    .sort((a, b) => new Date(b.last_reply_at || b.created_at) - new Date(a.last_reply_at || a.created_at))
    .slice(0, 8)

  if (threads.length === 0) return null

  return (
    <div className="glass rounded-2xl p-3 mb-4">
      <div className="section-label mb-2 flex items-center gap-1.5">
        <span className="glyph glyph-pulse text-sm">&#x25C8;</span>
        Active Threads
      </div>
      <div className="space-y-1.5">
        {threads.map(t => (
          <button key={t.id} onClick={() => onThreadClick(t.id)}
            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/40 transition-colors duration-200 group">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 ${t.author === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                {t.author?.[0]}
              </span>
              <span className="text-xs text-text truncate flex-1">
                {(t.text || '').replace(/<[^>]*>/g, '').slice(0, 50)}
              </span>
              <span className="tag tag-primary text-[9px] shrink-0">{t.reply_count}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 pl-7">
              {t.thread_tag && <span className="tag tag-blue text-[8px]">{t.thread_tag}</span>}
              <span className="text-[10px] text-text-tertiary">{timeAgo(t.last_reply_at || t.created_at)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function TaggedText({ text }) {
  if (!text) return null
  const parts = text.split(/(@Wes|@Gibb)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part === '@Wes') return <span key={i} className="font-semibold text-wes bg-[#EFF3F8] px-2 py-0.5 rounded-full text-[13px] inline-block">@Wes</span>
        if (part === '@Gibb') return <span key={i} className="font-semibold text-gibb bg-[#F3EEFA] px-2 py-0.5 rounded-full text-[13px] inline-block">@Gibb</span>
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
  const [meetingLink, setMeetingLink] = useState('')
  const [meetingScheduleType, setMeetingScheduleType] = useState('now')
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [meetingParticipantTags, setMeetingParticipantTags] = useState(['Wes', 'Gibb'])
  const [meetingExtraEmail, setMeetingExtraEmail] = useState('')
  const [meetingExtraEmails, setMeetingExtraEmails] = useState([])
  const [addingTranscriptTo, setAddingTranscriptTo] = useState(null)
  const [meetingTranscript, setMeetingTranscript] = useState('')
  const [meetingDuration, setMeetingDuration] = useState('')
  const [meetingParticipants, setMeetingParticipants] = useState(['Wes', 'Gibb'])
  const [processingTranscript, setProcessingTranscript] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const fileInputRef = useRef(null)

  const loadFeed = useCallback(async () => {
    const r = await getFeed(view)
    setFeed(r.data || [])
  }, [view])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      loadFeed(),
      getInterviews().then(r => setInterviews(r.data || [])),
    ]).finally(() => setLoading(false))
  }, [loadFeed])

  // Real-time subscription for new feed posts and notifications
  useEffect(() => {
    const feedChannel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed' }, () => {
        loadFeed()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'feed' }, () => {
        loadFeed()
      })
      .subscribe()

    return () => { supabase.removeChannel(feedChannel) }
  }, [loadFeed])

  // Open thread from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const threadId = params.get('thread')
    if (threadId) {
      setTimeout(() => {
        document.getElementById(`post-${threadId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 500)
    }
  }, [feed])

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

  function addExtraEmail() {
    const email = meetingExtraEmail.trim()
    if (email && email.includes('@') && !meetingExtraEmails.includes(email)) {
      setMeetingExtraEmails(prev => [...prev, email])
      setMeetingExtraEmail('')
    }
  }

  async function handleCreateMeeting(e) {
    e.preventDefault()
    if (!meetingTitle.trim()) return
    setCreatingMeeting(true)
    try {
      const scheduledAt = meetingScheduleType === 'scheduled' && meetingDate && meetingTime
        ? new Date(`${meetingDate}T${meetingTime}`).toISOString()
        : meetingScheduleType === 'scheduled' && meetingDate
        ? new Date(meetingDate).toISOString()
        : null

      const res = await createMeeting({
        title: meetingTitle.trim(),
        organizer: meetingOrganizer,
        attendees: meetingParticipantTags,
        scheduled_at: scheduledAt,
      })
      if (res.data?.meet_link && res.data.meet_link !== 'https://meet.google.com/new') {
        window.open(res.data.meet_link, '_blank')
      }
      setMeetingTitle('')
      setMeetingScheduleType('now')
      setMeetingDate('')
      setMeetingTime('')
      setMeetingParticipantTags(['Wes', 'Gibb'])
      setMeetingExtraEmails([])
      setShowMeetingModal(false)
      await loadFeed()
    } finally { setCreatingMeeting(false) }
  }

  async function handleAddMeetingTranscript(feedItemId) {
    if (!meetingTranscript.trim()) return
    setProcessingTranscript(true)
    try {
      const feedItem = feed.find(f => f.id === feedItemId)
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

      const meetingMeta = `Participants: ${participants} | Duration: ${duration}`
      const fullSummary = summary
        ? `${meetingMeta}\n\n${summary}`
        : `${meetingMeta}\n\nTranscript uploaded (${meetingTranscript.trim().split(/\s+/).length} words)`

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

  function extractTags(text) {
    const tags = []
    if (text.includes('@Wes') || text.includes('data-mention="Wes"')) tags.push('Wes')
    if (text.includes('@Gibb') || text.includes('data-mention="Gibb"')) tags.push('Gibb')
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

  function scrollToThread(id) {
    document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Filter + search + sort
  let filtered = feed
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(f =>
      f.text?.toLowerCase().includes(q) ||
      f.author?.toLowerCase().includes(q) ||
      f.summary?.toLowerCase().includes(q) ||
      f.thread_tag?.toLowerCase().includes(q)
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
    const [meetingFiles, setMeetingFiles] = useState([])
    const [uploadingMeetingFile, setUploadingMeetingFile] = useState(false)
    const [indexing, setIndexing] = useState(false)
    const [indexed, setIndexed] = useState(false)
    const [showTranscript, setShowTranscript] = useState(false)
    const [transcriptText, setTranscriptText] = useState(null)
    const [loadingTranscript, setLoadingTranscript] = useState(false)

    async function handleIndexThis() {
      setIndexing(true)
      try {
        const plainText = (item.text || '').replace(/<[^>]*>/g, '').slice(0, 200)
        await createIndexEntry({
          title: plainText.slice(0, 80) || `${item.author}'s ${ft.label}`,
          body: item.text,
          source_type: 'feed',
          source_id: item.id,
          tags: [ft.label, ...(item.tags || []), item.thread_tag].filter(Boolean),
          author: item.author,
        })
        setIndexed(true)
        setTimeout(() => setIndexed(false), 3000)
      } catch (e) { alert('Failed to index: ' + e.message) }
      finally { setIndexing(false) }
    }
    const meetingFileRef = useRef(null)

    async function handleMeetingFileUpload(e) {
      const file = e.target.files?.[0]
      if (!file) return
      setUploadingMeetingFile(true)
      try {
        const res = await uploadFeedMedia(file)
        if (res.url) {
          setMeetingFiles(prev => [...prev, { url: res.url, name: res.mediaName || file.name, type: res.mediaType }])
          // Append file link to the post text
          const fileLink = `\n<p><a href="${res.url}" target="_blank">${res.mediaName || file.name}</a></p>`
          await updateFeed(item.id, { text: (item.text || '') + fileLink })
          await loadFeed()
        }
      } catch (err) { alert('Upload failed: ' + err.message) }
      finally { setUploadingMeetingFile(false) }
    }

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
      <div id={`post-${item.id}`} className={`glass rounded-2xl p-4 flex items-start gap-3 transition-all ${
        isSelected ? 'border-accent ring-2 ring-accent/20'
        : item.pinned ? 'border-amber-300 bg-amber-50/50'
        : item.type === 'meeting' && item.summary ? 'gradient-purple gradient-bg-purple'
        : item.type === 'meeting' ? 'gradient-blue gradient-bg-blue'
        : ''
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
            {item.thread_tag && <span className="tag tag-blue">{item.thread_tag}</span>}
            {item.pinned && <span className="text-xs text-amber-600 flex items-center gap-1"><span className="glyph text-sm">&#x25C6;</span> Pinned</span>}
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

          {/* Link previews */}
          <LinkPreviews text={item.text} />

          {/* Meeting-specific UI */}
          {item.type === 'meeting' && (
            <div className="mt-2 space-y-2">
              {!item.summary && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={item.media_url || 'https://meet.google.com/new'} target="_blank" rel="noopener"
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition font-medium">
                      <span className="glyph">◎</span> Join Google Meet
                    </a>
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                      <span className="glyph glyph-pulse">&#x25C9;</span> Bot will auto-join
                    </span>
                  </div>
                </div>
              )}

              {item.summary && (() => {
                // Extract participants and duration from summary
                const participantMatch = item.summary.match(/Participants:\s*([^\n|]+)/)
                const durationMatch = item.summary.match(/Duration:\s*([^\n]+)/)
                const participants = participantMatch ? participantMatch[1].trim().split(',').map(p => p.trim()) : []
                const duration = durationMatch ? durationMatch[1].trim() : ''
                const summaryBody = item.summary.replace(/^Participants:.*\n*/m, '').replace(/^.*Duration:.*\n*/m, '').trim()

                return (
                <div className="glass-subtle rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="section-label text-indigo-600 flex items-center gap-1.5">
                      <span className="glyph">◎</span> Meeting Recap
                    </div>
                    <span className="tag tag-green">Completed</span>
                  </div>
                  {(participants.length > 0 || duration) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {participants.map(p => (
                        <span key={p} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          p === 'Wes' ? 'bg-wes/10 text-wes' : p === 'Gibb' ? 'bg-gibb/10 text-gibb' : 'bg-accent/5 text-text-secondary'
                        }`}>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${
                            p === 'Wes' ? 'bg-wes' : p === 'Gibb' ? 'bg-gibb' : 'bg-accent'
                          }`}>{p[0]}</span>
                          {p}
                        </span>
                      ))}
                      {duration && <span className="text-[10px] text-text-tertiary">{duration}</span>}
                    </div>
                  )}
                  <div className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{summaryBody}</div>
                </div>
                )
              })()}

              {/* View Full Transcript toggle */}
              {item.summary?.includes('Meeting ID:') && (() => {
                const meetingIdMatch = item.summary.match(/Meeting ID:\s*([^\n]+)/)
                const meetingId = meetingIdMatch ? meetingIdMatch[1].trim() : null
                const recordingMatch = item.summary.match(/Recording:\s*([^\n]+)/)
                const recordingUrlFromSummary = recordingMatch ? recordingMatch[1].trim() : null

                async function loadTranscript() {
                  if (transcriptText) { setShowTranscript(!showTranscript); return }
                  setLoadingTranscript(true)
                  try {
                    const res = await api(`/api/meetings`)
                    const meeting = res.data?.find(m => m.id === meetingId)
                    setTranscriptText(meeting?.transcript || 'No transcript available.')
                    setShowTranscript(true)
                  } catch (e) { setTranscriptText('Failed to load transcript.') ; setShowTranscript(true) }
                  finally { setLoadingTranscript(false) }
                }

                return (
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <button onClick={loadTranscript}
                      className="text-[11px] px-3 py-1.5 rounded-full glass-subtle text-text-secondary hover:text-text transition-colors duration-200 border border-[rgba(0,0,0,0.08)] font-medium">
                      {loadingTranscript ? 'Loading...' : showTranscript ? 'Hide Transcript' : 'View Full Transcript'}
                    </button>
                    {recordingUrlFromSummary && (
                      <a href={recordingUrlFromSummary} target="_blank" rel="noopener"
                        className="text-[11px] px-3 py-1.5 rounded-full glass-subtle text-indigo-600 hover:text-indigo-800 transition-colors duration-200 border border-indigo-200 font-medium">
                        View Recording
                      </a>
                    )}
                  </div>
                )
              })()}
              {showTranscript && transcriptText && (
                <div className="glass-subtle rounded-2xl p-4 mt-2 max-h-80 overflow-y-auto">
                  <div className="section-label text-text-secondary mb-2">Full Transcript</div>
                  <div className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed font-mono">{transcriptText}</div>
                </div>
              )}

              {/* Upload files to meeting */}
              <div className="flex items-center gap-2 flex-wrap">
                <input ref={meetingFileRef} type="file" className="hidden" accept="*/*" onChange={handleMeetingFileUpload} />
                <button type="button" onClick={() => meetingFileRef.current?.click()} disabled={uploadingMeetingFile}
                  className="text-xs px-3 py-1.5 rounded-full glass-subtle text-text-secondary hover:text-text transition-colors duration-200 border border-[rgba(0,0,0,0.08)]">
                  {uploadingMeetingFile ? 'Uploading...' : '+ Upload Files'}
                </button>
              </div>

              {!item.summary && addingTranscriptTo !== item.id && (
                <button onClick={() => { setAddingTranscriptTo(item.id); setMeetingTranscript(''); setMeetingDuration('') }}
                  className="text-[11px] text-text-tertiary hover:text-text transition font-medium">
                  Meeting done? Add recap manually
                </button>
              )}
              {addingTranscriptTo === item.id && (
                <div className="glass rounded-2xl p-3 space-y-3">
                  <div className="text-xs font-semibold text-text">Post-Meeting Recap</div>
                  <div>
                    <label className="section-label block mb-1">Participants</label>
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
                  <div>
                    <label className="section-label block mb-1">Call Duration</label>
                    <input value={meetingDuration} onChange={e => setMeetingDuration(e.target.value)}
                      placeholder="e.g. 45 min" className="!text-xs" />
                  </div>
                  <div>
                    <label className="section-label block mb-1">Transcript</label>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-xs px-3 py-1.5 rounded-full bg-card border border-border text-text-secondary hover:bg-white hover:border-accent hover:text-accent transition cursor-pointer font-medium">
                        <span className="glyph">◎</span> Upload recording
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
                      className="text-xs px-4 py-2 bg-accent text-white rounded-full font-semibold hover:bg-accent-light transition disabled:opacity-40">
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

          {/* Interview completion card */}
          {item.linked_interview_id && (() => {
            const interview = interviews.find(i => i.id === item.linked_interview_id)
            return (
              <div className="mt-3 glass rounded-2xl p-4 gradient-green border-l-[3px] border-l-green-500">
                <div className="flex items-center justify-between mb-2">
                  <div className="section-label text-green-700 flex items-center gap-1.5">
                    <span className="glyph glyph-float">◇</span> Interview
                  </div>
                  {interview && (() => {
                    const pains = Array.isArray(interview.pain_points) ? interview.pain_points.filter(p => p.description?.trim()) : []
                    const s = Math.min(10, pains.length * 2 + (pains.some(p => p.dollar_impact?.trim()) ? 2 : 0) + (interview.biggest_signal?.trim() ? 2 : 0) + (interview.willingness_to_pay?.trim() ? 2 : 0) + Math.round((interview.confidence || 0) / 2))
                    return (
                      <span className={`text-sm font-extrabold ${s >= 7 ? 'text-score-green' : s >= 4 ? 'text-score-orange' : 'text-score-red'}`}>
                        {s}<span className="text-xs font-normal opacity-60">/10</span>
                      </span>
                    )
                  })()}
                </div>
                <div className="text-sm font-semibold text-text">
                  {interview?.interviewee_name || 'Unknown'} <span className="text-text-secondary font-normal">at</span> {interview?.company || 'Unknown'}
                </div>
                {interview?.role && <div className="text-xs text-text-secondary mt-0.5">{interview.role}{interview.department ? ` — ${interview.department}` : ''}</div>}
                {item.summary && (
                  <div className="text-xs text-text-secondary mt-2 leading-relaxed whitespace-pre-wrap line-clamp-4">{item.summary}</div>
                )}
                {interview?.biggest_signal && !item.summary?.includes(interview.biggest_signal) && (
                  <div className="mt-2 text-xs text-green-700 bg-green-50/50 rounded-lg px-3 py-2">
                    <span className="font-semibold">Signal:</span> {interview.biggest_signal}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <a href={`/interviews/${item.linked_interview_id}`}
                    className="text-xs px-3 py-1.5 rounded-full glass-subtle text-text font-medium hover:bg-white/60 transition-colors duration-200 border border-[rgba(0,0,0,0.08)]">
                    View Interview
                  </a>
                  <a href={`/interviews/${item.linked_interview_id}/flow`}
                    className="text-xs px-3 py-1.5 rounded-full glass-subtle text-text font-medium hover:bg-white/60 transition-colors duration-200 border border-[rgba(0,0,0,0.08)]">
                    Generate Workflow
                  </a>
                </div>
              </div>
            )
          })()}

          {/* Inline actions row */}
          {!selectMode && !editing && (
            <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-[rgba(0,0,0,0.04)]">
              <ThreadReplies feedId={item.id} displayName={displayName} initialCount={item.reply_count} />
              <span className="w-px h-3 bg-[rgba(0,0,0,0.08)]" />
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
              <span className="w-px h-3 bg-[rgba(0,0,0,0.08)]" />
              <button onClick={handleIndexThis} disabled={indexing}
                className={`text-[11px] font-medium transition-colors duration-200 ${indexed ? 'text-green-600' : 'text-accent hover:text-accent-light'}`}>
                {indexing ? 'Indexing...' : indexed ? 'Indexed' : '⬡ Index This'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const dayKeys = Object.keys(grouped)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-text">Feed</h1>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <span className="text-xs text-text-secondary">{selectedPosts.size} selected</span>
              {selectedPosts.size > 0 && (
                <>
                  <button onClick={handleArchiveSelected}
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">Archive</button>
                  <button onClick={handleDeleteSelected}
                    className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition">Delete</button>
                </>
              )}
              <button onClick={() => { setSelectMode(false); setSelectedPosts(new Set()) }}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setShowMeetingModal(true)}
                className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition font-medium">
                <span className="glyph">◎</span> Create a Meeting
              </button>
              <button onClick={() => setSelectMode(true)}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">Select</button>
            </>
          )}
        </div>
      </div>

      {/* Sticky composer + search/filters */}
      <div className="sticky top-14 z-30 bg-[#fafafa] pb-4 space-y-3">
        {/* Search + filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search feed..." className="!rounded-full flex-1 !text-xs" />
          <div className="flex gap-1">
            {[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
              { value: 'all', label: 'All' },
            ].map(v => (
              <button key={v.value} onClick={() => { setView(v.value); setSelectedPosts(new Set()) }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  view === v.value ? 'bg-accent text-white' : 'text-text-secondary hover:bg-card-hover'
                }`}>{v.label}</button>
            ))}
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="!w-auto !rounded-full text-xs !py-1.5">
            <option value="all">All types</option>
            {FEED_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
            ))}
          </select>
          {(searchQuery || filterType !== 'all') && (
            <button onClick={() => { setSearchQuery(''); setFilterType('all') }}
              className="text-xs text-text-tertiary hover:text-text transition">Clear</button>
          )}
        </div>

        {/* Composer */}
        {view !== 'archived' && (
          <form onSubmit={handlePost} className="glass rounded-2xl p-4 space-y-3">
            <RichEditor content={text} onChange={setText}
              placeholder="What's on your mind? Use @Wes or @Gibb to tag" />

            {mediaUrl && (
              <div className="flex items-center gap-2 bg-card-hover rounded-lg px-3 py-2">
                <span className="glyph text-sm">
                  {mediaType === 'image' && '◈'}
                  {mediaType === 'video' && '▸'}
                  {mediaType === 'video_link' && '◎'}
                  {mediaType === 'document' && '◇'}
                </span>
                <span className="text-xs text-text-secondary flex-1 truncate">{mediaName || mediaUrl}</span>
                <button type="button" onClick={clearMedia} className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {!mediaUrl && (
                <>
                  <input ref={fileInputRef} type="file" className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    onChange={handleFileUpload} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-text-tertiary hover:bg-card-hover transition">
                    {uploading ? 'Uploading...' : '+ Attach'}
                  </button>
                  <div className="flex items-center gap-1">
                    <input value={videoLink} onChange={e => setVideoLink(e.target.value)}
                      placeholder="Video link" className="!w-36 text-xs !py-1" />
                    {videoLink.trim() && (
                      <button type="button" onClick={handleAddVideoLink}
                        className="text-xs px-2 py-1 rounded-full border border-border text-text-tertiary hover:bg-card-hover transition">Add</button>
                    )}
                  </div>
                </>
              )}
              <select value={type} onChange={e => setType(e.target.value)}
                className="!w-auto !rounded-full text-xs !py-1.5">
                {FEED_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                ))}
              </select>
              <button type="submit" disabled={posting || !text.trim()}
                className="ml-auto px-5 py-2 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all active:scale-[0.97] disabled:opacity-40 shadow-sm">
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Main content with timeline sidebar */}
      <div className="flex gap-6">
        {/* Timeline sidebar — desktop only */}
        <div className="hidden md:block w-28 shrink-0">
          <div className="sticky top-40 space-y-1 max-h-[60vh] overflow-y-auto">
            {/* Active Threads */}
            <ActiveThreads feed={feed} onThreadClick={scrollToThread} />

            {pinned.length > 0 && (
              <button onClick={() => { setSelectedDay(null); document.getElementById('pinned')?.scrollIntoView({ behavior: 'smooth' }) }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold text-amber-600 hover:bg-amber-50 transition">
                <span className="glyph">&#x25C6;</span> Pinned
              </button>
            )}
            {dayKeys.map(day => {
              const shortDay = new Date(grouped[day][0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const weekday = new Date(grouped[day][0].created_at).toLocaleDateString('en-US', { weekday: 'short' })
              return (
                <button key={day} onClick={() => {
                  setSelectedDay(day)
                  document.getElementById(`day-${day}`)?.scrollIntoView({ behavior: 'smooth' })
                }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg transition ${
                    selectedDay === day ? 'bg-accent text-white' : 'text-text-secondary hover:bg-card-hover'
                  }`}>
                  <div className="text-[11px] font-semibold">{shortDay}</div>
                  <div className="text-[10px] opacity-70">{weekday}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Feed content */}
        <div className="flex-1 min-w-0 space-y-4">
          {loading ? (
            <div className="text-text-tertiary text-center py-10">Loading...</div>
          ) : (
            <>
              {pinned.length > 0 && (
                <div id="pinned">
                  <div className="section-label text-amber-600 mb-2"><span className="glyph">&#x25C6;</span> Pinned</div>
                  <div className="space-y-2">
                    {pinned.map(item => <FeedItem key={item.id} item={item} />)}
                  </div>
                </div>
              )}

              {Object.entries(grouped).map(([day, items]) => (
                <div key={day} id={`day-${day}`}>
                  <div className="section-label mb-2 mt-4">{day}</div>
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
      </div>

      {/* Meeting creation modal */}
      <Dialog open={showMeetingModal} onOpenChange={setShowMeetingModal}>
        <DialogContent className="glass-strong rounded-2xl border-0 shadow-xl w-full max-w-md p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold text-text flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs glyph">◎</span>
                Create a Meeting
              </DialogTitle>
            </DialogHeader>
          </div>
          <form onSubmit={handleCreateMeeting} className="px-5 pb-5 space-y-4">
            <div>
              <label className="section-label block mb-1.5">Organizer</label>
              <div className="flex gap-2">
                {['Wes', 'Gibb'].map(a => (
                  <button key={a} type="button" onClick={() => setMeetingOrganizer(a)}
                    className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 active:scale-[0.97] ${
                      meetingOrganizer === a
                        ? (a === 'Wes' ? 'bg-wes text-white' : 'bg-gibb text-white')
                        : 'glass-subtle text-text-secondary border border-[rgba(0,0,0,0.06)]'
                    }`}>{a}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="section-label block mb-1.5">Meeting Title</label>
              <input value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)}
                placeholder="e.g. Weekly sync, Interview debrief" />
            </div>

            {/* Participants */}
            <div>
              <label className="section-label block mb-1.5">Participants</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['Wes', 'Gibb'].map(p => (
                  <button key={p} type="button" onClick={() => {
                    setMeetingParticipantTags(prev =>
                      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                    )
                  }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      meetingParticipantTags.includes(p)
                        ? (p === 'Wes' ? 'bg-wes text-white' : 'bg-gibb text-white')
                        : 'glass-subtle text-text-secondary border border-[rgba(0,0,0,0.06)]'
                    }`}>{p}</button>
                ))}
                {meetingExtraEmails.map(email => (
                  <span key={email} className="flex items-center gap-1 px-2.5 py-1 rounded-full glass-subtle text-xs text-text-secondary border border-[rgba(0,0,0,0.06)]">
                    {email}
                    <button type="button" onClick={() => setMeetingExtraEmails(prev => prev.filter(e => e !== email))}
                      className="text-text-tertiary hover:text-red-500 transition-colors ml-0.5">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input value={meetingExtraEmail} onChange={e => setMeetingExtraEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExtraEmail() } }}
                  placeholder="Add email invite..." className="flex-1 !text-xs" />
                {meetingExtraEmail.trim() && (
                  <button type="button" onClick={addExtraEmail}
                    className="text-xs px-3 py-1.5 rounded-full glass-subtle text-text-secondary hover:text-text transition-colors duration-200 shrink-0">
                    Add
                  </button>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="section-label block mb-1.5">When</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setMeetingScheduleType('now')}
                  className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                    meetingScheduleType === 'now' ? 'bg-accent text-white' : 'glass-subtle text-text-secondary border border-[rgba(0,0,0,0.06)]'
                  }`}>Right Now</button>
                <button type="button" onClick={() => setMeetingScheduleType('scheduled')}
                  className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                    meetingScheduleType === 'scheduled' ? 'bg-accent text-white' : 'glass-subtle text-text-secondary border border-[rgba(0,0,0,0.06)]'
                  }`}>Schedule</button>
              </div>
              {meetingScheduleType === 'scheduled' && (
                <div className="grid grid-cols-2 gap-2 animate-in">
                  <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="!text-xs" />
                  <input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="!text-xs" />
                </div>
              )}
            </div>

            <div className="glass-subtle rounded-xl p-3 flex items-start gap-2">
              <span className="glyph text-green-600 text-sm mt-0.5 glyph-pulse">&#x25C9;</span>
              <div>
                <p className="text-[11px] text-text-secondary font-medium">Auto-configured</p>
                <p className="text-[10px] text-text-tertiary mt-0.5">Google Meet link generated. Fireflies bot joins and records automatically.</p>
              </div>
            </div>

            <button type="submit" disabled={creatingMeeting || !meetingTitle.trim()}
              className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all duration-200 active:scale-[0.97] disabled:opacity-40 shadow-sm">
              {creatingMeeting ? 'Creating...' : meetingScheduleType === 'now' ? 'Start Meeting Now' : 'Schedule Meeting'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
