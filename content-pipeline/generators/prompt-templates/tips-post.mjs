export function buildTipsPrompt(analysis) {
  const localCtx = analysis.localContext?.length
    ? `\nLOCAL GRAND RAPIDS CONTEXT:\n${analysis.localContext.map(c => `- ${c}`).join('\n')}`
    : '';
  const profCtx = analysis.professionalContext?.length
    ? `\nPROFESSIONAL INSIGHTS:\n${analysis.professionalContext.map(c => `- ${c}`).join('\n')}`
    : '';

  return `Based on the following analysis of trending content, write a tips/how-to post for Grand Rapids professionals.

ANALYSIS:
${JSON.stringify(analysis, null, 2)}
${localCtx}
${profCtx}

Write a post that:
- Shares practical, immediately usable tips for professionals in Grand Rapids
- Uses numbered lists or clear structure
- Is technically accurate and specific to West Michigan's professional landscape
- References local resources, organizations, or events when relevant
- Is 150-300 words

Respond with JSON:
{
  "title": "actionable title under 80 chars",
  "content": "the full post text (plain text, no HTML)",
  "tags": ["3-5 relevant tags", "grand-rapids"],
  "premium": false,
  "contentType": "text",
  "interactiveData": null
}`;
}
