'use client'

import { useState, useEffect } from 'react'
import { timeAgo } from '@/lib/constants'

const RSS_FEEDS = [
  { name: 'Food Dive', url: 'https://www.fooddive.com/feeds/news/', category: 'Industry' },
  { name: 'Grocery Dive', url: 'https://www.grocerydive.com/feeds/news/', category: 'Retail' },
  { name: 'Progressive Grocer', url: 'https://progressivegrocer.com/rss.xml', category: 'Retail' },
  { name: 'Food Business News', url: 'https://www.foodbusinessnews.net/rss', category: 'Industry' },
  { name: 'NOSH', url: 'https://www.nosh.com/rss', category: 'CPG' },
]

const CATEGORIES = ['All', 'Industry', 'Retail', 'CPG']

export default function NewsPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadFeeds() {
      const allArticles = []

      for (const feed of RSS_FEEDS) {
        try {
          // Use a CORS proxy to fetch RSS feeds
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=10`)
          if (!res.ok) continue
          const data = await res.json()
          if (data.items) {
            data.items.forEach(item => {
              allArticles.push({
                title: item.title,
                link: item.link,
                description: item.description?.replace(/<[^>]*>/g, '').slice(0, 200),
                pubDate: item.pubDate,
                source: feed.name,
                category: feed.category,
                thumbnail: item.thumbnail || item.enclosure?.link || null,
              })
            })
          }
        } catch (e) {
          console.error(`Failed to load ${feed.name}:`, e)
        }
      }

      // Sort by date, newest first
      allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      setArticles(allArticles)
      setLoading(false)
    }

    loadFeeds()
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
        <div className="flex gap-1">
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
        <div className="space-y-3">
          {filtered.map((article, i) => (
            <a key={i} href={article.link} target="_blank" rel="noopener"
              className="block bg-card border border-border rounded-lg p-4 hover:shadow hover:-translate-y-px transition-all">
              <div className="flex gap-3">
                {article.thumbnail && (
                  <img src={article.thumbnail} alt="" className="w-20 h-16 object-cover rounded-lg shrink-0 bg-card-hover" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text leading-snug line-clamp-2">{article.title}</h3>
                  {article.description && (
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">{article.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-card-hover border border-border text-text-tertiary font-medium">
                      {article.source}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-card-hover border border-border text-text-tertiary font-medium">
                      {article.category}
                    </span>
                    <span className="text-[10px] text-text-tertiary ml-auto">
                      {article.pubDate ? timeAgo(article.pubDate) : ''}
                    </span>
                  </div>
                </div>
              </div>
            </a>
          ))}
          {filtered.length === 0 && !loading && (
            <p className="text-text-tertiary text-center py-10">No articles found.</p>
          )}
        </div>
      )}
    </div>
  )
}
