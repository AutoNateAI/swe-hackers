export function buildResultsPrompt(analysis) {
  return `Based on the following analysis of trending content, write a results/case-study post for the AutoNateAI community.

ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Write a post that:
- Showcases specific results, ROI, or revenue data
- Includes concrete numbers (dollars, percentages, time saved)
- Reads like a mini case study or data report
- Is 150-300 words

Respond with JSON:
{
  "title": "compelling title with specific numbers under 80 chars",
  "content": "the full post text (plain text, no HTML)",
  "tags": ["3-5 relevant tags"],
  "premium": true,
  "contentType": "text",
  "interactiveData": null
}`;
}
