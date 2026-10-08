import { useEffect } from 'react'

import {
  EditorContent,
  useEditor,
} from '@tiptap/react'

import { createRichTextExtensions } from './richTextExtensions'
import { toEditorHtml } from '../../utils/richText'

type RichTextContentProps = {
  // Stored description (HTML or legacy plain text).
  content: string | null
  className?: string
}

/*
* Displays a stored description read-only.
*
* Instead of inserting the HTML with
* dangerouslySetInnerHTML, it is loaded into a read-only
* Tiptap editor. Tiptap only keeps elements it knows
* (paragraphs, bold, lists, ...), so things like <script>
* or onerror="..." are dropped. The backend also
* sanitizes on save, so there are two layers of protection.
*/
function RichTextContent({
  content,
  className = '',
}: RichTextContentProps) {
  const editor = useEditor({
    editable: false,

    extensions: createRichTextExtensions({
      editable: false,
    }),

    content: toEditorHtml(content),

    editorProps: {
      attributes: {
        class: `rich-text text-sm leading-7 text-slate-600 break-words outline-none ${className}`,
      },
    },
  })

  // Show the new content when the task is updated
  // while it's displayed.
  useEffect(() => {
    editor.commands.setContent(
      toEditorHtml(content),
      {
        emitUpdate: false,
      }
    )
  }, [editor, content])

  return <EditorContent editor={editor} />
}

export default RichTextContent
