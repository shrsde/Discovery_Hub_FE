'use client'

import { useState, useEffect } from 'react'
import { getMeetings, createMeeting, updateMeeting, uploadMeetingRecording } from '@/lib/api'
import { timeAgo } from '@/lib/constants'

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [organizer, setOrganizer] = useState('Wes')
  const [scheduledAt, setScheduledAt] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const r = await getMeetings()
    setMeetings(r.data || [])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    try {
      await createMeeting({ title: title.trim(), organizer, scheduled_at: scheduledAt || null })
      setTitle('')
      setScheduledAt('')
      setShowNew(false)
      await load()
    } finally { setCreating(false) }
  }

  async function handleAddTranscript(meetingId) {
    if (!transcript.trim()) return
    setSaving(true)
    try {
      await updateMeeting(meetingId, { transcript: transcript.trim(), status: 'completed' })
      setTranscript('')
      setExpandedId(null)
      await load()
    } finally { setSaving(false) }
  }

  async function handleUploadRecording(meetingId, file) {
    try {
      const res = await uploadMeetingRecording(file)
      await updateMeeting(meetingId, { recording_url: res.url })
      await load()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    }
  }

  const statusColor = {
    scheduled: 'bg-blue-50 text-blue-600 border-blue-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  }

  if (loading) return <div className="text-text-tertiary text-center py-20">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Meetings</h1>
        <button onClick={() => setShowNew(!showNew)}
          className="text-sm px-5 py-2.5 bg-accent text-white rounded-full hover:bg-accent-light transition-all active:scale-[0.97] font-semibold shadow-sm">
          + New Meeting
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="bg-card border border-border rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex gap-2">
            {['Wes', 'Gibb'].map(a => (
              <button key={a} type="button" onClick={() => setOrganizer(a)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-[0.97] ${
                  organizer === a
                    ? (a === 'Wes' ? 'bg-wes text-white' : 'bg-gibb text-white')
                    : 'bg-transparent border border-border text-text-secondary'
                }`}>{a}</button>
            ))}
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting title" />
          <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          <div className="flex gap-2">
            <button type="submit" disabled={creating || !title.trim()}
              className="px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all active:scale-[0.97] disabled:opacity-40">
              {creating ? 'Creating...' : 'Create & Get Meet Link'}
            </button>
            <button type="button" onClick={() => setShowNew(false)}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text transition">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {meetings.map(m => (
          <div key={m.id} className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${m.organizer === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                  {m.organizer?.[0]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text text-sm">{m.title}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${statusColor[m.status]}`}>{m.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-tertiary">
                    <span>{timeAgo(m.created_at)}</span>
                    {m.scheduled_at && <span>Scheduled: {new Date(m.scheduled_at).toLocaleString()}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {m.meet_link && (
                  <a href={m.meet_link} target="_blank" rel="noopener"
                    className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition font-medium">
                    Join Google Meet
                  </a>
                )}
                {m.status === 'scheduled' && (
                  <button onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">
                    {expandedId === m.id ? 'Cancel' : 'Add Transcript'}
                  </button>
                )}
                {m.recording_url && (
                  <a href={m.recording_url} target="_blank" rel="noopener"
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">
                    View Recording
                  </a>
                )}
              </div>

              {/* Parsed summary */}
              {m.parsed_summary && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-1">AI Summary</div>
                  <p className="text-xs text-text-secondary whitespace-pre-wrap">{m.parsed_summary}</p>
                </div>
              )}
            </div>

            {/* Transcript input */}
            {expandedId === m.id && (
              <div className="border-t border-border p-4 bg-card-hover space-y-3">
                <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
                  rows={6} placeholder="Paste the meeting transcript here..." className="resize-none" />
                <div className="flex items-center gap-2">
                  <label className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-white transition cursor-pointer">
                    Upload Recording
                    <input type="file" className="hidden" accept="audio/*,video/*"
                      onChange={e => e.target.files?.[0] && handleUploadRecording(m.id, e.target.files[0])} />
                  </label>
                  <button onClick={() => handleAddTranscript(m.id)} disabled={saving || !transcript.trim()}
                    className="ml-auto px-5 py-2 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all active:scale-[0.97] disabled:opacity-40">
                    {saving ? 'Processing...' : 'Save & Generate Summary'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {meetings.length === 0 && (
          <p className="text-text-tertiary text-center py-10">No meetings yet. Schedule one to get started.</p>
        )}
      </div>
    </div>
  )
}
