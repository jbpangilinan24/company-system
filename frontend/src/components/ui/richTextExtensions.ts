import StarterKit from '@tiptap/starter-kit'

import { isAllowedLinkUrl } from '../../utils/richText'

/*
* Tiptap extensions shared by RichTextEditor and
* RichTextContent.
*
* Only formatting the backend allows is enabled (see
* backend/src/utils/sanitizeDescription.ts). Anything
* else would be removed when the task is saved.
*/
export function createRichTextExtensions({
  editable,
}: {
  editable: boolean
}) {
  return [
    StarterKit.configure({
      heading: {
        levels: [2, 3],
      },

      // Not offered in this editor.
      codeBlock: false,
      horizontalRule: false,

      link: {
        // While editing, clicking a link places the cursor
        // instead of opening the page. In the read-only
        // view, links open through the browser's normal
        // link click (they have target="_blank").
        openOnClick: !editable,
        autolink: true,
        defaultProtocol: 'https',

        // Same allowlist as the Link popup and the backend:
        // http, https and mailto only. Applies to typed,
        // pasted and auto-detected links.
        isAllowedUri: (url) => isAllowedLinkUrl(url),
      },
    }),
  ]
}
