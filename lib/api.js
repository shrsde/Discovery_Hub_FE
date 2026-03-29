const API = process.env.NEXT_PUBLIC_API_URL || 'https://the-discovery-hub.vercel.app'
const KEY = process.env.NEXT_PUBLIC_API_KEY || 'c5c6c44b2891e6f316c9a56775bb04b7f81c950412e58f1ac1fd2d6297ed1d38'

// Stale-while-revalidate cache: return cached data instantly, refresh in background
const cache = new Map()
const CACHE_TTL = 15_000 // 15s — data younger than this is fresh, skip refetch

function getCacheKey(endpoint, options) {
  if (options.method && options.method !== 'GET') return null
  return endpoint
}

export async function api(endpoint, options = {}) {
  const cacheKey = getCacheKey(endpoint, options)

  // For mutations, bust related cache entries and fetch normally
  if (!cacheKey) {
    // Invalidate cache for this endpoint's base path after mutations
    const base = endpoint.split('?')[0]
    for (const key of cache.keys()) {
      if (key.split('?')[0] === base) cache.delete(key)
    }
    return apiFetch(endpoint, options)
  }

  const cached = cache.get(cacheKey)
  const now = Date.now()

  if (cached) {
    // Fresh cache — return immediately, no refetch
    if (now - cached.time < CACHE_TTL) return cached.data

    // Stale cache — return immediately, refetch in background
    apiFetch(endpoint, options).then(data => {
      cache.set(cacheKey, { data, time: Date.now() })
    }).catch(() => {})
    return cached.data
  }

  // No cache — fetch and cache
  const data = await apiFetch(endpoint, options)
  cache.set(cacheKey, { data, time: now })
  return data
}

async function apiFetch(endpoint, options = {}) {
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

export async function deleteInterviews(ids) {
  return api('/api/interview', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
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

// Meeting bot (Recall.ai)
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

// Notifications
export async function getNotifications(recipient) {
  return api(`/api/notifications?recipient=${recipient}`)
}

export async function markNotificationsRead(recipient) {
  return api('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ recipient }),
  })
}

export async function getEmailPref(userName) {
  return api(`/api/notifications/email-pref?user=${userName}`)
}

export async function setEmailPref(userName, enabled) {
  return api('/api/notifications/email-pref', {
    method: 'POST',
    body: JSON.stringify({ user: userName, enabled }),
  })
}

export async function getNews() {
  return api('/api/news')
}

// Push subscriptions
export async function subscribePush(userName, subscription) {
  return api('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ user_name: userName, subscription }),
  })
}

export async function unsubscribePush(endpoint) {
  return api('/api/push/subscribe', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  })
}

// Feed replies / threads
export async function getReplies(feedId) {
  return api(`/api/feed/replies?feed_id=${feedId}`)
}

export async function postReply(feedId, author, text) {
  return api('/api/feed/replies', {
    method: 'POST',
    body: JSON.stringify({ feed_id: feedId, author, text }),
  })
}

// Link preview
export async function getLinkPreview(url) {
  return api('/api/feed/preview', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

// Index
export async function getIndex(folderId) {
  const q = folderId ? `?folder_id=${folderId}` : ''
  return api(`/api/index${q}`)
}

export async function getIndexFolders() {
  return api('/api/index?type=folders')
}

export async function createIndexFolder(data) {
  return api('/api/index', { method: 'POST', body: JSON.stringify({ action: 'create_folder', ...data }) })
}

export async function createIndexEntry(data) {
  return api('/api/index', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateIndexEntry(id, updates) {
  return api('/api/index', { method: 'PATCH', body: JSON.stringify({ id, ...updates }) })
}

export async function updateIndexFolder(id, updates) {
  return api('/api/index', { method: 'PATCH', body: JSON.stringify({ id, type: 'folder', ...updates }) })
}

export async function deleteIndexEntry(id) {
  return api('/api/index', { method: 'DELETE', body: JSON.stringify({ id }) })
}

export async function deleteIndexFolder(id) {
  return api('/api/index', { method: 'DELETE', body: JSON.stringify({ id, type: 'folder' }) })
}

// Projects
export async function getProjects() {
  return api('/api/projects')
}

export async function getProject(id) {
  return api(`/api/projects?id=${id}`)
}

export async function createProject(data) {
  return api('/api/projects', { method: 'POST', body: JSON.stringify({ action: 'create_project', ...data }) })
}

export async function updateProject(id, updates) {
  return api('/api/projects', { method: 'PATCH', body: JSON.stringify({ id, ...updates }) })
}

export async function deleteProject(id) {
  return api('/api/projects', { method: 'DELETE', body: JSON.stringify({ id, type: 'project' }) })
}

export async function addProjectItem(projectId, item) {
  return api('/api/projects', { method: 'POST', body: JSON.stringify({ action: 'add_item', project_id: projectId, ...item }) })
}

export async function updateProjectItem(itemId, updates) {
  return api('/api/projects', { method: 'PATCH', body: JSON.stringify({ id: itemId, type: 'item', ...updates }) })
}

export async function removeProjectItem(itemId) {
  return api('/api/projects', { method: 'DELETE', body: JSON.stringify({ id: itemId, type: 'item' }) })
}

// Documents
export async function getDocuments(projectId) {
  const q = projectId ? `?project_id=${projectId}` : ''
  return api(`/api/documents${q}`)
}

export async function getDocument(id) {
  return api(`/api/documents?id=${id}`)
}

export async function createDocument(data) {
  return api('/api/documents', { method: 'POST', body: JSON.stringify({ action: 'create', ...data }) })
}

export async function uploadDocument(file, title, createdBy, projectId) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('title', title || file.name)
  formData.append('created_by', createdBy || 'Wes')
  if (projectId) formData.append('project_id', projectId)
  const res = await fetch(`${API}/api/documents`, {
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

export async function updateDocument(id, updates) {
  return api('/api/documents', { method: 'PATCH', body: JSON.stringify({ id, ...updates }) })
}

export async function deleteDocument(id) {
  return api('/api/documents', { method: 'DELETE', body: JSON.stringify({ id }) })
}

// Opportunity analysis
export async function getOpportunityAnalysis() {
  return api('/api/analysis')
}

export async function getContextText() {
  const res = await fetch(`${API}/api/context`, {
    headers: { 'Authorization': `Bearer ${KEY}` },
    cache: 'no-store',
  })
  return res.text()
}
