export function buildKeywordsPrompt(analysis) {
  return `Based on the following analysis of trending content and search data, write a keyword trends post for the AutoNateAI community.

ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Write a post that:
- Highlights trending keywords and search terms in the AI space
- Includes specific percentage changes or search volume estimates
- Identifies opportunities builders can capitalize on
- Is 150-250 words

Consider whether this data could be visualized as a chart. If so, include Chart.js config in interactiveData.

Respond with JSON:
{
  "title": "trend-focused title under 80 chars",
  "content": "the full post text (plain text, no HTML)",
  "tags": ["3-5 relevant tags"],
  "premium": true,
  "contentType": "text" or "chart",
  "interactiveData": null or { chart.js config object }
}`;
}
