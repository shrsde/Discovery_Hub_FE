'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getInterviews, saveInterview, createMeeting, deleteInterviews } from '@/lib/api'
import { scoreColor, timeAgo } from '@/lib/constants'
import { useAuth } from '@/lib/auth-context'

export default function InterviewsListPage() {
  const { displayName } = useAuth()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(new Set())

  function toggleSelect(id) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  async function handleDeleteSelected() {
    if (!confirm(`Delete ${selected.size} interview${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    await deleteInterviews([...selected])
    setSelected(new Set())
    setSelectMode(false)
    await load()
  }
  const [schedForm, setSchedForm] = useState({
    interviewee_name: '',
    company: '',
    role: '',
    department: '',
    date: '',
    time: '',
    interviewer: 'Gibb',
    notes: '',
  })

  async function load() {
    const r = await getInterviews()
    setInterviews(r.data || [])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const scheduled = interviews
    .filter(i => i.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_at || a.date) - new Date(b.scheduled_at || b.date))

  const completed = interviews
    .filter(i => i.status !== 'scheduled')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  // Group scheduled by date for timeline
  const scheduledByDate = {}
  scheduled.forEach(i => {
    const day = new Date(i.scheduled_at || i.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    if (!scheduledByDate[day]) scheduledByDate[day] = []
    scheduledByDate[day].push(i)
  })

  // Group completed by date
  const completedByDate = {}
  completed.forEach(i => {
    const day = new Date(i.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!completedByDate[day]) completedByDate[day] = []
    completedByDate[day].push(i)
  })

  async function handleSchedule(e) {
    e.preventDefault()
    if (!schedForm.interviewee_name.trim()) return
    setScheduling(true)
    try {
      // Generate Meet link
      let meetLink = null
      try {
        const meetRes = await createMeeting({
          title: `Interview: ${schedForm.interviewee_name} — ${schedForm.company}`,
          organizer: schedForm.interviewer,
        })
        if (meetRes.data?.meet_link) meetLink = meetRes.data.meet_link
      } catch (e) { console.error('Meet link generation failed:', e) }

      const scheduledAt = schedForm.date && schedForm.time
        ? new Date(`${schedForm.date}T${schedForm.time}`).toISOString()
        : schedForm.date ? new Date(schedForm.date).toISOString() : null

      await saveInterview({
        status: 'scheduled',
        date: schedForm.date || new Date().toISOString().split('T')[0],
        scheduled_at: scheduledAt,
        interviewer: schedForm.interviewer,
        interviewee_name: schedForm.interviewee_name.trim(),
        company: schedForm.company.trim(),
        role: schedForm.role.trim(),
        department: schedForm.department.trim(),
        notes: schedForm.notes.trim(),
        meet_link: meetLink,
      })

      setSchedForm({ interviewee_name: '', company: '', role: '', department: '', date: '', time: '', interviewer: 'Gibb', notes: '' })
      setShowSchedule(false)
      await load()
    } finally { setScheduling(false) }
  }

  if (loading) return <div className="text-text-tertiary text-center py-20">Loading...</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-text">Interviews</h1>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <span className="text-xs text-text-secondary">{selected.size} selected</span>
              {selected.size > 0 && (
                <button onClick={handleDeleteSelected}
                  className="text-xs px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition">
                  Delete
                </button>
              )}
              <button onClick={() => { setSelectMode(false); setSelected(new Set()) }}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setSelectMode(true)}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">
                Select
              </button>
              <button onClick={() => setShowSchedule(!showSchedule)}
                className="text-sm px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full hover:bg-indigo-100 transition-all active:scale-[0.97] font-medium">
                Schedule
              </button>
              <Link href="/interviews/new"
                className="text-sm px-4 py-2 bg-accent text-white rounded-full hover:bg-accent-light transition-all active:scale-[0.97] font-semibold shadow-sm">
                + New
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Schedule form */}
      {showSchedule && (
        <form onSubmit={handleSchedule} className="bg-card border border-border rounded-lg p-5 space-y-4 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Schedule Interview</h2>
            <button type="button" onClick={() => setShowSchedule(false)} className="text-text-tertiary hover:text-text text-lg">&times;</button>
          </div>

          <div className="flex gap-2">
            {['Wes', 'Gibb'].map(a => (
              <button key={a} type="button" onClick={() => setSchedForm(f => ({ ...f, interviewer: a }))}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-[0.97] ${
                  schedForm.interviewer === a
                    ? (a === 'Wes' ? 'bg-wes text-white' : 'bg-gibb text-white')
                    : 'bg-card-hover border border-border text-text-secondary'
                }`}>{a}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Interviewee Name</label>
              <input value={schedForm.interviewee_name} onChange={e => setSchedForm(f => ({ ...f, interviewee_name: e.target.value }))}
                placeholder="Sarah Chen" />
            </div>
            <div>
              <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Company</label>
              <input value={schedForm.company} onChange={e => setSchedForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Purely Organic" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Role</label>
              <input value={schedForm.role} onChange={e => setSchedForm(f => ({ ...f, role: e.target.value }))}
                placeholder="VP Trade Marketing" />
            </div>
            <div>
              <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Department</label>
              <input value={schedForm.department} onChange={e => setSchedForm(f => ({ ...f, department: e.target.value }))}
                placeholder="Trade Marketing" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Date</label>
              <input type="date" value={schedForm.date} onChange={e => setSchedForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Time</label>
              <input type="time" value={schedForm.time} onChange={e => setSchedForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Notes</label>
            <textarea value={schedForm.notes} onChange={e => setSchedForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Topics to cover, connection source, prep notes..." className="resize-none" />
          </div>

          <p className="text-[10px] text-text-tertiary">A Google Meet link will be auto-generated for the interview.</p>

          <button type="submit" disabled={scheduling || !schedForm.interviewee_name.trim()}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-all active:scale-[0.97] disabled:opacity-40">
            {scheduling ? 'Scheduling...' : 'Schedule Interview'}
          </button>
        </form>
      )}

      {/* Main layout with timeline sidebar */}
      <div className="flex gap-6">
        {/* Timeline sidebar — desktop */}
        <div className="hidden md:block w-32 shrink-0">
          <div className="sticky top-16 space-y-1 max-h-[70vh] overflow-y-auto">
            {scheduled.length > 0 && (
              <>
                <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider px-2 mt-2 mb-1">Upcoming</div>
                {Object.entries(scheduledByDate).map(([day, items]) => (
                  <button key={day} onClick={() => document.getElementById(`sched-${day}`)?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-text-secondary hover:bg-indigo-50 transition">
                    <div className="text-[11px] font-semibold">{day}</div>
                    <div className="text-[10px] text-text-tertiary line-clamp-1">{items.map(i => i.interviewee_name).join(', ')}</div>
                  </button>
                ))}
              </>
            )}
            {completed.length > 0 && (
              <>
                <div className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider px-2 mt-3 mb-1">Completed</div>
                {Object.entries(completedByDate).map(([day, items]) => (
                  <button key={day} onClick={() => document.getElementById(`comp-${day}`)?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-text-secondary hover:bg-card-hover transition">
                    <div className="text-[11px] font-semibold">{day}</div>
                    <div className="text-[10px] text-text-tertiary line-clamp-1">{items.map(i => i.company || i.interviewee_name).join(', ')}</div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Scheduled interviews */}
          {scheduled.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-3">Upcoming Interviews</h2>
              {Object.entries(scheduledByDate).map(([day, items]) => (
                <div key={day} id={`sched-${day}`} className="mb-4">
                  <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">{day}</div>
                  <div className="space-y-2">
                    {items.map(i => (
                      <div key={i.id} className={`bg-card border rounded-lg p-4 hover:shadow hover:-translate-y-px transition-all ${selected.has(i.id) ? 'border-accent ring-2 ring-accent/20' : 'border-indigo-200'}`}>
                        <div className="flex items-center gap-3">
                          {selectMode && (
                            <button onClick={() => toggleSelect(i.id)}
                              className={`w-5 h-5 rounded border-2 shrink-0 transition-all ${selected.has(i.id) ? 'bg-accent border-accent' : 'border-border hover:border-accent'}`}>
                              {selected.has(i.id) && <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            </button>
                          )}
                          <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${i.interviewer === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                            {i.interviewer?.[0]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-text">{i.interviewee_name || 'TBD'}</span>
                              {i.company && <span className="text-text-secondary text-sm">{i.company}</span>}
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 font-medium">Scheduled</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                              {i.role && <span>{i.role}</span>}
                              {i.scheduled_at && (
                                <span>{new Date(i.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {i.meet_link && (
                              <a href={i.meet_link} target="_blank" rel="noopener"
                                className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition font-medium">
                                Join
                              </a>
                            )}
                            <Link href={`/interviews/${i.id}`}
                              className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">
                              Edit
                            </Link>
                          </div>
                        </div>
                        {i.notes && <p className="text-xs text-text-tertiary mt-2 pl-12">{i.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Completed interviews */}
          <section>
            <h2 className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-3">
              {scheduled.length > 0 ? 'Completed Interviews' : 'Interviews'}
            </h2>
            {Object.entries(completedByDate).map(([day, items]) => (
              <div key={day} id={`comp-${day}`} className="mb-4">
                <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">{day}</div>
                <div className="space-y-2">
                  {items.map(i => {
                    const painCount = Array.isArray(i.pain_points) ? i.pain_points.length : 0
                    return (
                      <div key={i.id} className={`bg-card border rounded-lg p-4 hover:shadow hover:-translate-y-px transition-all flex items-center gap-3 ${selected.has(i.id) ? 'border-accent ring-2 ring-accent/20' : 'border-border'}`}>
                        {selectMode && (
                          <button onClick={() => toggleSelect(i.id)}
                            className={`w-5 h-5 rounded border-2 shrink-0 transition-all ${selected.has(i.id) ? 'bg-accent border-accent' : 'border-border hover:border-accent'}`}>
                            {selected.has(i.id) && <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                          </button>
                        )}
                        <Link href={`/interviews/${i.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${i.interviewer === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                            {i.interviewer?.[0]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-text">{i.company || 'Unnamed'}</span>
                              <span className="text-text-secondary text-sm">{i.interviewee_name}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                              <span>{i.date}</span>
                              <span>{i.role}</span>
                              <span>{painCount} pain point{painCount !== 1 ? 's' : ''}</span>
                              {i.confidence && <span>Confidence: {i.confidence}/5</span>}
                            </div>
                          </div>
                          <span className={`text-lg font-extrabold shrink-0 ${scoreColor(i.score_total || 0)}`}>
                            {i.score_total || 0}<span className="text-text-tertiary text-xs font-normal">/30</span>
                          </span>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {completed.length === 0 && scheduled.length === 0 && (
              <p className="text-text-tertiary text-center py-10">No interviews yet. Schedule one or capture on the fly.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
