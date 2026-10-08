import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from '@tiptap/react'

import { Placeholder } from '@tiptap/extensions'

import {
  Bold,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Underline,
} from 'lucide-react'

import { createRichTextExtensions } from './richTextExtensions'
import {
  normalizeLinkUrl,
  toEditorHtml,
} from '../../utils/richText'

type RichTextEditorProps = {
  /*
  * Starting content (HTML or legacy plain text).
  * Only read when the editor is created; later changes
  * come from the user typing. The task modal unmounts
  * when closed, so each open starts fresh.
  */
  value: string
  onChange: (html: string) => void
  placeholder?: string

  // ID of the visible label, for screen readers.
  labelId?: string
}

function RichTextEditor({
  value,
  onChange,
  placeholder,
  labelId,
}: RichTextEditorProps) {
  /*
  * Tiptap keeps the onUpdate callback from when the
  * editor was created. Storing onChange in a ref means
  * we always call the latest version.
  */
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    extensions: [
      ...createRichTextExtensions({
        editable: true,
      }),

      Placeholder.configure({
        placeholder: placeholder || '',
      }),
    ],

    content: toEditorHtml(value),

    editorProps: {
      attributes: {
        class:
          'rich-text min-h-[140px] max-h-80 overflow-y-auto px-3.5 py-2.5 text-sm text-slate-700 outline-none',
        ...(labelId && {
          'aria-labelledby': labelId,
        }),
      },
    },

    // An empty editor still contains "<p></p>", so
    // report '' instead to mean "no description".
    onUpdate: ({ editor }) => {
      onChangeRef.current(
        editor.isEmpty ? '' : editor.getHTML()
      )
    },
  })

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 transition focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-200">
      <Toolbar editor={editor} />

      <EditorContent editor={editor} />
    </div>
  )
}

// --------------------------------------------------
// TOOLBAR
// --------------------------------------------------

function Toolbar({ editor }: { editor: Editor }) {
  /*
  * useEditorState re-renders the toolbar only when these
  * values change, so the buttons can show which
  * formatting is active at the cursor.
  */
  const active = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor.isActive('bold'),
      italic: currentEditor.isActive('italic'),
      underline: currentEditor.isActive('underline'),
      heading: currentEditor.isActive('heading', {
        level: 2,
      }),
      bulletList: currentEditor.isActive('bulletList'),
      orderedList: currentEditor.isActive('orderedList'),
      link: currentEditor.isActive('link'),
    }),
  })

  // --------------------------------------------------
  // LINK POPUP
  // --------------------------------------------------

  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState('')

  /*
  * Opens the popup. If the cursor is inside a link,
  * the input starts with that link's URL so it can be
  * edited.
  *
  * The editor's selection doesn't need saving here:
  * Tiptap keeps it in the editor state while focus is
  * in the URL input.
  */
  const openLinkPopup = () => {
    const currentHref =
      editor.getAttributes('link').href

    setLinkUrl(
      typeof currentHref === 'string'
        ? currentHref
        : ''
    )

    setLinkError('')
    setLinkOpen(true)
  }

  // Closes the popup and returns the cursor to the
  // editor where it was.
  const closeLinkPopup = () => {
    setLinkOpen(false)
    setLinkError('')
    editor.commands.focus()
  }

  const removeLink = () => {
    editor
      .chain()
      .focus()
      // Select the whole link, not just the cursor
      // position, so all of it is removed.
      .extendMarkRange('link')
      .unsetLink()
      .run()

    setLinkOpen(false)
    setLinkError('')
  }

  const applyLink = () => {
    // An empty URL means "remove the link".
    if (!linkUrl.trim()) {
      if (active.link) {
        removeLink()
      } else {
        closeLinkPopup()
      }

      return
    }

    const url = normalizeLinkUrl(linkUrl)

    if (!url) {
      setLinkError(
        'Enter a valid http://, https:// or mailto: link.'
      )

      return
    }

    const { empty } = editor.state.selection

    if (empty && !active.link) {
      // Nothing selected: insert the URL itself as
      // linked text.
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: url,
          marks: [
            {
              type: 'link',
              attrs: {
                href: url,
              },
            },
          ],
        })
        .run()
    } else {
      // Text selected, or cursor inside a link: apply
      // the URL to it. focus() restores the saved
      // selection; extendMarkRange('link') grows it to
      // the whole existing link when editing one.
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({
          href: url,
        })
        .run()
    }

    setLinkOpen(false)
    setLinkError('')
  }

  const handleLinkKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Enter') {
      // Without this, Enter would submit the task form.
      event.preventDefault()
      applyLink()
    }

    if (event.key === 'Escape') {
      // Stop the Modal's Escape handler from closing
      // the whole task modal.
      event.preventDefault()
      event.stopPropagation()
      closeLinkPopup()
    }
  }

  const buttons = [
    {
      label: 'Bold',
      icon: Bold,
      isActive: active.bold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      icon: Italic,
      isActive: active.italic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Underline',
      icon: Underline,
      isActive: active.underline,
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'Heading',
      icon: Heading2,
      isActive: active.heading,
      run: () =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Bullet list',
      icon: List,
      isActive: active.bulletList,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      icon: ListOrdered,
      isActive: active.orderedList,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Link',
      icon: Link,
      isActive: active.link || linkOpen,
      run: () =>
        linkOpen
          ? closeLinkPopup()
          : openLinkPopup(),
    },
  ]

  return (
    <div className="relative flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
      {buttons.map((button) => {
        const Icon = button.icon

        return (
          <button
            key={button.label}
            // type="button" stops the click from
            // submitting the surrounding task form.
            type="button"
            onClick={button.run}
            title={button.label}
            aria-label={button.label}
            aria-pressed={button.isActive}
            className={`rounded-lg p-1.5 transition ${
              button.isActive
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Icon size={16} />
          </button>
        )
      })}

      {/* LINK POPUP */}

      {linkOpen && (
        <div
          role="dialog"
          aria-label="Link"
          className="absolute left-2 right-2 top-full z-10 mt-1.5 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:right-auto sm:w-80"
        >
          <label
            htmlFor="rich-text-link-url"
            className="mb-1.5 block text-xs font-medium text-slate-700"
          >
            Link URL
          </label>

          <input
            id="rich-text-link-url"
            type="text"
            inputMode="url"
            value={linkUrl}
            onChange={(event) => {
              setLinkUrl(event.target.value)
              setLinkError('')
            }}
            onKeyDown={handleLinkKeyDown}
            placeholder="https://example.com"
            autoFocus
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />

          {linkError && (
            <p className="mt-1.5 text-xs text-red-600">
              {linkError}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <div>
              {active.link && (
                <button
                  type="button"
                  onClick={removeLink}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                >
                  Remove link
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeLinkPopup}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={applyLink}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RichTextEditor
