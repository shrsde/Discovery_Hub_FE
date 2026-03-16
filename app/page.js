'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getInterviews, getFeed, getSyncs, getContextText } from '@/lib/api'
import { scoreColor, scoreBg, getFeedType, getSyncType, timeAgo, PAIN_CATEGORIES } from '@/lib/constants'

export default function Dashboard() {
  const [interviews, setInterviews] = useState([])
  const [feed, setFeed] = useState([])
  const [syncs, setSyncs] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([
      getInterviews().then(r => setInterviews(r.data || [])),
      getFeed().then(r => setFeed(r.data || [])),
      getSyncs().then(r => setSyncs(r.data || [])),
    ]).finally(() => setLoading(false))
  }, [])

  const totalPainPoints = interviews.reduce((sum, i) => {
    const pp = Array.isArray(i.pain_points) ? i.pain_points : []
    return sum + pp.length
  }, 0)

  const avgScore = interviews.length
    ? Math.round(interviews.reduce((s, i) => s + (i.score_total || 0), 0) / interviews.length)
    : 0

  const painByCategory = PAIN_CATEGORIES.map(cat => ({
    category: cat,
    count: interviews.reduce((sum, i) => {
      const pp = Array.isArray(i.pain_points) ? i.pain_points : []
      return sum + pp.filter(p => p.category === cat).length
    }, 0),
  }))

  const hypotheses = feed.filter(f => f.type === 'hypothesis')
  const questions = feed.filter(f => f.type === 'question')
  const actions = feed.filter(f => f.type === 'action')
  const activeSyncs = syncs.filter(s => s.status === 'Active')
  const ranked = [...interviews].sort((a, b) => (b.score_total || 0) - (a.score_total || 0))

  async function handleExport() {
    const text = await getContextText()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="text-text-tertiary text-center py-20">Loading...</div>

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Dashboard</h1>
        <button onClick={handleExport}
          className="text-sm px-5 py-2.5 bg-accent text-white rounded-full hover:bg-accent-light transition-all active:scale-[0.97] font-medium shadow-sm">
          {copied ? 'Copied!' : 'Export for Synthesis'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Interviews', value: interviews.length },
          { label: 'Pain Points', value: totalPainPoints },
          { label: 'Syncs', value: syncs.length },
          { label: 'Avg Score', value: `${avgScore}/30`, colorClass: scoreColor(avgScore) },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <div className="text-text-tertiary text-[11px] font-semibold uppercase tracking-wider">{s.label}</div>
            <div className={`text-[28px] font-extrabold mt-1 ${s.colorClass || 'text-text'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Opportunity Ranking */}
      {ranked.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Opportunity Ranking</h2>
          <div className="space-y-2">
            {ranked.map(i => (
              <Link key={i.id} href={`/interviews/${i.id}`}
                className={`block border rounded-lg p-3.5 transition-all hover:shadow hover:-translate-y-px ${scoreBg(i.score_total || 0)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${i.interviewer === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                      {i.interviewer?.[0]}
                    </span>
                    <div>
                      <span className="font-semibold text-text">{i.company || 'Unnamed'}</span>
                      <span className="text-text-secondary text-sm ml-2">{i.interviewee_name}</span>
                    </div>
                  </div>
                  <span className={`text-lg font-extrabold ${scoreColor(i.score_total || 0)}`}>
                    {i.score_total || 0}<span className="text-text-tertiary text-xs font-normal">/30</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest Sync */}
      {activeSyncs.length > 0 && (() => {
        const s = activeSyncs[0]
        const st = getSyncType(s.type)
        return (
          <section>
            <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Latest Sync</h2>
            <Link href={`/sync/${s.id}`}
              className="block bg-card border border-border rounded-lg p-3.5 hover:shadow hover:-translate-y-px transition-all">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{st.icon}</span>
                <span className="font-medium text-text text-sm flex-1">{s.title}</span>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${s.author === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                  {s.author?.[0]}
                </span>
              </div>
              {s.key_takeaways && (
                <p className="text-text-secondary text-xs mt-1.5 line-clamp-2 pl-8">{s.key_takeaways}</p>
              )}
            </Link>
            {activeSyncs.length > 1 && (
              <Link href="/sync" className="block text-center text-xs text-accent hover:underline mt-2 font-medium">
                View {activeSyncs.length - 1} more sync{activeSyncs.length > 2 ? 's' : ''} →
              </Link>
            )}
          </section>
        )
      })()}

      {/* Pain Distribution */}
      {totalPainPoints > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Pain Distribution</h2>
          <div className="grid grid-cols-2 gap-2">
            {painByCategory.map(p => (
              <div key={p.category} className="bg-card border border-border rounded-lg p-3.5 flex items-center justify-between shadow-sm">
                <span className="text-sm text-text-secondary">{p.category}</span>
                <span className="text-lg font-extrabold text-text">{p.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Hypotheses / Questions / Actions */}
      {[
        { title: 'Hypotheses', items: hypotheses, type: 'hypothesis' },
        { title: 'Open Questions', items: questions, type: 'question' },
        { title: 'Action Items', items: actions, type: 'action' },
      ].map(({ title, items, type }) => items.length > 0 && (
        <section key={type}>
          <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">
            {title} <span>({items.length})</span>
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            {items.slice(0, 6).map(item => {
              const ft = getFeedType(item.type)
              return (
                <div key={item.id} className={`border rounded-lg p-3 text-xs shrink-0 w-[200px] ${ft.color}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span>{ft.emoji}</span>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${item.author === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                      {item.author?.[0]}
                    </span>
                    <span className="text-[10px] text-text-tertiary ml-auto">{timeAgo(item.created_at)}</span>
                  </div>
                  <p className="text-text text-xs line-clamp-2">{item.text?.replace(/<[^>]*>/g, '')}</p>
                </div>
              )
            })}
          </div>
          <Link href={`/feed?type=${type}`} className="text-xs text-accent hover:underline font-medium mt-1 inline-block">
            View on Feed →
          </Link>
        </section>
      ))}

      {/* Recent Activity */}
      <section>
        <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Recent Activity</h2>
        <div className="space-y-2">
          {feed.slice(0, 10).map(item => {
            const ft = getFeedType(item.type)
            return (
              <div key={item.id} className="bg-card border border-border rounded-lg p-3.5 flex items-start gap-3 shadow-sm">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${item.author === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                  {item.author?.[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ft.color}`}>{ft.emoji} {ft.label}</span>
                    <span className="text-text-tertiary text-xs">{timeAgo(item.created_at)}</span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{item.text}</p>
                </div>
              </div>
            )
          })}
          {feed.length === 0 && <p className="text-text-tertiary text-sm">No activity yet. Post something in the Feed.</p>}
        </div>
      </section>
    </div>
  )
}
