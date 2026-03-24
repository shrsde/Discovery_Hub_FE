export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4 animate-pulse">
      <div className="h-8 bg-card-hover rounded-xl w-48" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="glass rounded-2xl p-4 space-y-2">
            <div className="h-10 w-10 bg-card-hover rounded-xl" />
            <div className="h-4 bg-card-hover rounded w-24" />
            <div className="h-3 bg-card-hover rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
