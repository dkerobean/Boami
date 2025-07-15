/**
 * Utility functions for handling HTML content
 */

/**
 * Strips HTML tags from a string and returns plain text
 * @param html - HTML string to clean
 * @returns Plain text without HTML tags
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';
  
  // Create a temporary div element to parse HTML
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }
  
  // Fallback for server-side rendering - simple regex replacement
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Truncates text to a specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Converts HTML to plain text and optionally truncates it
 * @param html - HTML string to process
 * @param maxLength - Optional maximum length for truncation
 * @returns Clean plain text
 */
export function htmlToPlainText(html: string, maxLength?: number): string {
  const plainText = stripHtmlTags(html);
  return maxLength ? truncateText(plainText, maxLength) : plainText;
}