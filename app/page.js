'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getInterviews, getNews, getTasks, getContextText } from '@/lib/api'
import { scoreColor, timeAgo, PAIN_CATEGORIES } from '@/lib/constants'
import Countdown from '@/components/Countdown'

const ScatterChart = dynamic(() => import('recharts').then(m => m.ScatterChart), { ssr: false })
const Scatter = dynamic(() => import('recharts').then(m => m.Scatter), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })

const CATEGORY_COLORS = {
  'Overhead Savings': '#3b82f6',
  'Revenue Adder': '#22c55e',
  'Risk Reduction': '#ef4444',
  'Speed/Efficiency': '#f59e0b',
}

const FREQ_MAP = { Daily: 5, Weekly: 4, Monthly: 3, Quarterly: 2, Annually: 1, 'Ad-hoc': 1 }

function parseDollar(str) {
  if (!str) return 0
  const cleaned = str.replace(/[^0-9.KkMmBb]/g, '')
  let num = parseFloat(cleaned) || 0
  if (/[Kk]/.test(str)) num *= 1000
  if (/[Mm]/.test(str)) num *= 1000000
  if (/[Bb]/.test(str)) num *= 1000000000
  return num
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const NEWS_CATEGORY_COLORS = {
  Industry: 'bg-blue-50 text-blue-600 border-blue-200',
  Retail: 'bg-green-50 text-green-700 border-green-200',
  CPG: 'bg-orange-50 text-orange-600 border-orange-200',
  AI: 'bg-purple-50 text-purple-600 border-purple-200',
}

const NAV_ITEMS = [
  { label: 'New Interview', href: '/interviews/new', icon: '◇' },
  { label: 'AI Hub', href: 'https://dropclaw.vercel.app', icon: '⬡', external: true },
  { label: 'Recoup', href: '/', icon: '△' },
  { label: 'Feed', href: '/feed', icon: '◈' },
  { label: 'Tasks', href: '/tasks', icon: '▸' },
  { label: 'Meetings', href: '/meetings', icon: '◎' },
]

export default function Dashboard() {
  const [interviews, setInterviews] = useState([])
  const [news, setNews] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([
      getInterviews().then(r => setInterviews(r.data || [])),
      getNews().then(r => setNews(r.data || [])).catch(() => {}),
      getTasks().then(r => setTasks(r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const totalPainPoints = interviews.reduce((sum, i) => {
    const pp = Array.isArray(i.pain_points) ? i.pain_points : []
    return sum + pp.length
  }, 0)

  const avgScore = interviews.length
    ? Math.round(interviews.reduce((s, i) => s + (i.score_total || 0), 0) / interviews.length)
    : 0

  const openTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'completed').length

  const upcoming = interviews
    .filter(i => i.status === 'scheduled' || i.status === 'in_progress')
    .sort((a, b) => new Date(a.scheduled_at || a.date) - new Date(b.scheduled_at || b.date))
    .slice(0, 4)

  const recentCompleted = interviews
    .filter(i => i.status !== 'scheduled' && i.status !== 'in_progress')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4)

  // Pain point scatter data
  const scatterData = useMemo(() => {
    const points = []
    interviews.forEach(interview => {
      const pp = Array.isArray(interview.pain_points) ? interview.pain_points : []
      pp.forEach(p => {
        const freq = FREQ_MAP[p.frequency] || 1
        const dollar = parseDollar(p.dollar_impact)
        if (dollar > 0 || freq > 1) {
          points.push({
            x: freq,
            y: dollar,
            category: p.category || 'Overhead Savings',
            description: p.description || '',
            company: interview.company || 'Unknown',
          })
        }
      })
    })
    return points
  }, [interviews])

  const scatterByCategory = useMemo(() => {
    const grouped = {}
    PAIN_CATEGORIES.forEach(cat => { grouped[cat] = [] })
    scatterData.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = []
      grouped[p.category].push(p)
    })
    return grouped
  }, [scatterData])

  async function handleExport() {
    const text = await getContextText()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="text-text-tertiary text-center py-20">Loading...</div>

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="space-y-8">
      {/* 1. Greeting Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">{getGreeting()}, Wes</h1>
          <p className="text-sm text-text-tertiary mt-0.5">{todayStr}</p>
        </div>
        <button onClick={handleExport}
          className="text-sm px-5 py-2.5 bg-accent text-white rounded-full hover:bg-accent-light transition-all active:scale-[0.97] font-medium shadow-sm">
          {copied ? 'Copied!' : 'Export for Synthesis'}
        </button>
      </div>

      {/* 2. Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Interviews', value: interviews.length, glyph: '◇' },
          { label: 'Pain Points', value: totalPainPoints, glyph: '◆' },
          { label: 'Open Tasks', value: openTasks, glyph: '▸' },
          { label: 'Avg Score', value: `${avgScore}/30`, colorClass: scoreColor(avgScore), glyph: '⬡' },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-4 card-lift">
            <div className="flex items-center gap-1.5">
              <span className="text-text-tertiary text-xs">{s.glyph}</span>
              <span className="section-label">{s.label}</span>
            </div>
            <div className={`text-[28px] font-extrabold mt-1 tracking-tight ${s.colorClass || 'text-text'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 3. Interviews Panel */}
      {(upcoming.length > 0 || recentCompleted.length > 0) && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-label">Interviews</h2>
            <Link href="/interviews" className="text-xs text-accent hover:underline font-medium">View all →</Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Upcoming */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Upcoming</h3>
              {upcoming.length === 0 ? (
                <p className="text-text-tertiary text-xs py-4">No upcoming interviews</p>
              ) : upcoming.map(i => (
                <div key={i.id} className="glass rounded-2xl p-3.5 gradient-blue card-lift">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${i.interviewer === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                      {i.interviewer?.[0]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/interviews/${i.id}`} className="font-semibold text-text text-sm hover:underline">{i.interviewee_name || 'TBD'}</Link>
                        {i.company && <span className="text-text-secondary text-xs">{i.company}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {i.status === 'in_progress' ? (
                          <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full animate-pulse">In Progress</span>
                        ) : (
                          i.scheduled_at && <Countdown scheduledAt={i.scheduled_at} />
                        )}
                      </div>
                    </div>
                    {i.meet_link && (
                      <a href={i.meet_link} target="_blank" rel="noopener"
                        className="text-xs px-3 py-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition font-semibold shadow-sm shrink-0">
                        Join Meet
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Completed */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Recent</h3>
              {recentCompleted.length === 0 ? (
                <p className="text-text-tertiary text-xs py-4">No completed interviews yet</p>
              ) : recentCompleted.map(i => (
                <Link key={i.id} href={`/interviews/${i.id}`}
                  className="block glass rounded-2xl p-3.5 card-lift">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${i.interviewer === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                      {i.interviewer?.[0]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text text-sm">{i.company || 'Unnamed'}</span>
                        <span className="text-text-secondary text-xs">{i.interviewee_name}</span>
                      </div>
                      <span className="text-text-tertiary text-xs">{timeAgo(i.date)}</span>
                    </div>
                    <span className={`text-lg font-extrabold shrink-0 ${scoreColor(i.score_total || 0)}`}>
                      {i.score_total || 0}<span className="text-text-tertiary text-xs font-normal">/30</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Pain Point Landscape */}
      <section>
        <h2 className="section-label mb-3">Pain Point Landscape</h2>
        {scatterData.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-3 mb-3">
              {PAIN_CATEGORIES.map(cat => (
                <div key={cat} className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                  {cat}
                </div>
              ))}
            </div>
            <div className="glass rounded-2xl p-4">
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                  <XAxis type="number" dataKey="x" name="Frequency" domain={[0, 6]}
                    tickFormatter={v => ['', 'Annually', 'Quarterly', 'Monthly', 'Weekly', 'Daily'][v] || ''}
                    tick={{ fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" name="Dollar Impact"
                    tickFormatter={v => v >= 1000000 ? `$${(v / 1000000).toFixed(0)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
                    tick={{ fontSize: 11 }} />
                  <Tooltip content={({ payload }) => {
                    if (!payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs max-w-[220px]">
                        <p className="font-semibold text-text">{d.company}</p>
                        <p className="text-text-secondary mt-1 line-clamp-2">{d.description}</p>
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-white" style={{ backgroundColor: CATEGORY_COLORS[d.category] }}>
                          {d.category}
                        </span>
                      </div>
                    )
                  }} />
                  {PAIN_CATEGORIES.map(cat => (
                    scatterByCategory[cat]?.length > 0 && (
                      <Scatter key={cat} name={cat} data={scatterByCategory[cat]} fill={CATEGORY_COLORS[cat]} opacity={0.8} />
                    )
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-text-tertiary text-sm">No pain point data yet. Complete interviews to populate the landscape.</p>
          </div>
        )}
      </section>

      {/* 5. News + AI Headlines */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-label">Industry News</h2>
          <Link href="/news" className="text-xs text-accent hover:underline font-medium">View all →</Link>
        </div>
        {news.length > 0 ? (
          <div className="space-y-2">
            {news.slice(0, 5).map((article, i) => (
              <a key={i} href={article.link} target="_blank" rel="noopener"
                className="block glass rounded-2xl p-3.5 card-lift">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text text-sm line-clamp-1">{article.title}</h3>
                    <p className="text-text-secondary text-xs mt-0.5 line-clamp-1">{article.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${NEWS_CATEGORY_COLORS[article.category] || 'bg-card-hover text-text-tertiary border-border'}`}>
                      {article.source}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-text-tertiary text-sm">No news available.</p>
          </div>
        )}
      </section>

      {/* 6. Quick Nav Tools */}
      <section>
        <h2 className="section-label mb-3">Quick Nav</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {NAV_ITEMS.map(item => {
            const inner = (
              <div className="glass rounded-2xl p-4 text-center card-lift cursor-pointer">
                <div className="text-xl mb-1.5 text-text-secondary">{item.icon}</div>
                <div className="text-xs font-medium text-text">{item.label}</div>
              </div>
            )
            return item.external ? (
              <a key={item.label} href={item.href} target="_blank" rel="noopener">{inner}</a>
            ) : (
              <Link key={item.label} href={item.href}>{inner}</Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
