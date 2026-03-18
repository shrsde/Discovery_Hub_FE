const API = process.env.NEXT_PUBLIC_API_URL || 'https://the-discovery-hub.vercel.app'
const KEY = process.env.NEXT_PUBLIC_API_KEY || 'c5c6c44b2891e6f316c9a56775bb04b7f81c950412e58f1ac1fd2d6297ed1d38'

export async function api(endpoint, options = {}) {
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KEY}`,
      ...options.headers,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'API request failed')
  }
  return res.json()
}

export async function getInterviews() {
  return api('/api/interview')
}

export async function getInterview(id) {
  const { data } = await api('/api/interview')
  return data.find(i => i.id === id)
}

export async function saveInterview(data) {
  return api('/api/interview', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getFeed(view = 'active') {
  return api(`/api/feed?view=${view}`)
}

export async function postFeed(data) {
  return api('/api/feed', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateFeed(id, updates) {
  return api('/api/feed', {
    method: 'PATCH',
    body: JSON.stringify({ id, ...updates }),
  })
}

export async function deleteFeed(id) {
  return api('/api/feed', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
}

export async function uploadFeedMedia(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API}/api/feed/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}` },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Upload failed')
  }
  return res.json()
}

export async function getSyncs() {
  return api('/api/sync')
}

export async function saveSync(data) {
  return api('/api/sync', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getDigests(limit = 5) {
  return api(`/api/digest?limit=${limit}`)
}

export async function generateDigest(author, since) {
  return api('/api/digest', {
    method: 'POST',
    body: JSON.stringify({ author, since }),
  })
}

export async function getChangelog(since) {
  const q = since ? `?since=${since}` : ''
  return api(`/api/changelog${q}`)
}

export async function getContext(format = 'text') {
  return api(`/api/context?format=${format}`)
}

export async function generateFlowchart(interviewData) {
  return api('/api/interview/flow', {
    method: 'POST',
    body: JSON.stringify(interviewData),
  })
}

export async function saveFlowchart(id, workflowGraph) {
  return api('/api/interview/flow/save', {
    method: 'PATCH',
    body: JSON.stringify({ id, workflow_graph: workflowGraph }),
  })
}

export async function importTranscript(transcript, interviewer) {
  return api('/api/interview/import', {
    method: 'POST',
    body: JSON.stringify({ transcript, interviewer }),
  })
}

// Attachments
export async function getAttachments(interviewId) {
  return api(`/api/attachments?interview_id=${interviewId}`)
}

export async function uploadAttachment(file, interviewId, uploadedBy) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('interview_id', interviewId)
  formData.append('uploaded_by', uploadedBy)
  const res = await fetch(`${API}/api/attachments`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}` },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Upload failed')
  }
  return res.json()
}

export async function deleteAttachment(id) {
  return api('/api/attachments', { method: 'DELETE', body: JSON.stringify({ id }) })
}

// Transcribe audio via Groq Whisper
export async function transcribeAudio(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API}/api/transcribe`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}` },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Transcription failed')
  }
  return res.json()
}

// Meeting bot (Fireflies)
export async function sendMeetingBot(meetLink) {
  return api('/api/meetings/bot', {
    method: 'POST',
    body: JSON.stringify({ action: 'join', meetLink }),
  })
}

export async function getMeetingBotTranscript(meetingId) {
  return api('/api/meetings/bot', {
    method: 'POST',
    body: JSON.stringify({ action: 'get_transcript', meetingId }),
  })
}

export async function listRecentBotTranscripts() {
  return api('/api/meetings/bot', {
    method: 'POST',
    body: JSON.stringify({ action: 'list_recent' }),
  })
}

// Meetings
export async function getMeetings() {
  return api('/api/meetings')
}

export async function createMeeting(data) {
  return api('/api/meetings', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateMeeting(id, updates) {
  return api('/api/meetings', { method: 'PATCH', body: JSON.stringify({ id, ...updates }) })
}

export async function uploadMeetingRecording(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API}/api/meetings/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}` },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Upload failed')
  }
  return res.json()
}

// Tasks
export async function getTasks() {
  return api('/api/tasks')
}

export async function createTask(data) {
  return api('/api/tasks', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateTask(id, updates) {
  return api('/api/tasks', { method: 'PATCH', body: JSON.stringify({ id, ...updates }) })
}

export async function deleteTask(id) {
  return api('/api/tasks', { method: 'DELETE', body: JSON.stringify({ id }) })
}

export async function getContextText() {
  const res = await fetch(`${API}/api/context`, {
    headers: { 'Authorization': `Bearer ${KEY}` },
    cache: 'no-store',
  })
  return res.text()
}
