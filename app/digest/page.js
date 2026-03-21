'use client'

import { useState, useEffect } from 'react'
import { getDigests, generateDigest } from '@/lib/api'
import { timeAgo } from '@/lib/constants'

export default function DigestPage() {
  const [digests, setDigests] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [author, setAuthor] = useState('Wes')
  const [since, setSince] = useState('')

  useEffect(() => {
    getDigests(10).then(r => setDigests(r.data || [])).finally(() => setLoading(false))
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      await generateDigest(author, sinceDate)
      const r = await getDigests(10)
      setDigests(r.data || [])
    } finally { setGenerating(false) }
  }

  if (loading) return <div className="text-text-tertiary text-center py-20">Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text">Digest</h1>

      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            {['Wes', 'Gibb'].map(a => (
              <button key={a} type="button" onClick={() => setAuthor(a)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-[0.97] ${
                  author === a
                    ? (a === 'Wes' ? 'bg-wes text-white' : 'bg-gibb text-white')
                    : 'bg-transparent border border-border text-text-secondary'
                }`}>{a}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>Since:</span>
            <input type="datetime-local" value={since} onChange={e => setSince(e.target.value)}
              className="!w-auto text-xs" />
          </div>
          <button onClick={handleGenerate} disabled={generating}
            className="ml-auto px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all active:scale-[0.97] disabled:opacity-40 shadow-sm">
            {generating ? 'Generating...' : 'Generate New Digest'}
          </button>
        </div>
        <p className="text-xs text-text-tertiary">AI summary of all activity since the selected time (defaults to last 24h).</p>
      </div>

      <div className="space-y-4">
        {digests.map((d, idx) => (
          <div key={d.id} className={`glass rounded-2xl p-5 ${idx === 0 ? 'bg-blue-50/50 border-blue-200' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${
                d.trigger_type === 'auto' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>{d.trigger_type === 'auto' ? 'Auto' : 'On-demand'}</span>
              {d.requested_by && <span className="text-xs text-text-tertiary">by {d.requested_by}</span>}
              <span className="text-xs text-text-tertiary ml-auto">{timeAgo(d.created_at)}</span>
            </div>
            <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{d.summary}</div>
          </div>
        ))}
        {digests.length === 0 && (
          <p className="text-text-tertiary text-center py-10">No digests yet. Generate one or push data to trigger auto-digests.</p>
        )}
      </div>
    </div>
  )
}
