import sanitizeHtml from 'sanitize-html'

// --------------------------------------------------
// TASK DESCRIPTION SANITIZER
//
// Task descriptions are HTML written by one user and
// shown to others. Everything not on this allowlist is
// removed before saving, so a request sent directly to
// the API can't store scripts, event handlers or
// javascript: links.
// --------------------------------------------------

// Must match HTML_TAG_PATTERN in frontend/src/utils/richText.ts
const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/i

// Only the formatting the Tiptap editor produces.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'code',
    'h2',
    'h3',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
  ],

  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    ol: ['start'],
  },

  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,

  // Links always open in a new tab without giving
  // the other site access to this page.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
    }),
  },
}

/*
* Returns a safe description, or null when it's empty.
*
* - Plain text (no tags) is stored as-is, trimmed, the
*   same way descriptions were saved before the editor.
* - HTML is cleaned with the allowlist above.
* - HTML with no visible text (e.g. "<p></p>") becomes null.
*/
export function sanitizeDescription(
  description: string | null
): string | null {
  const trimmed = description?.trim()

  if (!trimmed) {
    return null
  }

  if (!HTML_TAG_PATTERN.test(trimmed)) {
    return trimmed
  }

  const clean = sanitizeHtml(
    trimmed,
    SANITIZE_OPTIONS
  ).trim()

  const visibleText = sanitizeHtml(clean, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim()

  if (!visibleText) {
    return null
  }

  // If every tag was removed, the result is escaped text
  // (e.g. "x &amp; y"). Wrap it so it's still read as HTML.
  return HTML_TAG_PATTERN.test(clean)
    ? clean
    : `<p>${clean}</p>`
}
