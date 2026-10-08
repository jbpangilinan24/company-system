// --------------------------------------------------
// RICH TEXT HELPERS
//
// Task descriptions used to be plain text. New ones are
// HTML from the Tiptap editor. These helpers let the rest
// of the app handle both formats.
// --------------------------------------------------

// Matches an HTML tag such as <p>, </li> or <br />.
// Must match HTML_TAG_PATTERN in backend/src/utils/sanitizeDescription.ts
const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/i

export function isHtml(value: string) {
  return HTML_TAG_PATTERN.test(value)
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/*
* Prepares a stored description for Tiptap.
*
* HTML is returned unchanged. Plain text is converted
* into one paragraph per line, so existing line breaks
* are kept instead of being merged into one line.
*/
export function toEditorHtml(
  value: string | null | undefined
) {
  if (!value) {
    return ''
  }

  if (isHtml(value)) {
    return value
  }

  return value
    .split(/\r?\n/)
    .map((line) =>
      line ? `<p>${escapeHtml(line)}</p>` : '<p></p>'
    )
    .join('')
}

/*
* Returns readable text without HTML tags.
* Used for the task list preview and search.
*
* DOMParser creates an inert document: scripts don't run
* and images don't load, so this is safe for any input.
*/
export function toPlainText(
  value: string | null | undefined
) {
  if (!value) {
    return ''
  }

  if (!isHtml(value)) {
    return value
  }

  const document = new DOMParser().parseFromString(
    value,
    'text/html'
  )

  // Add a space after block elements so words from
  // separate paragraphs or list items don't run together.
  document.body
    .querySelectorAll('p, li, h2, h3, blockquote, br')
    .forEach((element) => element.after(' '))

  return (document.body.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
}

// --------------------------------------------------
// LINK URLS
// --------------------------------------------------

// Must match allowedSchemes in backend/src/utils/sanitizeDescription.ts
const ALLOWED_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:']

/*
* True only for complete http(s) or mailto URLs.
* Anything else (javascript:, data:, file:, ...) is rejected.
*/
export function isAllowedLinkUrl(url: string | undefined) {
  if (!url) {
    return false
  }

  try {
    const parsed = new URL(url)

    if (!ALLOWED_LINK_PROTOCOLS.includes(parsed.protocol)) {
      return false
    }

    return parsed.protocol === 'mailto:'
      ? parsed.pathname.length > 0
      : parsed.hostname.length > 0
  } catch {
    // new URL() throws for text that isn't a URL.
    return false
  }
}

/*
* Turns what the user typed into a safe URL, or null.
*
* - "example.com"      -> "https://example.com"
* - "name@example.com" -> "mailto:name@example.com"
* - "javascript:..."   -> null (has a scheme that isn't allowed)
*/
export function normalizeLinkUrl(input: string) {
  const value = input.trim()

  if (!value) {
    return null
  }

  // Starts with "scheme:" (but not "host:8080", where a
  // number follows the colon).
  const hasScheme = /^[a-z][a-z\d+.-]*:(?!\d)/i.test(value)

  let candidate = value

  if (!hasScheme) {
    candidate =
      value.includes('@') && !value.includes('/')
        ? `mailto:${value}`
        : `https://${value}`
  }

  return isAllowedLinkUrl(candidate) ? candidate : null
}
