export function buildStrategyPrompt(analysis) {
  const localCtx = analysis.localContext?.length
    ? `\nLOCAL GRAND RAPIDS CONTEXT:\n${analysis.localContext.map(c => `- ${c}`).join('\n')}`
    : '';
  const profCtx = analysis.professionalContext?.length
    ? `\nPROFESSIONAL INSIGHTS:\n${analysis.professionalContext.map(c => `- ${c}`).join('\n')}`
    : '';

  return `Based on the following analysis of trending content, write a strategy post for Grand Rapids professionals.

ANALYSIS:
${JSON.stringify(analysis, null, 2)}
${localCtx}
${profCtx}

Write a post that:
- Shares a specific, actionable strategy relevant to Grand Rapids professionals
- Includes concrete steps, numbers, or frameworks
- References local Grand Rapids context when appropriate (industries, companies, events)
- Feels like advice from a fellow GR professional who has done it
- Is 150-300 words

Respond with JSON:
{
  "title": "compelling title under 80 chars",
  "content": "the full post text (plain text, no HTML)",
  "tags": ["3-5 relevant tags", "grand-rapids"],
  "premium": false,
  "contentType": "text",
  "interactiveData": null
}`;
}
