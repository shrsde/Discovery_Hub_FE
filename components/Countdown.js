'use client'

import { useState, useEffect } from 'react'

export default function Countdown({ scheduledAt }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const target = new Date(scheduledAt).getTime()
  const diff = target - now

  if (diff <= 0) {
    return <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full animate-pulse">Starting now</span>
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  let label = ''
  if (days > 0) label = `${days}d ${hours}h ${minutes}m`
  else if (hours > 0) label = `${hours}h ${minutes}m ${seconds}s`
  else label = `${minutes}m ${seconds}s`

  const urgent = diff < 1000 * 60 * 30 // under 30 min
  const soon = diff < 1000 * 60 * 60 * 2 // under 2 hours

  return (
    <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full border ${
      urgent ? 'text-red-600 bg-red-50 border-red-200' :
      soon ? 'text-amber-600 bg-amber-50 border-amber-200' :
      'text-indigo-600 bg-indigo-50 border-indigo-200'
    }`}>
      {label}
    </span>
  )
}
