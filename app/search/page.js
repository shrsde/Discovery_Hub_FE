'use client'

import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/constants'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [searching, setSearching] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setResult(null)
    try {
      const res = await api('/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: query.trim() }),
      })
      setResult(res)
    } catch (err) {
      setResult({ answer: `Search failed: ${err.message}`, sources: [] })
    } finally {
      setSearching(false)
    }
  }

  const sourceLink = (s) => {
    if (s.type === 'interview') return `/interviews/${s.id}`
    if (s.type === 'sync') return `/sync/${s.id}`
    return null
  }

  const sourceIcon = (type) => {
    if (type === 'interview') return '◇'
    if (type === 'sync') return '◆'
    return '◈'
  }

  const sourceBadge = (type) => {
    if (type === 'interview') return 'bg-blue-50 text-blue-600 border-blue-200'
    if (type === 'sync') return 'bg-purple-50 text-purple-600 border-purple-200'
    return 'bg-green-50 text-green-700 border-green-200'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-text">Search</h1>

      <form onSubmit={handleSearch}>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask anything — e.g. 'which interviews mentioned deductions?' or 'what are the top pain points?'"
            className="flex-1"
          />
          <button type="submit" disabled={searching || !query.trim()}
            className="px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-full hover:bg-accent-light transition-all active:scale-[0.97] disabled:opacity-40 shadow-sm shrink-0">
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {searching && (
        <div className="text-center py-10">
          <div className="text-text-tertiary text-sm">Searching across all interviews, feed posts, and syncs...</div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Answer */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3">Answer</div>
            <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">{result.answer}</div>
          </div>

          {/* Sources */}
          {result.sources && result.sources.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Sources</div>
              <div className="space-y-2">
                {result.sources.map((s, i) => {
                  const link = sourceLink(s)
                  const Wrapper = link ? Link : 'div'
                  const wrapperProps = link ? { href: link } : {}
                  return (
                    <Wrapper key={i} {...wrapperProps}
                      className={`block bg-card border border-border rounded-lg p-3.5 shadow-sm ${link ? 'hover:shadow hover:-translate-y-px transition-all cursor-pointer' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{sourceIcon(s.type)}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${sourceBadge(s.type)}`}>
                          {s.type}
                        </span>
                        <span className="text-sm font-medium text-text">{s.title}</span>
                      </div>
                      {s.relevance && (
                        <p className="text-xs text-text-secondary mt-1.5 pl-6">{s.relevance}</p>
                      )}
                    </Wrapper>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !searching && (
        <div className="text-center py-10 space-y-3">
          <div className="text-text-tertiary text-sm">Ask a question about your discovery data</div>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              'Which interviews scored highest?',
              'What pain points come up most?',
              'What are the autopilot opportunities?',
              'Summarize our hypotheses',
            ].map(suggestion => (
              <button key={suggestion} onClick={() => { setQuery(suggestion); }}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-card-hover transition">
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
