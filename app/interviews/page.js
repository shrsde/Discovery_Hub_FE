'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getInterviews, saveInterview, createMeeting, deleteInterviews, createIndexEntry } from '@/lib/api'
import { timeAgo } from '@/lib/constants'
import { useAuth } from '@/lib/auth-context'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Countdown from '@/components/Countdown'

function getOpportunityScore(interview) {
  const pains = Array.isArray(interview.pain_points) ? interview.pain_points.filter(p => p.description?.trim()) : []
  const painCount = pains.length
  const hasDollarImpact = pains.some(p => p.dollar_impact?.trim())
  const hasSignal = !!interview.biggest_signal?.trim()
  const hasWTP = !!interview.willingness_to_pay?.trim()
  const confidence = interview.confidence || 0
  return Math.min(10, painCount * 2 + (hasDollarImpact ? 2 : 0) + (hasSignal ? 2 : 0) + (hasWTP ? 2 : 0) + Math.round(confidence / 2))
}

function OpportunityBadge({ score }) {
  const color = score >= 7 ? 'text-green-700 bg-green-50/60' : score >= 4 ? 'text-amber-700 bg-amber-50/60' : 'text-red-600 bg-red-50/60'
  return (
    <span className={`text-lg font-extrabold px-2 py-0.5 rounded-lg ${color}`}>
      {score}<span className="text-xs font-normal opacity-60">/10</span>
    </span>
  )
}

