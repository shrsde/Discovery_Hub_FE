'use client'

import { useState, useEffect } from 'react'
import { getTasks, createTask, updateTask, deleteTask } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const COLUMNS = [
  { status: 'backlog', label: 'Backlog', color: 'border-t-gray-300' },
  { status: 'todo', label: 'To Do', color: 'border-t-blue-400' },
  { status: 'in_progress', label: 'In Progress', color: 'border-t-amber-400' },
  { status: 'done', label: 'Done', color: 'border-t-green-500' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-600' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-50 text-blue-600' },
  { value: 'high', label: 'High', color: 'bg-orange-50 text-orange-600' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-50 text-red-600' },
]

function getPriorityStyle(p) {
  return PRIORITIES.find(x => x.value === p) || PRIORITIES[1]
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [filter, setFilter] = useState('all')
  const [draggedId, setDraggedId] = useState(null)

  async function load() {
    const r = await getTasks()
    setTasks(r.data || [])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function handleAddTask(status) {
    if (!newTitle.trim()) return
    await createTask({ title: newTitle.trim(), status, created_by: 'Wes' })
    setNewTitle('')
    setAddingTo(null)
    await load()
  }

  async function handleUpdateTask(id, updates) {
    await updateTask(id, updates)
    setEditingTask(null)
    await load()
  }

  async function handleDeleteTask(id) {
    if (!confirm('Delete this task?')) return
    await deleteTask(id)
    setEditingTask(null)
    await load()
  }

  function handleDragStart(e, taskId) {
    setDraggedId(taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  async function handleDrop(e, newStatus) {
    e.preventDefault()
    if (!draggedId) return
    await updateTask(draggedId, { status: newStatus })
    setDraggedId(null)
    await load()
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.assignee === filter)

  if (loading) return <div className="text-text-tertiary text-center py-20">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Tasks</h1>
        <div className="flex gap-1">
          {['all', 'Wes', 'Gibb'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f ? 'bg-accent text-white' : 'text-text-secondary hover:bg-card-hover'
              }`}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {COLUMNS.map(col => {
          const colTasks = filtered
            .filter(t => t.status === col.status)
            .sort((a, b) => {
              if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date)
              if (a.due_date) return -1
              if (b.due_date) return 1
              return a.position - b.position
            })

          return (
            <div key={col.status}
              className={`min-w-[260px] flex-1 bg-card-hover rounded-lg border-t-4 ${col.color}`}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col.status)}>

              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text">{col.label}</span>
                  <span className="text-xs text-text-tertiary bg-white rounded-full px-1.5">{colTasks.length}</span>
                </div>
                <button onClick={() => { setAddingTo(col.status); setNewTitle('') }}
                  className="text-text-tertiary hover:text-text text-lg transition">+</button>
              </div>

              <div className="px-2 pb-2 space-y-2">
                {/* Add task inline */}
                {addingTo === col.status && (
                  <div className="bg-white rounded-lg border border-border p-2 shadow-sm">
                    <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      placeholder="Task title..." autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleAddTask(col.status); if (e.key === 'Escape') setAddingTo(null) }}
                      className="!text-xs !py-1.5" />
                    <div className="flex gap-1 mt-1.5">
                      <button onClick={() => handleAddTask(col.status)} disabled={!newTitle.trim()}
                        className="text-[11px] px-2.5 py-1 bg-accent text-white rounded-full font-medium disabled:opacity-40">Add</button>
                      <button onClick={() => setAddingTo(null)}
                        className="text-[11px] px-2.5 py-1 text-text-tertiary hover:text-text">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Task cards */}
                {colTasks.map(task => {
                  const ps = getPriorityStyle(task.priority)
                  return (
                    <div key={task.id}
                      draggable
                      onDragStart={e => handleDragStart(e, task.id)}
                      onClick={() => setEditingTask(task)}
                      className="bg-white rounded-lg border border-border p-3 shadow-sm cursor-pointer hover:shadow hover:-translate-y-px transition-all">
                      <p className="text-sm font-medium text-text leading-snug">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${ps.color}`}>{ps.label}</span>
                        {task.assignee && (
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${task.assignee === 'Wes' ? 'bg-wes' : 'bg-gibb'}`}>
                            {task.assignee[0]}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="text-[10px] text-text-tertiary">{task.due_date}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit modal */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="max-w-md p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-text">Edit Task</DialogTitle>
          </DialogHeader>

          {editingTask && (
            <>
              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Title</label>
                <input defaultValue={editingTask.title}
                  onBlur={e => handleUpdateTask(editingTask.id, { title: e.target.value })} />
              </div>

              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Description</label>
                <textarea defaultValue={editingTask.description || ''} rows={3}
                  onBlur={e => handleUpdateTask(editingTask.id, { description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Assignee</label>
                  <div className="flex gap-1">
                    {['Wes', 'Gibb'].map(a => (
                      <button key={a} onClick={() => handleUpdateTask(editingTask.id, { assignee: a })}
                        className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
                          editingTask.assignee === a
                            ? (a === 'Wes' ? 'bg-wes text-white' : 'bg-gibb text-white')
                            : 'bg-card-hover border border-border text-text-secondary'
                        }`}>{a}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Due Date</label>
                  <input type="date" defaultValue={editingTask.due_date || ''}
                    onChange={e => handleUpdateTask(editingTask.id, { due_date: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Priority</label>
                <div className="flex gap-1">
                  {PRIORITIES.map(p => (
                    <button key={p.value} onClick={() => handleUpdateTask(editingTask.id, { priority: p.value })}
                      className={`flex-1 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        editingTask.priority === p.value ? p.color + ' border-current' : 'bg-white border-border text-text-tertiary'
                      }`}>{p.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold block mb-1">Status</label>
                <div className="flex gap-1">
                  {COLUMNS.map(c => (
                    <button key={c.status} onClick={() => handleUpdateTask(editingTask.id, { status: c.status })}
                      className={`flex-1 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        editingTask.status === c.status ? 'bg-accent text-white border-accent' : 'bg-white border-border text-text-tertiary'
                      }`}>{c.label}</button>
                  ))}
                </div>
              </div>

              <button onClick={() => handleDeleteTask(editingTask.id)}
                className="text-xs text-red-500 hover:text-red-700 transition">Delete task</button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
