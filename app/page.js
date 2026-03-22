'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getInterviews, getNews, getTasks, getContextText, getOpportunityAnalysis } from '@/lib/api'
import { timeAgo, PAIN_CATEGORIES } from '@/lib/constants'

function getOpportunityScore(i) {
  const pains = Array.isArray(i.pain_points) ? i.pain_points.filter(p => p.description?.trim()) : []
  return Math.min(10, pains.length * 2 + (pains.some(p => p.dollar_impact?.trim()) ? 2 : 0) + (i.biggest_signal?.trim() ? 2 : 0) + (i.willingness_to_pay?.trim() ? 2 : 0) + Math.round((i.confidence || 0) / 2))
}

function oppColor(score) {
  if (score >= 7) return 'text-score-green'
  if (score >= 4) return 'text-score-orange'
  return 'text-score-red'
}
import Countdown from '@/components/Countdown'

const CATEGORY_COLORS = {
  'Overhead Savings': '#3b82f6',
  'Revenue Adder': '#22c55e',
  'Risk Reduction': '#ef4444',
  'Speed/Efficiency': '#f59e0b',
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
  const [analysis, setAnalysis] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisExpanded, setAnalysisExpanded] = useState(false)

  useEffect(() => {
    Promise.all([
      getInterviews().then(r => setInterviews(r.data || [])),
      getNews().then(r => setNews(r.data || [])).catch(() => {}),
      getTasks().then(r => setTasks(r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  async function loadAnalysis() {
    setAnalysisLoading(true)
    try {
      const res = await getOpportunityAnalysis()
      if (res.success) setAnalysis(res.analysis)
    } catch (e) { console.error('Analysis failed:', e) }
    finally { setAnalysisLoading(false) }
  }

  const totalPainPoints = interviews.reduce((sum, i) => {
    const pp = Array.isArray(i.pain_points) ? i.pain_points : []
    return sum + pp.length
  }, 0)

  const avgScore = interviews.length
    ? Math.round(interviews.reduce((s, i) => s + getOpportunityScore(i), 0) / interviews.length * 10) / 10
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
          { label: 'Interviews', value: interviews.length, glyph: '◇', grad: 'gradient-bg-blue', border: 'gradient-blue' },
          { label: 'Pain Points', value: totalPainPoints, glyph: '◆', grad: 'gradient-bg-red', border: 'gradient-red' },
          { label: 'Open Tasks', value: openTasks, glyph: '▸', grad: 'gradient-bg-amber', border: 'gradient-amber' },
          { label: 'Avg Opp', value: `${avgScore}/10`, colorClass: oppColor(avgScore), glyph: '⬡', grad: 'gradient-bg-green', border: 'gradient-green' },
        ].map((s, i) => (
          <div key={s.label} className={`glass rounded-2xl p-4 card-lift ${s.grad} ${s.border} animate-in animate-in-${i + 1}`}>
            <div className="flex items-center gap-1.5">
              <span className="glyph text-text-tertiary text-sm glyph-float" style={{ animationDelay: `${i * 200}ms` }}>{s.glyph}</span>
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
              ) : recentCompleted.map(i => {
                const score = getOpportunityScore(i)
                const painCount = Array.isArray(i.pain_points) ? i.pain_points.filter(p => p.description?.trim()).length : 0
                return (
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-text-tertiary text-xs">{timeAgo(i.date)}</span>
                        {painCount > 0 && <span className="tag tag-red text-[8px]">{painCount} pain{painCount !== 1 ? 's' : ''}</span>}
                        {i.biggest_signal && <span className="tag tag-green text-[8px]">signal</span>}
                      </div>
                    </div>
                    <span className={`text-lg font-extrabold shrink-0 ${oppColor(score)}`}>
                      {score}<span className="text-text-tertiary text-xs font-normal">/10</span>
                    </span>
                  </div>
                </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. Opportunity Analysis */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-label flex items-center gap-1.5">
            <span className="glyph glyph-float">⬡</span> Opportunity Analysis
          </h2>
          <button onClick={loadAnalysis} disabled={analysisLoading}
            className="text-xs px-3 py-1.5 rounded-full glass-subtle font-medium text-text-secondary hover:text-text transition-colors duration-200 border border-[rgba(0,0,0,0.08)] disabled:opacity-40">
            {analysisLoading ? 'Analyzing...' : analysis ? 'Refresh' : 'Generate'}
          </button>
        </div>
        <div className="glass rounded-2xl gradient-bg-purple gradient-purple">
          {analysisLoading ? (
            <div className="p-8 text-center">
              <div className="glyph glyph-pulse text-2xl text-text-tertiary mb-2">⬡</div>
              <p className="text-sm text-text-tertiary">Analyzing {interviews.length} interviews and research data...</p>
            </div>
          ) : analysis ? (
            <div className="p-5">
              <button type="button" onClick={() => setAnalysisExpanded(!analysisExpanded)}
                className="w-full flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text">Claude Analysis</span>
                <span className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text transition-colors duration-200">
                  {analysisExpanded ? 'Collapse' : 'Expand'}
                  <span className={`text-lg transition-transform duration-200 ${analysisExpanded ? 'rotate-180' : ''}`}>&#x25BE;</span>
                </span>
              </button>
              {!analysisExpanded ? (
                <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 whitespace-pre-wrap">{analysis.split('\n')[0]}</p>
              ) : (
                <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap animate-in">{analysis}</div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="glyph text-2xl text-text-tertiary mb-2">⬡</div>
              <p className="text-sm text-text-tertiary">Generate an AI-powered opportunity analysis based on your interviews and research.</p>
            </div>
          )}
        </div>
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
                <div className="glyph glyph-spin-hover text-xl mb-1.5 text-text-secondary">{item.icon}</div>
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
