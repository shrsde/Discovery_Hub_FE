'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSyncs } from '@/lib/api'
import { getSyncType, timeAgo } from '@/lib/constants'

export default function SyncListPage() {
  const [syncs, setSyncs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSyncs().then(r => setSyncs(r.data || [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-text-tertiary text-center py-20">Loading...</div>

  const statusColor = {
    Draft: 'bg-amber-50 text-amber-700 border-amber-200',
    Active: 'bg-green-50 text-green-700 border-green-200',
    Superseded: 'bg-gray-100 text-gray-500 border-gray-200',
    Archived: 'bg-gray-100 text-gray-500 border-gray-200',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Project Sync</h1>
        <Link href="/sync/new"
          className="text-sm px-5 py-2.5 bg-accent text-white rounded-full hover:bg-accent-light transition-all active:scale-[0.97] font-semibold shadow-sm">
          + New Sync
        </Link>
      </div>

      <div className="space-y-2">
        {syncs.map(s => {
          const st = getSyncType(s.type)
          return (
            <Link key={s.id} href={`/sync/${s.id}`}
              className="block glass rounded-2xl p-4 card-lift">
              <div className="flex items-center gap-3">
                <span className="text-lg">{st.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text text-sm">{s.title}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${statusColor[s.status] || ''}`}>{s.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${s.author === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                      {s.author?.[0]}
                    </span>
                    <span className="text-text-tertiary text-xs">{st.label}</span>
                    <span className="text-text-tertiary text-xs">{timeAgo(s.created_at)}</span>
                  </div>
                </div>
              </div>
              {s.key_takeaways && (
                <p className="text-text-secondary text-xs mt-2.5 line-clamp-2 pl-9">{s.key_takeaways}</p>
              )}
            </Link>
          )
        })}
        {syncs.length === 0 && (
          <p className="text-text-tertiary text-center py-10">No syncs yet. Create one to start building shared context.</p>
        )}
      </div>
    </div>
  )
}
