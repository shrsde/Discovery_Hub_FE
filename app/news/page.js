'use client'

export default function NewsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <span className="text-4xl">📰</span>
      <h1 className="text-xl font-semibold text-text">News Room</h1>
      <p className="text-sm text-text-secondary text-center max-w-md">
        Industry news, articles, and blog aggregator for CPG discovery research.
      </p>
      <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold uppercase tracking-wider">
        Coming Soon
      </span>
      <div className="text-xs text-text-tertiary text-center max-w-sm mt-4 space-y-1">
        <p>Planned features:</p>
        <ul className="space-y-0.5">
          <li>Curated CPG industry news feed</li>
          <li>Trade publication aggregation</li>
          <li>Competitor press monitoring</li>
          <li>AI-powered relevance filtering</li>
          <li>Save and annotate articles</li>
        </ul>
      </div>
    </div>
  )
}
