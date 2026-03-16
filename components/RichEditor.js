'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { useState } from 'react'

const EMOJIS = ['👍', '🎯', '💡', '⚡', '🔥', '✅', '❌', '⚠️', '📌', '📞', '🔍', '💰', '📊', '🚀', '🤔', '👀']

function ToolbarButton({ onClick, active, children, title }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-all ${
        active ? 'bg-accent text-white' : 'text-text-secondary hover:bg-card-hover'
      }`}>
      {children}
    </button>
  )
}

export default function RichEditor({ content, onChange, placeholder = "What's on your mind?" }) {
  const [showEmojis, setShowEmojis] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
      }),
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({ placeholder }),
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
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')} title="Bold">
          B
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')} title="Italic">
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')} title="Strikethrough">
          <span className="line-through">S</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive('highlight')} title="Highlight">
          <span className="bg-yellow-200 px-0.5">H</span>
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-0.5" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading')} title="Heading">
          H
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')} title="Bullet list">
          •
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')} title="Numbered list">
          1.
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')} title="Quote">
          &ldquo;
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')} title="Code block">
          {'</>'}
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-0.5" />

        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider">
          —
        </ToolbarButton>

        {/* Emoji picker */}
        <div className="relative">
          <ToolbarButton onClick={() => setShowEmojis(!showEmojis)} title="Emoji">
            😀
          </ToolbarButton>
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
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}

export function RichContent({ html }) {
  if (!html) return null
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
      prose-hr:my-2 prose-hr:border-border"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
