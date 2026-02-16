export function buildInteractivePrompt(analysis, type = 'cytoscape') {
  const localCtx = analysis.localContext?.length
    ? `\nLOCAL GRAND RAPIDS CONTEXT:\n${analysis.localContext.map(c => `- ${c}`).join('\n')}`
    : '';
  const profCtx = analysis.professionalContext?.length
    ? `\nPROFESSIONAL INSIGHTS:\n${analysis.professionalContext.map(c => `- ${c}`).join('\n')}`
    : '';

  const vizInstructions = type === 'cytoscape'
    ? `Generate a Cytoscape.js visualization. The interactiveData should be:
{
  "elements": { "nodes": [...], "edges": [...] },
  "style": [...cytoscape style array...],
  "layout": { "name": "cose" or "dagre" or "breadthfirst" }
}`
    : `Generate a Chart.js visualization. The interactiveData should be a valid Chart.js config:
{
  "type": "bar" or "line" or "doughnut" or "radar",
  "data": { "labels": [...], "datasets": [...] },
  "options": { ... }
}`;

  return `Based on the following analysis, write an interactive visualization post for Grand Rapids professionals.

ANALYSIS:
${JSON.stringify(analysis, null, 2)}
${localCtx}
${profCtx}

Write a post that:
- Introduces the visualization with 2-3 sentences of context relevant to Grand Rapids
- The visual tells a compelling data story about trends affecting GR professionals
- Content is 50-100 words (the visual does the heavy lifting)

${vizInstructions}

Respond with JSON:
{
  "title": "descriptive title under 80 chars",
  "content": "brief intro text (plain text, no HTML)",
  "tags": ["3-5 relevant tags", "grand-rapids"],
  "premium": false,
  "contentType": "${type === 'cytoscape' ? 'interactive' : 'chart'}",
  "interactiveData": { ...visualization config... }
}`;
}
