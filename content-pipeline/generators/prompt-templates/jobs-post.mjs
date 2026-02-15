export function buildJobsPrompt(analysis) {
  return `Based on the following analysis of job market content, write a job listing post for the AutoNateAI community.

ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Write a job listing that:
- Has a clear title with role, arrangement (remote/hybrid), and salary range
- Describes what the person will work on day-to-day
- Lists specific tech requirements
- Includes compensation details
- Is 100-200 words

Respond with JSON:
{
  "title": "Role Title - Arrangement, $Salary Range",
  "content": "the full job listing text (plain text, no HTML)",
  "tags": ["3-5 relevant tags like remote, contract, AI-automation"],
  "premium": false,
  "contentType": "text",
  "interactiveData": null
}`;
}
