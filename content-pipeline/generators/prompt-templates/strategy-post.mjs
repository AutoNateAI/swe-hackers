export function buildStrategyPrompt(analysis) {
  return `Based on the following analysis of trending content, write a strategy post for the AutoNateAI community.

ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Write a post that:
- Shares a specific, actionable strategy for making money with AI
- Includes concrete steps, numbers, or frameworks
- Feels like advice from someone who has done it
- Is 150-300 words

Respond with JSON:
{
  "title": "compelling title under 80 chars",
  "content": "the full post text (plain text, no HTML)",
  "tags": ["3-5 relevant tags"],
  "premium": false,
  "contentType": "text",
  "interactiveData": null
}`;
}
