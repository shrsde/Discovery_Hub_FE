'use client'

import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef } from 'react'
import tippy from 'tippy.js'

const EMOJIS = ['👍', '🎯', '💡', '⚡', '🔥', '✅', '❌', '⚠️', '📌', '📞', '🔍', '💰', '📊', '🚀', '🤔', '👀']
const USERS = [
  { id: 'Wes', label: 'Wes', color: '#1E3A5F', bg: '#EFF3F8' },
  { id: 'Gibb', label: 'Gibb', color: '#7c3aed', bg: '#F3EEFA' },
]

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const icons = {
  bold: <Icon d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />,
  italic: <Icon d="M19 4h-9 M14 20H5 M15 4L9 20" />,
  strikethrough: <Icon d="M16 4H9a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H7 M4 12h16" />,
  highlight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="14" width="18" height="6" rx="1" fill="#FEF08A" stroke="none" /><path d="M15.5 4.5l2.5 2.5-9 9H6.5v-2.5z" /></svg>,
  heading: <Icon d="M6 4v16 M18 4v16 M6 12h12" />,
  bulletList: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" /><circle cx="5" cy="6" r="1" fill="currentColor" /><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="5" cy="18" r="1" fill="currentColor" /></svg>,
  orderedList: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="20" y2="6" /><line x1="10" y1="12" x2="20" y2="12" /><line x1="10" y1="18" x2="20" y2="18" /><text x="3" y="8" fontSize="8" fill="currentColor" stroke="none" fontFamily="system-ui">1</text><text x="3" y="14" fontSize="8" fill="currentColor" stroke="none" fontFamily="system-ui">2</text><text x="3" y="20" fontSize="8" fill="currentColor" stroke="none" fontFamily="system-ui">3</text></svg>,
  quote: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 8H6a2 2 0 00-2 2v2a2 2 0 002 2h2v2a2 2 0 01-2 2H5v2h1a4 4 0 004-4V8zm10 0h-4a2 2 0 00-2 2v2a2 2 0 002 2h2v2a2 2 0 01-2 2h-1v2h1a4 4 0 004-4V8z" /></svg>,
  code: <Icon d="M16 18l6-6-6-6 M8 6l-6 6 6 6" />,
  divider: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12" /></svg>,
  emoji: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>,
  at: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" /></svg>,
}

function ToolbarButton({ onClick, active, children, title }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
        active ? 'bg-accent text-white' : 'text-text-secondary hover:bg-card-hover'
      }`}>
      {children}
    </button>
  )
}

// Mention suggestion dropdown
const MentionList = forwardRef(function MentionList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => setSelectedIndex(0), [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') { setSelectedIndex((selectedIndex + items.length - 1) % items.length); return true }
      if (event.key === 'ArrowDown') { setSelectedIndex((selectedIndex + 1) % items.length); return true }
      if (event.key === 'Enter') { items[selectedIndex] && command(items[selectedIndex]); return true }
      return false
    },
  }))

  return (
    <div className="bg-white border border-border rounded-lg shadow-lg py-1 w-36 overflow-hidden">
      {items.map((item, i) => {
        const u = USERS.find(u => u.id === item.id) || {}
        return (
          <button key={item.id} type="button"
            onClick={() => command(item)}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition ${i === selectedIndex ? 'bg-card-hover' : 'hover:bg-card-hover'}`}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: u.color }}>
              {item.label[0]}
            </span>
            @{item.label}
          </button>
        )
      })}
      {items.length === 0 && <div className="px-3 py-2 text-xs text-text-tertiary">No matches</div>}
    </div>
  )
})