export default function InterviewsListPage() {
  const { displayName } = useAuth()
  const router = useRouter()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')

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
    interviewee_name: '', company: '', role: '', department: '',
    date: '', time: '', interviewer: 'Gibb', notes: '',
  })

  async function load() {
    const r = await getInterviews()
    setInterviews(r.data || [])
  }

  async function handleStartInterview(id) {
    await saveInterview({ id, status: 'in_progress' })
    router.push(`/interviews/${id}`)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  // Filter
  let filtered = interviews
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(i =>
      i.interviewee_name?.toLowerCase().includes(q) ||
      i.company?.toLowerCase().includes(q) ||
      i.role?.toLowerCase().includes(q) ||
      i.biggest_signal?.toLowerCase().includes(q)
    )
  }

  const scheduled = filtered
    .filter(i => i.status === 'scheduled' || i.status === 'in_progress')
    .sort((a, b) => new Date(a.scheduled_at || a.date) - new Date(b.scheduled_at || b.date))

  const completed = filtered
    .filter(i => i.status !== 'scheduled' && i.status !== 'in_progress')
    .sort((a, b) => getOpportunityScore(b) - getOpportunityScore(a))

  const scheduledByDate = {}
  scheduled.forEach(i => {
    const day = new Date(i.scheduled_at || i.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    if (!scheduledByDate[day]) scheduledByDate[day] = []
    scheduledByDate[day].push(i)
  })

  async function handleSchedule(e) {
    e.preventDefault()
    if (!schedForm.interviewee_name.trim()) return
    setScheduling(true)
    try {
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
      {/* Sticky header + search */}
      <div className="sticky top-14 z-30 bg-[#fafafa] pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text">Interviews</h1>
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <span className="text-xs text-text-secondary">{selected.size} selected</span>
                {selected.size > 0 && (
                  <button onClick={handleDeleteSelected}
                    className="text-xs px-3 py-1.5 rounded-full glass-subtle border border-red-200/40 text-red-600 hover:bg-red-50/50 transition-colors duration-200">
                    Delete
                  </button>
                )}
                <button onClick={() => { setSelectMode(false); setSelected(new Set()) }}
                  className="text-xs px-3 py-1.5 rounded-full glass-subtle text-text-secondary hover:text-text transition-colors duration-200">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setSelectMode(true)}
                  className="text-xs px-3 py-1.5 rounded-full glass-subtle text-text-secondary hover:text-text transition-colors duration-200">
                  Select
                </button>
                <button onClick={() => setShowSchedule(true)}
                  className="text-xs px-4 py-2 rounded-full bg-accent text-white hover:bg-accent-light transition-all duration-200 active:scale-[0.97] font-semibold shadow-sm">
                  <span className="glyph mr-1">◎</span> Schedule
                </button>
                <Link href="/interviews/new"
                  className="text-xs px-4 py-2 rounded-full bg-accent text-white hover:bg-accent-light transition-all duration-200 active:scale-[0.97] font-semibold shadow-sm">
                  + New
                </Link>
              </>
            )}
          </div>
        </div>

        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search interviews..." className="!rounded-full !text-xs" />
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="glass-strong rounded-2xl border-0 shadow-xl max-w-md p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-text">Schedule Interview</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSchedule} className="space-y-4">
            <div className="flex gap-2">
              {['Wes', 'Gibb'].map(a => (
                <button key={a} type="button" onClick={() => setSchedForm(f => ({ ...f, interviewer: a }))}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-[0.97] ${
                    schedForm.interviewer === a
                      ? (a === 'Wes' ? 'bg-wes text-white' : 'bg-gibb text-white')
                      : 'glass-subtle text-text-secondary'
                  }`}>{a}</button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="section-label block mb-1">Interviewee Name</label>
                <input value={schedForm.interviewee_name} onChange={e => setSchedForm(f => ({ ...f, interviewee_name: e.target.value }))}
                  placeholder="Sarah Chen" />
              </div>
              <div>
                <label className="section-label block mb-1">Company</label>
                <input value={schedForm.company} onChange={e => setSchedForm(f => ({ ...f, company: e.target.value }))}
                  placeholder="Purely Organic" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="section-label block mb-1">Role</label>
                <input value={schedForm.role} onChange={e => setSchedForm(f => ({ ...f, role: e.target.value }))}
                  placeholder="VP Trade Marketing" />
              </div>
              <div>
                <label className="section-label block mb-1">Department</label>
                <input value={schedForm.department} onChange={e => setSchedForm(f => ({ ...f, department: e.target.value }))}
                  placeholder="Trade Marketing" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="section-label block mb-1">Date</label>
                <input type="date" value={schedForm.date} onChange={e => setSchedForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="section-label block mb-1">Time</label>
                <input type="time" value={schedForm.time} onChange={e => setSchedForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="section-label block mb-1">Notes</label>
              <textarea value={schedForm.notes} onChange={e => setSchedForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Topics to cover, prep notes..." className="resize-none" />
            </div>

            <p className="text-[10px] text-text-tertiary">Google Meet link auto-generated. Recording bot joins and transcribes automatically.</p>

            <button type="submit" disabled={scheduling || !schedForm.interviewee_name.trim()}
              className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all active:scale-[0.97] disabled:opacity-40">
              {scheduling ? 'Scheduling...' : 'Schedule Interview'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main layout */}
      <div className="flex gap-6">
        {/* Timeline sidebar */}
        <div className="hidden md:block w-32 shrink-0">
          <div className="sticky top-40 space-y-1 max-h-[70vh] overflow-y-auto">
            {scheduled.length > 0 && (
              <>
                <div className="section-label text-[9px] px-2 mt-2 mb-1 flex items-center gap-1">
                  <span className="glyph text-xs glyph-pulse">◎</span> Upcoming
                </div>
                {Object.entries(scheduledByDate).map(([day, items]) => (
                  <button key={day} onClick={() => document.getElementById(`sched-${day}`)?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-text-secondary hover:bg-white/40 transition-colors duration-200">
                    <div className="text-[11px] font-semibold">{day}</div>
                    <div className="text-[10px] text-text-tertiary line-clamp-1">{items.map(i => i.interviewee_name).join(', ')}</div>
                  </button>
                ))}
              </>
            )}
            {completed.length > 0 && (
              <>
                <div className="section-label text-[9px] px-2 mt-3 mb-1 flex items-center gap-1">
                  <span className="glyph text-xs">◇</span> Ranked
                </div>
                {completed.slice(0, 8).map(i => {
                  const score = getOpportunityScore(i)
                  return (
                    <button key={i.id} onClick={() => document.getElementById(`int-${i.id}`)?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-text-secondary hover:bg-white/40 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold truncate">{i.company || i.interviewee_name}</span>
                        <span className={`text-[10px] font-bold ${score >= 7 ? 'text-green-600' : score >= 4 ? 'text-amber-600' : 'text-red-500'}`}>{score}</span>
                      </div>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Scheduled interviews */}
          {scheduled.length > 0 && (
            <section>
              <h2 className="section-label mb-3 flex items-center gap-1.5">
                <span className="glyph glyph-pulse">◎</span> Upcoming Interviews
              </h2>
              {Object.entries(scheduledByDate).map(([day, items]) => (
                <div key={day} id={`sched-${day}`} className="mb-4">
                  <div className="section-label mb-2">{day}</div>
                  <div className="space-y-2">
                    {items.map(i => (
                      <div key={i.id} className={`glass rounded-2xl p-4 card-lift gradient-blue ${selected.has(i.id) ? 'ring-2 ring-accent/20' : ''}`}>
                        <div className="flex items-center gap-3">
                          {selectMode && (
                            <button onClick={() => toggleSelect(i.id)}
                              className={`w-5 h-5 rounded border-2 shrink-0 transition-all ${selected.has(i.id) ? 'bg-accent border-accent' : 'border-[rgba(0,0,0,0.15)] hover:border-accent'}`}>
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
                              {i.status === 'in_progress' ? (
                                <span className="tag tag-green flex items-center gap-1">
                                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                                  Live
                                </span>
                              ) : (
                                i.scheduled_at && <Countdown scheduledAt={i.scheduled_at} />
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                              {i.role && <span>{i.role}</span>}
                              {i.scheduled_at && (
                                <span>{new Date(i.scheduled_at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {i.meet_link && (
                              <a href={i.meet_link} target="_blank" rel="noopener"
                                className="text-xs px-3 py-1.5 rounded-full bg-accent text-white hover:bg-accent-light transition-all duration-200 font-semibold shadow-sm">
                                Join
                              </a>
                            )}
                            {(() => {
                              const scheduledTime = new Date(i.scheduled_at || i.date).getTime()
                              const canStart = Date.now() >= scheduledTime - 15 * 60 * 1000
                              return canStart ? (
                                <button onClick={() => handleStartInterview(i.id)}
                                  className="text-xs px-3 py-1.5 rounded-full glass-subtle text-green-700 font-semibold hover:bg-green-50/50 transition-colors duration-200 border border-green-200/40">
                                  Start
                                </button>
                              ) : null
                            })()}
                            <Link href={`/interviews/${i.id}`}
                              className="text-xs px-3 py-1.5 rounded-full glass-subtle text-text-secondary hover:text-text transition-colors duration-200">
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

          {/* Completed — ranked by opportunity */}
          <section>
            <h2 className="section-label mb-3 flex items-center gap-1.5">
              <span className="glyph">◇</span> {scheduled.length > 0 ? 'Ranked by Opportunity' : 'Interviews'}
            </h2>
            <div className="space-y-2">
              {completed.map((i, idx) => {
                const pains = Array.isArray(i.pain_points) ? i.pain_points.filter(p => p.description?.trim()) : []
                const painCount = pains.length
                const score = getOpportunityScore(i)
                const topPain = pains[0]?.description || ''

                return (
                  <div key={i.id} id={`int-${i.id}`}
                    className={`glass rounded-2xl p-4 card-lift ${selected.has(i.id) ? 'ring-2 ring-accent/20' : ''} ${idx === 0 && score >= 7 ? 'gradient-green' : ''}`}>
                    <div className="flex items-start gap-3">
                      {selectMode && (
                        <button onClick={() => toggleSelect(i.id)}
                          className={`w-5 h-5 rounded border-2 shrink-0 mt-1 transition-all ${selected.has(i.id) ? 'bg-accent border-accent' : 'border-[rgba(0,0,0,0.15)] hover:border-accent'}`}>
                          {selected.has(i.id) && <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                        </button>
                      )}
                      <Link href={`/interviews/${i.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${i.interviewer === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                            {i.interviewer?.[0]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-text">{i.company || 'Unnamed'}</span>
                              <span className="text-text-secondary text-sm">{i.interviewee_name}</span>
                              {i.org_type && <span className="tag tag-primary">{i.org_type}</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                              <span>{timeAgo(i.date)}</span>
                              {i.role && <span>{i.role}</span>}
                            </div>
                          </div>
                          <OpportunityBadge score={score} />
                        </div>

                        {/* Pain vs Opportunity summary */}
                        <div className="mt-3 pl-12 flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="tag tag-red">{painCount} pain{painCount !== 1 ? 's' : ''}</span>
                              {i.biggest_signal && <span className="tag tag-green">signal</span>}
                              {i.willingness_to_pay && <span className="tag tag-amber">wtp</span>}
                              {i.confidence && <span className="tag tag-blue">conf {i.confidence}/5</span>}
                            </div>
                            {topPain && (
                              <p className="text-xs text-text-secondary line-clamp-1 mt-1">{topPain}</p>
                            )}
                            {i.biggest_signal && (
                              <p className="text-[11px] text-green-700 mt-1 line-clamp-1">{i.biggest_signal}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-1.5 shrink-0 mt-1">
                        <Link href={`/interviews/${i.id}/flow`}
                          className="text-xs px-3 py-1.5 rounded-full glass-subtle text-text-secondary hover:text-text transition-colors duration-200">
                          Workflow
                        </Link>
                        <button onClick={async (e) => {
                          e.preventDefault()
                          const btn = e.currentTarget
                          btn.textContent = 'Indexing...'
                          try {
                            await createIndexEntry({
                              title: `${i.interviewee_name || 'Unknown'} — ${i.company || 'Unknown'}`,
                              body: `<strong>${i.interviewee_name}</strong> at ${i.company}${i.role ? ` (${i.role})` : ''}\n\n${i.biggest_signal || ''}\n\n${(Array.isArray(i.pain_points) ? i.pain_points.filter(p => p.description).map(p => '- ' + p.description).join('\n') : '')}`,
                              source_type: 'interview',
                              source_id: i.id,
                              tags: ['interview', i.company, i.org_type].filter(Boolean),
                              author: i.interviewer || 'Wes',
                            })
                            btn.textContent = 'Indexed'
                            btn.classList.add('text-green-600')
                            setTimeout(() => { btn.textContent = '⬡ Index'; btn.classList.remove('text-green-600') }, 3000)
                          } catch (err) { btn.textContent = '⬡ Index'; alert('Failed: ' + err.message) }
                        }}
                          className="text-xs px-3 py-1.5 rounded-full glass-subtle text-accent font-medium hover:text-accent-light transition-colors duration-200">
                          ⬡ Index
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {completed.length === 0 && scheduled.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center">
                <p className="text-text-tertiary text-sm">No interviews yet. Schedule one or capture on the fly.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
