'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getInterview, saveInterview, importTranscript, getAttachments, uploadAttachment, deleteAttachment, transcribeAudio } from '@/lib/api'
import { CHANNELS, PAIN_CATEGORIES, FREQUENCIES, OUTSOURCED_OPTIONS, AUTOPILOT_OPTIONS, SCORE_DIMENSIONS, scoreColor } from '@/lib/constants'

function DotSelector({ value, max = 5, onChange, label }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-full border text-xs font-bold transition-all active:scale-[0.93] ${
              n <= value ? 'bg-accent border-accent text-white' : 'bg-card border-border text-text-tertiary hover:border-text-tertiary'
            }`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function Section({ title, number, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-text flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">{number}</span>
        {title}
      </h2>
      <div className="bg-card border border-border rounded-lg p-5 space-y-4 shadow-sm">
        {children}
      </div>
    </section>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">{label}</label>
      {hint && <p className="text-[11px] text-text-tertiary mb-1">{hint}</p>}
      {children}
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
  const attachInputRef = useRef(null)
  const audioInputRef = useRef(null)

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    interviewer: 'Gibb',
    interviewee_name: '', company: '', role: '', department: '',
    company_size: '', connection_source: '', channels: [], distributors: '',
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
  })

  useEffect(() => {
    if (!isNew) {
      getInterview(id).then(data => {
        if (data) {
          const pp = Array.isArray(data.pain_points) ? data.pain_points : []
          while (pp.length < 3) pp.push({ ...EMPTY_PAIN })
          setForm(f => ({ ...f, ...data, pain_points: pp }))
        }
        setLoading(false)
      })
      getAttachments(id).then(r => setAttachments(r.data || [])).catch(() => {})
    }
  }, [id, isNew])

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      await uploadAttachment(file, id, form.interviewer || 'Wes')
      const r = await getAttachments(id)
      setAttachments(r.data || [])
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally { setUploadingFile(false) }
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
  const toggleChannel = (ch) => {
    const channels = form.channels.includes(ch)
      ? form.channels.filter(c => c !== ch)
      : [...form.channels, ch]
    update('channels', channels)
  }

  const scoreTotal = SCORE_DIMENSIONS.reduce((s, d) => s + (form[d.key] || 0), 0)

  async function handleAudioUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setTranscribing(true)
    try {
      const res = await transcribeAudio(file)
      if (res.success && res.transcript) {
        setTranscript(res.transcript)
      }
    } catch (err) {
      alert('Transcription failed: ' + err.message)
    } finally { setTranscribing(false) }
  }

  async function handleImport() {
    if (!transcript.trim()) return
    setImporting(true)
    try {
      const res = await importTranscript(transcript.trim(), importInterviewer)
      if (res.success && res.data) {
        const imported = res.data
        // Merge imported data into form, keeping defaults for missing fields
        const pp = Array.isArray(imported.pain_points) ? imported.pain_points : []
        while (pp.length < 3) pp.push({ ...EMPTY_PAIN })
        setForm(f => ({
          ...f,
          ...Object.fromEntries(
            Object.entries(imported).filter(([_, v]) => v !== null && v !== undefined)
          ),
          pain_points: pp,
          date: f.date, // keep today's date
          interviewer: imported.interviewer || importInterviewer,
        }))
        setShowImport(false)
        setTranscript('')
      }
    } catch (err) {
      alert('Import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, pain_points: form.pain_points.filter(p => p.description.trim()) }
      if (!isNew) payload.id = id
      await saveInterview(payload)
      router.push('/interviews')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="text-text-tertiary text-center py-20">Loading...</div>

  const painColors = [
    'border-red-200 bg-red-50',
    'border-orange-200 bg-orange-50',
    'border-amber-200 bg-amber-50',
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/interviews')} className="text-text-secondary text-sm hover:text-text transition">&larr; Back</button>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Link href={`/interviews/${id}/flow`}
              className="text-xs px-4 py-2 bg-accent text-white rounded-full hover:bg-accent-light transition-all active:scale-[0.97] font-medium shadow-sm">
              View Workflow
            </Link>
          )}
          <h1 className="text-xl font-semibold text-text">{isNew ? 'New Interview' : 'Edit Interview'}</h1>
        </div>
      </div>

      {/* Import Transcript */}
      {isNew && !showImport && (
        <button onClick={() => setShowImport(true)}
          className="w-full py-4 bg-card border-2 border-dashed border-border rounded-lg text-text-secondary hover:border-accent hover:text-accent transition-all text-sm font-medium">
          Import from Recording or Transcript — upload audio/video or paste text
        </button>
      )}

      {showImport && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4 shadow-sm">
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
                    : 'bg-transparent border border-border text-text-secondary'
                }`}>{a}</button>
            ))}
          </div>

          {/* Audio/Video upload */}
          <div className="bg-card-hover border border-border rounded-lg p-4 space-y-2">
            <div className="text-xs font-semibold text-text">Upload Recording</div>
            <p className="text-[11px] text-text-tertiary">Upload an audio or video file — AI will transcribe it automatically, then extract interview data.</p>
            <input ref={audioInputRef} type="file" className="hidden"
              accept="audio/*,video/*,.mp3,.m4a,.wav,.mp4,.webm,.ogg" onChange={handleAudioUpload} />
            <button type="button" onClick={() => audioInputRef.current?.click()} disabled={transcribing}
              className="px-4 py-2 bg-card border border-border rounded-full text-sm font-medium text-text-secondary hover:bg-white hover:border-accent hover:text-accent transition-all disabled:opacity-40">
              {transcribing ? 'Transcribing audio...' : '🎙️ Choose audio/video file'}
            </button>
            {transcribing && (
              <p className="text-[11px] text-accent">Processing with Whisper — this may take a moment for longer recordings...</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-tertiary">or paste transcript</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
            rows={8} placeholder="Paste the full interview transcript here..."
            className="resize-none" />

          <button type="button" onClick={handleImport} disabled={importing || !transcript.trim()}
            className="w-full py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-light transition-all active:scale-[0.97] disabled:opacity-40 shadow-sm">
            {importing ? 'Analyzing transcript...' : 'Import & Fill Form'}
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        <Section title="Interview Details" number="1">
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
                        : 'bg-card-hover border border-border text-text-secondary'
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Size">
              <input value={form.company_size} onChange={e => update('company_size', e.target.value)} placeholder="$50M revenue, 120 employees" />
            </Field>
            <Field label="Connection Source">
              <input value={form.connection_source} onChange={e => update('connection_source', e.target.value)} placeholder="Kellogg network" />
            </Field>
          </div>
          <Field label="Channels">
            <div className="flex flex-wrap gap-1.5">
              {CHANNELS.map(ch => (
                <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${
                    form.channels.includes(ch) ? 'bg-accent text-white border-accent' : 'bg-card-hover border-border text-text-secondary hover:text-text'
                  }`}>{ch}</button>
              ))}
            </div>
          </Field>
          <Field label="Key Retailers / Distributors">
            <input value={form.distributors} onChange={e => update('distributors', e.target.value)} placeholder="UNFI, KeHE" />
          </Field>
        </Section>

        <Section title="Workflow Mapping" number="2">
          <Field label="Primary Workflow">
            <textarea value={form.workflow_steps} onChange={e => update('workflow_steps', e.target.value)} rows={3} placeholder="Describe their main workflow step by step..." />
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
        </Section>

        <Section title="Pain Points" number="3">
          {form.pain_points.map((pp, idx) => (
            <div key={idx} className={`border rounded-lg p-4 space-y-3 ${painColors[idx] || painColors[2]}`}>
              <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Pain Point {idx + 1}</div>
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
        </Section>

        <Section title="Solution Landscape" number="4">
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
        </Section>

        <Section title="Key Quotes & Observations" number="5">
          <Field label="Verbatim Quotes">
            <textarea value={form.verbatim_quotes} onChange={e => update('verbatim_quotes', e.target.value)} rows={3} placeholder='"We spend 20 hours a week just reconciling..."' />
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
        </Section>

        <Section title="Quick Assessment" number="6">
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
        </Section>

        <Section title="Opportunity Scoring" number="7">
          <div className="space-y-3">
            {SCORE_DIMENSIONS.map(d => (
              <DotSelector key={d.key} label={d.label} value={form[d.key]} onChange={v => update(d.key, v)} />
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-sm font-semibold text-text">Total Score</span>
            <span className={`text-3xl font-extrabold ${scoreColor(scoreTotal)}`}>
              {scoreTotal}<span className="text-sm text-text-tertiary font-normal">/30</span>
            </span>
          </div>
        </Section>

        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <Field label="Additional Notes">
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} placeholder="Anything else worth capturing..." />
          </Field>
        </div>

        {/* Attachments */}
        {!isNew && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">📎</span>
              Attachments
            </h2>
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
              <input ref={attachInputRef} type="file" className="hidden"
                accept="*/*" onChange={handleFileUpload} />
              <button type="button" onClick={() => attachInputRef.current?.click()} disabled={uploadingFile}
                className="w-full py-3 border-2 border-dashed border-border rounded-lg text-text-secondary hover:border-accent hover:text-accent transition-all text-sm font-medium">
                {uploadingFile ? 'Uploading...' : 'Click to attach a file (PDF, doc, image, audio, video)'}
              </button>
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map(a => (
                    <div key={a.id} className="flex items-center gap-3 bg-card-hover rounded-lg px-3 py-2">
                      <span className="text-sm">
                        {a.file_type?.startsWith('image') ? '🖼️' :
                         a.file_type?.startsWith('video') ? '🎥' :
                         a.file_type?.startsWith('audio') ? '🎙️' : '📄'}
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
  )
}
