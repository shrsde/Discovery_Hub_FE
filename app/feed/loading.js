export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4 animate-pulse">
      <div className="h-8 bg-card-hover rounded-xl w-48" />
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="h-20 bg-card-hover rounded-xl" />
        <div className="h-8 bg-card-hover rounded-full w-24 ml-auto" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="glass rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-card-hover rounded-full" />
            <div className="h-4 bg-card-hover rounded w-32" />
            <div className="h-3 bg-card-hover rounded w-16 ml-auto" />
          </div>
          <div className="h-4 bg-card-hover rounded w-full" />
          <div className="h-4 bg-card-hover rounded w-3/4" />
        </div>
      ))}
    </div>
  )
}
