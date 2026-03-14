'use client'

import { Handle, Position } from '@xyflow/react'
import { getNodeType } from '@/lib/constants'

function BaseNode({ data, type, selected }) {
  const nt = getNodeType(type)
  return (
    <div className={`px-3 py-2.5 rounded-lg border ${nt.color} border-l-4 ${nt.accent} shadow-sm min-w-[180px] max-w-[240px] transition-all ${selected ? 'ring-2 ring-blue-400 shadow-md' : 'hover:shadow'}`}>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">{nt.label}</div>
      <div className="text-sm font-medium text-gray-900 leading-snug">{data.label}</div>
      {data.description && (
        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{data.description}</div>
      )}
      {data.dollarImpact && (
        <div className="text-xs font-semibold text-red-600 mt-1">{data.dollarImpact}</div>
      )}
      {data.tools && (
        <div className="text-[10px] text-gray-400 mt-1">{data.tools}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-400 !border-gray-300" />
    </div>
  )
}

export function WorkflowStepNode(props) {
  return <BaseNode {...props} type="workflowStep" />
}

export function PainPointNode(props) {
  return <BaseNode {...props} type="painPoint" />
}

export function FrictionNode(props) {
  return <BaseNode {...props} type="friction" />
}

export function OpportunityNode(props) {
  return <BaseNode {...props} type="opportunity" />
}

export function HandoffNode(props) {
  return <BaseNode {...props} type="handoff" />
}

export function SystemToolNode(props) {
  return <BaseNode {...props} type="systemTool" />
}

export const nodeTypes = {
  workflowStep: WorkflowStepNode,
  painPoint: PainPointNode,
  friction: FrictionNode,
  opportunity: OpportunityNode,
  handoff: HandoffNode,
  systemTool: SystemToolNode,
}
