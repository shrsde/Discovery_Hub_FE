'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSyncs, getInterviews, saveSync } from '@/lib/api'
import { SYNC_TYPES, SYNC_STATUSES, getSyncType, timeAgo } from '@/lib/constants'

export default function SyncDetailPage({ params }) {
  const { id } = params
  const router = useRouter()
  const isNew = id === 'new'
  const [sync, setSync] = useState(null)
  const [allSyncs, setAllSyncs] = useState([])
  const [interviews, setInterviews] = useState([])
  const [editing, setEditing] = useState(isNew)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)

  const [form, setForm] = useState({
    author: 'Wes', type: 'synthesis', status: 'Active', title: '',
    key_takeaways: '', content: '', implications: '', next_steps: '',
    linked_interview_ids: [], linked_sync_ids: [],
  })

  useEffect(() => {
    const load = async () => {
      const [syncRes, intRes] = await Promise.all([getSyncs(), getInterviews()])
      const syncs = syncRes.data || []
      setAllSyncs(syncs)
      setInterviews(intRes.data || [])
      if (!isNew) {
        const found = syncs.find(s => s.id === id)
        if (found) {
          setSync(found)
          setForm({
            author: found.author || 'Wes', type: found.type || 'synthesis',
            status: found.status || 'Active', title: found.title || '',
            key_takeaways: found.key_takeaways || '', content: found.content || '',
            implications: found.implications || '', next_steps: found.next_steps || '',
            linked_interview_ids: found.linked_interview_ids || [],
            linked_sync_ids: found.linked_sync_ids || [],
          })
        }
      }
      setLoading(false)
    }
    load()
  }, [id, isNew])

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = { ...form }
      if (!isNew) payload.id = id
      await saveSync(payload)
      router.push('/sync')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="text-text-tertiary text-center py-20">Loading...</div>
  if (!isNew && !sync) return <div className="text-text-tertiary text-center py-20">Sync not found</div>

  if (!editing && sync) {
    const st = getSyncType(sync.type)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/sync')} className="text-text-secondary text-sm hover:text-text transition">&larr; Back</button>
          <button onClick={() => setEditing(true)}
            className="text-sm px-5 py-2 bg-accent text-white rounded-full hover:bg-accent-light transition-all active:scale-[0.97] font-medium">
            Edit
          </button>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{st.icon}</span>
            <span className="text-[11px] text-text-tertiary uppercase font-semibold tracking-wider">{st.label}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ml-1 ${
              sync.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}>{sync.status}</span>
          </div>
          <h1 className="text-xl font-semibold text-text">{sync.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${sync.author === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
              {sync.author?.[0]}
            </span>
            <span className="text-text-secondary text-sm">{sync.author}</span>
            <span className="text-text-tertiary text-xs">{timeAgo(sync.created_at)}</span>
          </div>
        </div>

        {sync.key_takeaways && (
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-2">Key Takeaways</h3>
            <p className="text-sm text-text whitespace-pre-wrap">{sync.key_takeaways}</p>
          </section>
        )}

        {sync.content && (
          <section>
            <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Full Content</h3>
            <div className="bg-card border border-border rounded-lg p-4 text-sm text-text-secondary whitespace-pre-wrap shadow-sm">{sync.content}</div>
          </section>
        )}

        {sync.implications && (
          <section>
            <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Implications / So What</h3>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{sync.implications}</p>
          </section>
        )}

        {sync.next_steps && (
          <section>
            <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Next Steps</h3>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{sync.next_steps}</p>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => isNew ? router.push('/sync') : setEditing(false)} className="text-text-secondary text-sm hover:text-text transition">&larr; {isNew ? 'Back' : 'Cancel'}</button>
        <h1 className="text-xl font-semibold text-text">{isNew ? 'New Sync' : 'Edit Sync'}</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="flex gap-2">
          {['Wes', 'Gibb'].map(a => (
            <button key={a} type="button" onClick={() => update('author', a)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-[0.97] ${
                form.author === a
                  ? (a === 'Wes' ? 'bg-wes text-white' : 'bg-gibb text-white')
                  : 'bg-transparent border border-border text-text-secondary'
              }`}>{a}</button>
          ))}
        </div>

        <div>
          <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-2">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {SYNC_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => update('type', t.value)}
                className={`p-3 rounded-lg border text-center text-sm transition-all ${
                  form.type === t.value
                    ? 'bg-accent text-white border-accent shadow-sm'
                    : 'bg-card border-border text-text-secondary hover:bg-card-hover'
                }`}>
                <div className="text-lg">{t.icon}</div>
                <div className="text-xs mt-1 font-medium">{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Status</label>
          <select value={form.status} onChange={e => update('status', e.target.value)} className="!rounded-full">
            {SYNC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Title</label>
          <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Interviews 1-3: Deductions pattern emerging" />
        </div>

        <div>
          <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Key Takeaways</label>
          <textarea value={form.key_takeaways} onChange={e => update('key_takeaways', e.target.value)} rows={3} placeholder="The most important points..." />
        </div>

        <div>
          <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Full Content</label>
          <textarea value={form.content} onChange={e => update('content', e.target.value)} rows={10} placeholder="Paste Claude output or write full analysis..." />
        </div>

        <div>
          <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Implications / So What</label>
          <textarea value={form.implications} onChange={e => update('implications', e.target.value)} rows={3} placeholder="What does this mean for our direction?" />
        </div>

        <div>
          <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Next Steps</label>
          <textarea value={form.next_steps} onChange={e => update('next_steps', e.target.value)} rows={3} placeholder="Gibb: ..., Wes: ..." />
        </div>

        {interviews.length > 0 && (
          <div>
            <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-2">Link Interviews</label>
            <div className="space-y-1.5">
              {interviews.map(i => (
                <label key={i.id} className="flex items-center gap-2.5 text-sm text-text-secondary cursor-pointer hover:text-text transition">
                  <input type="checkbox" className="!w-4 !p-0 !rounded-sm accent-accent"
                    checked={form.linked_interview_ids.includes(i.id)}
                    onChange={e => {
                      if (e.target.checked) update('linked_interview_ids', [...form.linked_interview_ids, i.id])
                      else update('linked_interview_ids', form.linked_interview_ids.filter(x => x !== i.id))
                    }} />
                  {i.company} — {i.interviewee_name}
                </label>
              ))}
            </div>
          </div>
        )}

        <button type="submit" disabled={saving || !form.title.trim()}
          className="w-full py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-light transition-all active:scale-[0.97] disabled:opacity-40 shadow-sm">
          {saving ? 'Saving...' : isNew ? 'Create Sync' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
