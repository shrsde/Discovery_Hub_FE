'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { getInterview, generateFlowchart, saveFlowchart } from '@/lib/api'
import { NODE_TYPES } from '@/lib/constants'
import { nodeTypes } from './nodes'
import DetailPanel from './DetailPanel'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

export default function FlowPage({ params }) {
  const { id } = params
  const router = useRouter()
  const [interview, setInterview] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved') // saved, saving, unsaved
  const [selectedNode, setSelectedNode] = useState(null)
  const saveTimer = useRef(null)

  useEffect(() => {
    getInterview(id).then(data => {
      if (data) {
        setInterview(data)
        if (data.workflow_graph) {
          setNodes(data.workflow_graph.nodes || [])
          setEdges(data.workflow_graph.edges || [])
        }
      }
      setLoading(false)
    })
  }, [id])

  // Auto-save debounced
  const triggerSave = useCallback((newNodes, newEdges) => {
    setSaveStatus('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await saveFlowchart(id, { nodes: newNodes, edges: newEdges })
        setSaveStatus('saved')
      } catch {
        setSaveStatus('unsaved')
      }
    }, 1500)
  }, [id])

  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes)
    // Get updated nodes after change
    setNodes(prev => {
      const updated = prev // onNodesChange already updated this
      triggerSave(updated, edges)
      return prev
    })
  }, [onNodesChange, edges, triggerSave])

  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes)
    setEdges(prev => {
      triggerSave(nodes, prev)
      return prev
    })
  }, [onEdgesChange, nodes, triggerSave])

  const onConnect = useCallback((connection) => {
    setEdges(eds => {
      const updated = addEdge({ ...connection, id: `e-${Date.now()}` }, eds)
      triggerSave(nodes, updated)
      return updated
    })
  }, [nodes, triggerSave])

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node)
  }, [])

  async function handleGenerate() {
    if (!interview) return
    setGenerating(true)
    try {
      const res = await generateFlowchart({
        workflow_steps: interview.workflow_steps,
        pain_points: interview.pain_points,
        systems_tools: interview.systems_tools,
        data_sources: interview.data_sources,
        handoffs: interview.handoffs,
        workarounds: interview.workarounds,
        observations: interview.observations,
        verbatim_quotes: interview.verbatim_quotes,
      })
      if (res.success && res.data) {
        setNodes(res.data.nodes || [])
        setEdges(res.data.edges || [])
        // Save immediately
        setSaveStatus('saving')
        await saveFlowchart(id, res.data)
        setSaveStatus('saved')
      }
    } catch (err) {
      alert('Generation failed: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  function handleAddNode(type) {
    const newNode = {
      id: `node-${Date.now()}`,
      type,
      position: { x: 400, y: nodes.length * 200 + 50 },
      data: { label: `New ${NODE_TYPES.find(t => t.value === type)?.label || 'node'}` },
    }
    setNodes(prev => {
      const updated = [...prev, newNode]
      triggerSave(updated, edges)
      return updated
    })
  }

  function handleUpdateLabel(nodeId, newLabel) {
    setNodes(prev => {
      const updated = prev.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n
      )
      triggerSave(updated, edges)
      return updated
    })
    if (selectedNode?.id === nodeId) {
      setSelectedNode(prev => ({ ...prev, data: { ...prev.data, label: newLabel } }))
    }
  }

  async function handleManualSave() {
    setSaveStatus('saving')
    try {
      await saveFlowchart(id, { nodes, edges })
      setSaveStatus('saved')
    } catch {
      setSaveStatus('unsaved')
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        Loading...
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        Interview not found
      </div>
    )
  }

  const hasFlow = nodes.length > 0

  return (
    <div className="h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white/90 backdrop-blur-[20px] border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 z-10 shrink-0">
        <button onClick={() => router.push(`/interviews/${id}`)}
          className="text-gray-500 text-sm hover:text-gray-800 transition">
          &larr; Back
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900">{interview.company}</span>
          <span className="text-sm text-gray-400 ml-2">{interview.interviewee_name}</span>
        </div>

        {hasFlow && (
          <>
            {/* Add node */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                  + Add Block
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {NODE_TYPES.map(t => (
                  <DropdownMenuItem key={t.value} onClick={() => handleAddNode(t.value)}
                    className="flex items-center gap-2 cursor-pointer">
                    <span className={`w-3 h-3 rounded-sm border-l-2 ${t.accent} ${t.color}`} />
                    {t.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Save */}
            <button onClick={handleManualSave}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                saveStatus === 'saved' ? 'border-green-200 text-green-600 bg-green-50' :
                saveStatus === 'saving' ? 'border-blue-200 text-blue-600 bg-blue-50' :
                'border-orange-200 text-orange-600 bg-orange-50'
              }`}>
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
            </button>

            {/* Regenerate */}
            <button onClick={() => { if (confirm('Regenerate will replace the current flowchart. Continue?')) handleGenerate() }}
              disabled={generating}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-40">
              {generating ? 'Generating...' : 'Regenerate'}
            </button>
          </>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        {hasFlow ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode="Backspace"
            className="bg-[#fafafa]"
          >
            <Background color="#e0e0e0" gap={20} size={1} />
            <Controls position="bottom-left" className="!bg-white !border-gray-200 !shadow-sm !rounded-lg" />
            <MiniMap
              position="bottom-right"
              nodeColor={node => {
                const colors = {
                  workflowStep: '#e5e7eb',
                  painPoint: '#fecaca',
                  friction: '#fed7aa',
                  opportunity: '#bbf7d0',
                  handoff: '#e9d5ff',
                  systemTool: '#f3f4f6',
                }
                return colors[node.type] || '#e5e7eb'
              }}
              className="!bg-white !border-gray-200 !shadow-sm !rounded-lg"
            />
          </ReactFlow>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="text-center max-w-md">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Generate Workflow Map</h2>
              <p className="text-sm text-gray-500 mb-1">
                AI will analyze the workflow steps, pain points, and handoffs to create a visual flowchart.
              </p>
              {!interview.workflow_steps && (
                <p className="text-xs text-orange-600 mb-3">
                  This interview has no workflow data yet. Add workflow steps in the interview form first.
                </p>
              )}
            </div>
            <button onClick={handleGenerate}
              disabled={generating || !interview.workflow_steps}
              className="px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-700 transition-all active:scale-[0.97] disabled:opacity-40 shadow-sm">
              {generating ? 'Generating...' : 'Generate Workflow'}
            </button>
          </div>
        )}

        {/* Detail Panel */}
        {selectedNode && (
          <DetailPanel
            node={selectedNode}
            interview={interview}
            onClose={() => setSelectedNode(null)}
            onUpdateLabel={handleUpdateLabel}
          />
        )}
      </div>
    </div>
  )
}
