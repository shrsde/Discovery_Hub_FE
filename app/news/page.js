'use client'

import { useState, useEffect } from 'react'
import { timeAgo } from '@/lib/constants'
import { api, postFeed, getProjects, addProjectItem } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

const CATEGORIES = ['All', 'Industry', 'Retail', 'CPG', 'AI']

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function groupByDate(articles) {
  const groups = {}
  articles.forEach(a => {
    const day = new Date(a.pubDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    if (!groups[day]) groups[day] = []
    groups[day].push(a)
  })
  return groups
}

export default function NewsPage() {
  const { displayName } = useAuth()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [projects, setProjects] = useState([])
  const [addedToFeed, setAddedToFeed] = useState(new Set())
  const [addedToProject, setAddedToProject] = useState(new Set())
  const [showProjectPicker, setShowProjectPicker] = useState(null)

  useEffect(() => {
    async function loadNews() {
      try {
        const [newsRes, projRes] = await Promise.all([
          api('/api/news'),
          getProjects(),
        ])
        setArticles(newsRes.data || [])
        setProjects(projRes.data || [])
      } catch (e) {
        console.error('Failed to load news:', e)
      } finally {
        setLoading(false)
      }
    }
    loadNews()
  }, [])

  let filtered = articles
  if (category !== 'All') filtered = filtered.filter(a => a.category === category)
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(a =>
      a.title?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      a.source?.toLowerCase().includes(q)
    )
  }

  // Today's top 3 — most recent articles from today (or latest 3 if none today)
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const todayArticles = articles.filter(a =>
    new Date(a.pubDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) === today
  )
  const topNews = (todayArticles.length >= 3 ? todayArticles : articles).slice(0, 3)

  // Group remaining filtered articles by date
  const remaining = filtered.filter(a => !topNews.find(t => t.link === a.link))
  const grouped = groupByDate(remaining)

  const categoryColors = {
    Industry: 'bg-blue-50 text-blue-600 border-blue-200',
    Retail: 'bg-green-50 text-green-700 border-green-200',
    CPG: 'bg-orange-50 text-orange-600 border-orange-200',
    AI: 'bg-purple-50 text-purple-600 border-purple-200',
  }

  const articleKey = (a) => `${a.title}::${a.link}`

  async function handleAddToFeed(article) {
    const key = articleKey(article)
    if (addedToFeed.has(key)) return
    try {
      await postFeed({
        author: displayName || 'Wes',
        type: 'competitive',
        text: `<strong>${article.title}</strong><br><br>${article.description || ''}<br><br><a href="${article.link}" target="_blank">${article.source} — ${formatDate(article.pubDate)}</a>`,
        tags: [],
        media_url: article.link,
        media_type: 'video_link',
      })
      setAddedToFeed(prev => new Set(prev).add(key))
    } catch (e) { console.error('Add to feed failed:', e) }
  }

  async function handleAddToProject(article, projectId) {
    const key = articleKey(article)
    try {
      await addProjectItem(projectId, {
        item_type: 'link',
        title: article.title,
        url: article.link,
        notes: `${article.source} — ${article.category} — ${formatDate(article.pubDate)}`,
        added_by: displayName || 'Wes',
      })
      setAddedToProject(prev => new Set(prev).add(key))
      setShowProjectPicker(null)
    } catch (e) { console.error('Add to project failed:', e) }
  }

  function ArticleCard({ article, featured = false }) {
    const key = articleKey(article)
    const isFedded = addedToFeed.has(key)
    const isProjected = addedToProject.has(key)
    const pickerOpen = showProjectPicker === key

    return (
      <div className={`glass rounded-2xl overflow-hidden card-lift ${featured ? '' : ''}`}>
        <a href={article.link} target="_blank" rel="noopener" className="block">
          {featured && article.thumbnail && (
            <img src={article.thumbnail} alt="" className="w-full h-36 object-cover bg-card-hover" />
          )}
          <div className={`p-4 ${!featured && article.thumbnail ? 'flex gap-3' : ''}`}>
            {!featured && article.thumbnail && (
              <img src={article.thumbnail} alt="" className="w-20 h-16 object-cover rounded-lg shrink-0 bg-card-hover" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-text leading-snug line-clamp-2 ${featured ? 'text-base' : 'text-sm'}`}>{article.title}</h3>
              <p className={`text-text-secondary mt-1 line-clamp-2 ${featured ? 'text-sm' : 'text-xs'}`}>{article.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${categoryColors[article.category] || 'bg-card-hover text-text-tertiary border-border'}`}>
                  {article.category}
                </span>
                <span className="text-[10px] text-text-tertiary">{article.source}</span>
                <span className="text-[10px] text-text-tertiary ml-auto">{formatDate(article.pubDate)}</span>
              </div>
            </div>
          </div>
        </a>
        <div className="px-4 pb-3 flex items-center gap-2 relative">
          <button onClick={() => handleAddToFeed(article)}
            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
              isFedded ? 'bg-green-50 text-green-600 border border-green-200' : 'glass-subtle text-text-secondary hover:text-text border border-[rgba(0,0,0,0.08)]'
            }`}>
            {isFedded ? '✓ Added to Feed' : '◈ Add to Feed'}
          </button>
          <div className="relative">
            <button onClick={() => setShowProjectPicker(pickerOpen ? null : key)}
              className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
                isProjected ? 'bg-green-50 text-green-600 border border-green-200' : 'glass-subtle text-text-secondary hover:text-text border border-[rgba(0,0,0,0.08)]'
              }`}>
              {isProjected ? '✓ Added to Project' : '◆ Add to Project'}
            </button>
            {pickerOpen && (
              <div className="absolute bottom-full left-0 mb-1 glass-strong rounded-xl shadow-lg border border-[rgba(0,0,0,0.08)] p-2 min-w-[180px] z-50">
                {projects.length === 0 ? (
                  <div className="text-[10px] text-text-tertiary p-2">No projects yet</div>
                ) : projects.map(p => (
                  <button key={p.id} onClick={() => handleAddToProject(article, p.id)}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-card-hover transition text-xs text-text flex items-center gap-2">
                    <span className="glyph text-sm">{p.icon}</span> {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">News Room</h1>
        <span className="text-xs text-text-tertiary">{articles.length} articles</span>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search articles..." className="!rounded-full" />
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                category === c ? 'bg-accent text-white' : 'text-text-secondary hover:bg-card-hover'
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-text-tertiary text-center py-20">Loading industry news...</div>
      ) : (
        <>
          {/* Today's Big News */}
          {topNews.length > 0 && category === 'All' && !searchQuery.trim() && (
            <section>
              <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-3">
                Today&apos;s Big News
              </h2>
              <div className="grid md:grid-cols-3 gap-3">
                {topNews.map((article, i) => (
                  <ArticleCard key={i} article={article} featured />
                ))}
              </div>
            </section>
          )}

          {/* Articles grouped by date */}
          {Object.entries(grouped).map(([day, dayArticles]) => (
            <section key={day}>
              <h2 className="section-label mb-2 mt-4 border-b border-white/20 pb-1">
                {day}
              </h2>
              <div className="space-y-2">
                {dayArticles.map((article, i) => (
                  <ArticleCard key={i} article={article} />
                ))}
              </div>
            </section>
          ))}

          {filtered.length === 0 && !loading && (
            <p className="text-text-tertiary text-center py-10">No articles found.</p>
          )}
        </>
      )}
    </div>
  )
}
