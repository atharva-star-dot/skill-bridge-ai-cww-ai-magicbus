export function wrapUntrustedContent(
  tag: 'candidate_answer' | 'candidate_resume',
  content: string
): string {
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<${tag}>${escaped}</${tag}>`;
}
