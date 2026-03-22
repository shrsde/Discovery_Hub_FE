'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getInterview, saveInterview, importTranscript, getAttachments, uploadAttachment, deleteAttachment, transcribeAudio } from '@/lib/api'
import { PAIN_CATEGORIES, FREQUENCIES, OUTSOURCED_OPTIONS, AUTOPILOT_OPTIONS, scoreColor } from '@/lib/constants'

const ORG_TYPES = ['Manufacturer / Brand', 'Broker', 'Distributor']

const REVENUE_RANGES = ['$1–10M', '$11–50M', '$51–250M', '$251M+']

const CHANNEL_OPTIONS = ['Retail', 'Foodservice', 'E-commerce / DTC', 'Club', 'Industrial', 'Wholesale', 'Private Label']

const TECH_STACK_OPTIONS = ['ERP', 'TPM', 'CRM', 'Reporting Tools', 'Analytics', 'Other']

const DISTRIBUTOR_TYPES = ['Broadline', 'Specialty']

const SECTIONS = [
  { id: 'summary', label: 'Summary', glyph: '◎' },
  { id: 'details', label: 'Details', glyph: '◈' },
  { id: 'org-profile', label: 'Org Profile', glyph: '⬡' },
  { id: 'workflow', label: 'Workflow', glyph: '▸' },
  { id: 'pain-points', label: 'Pain Points', glyph: '◆' },
  { id: 'solution', label: 'Solution', glyph: '△' },
  { id: 'quotes', label: 'Quotes', glyph: '◇' },
  { id: 'assessment', label: 'Assessment', glyph: '⬡' },
  { id: 'notes', label: 'Notes', glyph: '◈' },
  { id: 'attachments', label: 'Attachments', glyph: '▸' },
]

