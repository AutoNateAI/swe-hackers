export function buildJobsPrompt(analysis) {
  const localCtx = analysis.localContext?.length
    ? `\nLOCAL GRAND RAPIDS CONTEXT:\n${analysis.localContext.map(c => `- ${c}`).join('\n')}`
    : '';
  const profCtx = analysis.professionalContext?.length
    ? `\nPROFESSIONAL INSIGHTS:\n${analysis.professionalContext.map(c => `- ${c}`).join('\n')}`
    : '';

  return `Based on the following analysis of job market content, write a job listing post for Grand Rapids professionals.

ANALYSIS:
${JSON.stringify(analysis, null, 2)}
${localCtx}
${profCtx}

Write a job listing that:
- Has a clear title with role, arrangement (remote/hybrid/on-site in GR), and salary range
- Describes what the person will work on day-to-day in the Grand Rapids area
- Lists specific tech requirements
- Includes compensation details
- References the Grand Rapids job market and local employers when relevant
- Is 100-200 words

Respond with JSON:
{
  "title": "Role Title - Grand Rapids, Arrangement, $Salary Range",
  "content": "the full job listing text (plain text, no HTML)",
  "tags": ["3-5 relevant tags", "grand-rapids"],
  "premium": false,
  "contentType": "text",
  "interactiveData": null
}`;
}
