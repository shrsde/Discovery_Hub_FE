'use client'

import { getNodeType } from '@/lib/constants'

export default function DetailPanel({ node, interview, onClose, onUpdateLabel }) {
  if (!node) return null

  const nt = getNodeType(node.type)
  const data = node.data || {}

  // Find linked pain point from interview
  const painPoint = data.painIndex !== undefined && interview?.pain_points?.[data.painIndex]
    ? interview.pain_points[data.painIndex]
    : null

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[360px] bg-white border-l border-gray-200 shadow-xl z-50 overflow-y-auto">
      {/* Header */}
      <div className={`p-4 border-b border-gray-200 border-l-4 ${nt.accent}`}>
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{nt.label}</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
        </div>
        <h3 className="text-base font-semibold text-gray-900 mt-1">{data.label}</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Description */}
        {data.description && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Description</div>
            <p className="text-sm text-gray-700">{data.description}</p>
          </div>
        )}

        {/* Pain point details */}
        {painPoint && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Pain Point Details</div>
            <p className="text-sm text-gray-800">{painPoint.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {painPoint.category && (
                <div>
                  <span className="text-gray-400">Category:</span>
                  <span className="ml-1 text-gray-700">{painPoint.category}</span>
                </div>
              )}
              {painPoint.dollar_impact && (
                <div>
                  <span className="text-gray-400">Impact:</span>
                  <span className="ml-1 text-red-600 font-semibold">{painPoint.dollar_impact}</span>
                </div>
              )}
              {painPoint.frequency && (
                <div>
                  <span className="text-gray-400">Frequency:</span>
                  <span className="ml-1 text-gray-700">{painPoint.frequency}</span>
                </div>
              )}
              {painPoint.who_feels && (
                <div>
                  <span className="text-gray-400">Who feels it:</span>
                  <span className="ml-1 text-gray-700">{painPoint.who_feels}</span>
                </div>
              )}
            </div>
            {painPoint.current_solution && (
              <div className="text-xs">
                <span className="text-gray-400">Current solution:</span>
                <span className="ml-1 text-gray-700">{painPoint.current_solution}</span>
              </div>
            )}
          </div>
        )}

        {/* Dollar impact (for non-pain nodes) */}
        {data.dollarImpact && !painPoint && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Dollar Impact</div>
            <p className="text-sm font-semibold text-red-600">{data.dollarImpact}</p>
          </div>
        )}

        {/* Tools */}
        {data.tools && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Systems / Tools</div>
            <p className="text-sm text-gray-700">{data.tools}</p>
          </div>
        )}

        {/* Quote */}
        {data.quote && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Related Quote</div>
            <blockquote className="text-sm text-gray-700 italic border-l-2 border-gray-300 pl-3">&ldquo;{data.quote}&rdquo;</blockquote>
          </div>
        )}

        {/* Interview context sections */}
        {interview && (
          <>
            {interview.verbatim_quotes && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">All Verbatim Quotes</div>
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{interview.verbatim_quotes}</p>
              </div>
            )}
            {interview.observations && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Observations</div>
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{interview.observations}</p>
              </div>
            )}
          </>
        )}

        {/* Edit label */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Edit Label</div>
          <input
            defaultValue={data.label}
            onBlur={e => onUpdateLabel(node.id, e.target.value)}
            className="!rounded-lg text-sm"
          />
        </div>
      </div>
    </div>
  )
}