function DotSelector({ value, max = 5, onChange, label }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-full border text-xs font-bold transition-all duration-200 active:scale-[0.93] ${
              n <= value ? 'bg-accent border-accent text-white' : 'glass-subtle border-[rgba(0,0,0,0.08)] text-text-tertiary hover:border-text-tertiary'
            }`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function Section({ title, number, id, glyph, children }) {
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <h2 className="text-sm font-semibold text-text flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold glyph">{glyph || number}</span>
        {title}
      </h2>
      <div className="glass rounded-2xl p-5 space-y-4">
        {children}
      </div>
    </section>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="section-label block mb-1">{label}</label>
      {hint && <p className="text-[11px] text-text-tertiary mb-1">{hint}</p>}
      {children}
    </div>
  )
}

function InternalNotes({ value, onChange }) {
  return (
    <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
      <label className="section-label block mb-1 text-amber-600">Interviewer Internal Notes</label>
      <p className="text-[10px] text-text-tertiary mb-1">Private notes — not parsed by AI</p>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)}
        rows={2} placeholder="Your internal observations for this section..."
        className="!bg-amber-50/30 !border-amber-200/40 text-xs" />
    </div>
  )
}

function ChannelSlider({ channels, onChange }) {
  const total = Object.values(channels).reduce((s, v) => s + v, 0)

  function handleChange(key, val) {
    const updated = { ...channels, [key]: val }
    onChange(updated)
  }

  return (
    <div className="space-y-2">
      {CHANNEL_OPTIONS.map(ch => (
        <div key={ch} className="flex items-center gap-3">
          <span className="text-xs text-text-secondary w-28 shrink-0">{ch}</span>
          <input type="range" min="0" max="100" value={channels[ch] || 0}
            onChange={e => handleChange(ch, parseInt(e.target.value))}
            className="flex-1" />
          <span className="text-xs text-text-tertiary w-10 text-right">{channels[ch] || 0}%</span>
        </div>
      ))}
      {total > 0 && total !== 100 && (
        <p className="text-[10px] text-amber-600">Total: {total}% (should equal 100%)</p>
      )}
    </div>
  )
}

const EMPTY_PAIN = { description: '', category: '', frequency: '', dollar_impact: '', who_feels: '', current_solution: '' }

export default function InterviewFormPage({ params }) {
  const { id } = params
  const router = useRouter()
  const isNew = id === 'new'
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [importInterviewer, setImportInterviewer] = useState('Gibb')
  const [attachments, setAttachments] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [interviewStatus, setInterviewStatus] = useState(null)
  const [meetLink, setMeetLink] = useState('')
  const [pollingNotice, setPollingNotice] = useState('')
  const [activeSection, setActiveSection] = useState('details')
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const attachInputRef = useRef(null)
  const audioInputRef = useRef(null)

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    interviewer: 'Gibb',
    interviewee_name: '', company: '', role: '', department: '',
    company_size: '', connection_source: '', channels: [], distributors: '',
    // Org type conditional fields
    org_type: '',
    annual_revenue: '',
    channel_mix: {},
    tech_stack: [],
    tech_stack_other: '',
    org_headcount: '',
    brokers: '',
    supply_chain_product: '',
    distribution_models: '',
    // Broker fields
    broker_channel_focus: '',
    broker_primary_account: '',
    broker_client_count: '',
    broker_client_size: '',
    broker_geographic: '',
    // Distributor fields
    distributor_channel: '',
    distributor_type: '',
    // Workflow
    workflow_steps: '', systems_tools: '', data_sources: '',
    handoffs: '', time_spent: '', workarounds: '',
    pain_points: [{ ...EMPTY_PAIN }, { ...EMPTY_PAIN }, { ...EMPTY_PAIN }],
    tools_evaluated: '', why_failed: '', current_spend: '',
    budget_authority: '', willingness_to_pay: '', integration_reqs: '',
    verbatim_quotes: '', observations: '', surprises: '', follow_ups: '',
    intel_vs_judgement: 50, outsourced_vs_insourced: '', autopilot_vs_copilot: '',
    biggest_signal: '', confidence: 3,
    score_founder_fit: 0, score_lowest_friction: 0, score_clearest_value: 0,
    score_defensibility: 0, score_ease_de_risk: 0, score_stickiness: 0,
    notes: '',
    // Internal notes per section
    internal_notes_details: '',
    internal_notes_org: '',
    internal_notes_workflow: '',
    internal_notes_pain: '',
    internal_notes_solution: '',
    internal_notes_quotes: '',
    internal_notes_assessment: '',
  })

  // Auto-resize all textareas
  useEffect(() => {
    function autoResize(el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
    function handleInput(e) {
      if (e.target.tagName === 'TEXTAREA') autoResize(e.target)
    }
    document.addEventListener('input', handleInput)
    // Resize all existing textareas on form change
    setTimeout(() => {
      document.querySelectorAll('textarea').forEach(autoResize)
    }, 100)
    return () => document.removeEventListener('input', handleInput)
  }, [form])

  useEffect(() => {
    if (!isNew) {
      getInterview(id).then(data => {
        if (data) {
          const pp = Array.isArray(data.pain_points) ? data.pain_points : []
          while (pp.length < 3) pp.push({ ...EMPTY_PAIN })
          setForm(f => ({ ...f, ...data, pain_points: pp, channel_mix: data.channel_mix || {}, tech_stack: data.tech_stack || [] }))
          if (data.status) setInterviewStatus(data.status)
          if (data.meet_link) setMeetLink(data.meet_link)
        }
        setLoading(false)
      })
      getAttachments(id).then(r => setAttachments(r.data || [])).catch(() => {})
    }
  }, [id, isNew])

  // Polling when in_progress
  useEffect(() => {
    if (interviewStatus !== 'in_progress') return
    const interval = setInterval(async () => {
      try {
        const data = await getInterview(id)
        if (!data) return
        if (data.status === 'completed') {
          setInterviewStatus('completed')
          clearInterval(interval)
        }
        const hasNewQuotes = data.verbatim_quotes && !form.verbatim_quotes
        const hasNewPains = Array.isArray(data.pain_points) && data.pain_points.some(p => p.description) &&
          !form.pain_points.some(p => p.description)
        if (hasNewQuotes || hasNewPains) {
          const pp = Array.isArray(data.pain_points) ? data.pain_points : []
          while (pp.length < 3) pp.push({ ...EMPTY_PAIN })
          setForm(f => ({
            ...f,
            ...Object.fromEntries(
              Object.entries(data).filter(([k, v]) => v !== null && v !== undefined && k !== 'id' && k !== 'status')
            ),
            pain_points: pp,
          }))
          setPollingNotice('Transcript processed — form updated with extracted data')
          setTimeout(() => setPollingNotice(''), 5000)
        }
      } catch (err) {}
    }, 15000)
    return () => clearInterval(interval)
  }, [interviewStatus, id])

  // Scroll spy for timeline
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      }
    }, { rootMargin: '-100px 0px -60% 0px' })

    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [loading])

  const handleMarkComplete = useCallback(async () => {
    setSaving(true)
    try {
      const payload = { ...form, status: 'completed', pain_points: form.pain_points.filter(p => p.description.trim()) }
      if (!isNew) payload.id = id
      await saveInterview(payload)
      setInterviewStatus('completed')
    } finally { setSaving(false) }
  }, [form, id, isNew])

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      await uploadAttachment(file, id, form.interviewer || 'Wes')
      const r = await getAttachments(id)
      setAttachments(r.data || [])
    } catch (err) { alert('Upload failed: ' + err.message) }
    finally { setUploadingFile(false) }
  }

  async function handleDeleteAttachment(attachId) {
    if (!confirm('Delete this attachment?')) return
    await deleteAttachment(attachId)
    const r = await getAttachments(id)
    setAttachments(r.data || [])
  }

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const updatePain = (idx, key, val) => {
    const pp = [...form.pain_points]
    pp[idx] = { ...pp[idx], [key]: val }
    update('pain_points', pp)
  }
  const toggleTech = (t) => {
    const ts = form.tech_stack.includes(t) ? form.tech_stack.filter(x => x !== t) : [...form.tech_stack, t]
    update('tech_stack', ts)
  }

  // Pain vs Opportunity score
  const painCount = form.pain_points.filter(p => p.description?.trim()).length
  const hasDollarImpact = form.pain_points.some(p => p.dollar_impact?.trim())
  const hasSignal = !!form.biggest_signal?.trim()
  const hasWTP = !!form.willingness_to_pay?.trim()
  const confidenceScore = form.confidence || 0
  const opportunityScore = Math.min(10, painCount * 2 + (hasDollarImpact ? 2 : 0) + (hasSignal ? 2 : 0) + (hasWTP ? 2 : 0) + Math.round(confidenceScore / 2))

  const rankedPains = [...form.pain_points].filter(p => p.description).sort((a, b) => {
    const catOrder = { 'Revenue Adder': 4, 'Overhead Savings': 3, 'Speed/Efficiency': 2, 'Risk Reduction': 1 }
    return (catOrder[b.category] || 0) - (catOrder[a.category] || 0)
  })

  async function handleAudioUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setTranscribing(true)
    try {
      const res = await transcribeAudio(file)
      if (res.success && res.transcript) setTranscript(res.transcript)
    } catch (err) { alert('Transcription failed: ' + err.message) }
    finally { setTranscribing(false) }
  }

  async function handleImport() {
    if (!transcript.trim()) return
    setImporting(true)
    try {
      const res = await importTranscript(transcript.trim(), importInterviewer)
      if (res.success && res.data) {
        const imported = res.data
        const pp = Array.isArray(imported.pain_points) ? imported.pain_points : []
        while (pp.length < 3) pp.push({ ...EMPTY_PAIN })
        setForm(f => ({
          ...f,
          ...Object.fromEntries(Object.entries(imported).filter(([_, v]) => v !== null && v !== undefined)),
          pain_points: pp,
          date: f.date,
          interviewer: imported.interviewer || importInterviewer,
        }))
        setShowImport(false)
        setTranscript('')
      }
    } catch (err) { alert('Import failed: ' + err.message) }
    finally { setImporting(false) }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, pain_points: form.pain_points.filter(p => p.description.trim()) }
      if (interviewStatus) payload.status = interviewStatus
      if (!isNew) payload.id = id
      await saveInterview(payload)
      router.push('/interviews')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="text-text-tertiary text-center py-20">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/interviews')} className="text-text-secondary text-sm hover:text-text transition">&larr; Back</button>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Link href={`/interviews/${id}/flow`}
              className="text-xs px-4 py-2 bg-accent text-white rounded-full hover:bg-accent-light transition-all duration-200 active:scale-[0.97] font-medium shadow-sm">
              View Workflow
            </Link>
          )}
          <h1 className="text-xl font-semibold text-text">{isNew ? 'New Interview' : 'Edit Interview'}</h1>
        </div>
      </div>

      {/* Live Interview Header */}
      {(interviewStatus === 'scheduled' || interviewStatus === 'in_progress') && (
        <div className={`sticky top-14 z-10 glass rounded-2xl p-4 flex items-center justify-between gap-3 ${
          interviewStatus === 'in_progress' ? 'gradient-green' : 'gradient-blue'
        }`}>
          <div className="flex items-center gap-3">
            {interviewStatus === 'scheduled' && (
              <span className="tag tag-blue">Scheduled</span>
            )}
            {interviewStatus === 'in_progress' && (
              <span className="inline-flex items-center gap-1.5 tag tag-green">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live Interview
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {meetLink && (
              <a href={meetLink} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all duration-200 active:scale-[0.97] shadow-sm">
                Join Meet
              </a>
            )}
            <button type="button" onClick={handleMarkComplete} disabled={saving}
              className="px-4 py-2 glass-strong text-sm font-semibold rounded-full text-text hover:bg-white/80 transition-all duration-200 active:scale-[0.97] disabled:opacity-40">
              {saving ? 'Saving...' : 'Mark Complete'}
            </button>
          </div>
        </div>
      )}

      {pollingNotice && (
        <div className="glass rounded-2xl gradient-green px-4 py-2.5 text-sm text-green-700 font-medium animate-pulse">
          {pollingNotice}
        </div>
      )}

      {/* AI Summary — collapsible */}
      {interviewStatus === 'completed' && (form.biggest_signal || rankedPains.length > 0) && (
        <div id="summary" className="glass rounded-2xl p-5 gradient-bg-blue gradient-blue scroll-mt-24">
          <button type="button" onClick={() => setSummaryExpanded(!summaryExpanded)}
            className="w-full flex items-center justify-between">
            <div className="section-label text-blue-700 flex items-center gap-1.5">
              <span className="glyph glyph-float">◎</span> AI Summary
              {rankedPains.length > 0 && <span className="tag tag-blue ml-2">{rankedPains.length} pain point{rankedPains.length !== 1 ? 's' : ''}</span>}
            </div>
            <span className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text transition-colors duration-200">
              {summaryExpanded ? 'Collapse' : 'Expand'}
              <span className={`text-lg transition-transform duration-200 ${summaryExpanded ? 'rotate-180' : ''}`}>&#x25BE;</span>
            </span>
          </button>

          {/* Collapsed snippet */}
          {!summaryExpanded && form.biggest_signal && (
            <p className="text-sm text-text mt-2 line-clamp-2">{form.biggest_signal}</p>
          )}

          {/* Expanded content */}
          {summaryExpanded && (
            <div className="mt-3 space-y-3 animate-in">
              {form.biggest_signal && (
                <div className="text-sm text-text font-medium">{form.biggest_signal}</div>
              )}
              {rankedPains.length > 0 && (
                <div className="space-y-2">
                  <div className="section-label text-xs">Ranked Pain Points</div>
                  {rankedPains.map((p, i) => (
                    <div key={i} className="flex items-start gap-2.5 glass-subtle rounded-xl p-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                        i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-500' : 'bg-amber-500'
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-text">{p.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {p.category && <span className="tag tag-red text-[8px]">{p.category}</span>}
                          {p.dollar_impact && <span className="text-[10px] text-text-tertiary font-semibold">{p.dollar_impact}</span>}
                          {p.frequency && <span className="text-[10px] text-text-tertiary">{p.frequency}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)]">
            <Link href={`/interviews/${id}/flow`}
              className="text-xs px-3 py-1.5 rounded-full glass-subtle font-medium text-text hover:bg-white/60 transition-colors duration-200 border border-[rgba(0,0,0,0.08)]">
              Generate Workflow
            </Link>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[10px] text-text-tertiary uppercase tracking-wide">Pain {painCount}</span>
              <span className="w-px h-3 bg-[rgba(0,0,0,0.1)]" />
              <span className={`text-lg font-extrabold ${opportunityScore >= 7 ? 'text-score-green' : opportunityScore >= 4 ? 'text-score-orange' : 'text-score-red'}`}>
                {opportunityScore}<span className="text-xs text-text-tertiary font-normal">/10</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Import Transcript */}
      {isNew && !showImport && (
        <button onClick={() => setShowImport(true)}
          className="w-full py-4 glass rounded-2xl text-text-secondary hover:text-accent transition-all text-sm font-medium border-2 border-dashed border-[rgba(0,0,0,0.08)]">
          Import from Recording or Transcript
        </button>
      )}

      {showImport && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Import Interview</h2>
            <button onClick={() => setShowImport(false)} className="text-text-tertiary text-sm hover:text-text transition">Cancel</button>
          </div>
          <div className="flex gap-2">
            {['Wes', 'Gibb'].map(a => (
              <button key={a} type="button" onClick={() => setImportInterviewer(a)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-[0.97] ${
                  importInterviewer === a
                    ? (a === 'Wes' ? 'bg-wes text-white' : 'bg-gibb text-white')
                    : 'glass-subtle text-text-secondary'
                }`}>{a}</button>
            ))}
          </div>
          <div className="glass-subtle rounded-xl p-4 space-y-2">
            <div className="text-xs font-semibold text-text">Upload Recording</div>
            <p className="text-[11px] text-text-tertiary">Upload audio/video — AI will transcribe and extract data.</p>
            <input ref={audioInputRef} type="file" className="hidden"
              accept="audio/*,video/*,.mp3,.m4a,.wav,.mp4,.webm,.ogg" onChange={handleAudioUpload} />
            <button type="button" onClick={() => audioInputRef.current?.click()} disabled={transcribing}
              className="px-4 py-2 glass-subtle rounded-full text-sm font-medium text-text-secondary hover:text-accent transition-all disabled:opacity-40">
              {transcribing ? 'Transcribing...' : '◎ Choose file'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[rgba(0,0,0,0.06)]" />
            <span className="text-xs text-text-tertiary">or paste transcript</span>
            <div className="flex-1 h-px bg-[rgba(0,0,0,0.06)]" />
          </div>
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
            rows={8} placeholder="Paste the full interview transcript here..." className="resize-none" />
          <button type="button" onClick={handleImport} disabled={importing || !transcript.trim()}
            className="w-full py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-light transition-all active:scale-[0.97] disabled:opacity-40 shadow-sm">
            {importing ? 'Analyzing transcript...' : 'Import & Fill Form'}
          </button>
        </div>
      )}

      {/* Main layout with timeline sidebar */}
      <div className="flex gap-6">
        {/* Timeline sidebar — desktop */}
        <div className="hidden md:block w-28 shrink-0">
          <div className="sticky top-24 space-y-0.5">
            {SECTIONS.map(s => (
              <button key={s.id}
                onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors duration-200 flex items-center gap-1.5 ${
                  activeSection === s.id ? 'bg-accent text-white' : 'text-text-tertiary hover:text-text hover:bg-white/40'
                }`}>
                <span className="text-xs">{s.glyph}</span>
                <span className="text-[11px] font-medium truncate">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form content */}
        <form onSubmit={handleSave} className="flex-1 min-w-0 space-y-6">

          <Section title="Interview Details" id="details" glyph="◈">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input type="date" value={form.date} onChange={e => update('date', e.target.value)} />
              </Field>
              <Field label="Interviewer">
                <div className="flex gap-2">
                  {['Wes', 'Gibb'].map(a => (
                    <button key={a} type="button" onClick={() => update('interviewer', a)}
                      className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.97] ${
                        form.interviewer === a
                          ? (a === 'Wes' ? 'bg-wes text-white' : 'bg-gibb text-white')
                          : 'glass-subtle text-text-secondary'
                      }`}>{a}</button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Interviewee Name">
                <input value={form.interviewee_name} onChange={e => update('interviewee_name', e.target.value)} placeholder="Sarah Chen" />
              </Field>
              <Field label="Company">
                <input value={form.company} onChange={e => update('company', e.target.value)} placeholder="Purely Organic" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <input value={form.role} onChange={e => update('role', e.target.value)} placeholder="VP Trade Marketing" />
              </Field>
              <Field label="Department">
                <input value={form.department} onChange={e => update('department', e.target.value)} placeholder="Trade Marketing" />
              </Field>
            </div>
            <Field label="Connection Source">
              <input value={form.connection_source} onChange={e => update('connection_source', e.target.value)} placeholder="Kellogg network" />
            </Field>
            <InternalNotes value={form.internal_notes_details} onChange={v => update('internal_notes_details', v)} />
          </Section>

          {/* Organization Profile — conditional */}
          <Section title="Organization Profile" id="org-profile" glyph="⬡">
            <Field label="Organization Type">
              <div className="flex flex-wrap gap-1.5">
                {ORG_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => update('org_type', t)}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${
                      form.org_type === t ? 'bg-accent text-white border-accent' : 'glass-subtle border-[rgba(0,0,0,0.08)] text-text-secondary hover:text-text'
                    }`}>{t}</button>
                ))}
              </div>
            </Field>

            {/* Manufacturer / Brand fields */}
            {form.org_type === 'Manufacturer / Brand' && (
              <>
                <Field label="Annual Revenue">
                  <div className="flex flex-wrap gap-1.5">
                    {REVENUE_RANGES.map(r => (
                      <button key={r} type="button" onClick={() => update('annual_revenue', r)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          form.annual_revenue === r ? 'bg-accent text-white border-accent' : 'glass-subtle border-[rgba(0,0,0,0.08)] text-text-secondary'
                        }`}>{r}</button>
                    ))}
                  </div>
                </Field>
                <Field label="Channel Mix">
                  <ChannelSlider channels={form.channel_mix || {}} onChange={v => update('channel_mix', v)} />
                </Field>
                <Field label="Tech Stack">
                  <div className="flex flex-wrap gap-1.5">
                    {TECH_STACK_OPTIONS.map(t => (
                      <button key={t} type="button" onClick={() => toggleTech(t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          form.tech_stack.includes(t) ? 'bg-accent text-white border-accent' : 'glass-subtle border-[rgba(0,0,0,0.08)] text-text-secondary'
                        }`}>{t}</button>
                    ))}
                  </div>
                  {form.tech_stack.includes('Other') && (
                    <input value={form.tech_stack_other} onChange={e => update('tech_stack_other', e.target.value)}
                      placeholder="List other tools..." className="mt-2" />
                  )}
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Organization Headcount">
                    <input value={form.org_headcount} onChange={e => update('org_headcount', e.target.value)} placeholder="120 employees" />
                  </Field>
                  <Field label="Brokers">
                    <input value={form.brokers} onChange={e => update('brokers', e.target.value)} placeholder="Acosta, Advantage Solutions" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Supply Chain / Product Type">
                    <input value={form.supply_chain_product} onChange={e => update('supply_chain_product', e.target.value)} placeholder="Frozen, Shelf-stable, Fresh" />
                  </Field>
                  <Field label="Distribution Models">
                    <input value={form.distribution_models} onChange={e => update('distribution_models', e.target.value)} placeholder="UNFI, KeHE, DSD" />
                  </Field>
                </div>
              </>
            )}

            {/* Broker fields */}
            {form.org_type === 'Broker' && (
              <>
                <Field label="Channel Focus">
                  <input value={form.broker_channel_focus} onChange={e => update('broker_channel_focus', e.target.value)}
                    placeholder="Retail, Club, Foodservice, Wholesale" />
                </Field>
                <Field label="Primary Account / Channel Focus">
                  <input value={form.broker_primary_account} onChange={e => update('broker_primary_account', e.target.value)}
                    placeholder="Walmart, Kroger, Whole Foods" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="# of Clients / Brands">
                    <input value={form.broker_client_count} onChange={e => update('broker_client_count', e.target.value)}
                      placeholder="25-50 brands" />
                  </Field>
                  <Field label="$ Size of Clients">
                    <input value={form.broker_client_size} onChange={e => update('broker_client_size', e.target.value)}
                      placeholder="$5M-$100M" />
                  </Field>
                </div>
                <Field label="Geographic Coverage">
                  <input value={form.broker_geographic} onChange={e => update('broker_geographic', e.target.value)}
                    placeholder="Northeast, National, West Coast" />
                </Field>
              </>
            )}

            {/* Distributor fields */}
            {form.org_type === 'Distributor' && (
              <>
                <Field label="Channel">
                  <div className="flex flex-wrap gap-1.5">
                    {['Foodservice', 'Retail', 'Club', 'Wholesale', 'Private Label'].map(ch => (
                      <button key={ch} type="button" onClick={() => update('distributor_channel', ch)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          form.distributor_channel === ch ? 'bg-accent text-white border-accent' : 'glass-subtle border-[rgba(0,0,0,0.08)] text-text-secondary'
                        }`}>{ch}</button>
                    ))}
                  </div>
                </Field>
                <Field label="Type">
                  <div className="flex gap-2">
                    {DISTRIBUTOR_TYPES.map(t => (
                      <button key={t} type="button" onClick={() => update('distributor_type', t)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                          form.distributor_type === t ? 'bg-accent text-white border-accent' : 'glass-subtle border-[rgba(0,0,0,0.08)] text-text-secondary'
                        }`}>{t}</button>
                    ))}
                  </div>
                </Field>
              </>
            )}
            <InternalNotes value={form.internal_notes_org} onChange={v => update('internal_notes_org', v)} />
          </Section>

          <Section title="Workflow Mapping" id="workflow" glyph="▸">
            <Field label="Primary Workflow">
              <textarea value={form.workflow_steps} onChange={e => update('workflow_steps', e.target.value)} rows={1} className="resize-none" placeholder="Describe their main workflow step by step..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Systems / Tools">
                <input value={form.systems_tools} onChange={e => update('systems_tools', e.target.value)} placeholder="SAP, Excel, ..." />
              </Field>
              <Field label="Data Sources">
                <input value={form.data_sources} onChange={e => update('data_sources', e.target.value)} placeholder="Distributor portals, ..." />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Handoffs">
                <input value={form.handoffs} onChange={e => update('handoffs', e.target.value)} placeholder="Finance → Sales → ..." />
              </Field>
              <Field label="Time Spent">
                <input value={form.time_spent} onChange={e => update('time_spent', e.target.value)} placeholder="20 hrs/week" />
              </Field>
            </div>
            <Field label="Workarounds">
              <textarea value={form.workarounds} onChange={e => update('workarounds', e.target.value)} rows={2} placeholder="Manual copy-paste, emailing spreadsheets..." />
            </Field>
            <InternalNotes value={form.internal_notes_workflow} onChange={v => update('internal_notes_workflow', v)} />
          </Section>

          <Section title="Pain Points" id="pain-points" glyph="◆">
            {form.pain_points.map((pp, idx) => (
              <div key={idx} className={`glass-subtle rounded-xl p-4 space-y-3 ${
                idx === 0 ? 'gradient-red' : idx === 1 ? 'gradient-peach' : 'gradient-amber'
              }`}>
                <div className="section-label">Pain Point {idx + 1}</div>
                <Field label="Description" hint='Capture verbatim "I wish..." statements'>
                  <textarea value={pp.description} onChange={e => updatePain(idx, 'description', e.target.value)} rows={2} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Category">
                    <select value={pp.category} onChange={e => updatePain(idx, 'category', e.target.value)} className="!rounded-full">
                      <option value="">Select...</option>
                      {PAIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Frequency">
                    <select value={pp.frequency} onChange={e => updatePain(idx, 'frequency', e.target.value)} className="!rounded-full">
                      <option value="">Select...</option>
                      {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="$ Impact">
                    <input value={pp.dollar_impact} onChange={e => updatePain(idx, 'dollar_impact', e.target.value)} placeholder="$400K/year" />
                  </Field>
                  <Field label="Who Feels It">
                    <input value={pp.who_feels} onChange={e => updatePain(idx, 'who_feels', e.target.value)} placeholder="Finance team" />
                  </Field>
                </div>
                <Field label="Current Solution">
                  <input value={pp.current_solution} onChange={e => updatePain(idx, 'current_solution', e.target.value)} placeholder="Manual spreadsheet, write-offs..." />
                </Field>
              </div>
            ))}
            <InternalNotes value={form.internal_notes_pain} onChange={v => update('internal_notes_pain', v)} />
          </Section>

          <Section title="Solution Landscape" id="solution" glyph="△">
            <Field label="Tools Evaluated / Tried">
              <textarea value={form.tools_evaluated} onChange={e => update('tools_evaluated', e.target.value)} rows={2} placeholder="Tried X but stopped because..." />
            </Field>
            <Field label="Why Failed">
              <textarea value={form.why_failed} onChange={e => update('why_failed', e.target.value)} rows={2} placeholder="Too expensive, didn't integrate with..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Current Spend">
                <input value={form.current_spend} onChange={e => update('current_spend', e.target.value)} placeholder="$50K/year on..." />
              </Field>
              <Field label="Budget Authority">
                <input value={form.budget_authority} onChange={e => update('budget_authority', e.target.value)} placeholder="VP level, $100K discretionary" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Willingness to Pay">
                <input value={form.willingness_to_pay} onChange={e => update('willingness_to_pay', e.target.value)} placeholder="Would pay $X/month if..." />
              </Field>
              <Field label="Integration Requirements">
                <input value={form.integration_reqs} onChange={e => update('integration_reqs', e.target.value)} placeholder="Must work with SAP, ..." />
              </Field>
            </div>
            <InternalNotes value={form.internal_notes_solution} onChange={v => update('internal_notes_solution', v)} />
          </Section>

          <Section title="Key Quotes & Observations" id="quotes" glyph="◇">
            <Field label="Verbatim Quotes">
              <textarea value={form.verbatim_quotes} onChange={e => update('verbatim_quotes', e.target.value)} rows={1} className="resize-none" placeholder='"We spend 20 hours a week just reconciling..."' />
            </Field>
            <Field label="Workflow Observations">
              <textarea value={form.observations} onChange={e => update('observations', e.target.value)} rows={2} placeholder="Noticed they had 3 Excel files open simultaneously..." />
            </Field>
            <Field label="Surprises">
              <textarea value={form.surprises} onChange={e => update('surprises', e.target.value)} rows={2} placeholder="Didn't expect them to already have a data team..." />
            </Field>
            <Field label="Follow-up Actions">
              <textarea value={form.follow_ups} onChange={e => update('follow_ups', e.target.value)} rows={2} placeholder="Send case study, intro to their finance lead..." />
            </Field>
            <InternalNotes value={form.internal_notes_quotes} onChange={v => update('internal_notes_quotes', v)} />
          </Section>

          <Section title="Quick Assessment" id="assessment" glyph="⬡">
            <Field label={`Intelligence vs. Judgement: ${form.intel_vs_judgement}% Intelligence`}>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-tertiary">Judgement</span>
                <input type="range" min="0" max="100" value={form.intel_vs_judgement}
                  onChange={e => update('intel_vs_judgement', parseInt(e.target.value))}
                  className="flex-1" />
                <span className="text-xs text-text-tertiary">Intelligence</span>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Outsourced vs. Insourced">
                <select value={form.outsourced_vs_insourced} onChange={e => update('outsourced_vs_insourced', e.target.value)} className="!rounded-full">
                  <option value="">Select...</option>
                  {OUTSOURCED_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Autopilot vs. Copilot">
                <select value={form.autopilot_vs_copilot} onChange={e => update('autopilot_vs_copilot', e.target.value)} className="!rounded-full">
                  <option value="">Select...</option>
                  {AUTOPILOT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Biggest Opportunity Signal">
              <textarea value={form.biggest_signal} onChange={e => update('biggest_signal', e.target.value)} rows={2} placeholder="The clearest signal from this interview..." />
            </Field>
            <DotSelector label="Confidence" value={form.confidence} onChange={v => update('confidence', v)} />
            <InternalNotes value={form.internal_notes_assessment} onChange={v => update('internal_notes_assessment', v)} />
          </Section>

          <div id="notes" className="glass rounded-2xl p-5 scroll-mt-24">
            <Field label="Additional Notes">
              <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={1} className="resize-none" placeholder="Anything else worth capturing..." />
            </Field>
          </div>

          {/* Attachments */}
          {!isNew && (
            <section id="attachments" className="space-y-3 scroll-mt-24">
              <h2 className="text-sm font-semibold text-text flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold glyph">▸</span>
                Attachments
              </h2>
              <div className="glass rounded-2xl p-5 space-y-3">
                <input ref={attachInputRef} type="file" className="hidden" accept="*/*" onChange={handleFileUpload} />
                <button type="button" onClick={() => attachInputRef.current?.click()} disabled={uploadingFile}
                  className="w-full py-3 border-2 border-dashed border-[rgba(0,0,0,0.08)] rounded-xl text-text-secondary hover:border-accent hover:text-accent transition-all text-sm font-medium">
                  {uploadingFile ? 'Uploading...' : 'Click to attach a file'}
                </button>
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map(a => (
                      <div key={a.id} className="flex items-center gap-3 glass-subtle rounded-xl px-3 py-2">
                        <span className="glyph text-text-tertiary">
                          {a.file_type?.startsWith('image') ? '◈' :
                           a.file_type?.startsWith('video') ? '▸' :
                           a.file_type?.startsWith('audio') ? '◎' : '◇'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <a href={a.file_url} target="_blank" rel="noopener"
                            className="text-sm text-text font-medium hover:text-accent transition truncate block">
                            {a.file_name}
                          </a>
                          {a.summary && <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{a.summary}</p>}
                        </div>
                        <span className="text-xs text-text-tertiary">{a.file_size ? `${Math.round(a.file_size / 1024)}KB` : ''}</span>
                        <button type="button" onClick={() => handleDeleteAttachment(a.id)}
                          className="text-xs text-red-500 hover:text-red-700 transition">Delete</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <button type="submit" disabled={saving}
            className="w-full py-3.5 bg-accent text-white font-semibold rounded-full hover:bg-accent-light transition-all active:scale-[0.97] disabled:opacity-40 shadow-sm sticky bottom-20 md:bottom-4">
            {saving ? 'Saving...' : isNew ? 'Save Interview' : 'Update Interview'}
          </button>
        </form>
      </div>
    </div>
  )
}
