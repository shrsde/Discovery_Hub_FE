'use client'

import { VERSIONS } from '@/lib/versions'

export default function ChangelogPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-text">Changelog</h1>

      <div className="space-y-6">
        {VERSIONS.map((v, i) => (
          <div key={v.version} className={`glass rounded-2xl p-5 animate-in ${i === 0 ? 'gradient-bg-blue gradient-blue' : ''}`} style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="version-pill text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full">v{v.version}</span>
              <span className="text-xs text-text-tertiary">{v.date}</span>
              {i === 0 && <span className="tag tag-green">Latest</span>}
            </div>
            <h2 className="text-base font-semibold text-text">{v.title}</h2>
            <p className="text-sm text-text-secondary mt-1">{v.summary}</p>
            <ul className="mt-3 space-y-1">
              {v.features.map((f, j) => (
                <li key={j} className="text-xs text-text-secondary flex items-start gap-2">
                  <span className="glyph text-text-tertiary mt-0.5">+</span>
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
