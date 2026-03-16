'use client'

const VERSIONS = [
  {
    version: '1.3',
    date: 'March 14, 2026',
    title: 'Meetings, Tasks, Attachments & More',
    summary: 'Meeting scheduling with Google Meet links and transcript capture. Trello-style task board. Interview file attachments with AI parsing for search. News Room placeholder.',
    features: [
      'Meeting scheduler with Google Meet link generation',
      'Post-meeting transcript upload with AI summary',
      'Trello-style task board with drag-and-drop (Backlog → To Do → In Progress → Done)',
      'Universal task creation from meetings, feed, interviews, or manual',
      'Interview file attachments (PDFs, docs, images, audio, video)',
      'Attached files parsed by AI and searchable',
      'News Room tab (coming soon)',
      'Dev changelog (this page)',
    ],
  },
  {
    version: '1.2',
    date: 'March 14, 2026',
    title: 'Visual Workflow Flowchart',
    summary: 'Interactive flowchart visualization for interview workflows using React Flow. AI generates the initial map from interview data.',
    features: [
      'AI-generated workflow flowcharts from interview data',
      '6 color-coded node types: workflow step, pain point, friction, opportunity, handoff, system/tool',
      'Drag-and-drop editing with auto-save',
      'Click nodes to see related interview data in detail panel',
      'Minimap and zoom controls',
    ],
  },
  {
    version: '1.1',
    date: 'March 14, 2026',
    title: 'Feed Enhancements, Search & Import',
    summary: 'Major feed upgrade with pinning, archiving, media, and tagging. AI-powered search. Transcript import for interviews.',
    features: [
      'Feed: pinned posts, archive/delete, media uploads, @Wes/@Gibb tagging',
      'Feed: video link embeds (YouTube, Vimeo, Loom)',
      'AI-powered natural language search across full database',
      'Interview transcript import — paste text, AI fills the form',
      'MCP server with 11 tools for Claude Desktop integration',
      'Light theme matching Dropclaw aesthetic',
    ],
  },
  {
    version: '1.0',
    date: 'March 13, 2026',
    title: 'Initial Build',
    summary: 'Core platform with headless API, Supabase database, and 6-view frontend. Deployed to Vercel.',
    features: [
      'Dashboard with stats, opportunity ranking, pain distribution',
      'Feed — shared research channel with 6 post types',
      'Project Sync — session handoffs with key takeaways',
      'Interview capture — 7-section structured form with scoring',
      'Digest — auto and on-demand AI summaries',
      'Headless API with Bearer token auth',
      'Supabase Postgres with 5 tables',
      'Export for Synthesis button',
    ],
  },
]

export default function ChangelogPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-text">Changelog</h1>

      <div className="space-y-6">
        {VERSIONS.map((v, i) => (
          <div key={v.version} className={`bg-card border rounded-lg p-5 shadow-sm ${i === 0 ? 'border-blue-200 bg-blue-50/30' : 'border-border'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-white font-semibold">v{v.version}</span>
              <span className="text-xs text-text-tertiary">{v.date}</span>
              {i === 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-semibold">Latest</span>}
            </div>
            <h2 className="text-base font-semibold text-text">{v.title}</h2>
            <p className="text-sm text-text-secondary mt-1">{v.summary}</p>
            <ul className="mt-3 space-y-1">
              {v.features.map((f, j) => (
                <li key={j} className="text-xs text-text-secondary flex items-start gap-2">
                  <span className="text-text-tertiary mt-0.5">+</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
