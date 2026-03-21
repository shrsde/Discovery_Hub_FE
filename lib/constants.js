export const FEED_TYPES = [
  { value: 'insight', label: 'Insight', emoji: '◈', color: 'glass-subtle text-blue-600 border-blue-200/40' },
  { value: 'hypothesis', label: 'Hypothesis', emoji: '△', color: 'glass-subtle text-green-700 border-green-200/40' },
  { value: 'challenge', label: 'Challenge', emoji: '◆', color: 'glass-subtle text-red-600 border-red-200/40' },
  { value: 'competitive', label: 'Competitive', emoji: '⬡', color: 'glass-subtle text-orange-600 border-orange-200/40' },
  { value: 'action', label: 'Action Item', emoji: '▸', color: 'glass-subtle text-purple-600 border-purple-200/40' },
  { value: 'question', label: 'Question', emoji: '◇', color: 'glass-subtle text-gray-600 border-gray-200/40' },
  { value: 'meeting', label: 'Meeting', emoji: '◎', color: 'glass-subtle text-indigo-600 border-indigo-200/40' },
]

export const SYNC_TYPES = [
  { value: 'synthesis', label: 'Synthesis', icon: '◈' },
  { value: 'competitive', label: 'Competitive Map', icon: '⬡' },
  { value: 'product', label: 'Product Concept', icon: '△' },
  { value: 'decision', label: 'Decision', icon: '◆' },
  { value: 'research', label: 'Research', icon: '◇' },
  { value: 'framework', label: 'Framework', icon: '▸' },
]

export const SYNC_STATUSES = ['Draft', 'Active', 'Superseded', 'Archived']

export const PAIN_CATEGORIES = [
  'Overhead Savings',
  'Revenue Adder',
  'Risk Reduction',
  'Speed/Efficiency',
]

export const CHANNELS = ['Retail', 'Foodservice', 'DTC', 'Club', 'Convenience', 'E-commerce']

export const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually', 'Ad-hoc']

export const NODE_TYPES = [
  { value: 'workflowStep', label: 'Workflow Step', color: 'bg-white border-gray-200', accent: 'border-l-gray-800' },
  { value: 'painPoint', label: 'Pain Point', color: 'bg-red-50 border-red-200', accent: 'border-l-red-500' },
  { value: 'friction', label: 'Friction', color: 'bg-orange-50 border-orange-200', accent: 'border-l-orange-500' },
  { value: 'opportunity', label: 'Opportunity', color: 'bg-green-50 border-green-200', accent: 'border-l-green-500' },
  { value: 'handoff', label: 'Handoff', color: 'bg-purple-50 border-purple-200', accent: 'border-l-purple-500' },
  { value: 'systemTool', label: 'System / Tool', color: 'bg-gray-50 border-gray-200', accent: 'border-l-gray-400' },
]

export function getNodeType(value) {
  return NODE_TYPES.find(t => t.value === value) || NODE_TYPES[0]
}

export const OUTSOURCED_OPTIONS = [
  'Fully outsourced',
  'Mostly outsourced',
  'Split',
  'Mostly insourced',
  'Fully insourced',
]

export const AUTOPILOT_OPTIONS = ['Autopilot', 'Copilot', 'Hybrid', 'Unclear']

export const SCORE_DIMENSIONS = [
  { key: 'score_founder_fit', label: 'Founder-Problem Fit' },
  { key: 'score_lowest_friction', label: 'Lowest Friction' },
  { key: 'score_clearest_value', label: 'Clearest Value ($)' },
  { key: 'score_defensibility', label: 'Defensibility / Moat' },
  { key: 'score_ease_de_risk', label: 'Ease of De-risk' },
  { key: 'score_stickiness', label: 'Stickiness' },
]

export function scoreColor(total) {
  if (total >= 22) return 'text-score-green'
  if (total >= 18) return 'text-score-orange'
  return 'text-score-red'
}

export function scoreBg(total) {
  if (total >= 22) return 'bg-green-50 border-green-200'
  if (total >= 18) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

export function getFeedType(value) {
  return FEED_TYPES.find(t => t.value === value) || FEED_TYPES[0]
}

export function getSyncType(value) {
  return SYNC_TYPES.find(t => t.value === value) || SYNC_TYPES[0]
}

export function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}
