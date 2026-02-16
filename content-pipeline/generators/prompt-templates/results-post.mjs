export function buildResultsPrompt(analysis) {
  const localCtx = analysis.localContext?.length
    ? `\nLOCAL GRAND RAPIDS CONTEXT:\n${analysis.localContext.map(c => `- ${c}`).join('\n')}`
    : '';
  const profCtx = analysis.professionalContext?.length
    ? `\nPROFESSIONAL INSIGHTS:\n${analysis.professionalContext.map(c => `- ${c}`).join('\n')}`
    : '';

  return `Based on the following analysis of trending content, write a results/case-study post for Grand Rapids professionals.

ANALYSIS:
${JSON.stringify(analysis, null, 2)}
${localCtx}
${profCtx}

Write a post that:
- Showcases specific results, ROI, or impact data relevant to the Grand Rapids market
- Includes concrete numbers (dollars, percentages, time saved)
- Reads like a mini case study from a West Michigan professional
- References local industries or companies when appropriate
- Is 150-300 words

Respond with JSON:
{
  "title": "compelling title with specific numbers under 80 chars",
  "content": "the full post text (plain text, no HTML)",
  "tags": ["3-5 relevant tags", "grand-rapids"],
  "premium": true,
  "contentType": "text",
  "interactiveData": null
}`;
}
