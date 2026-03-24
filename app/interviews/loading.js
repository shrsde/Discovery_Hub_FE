export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4 animate-pulse">
      <div className="h-8 bg-card-hover rounded-xl w-48" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="glass rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-card-hover rounded-full" />
            <div className="h-4 bg-card-hover rounded w-40" />
            <div className="h-3 bg-card-hover rounded w-20 ml-auto" />
          </div>
          <div className="h-4 bg-card-hover rounded w-full" />
          <div className="h-4 bg-card-hover rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}
