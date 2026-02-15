export function buildTipsPrompt(analysis) {
  return `Based on the following analysis of trending content, write a tips/how-to post for the AutoNateAI community.

ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Write a post that:
- Shares practical, immediately usable tips
- Uses numbered lists or clear structure
- Is technically accurate and specific
- Is 150-300 words

Respond with JSON:
{
  "title": "actionable title under 80 chars",
  "content": "the full post text (plain text, no HTML)",
  "tags": ["3-5 relevant tags"],
  "premium": false,
  "contentType": "text",
  "interactiveData": null
}`;
}
