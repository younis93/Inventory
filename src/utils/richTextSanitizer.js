import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'ul',
    'ol',
    'li',
    'blockquote',
    'code',
    'pre',
    'a'
];

const ALLOWED_ATTR = ['href', 'target', 'rel'];

const EMPTY_RICH_TEXT_PATTERNS = [
    /^<p><br><\/p>$/i,
    /^<p>\s*<\/p>$/i
];

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isRichTextEmpty = (value) => {
    const compact = String(value || '').replace(/\s+/g, '');
    return EMPTY_RICH_TEXT_PATTERNS.some((pattern) => pattern.test(compact));
};

export const sanitizeRichTextHtml = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const normalizedInput = HTML_TAG_PATTERN.test(raw)
        ? raw
        : `<p>${escapeHtml(raw).replace(/\n/g, '<br />')}</p>`;

    const sanitized = DOMPurify.sanitize(normalizedInput, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
        FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover']
    }).trim();

    if (!sanitized || isRichTextEmpty(sanitized)) return '';
    return sanitized;
};

export const richTextToPlainText = (value) => {
    const sanitizedHtml = sanitizeRichTextHtml(value);
    if (!sanitizedHtml) return '';

    if (typeof DOMParser === 'undefined') {
        return sanitizedHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    const doc = new DOMParser().parseFromString(sanitizedHtml, 'text/html');
    return String(doc.body.textContent || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export const getSafeRichText = (htmlCandidate, plainTextFallback = '') => {
    const preferred = sanitizeRichTextHtml(htmlCandidate);
    if (preferred) return preferred;
    return sanitizeRichTextHtml(plainTextFallback);
};
