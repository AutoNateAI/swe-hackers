export function buildKeywordsPrompt(analysis) {
  const localCtx = analysis.localContext?.length
    ? `\nLOCAL GRAND RAPIDS CONTEXT:\n${analysis.localContext.map(c => `- ${c}`).join('\n')}`
    : '';
  const profCtx = analysis.professionalContext?.length
    ? `\nPROFESSIONAL INSIGHTS:\n${analysis.professionalContext.map(c => `- ${c}`).join('\n')}`
    : '';

  return `Based on the following analysis of trending content and search data, write a keyword trends post for Grand Rapids professionals.

ANALYSIS:
${JSON.stringify(analysis, null, 2)}
${localCtx}
${profCtx}

Write a post that:
- Highlights trending keywords and search terms relevant to Grand Rapids industries
- Includes specific percentage changes or search volume estimates
- Identifies opportunities Grand Rapids professionals can capitalize on
- References West Michigan market dynamics
- Is 150-250 words

Consider whether this data could be visualized as a chart. If so, include Chart.js config in interactiveData.

Respond with JSON:
{
  "title": "trend-focused title under 80 chars",
  "content": "the full post text (plain text, no HTML)",
  "tags": ["3-5 relevant tags", "grand-rapids"],
  "premium": true,
  "contentType": "text" or "chart",
  "interactiveData": null or { chart.js config object }
}`;
}