const mentionSuggestion = {
  items: ({ query }) => {
    return USERS.filter(u => u.label.toLowerCase().includes(query.toLowerCase()))
  },
  render: () => {
    let component
    let popup

    return {
      onStart: (props) => {
        component = new ReactRenderer(MentionList, { props, editor: props.editor })
        if (!props.clientRect) return
        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },
      onUpdate: (props) => {
        component?.updateProps(props)
        if (props.clientRect) popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect })
      },
      onKeyDown: (props) => {
        if (props.event.key === 'Escape') { popup?.[0]?.hide(); return true }
        return component?.ref?.onKeyDown(props) || false
      },
      onExit: () => {
        popup?.[0]?.destroy()
        component?.destroy()
      },
    }
  },
}

// Custom mention rendering
const CustomMention = Mention.configure({
  HTMLAttributes: { class: 'mention-tag' },
  suggestion: mentionSuggestion,
  renderHTML: ({ node }) => {
    const user = USERS.find(u => u.id === node.attrs.id) || { color: '#333', bg: '#eee' }
    return ['span', {
      class: 'mention-tag',
      'data-mention': node.attrs.id,
      style: `background:${user.bg};color:${user.color};padding:2px 8px;border-radius:9999px;font-weight:600;font-size:13px;`,
    }, `@${node.attrs.label || node.attrs.id}`]
  },
})

export default function RichEditor({ content, onChange, placeholder = "What's on your mind?" }) {
  const [showEmojis, setShowEmojis] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [3] } }),
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({ placeholder }),
      CustomMention,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[60px] px-3 py-2.5 text-sm text-text',
      },
    },
  })

  if (!editor) return null

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-[#f2f2f2]">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-white/60 flex-wrap">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">{icons.bold}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">{icons.italic}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">{icons.strikethrough}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">{icons.highlight}</ToolbarButton>

        <div className="w-px h-4 bg-border mx-0.5" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading')} title="Heading">{icons.heading}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">{icons.bulletList}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">{icons.orderedList}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">{icons.quote}</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">{icons.code}</ToolbarButton>

        <div className="w-px h-4 bg-border mx-0.5" />

        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">{icons.divider}</ToolbarButton>

        {/* Emoji picker */}
        <div className="relative">
          <ToolbarButton onClick={() => setShowEmojis(!showEmojis)} title="Emoji">{icons.emoji}</ToolbarButton>
          {showEmojis && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEmojis(false)} />
              <div className="absolute left-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1 z-50 w-[220px]">
                {EMOJIS.map(e => (
                  <button key={e} type="button"
                    onClick={() => { editor.chain().focus().insertContent(e).run(); setShowEmojis(false) }}
                    className="w-6 h-6 flex items-center justify-center hover:bg-card-hover rounded transition text-sm">
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="text-[10px] text-text-tertiary ml-1">Type @ to mention</span>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}

export function RichContent({ html }) {
  if (!html) return null

  // Style @Wes and @Gibb as pill bubbles in plain text
  let processed = html
    .replace(/@Wes(?![<\w])/g, '<span style="background:#EFF3F8;color:#1E3A5F;padding:2px 8px;border-radius:9999px;font-weight:600;font-size:13px;">@Wes</span>')
    .replace(/@Gibb(?![<\w])/g, '<span style="background:#F3EEFA;color:#7c3aed;padding:2px 8px;border-radius:9999px;font-weight:600;font-size:13px;">@Gibb</span>')

  return (
    <div className="prose prose-sm max-w-none text-text
      prose-headings:text-text prose-headings:font-semibold prose-headings:text-sm prose-headings:mt-2 prose-headings:mb-1
      prose-p:my-1 prose-p:text-sm prose-p:leading-relaxed
      prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-li:text-sm
      prose-blockquote:my-1 prose-blockquote:border-l-2 prose-blockquote:border-gray-300 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-text-secondary
      prose-code:bg-card-hover prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
      prose-pre:bg-card-hover prose-pre:rounded-lg prose-pre:p-3
      prose-strong:text-text prose-strong:font-semibold
      [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:rounded-sm
      [&_.mention-tag]:inline-block
      prose-hr:my-2 prose-hr:border-border"
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  )
}
