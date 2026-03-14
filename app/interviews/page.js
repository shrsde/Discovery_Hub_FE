'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getInterviews } from '@/lib/api'
import { scoreColor, timeAgo } from '@/lib/constants'

export default function InterviewsListPage() {
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInterviews().then(r => setInterviews(r.data || [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-text-tertiary text-center py-20">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Interviews</h1>
        <Link href="/interviews/new"
          className="text-sm px-5 py-2.5 bg-accent text-white rounded-full hover:bg-accent-light transition-all active:scale-[0.97] font-semibold shadow-sm">
          + New Interview
        </Link>
      </div>

      <div className="space-y-2">
        {interviews.map(i => {
          const painCount = Array.isArray(i.pain_points) ? i.pain_points.length : 0
          return (
            <Link key={i.id} href={`/interviews/${i.id}`}
              className="block bg-card border border-border rounded-lg p-4 hover:shadow hover:-translate-y-px transition-all">
              <div className="flex items-center gap-3">
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
              </div>
            </Link>
          )
        })}
        {interviews.length === 0 && (
          <p className="text-text-tertiary text-center py-10">No interviews yet. Start capturing discovery conversations.</p>
        )}
      </div>
    </div>
  )
}
