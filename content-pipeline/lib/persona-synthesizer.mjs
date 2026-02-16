import { chatCompletion } from './openai-client.mjs';
import { createLogger } from './logger.mjs';

const log = createLogger('persona-synthesizer');

export const AVATAR_COLORS = {
  executives: '#1a237e',
  management: '#0d47a1',
  tech: '#00695c',
  finance: '#2e7d32',
  healthcare: '#c62828',
  sales: '#e65100',
  marketing: '#ad1457',
  legal: '#4a148c',
  education: '#f57f17',
  'real-estate': '#3e2723',
  nonprofit: '#263238'
};

const ARCHETYPE_PATTERNS = [
  {
    key: 'senior',
    regex: /CEO|CFO|COO|CTO|CMO|VP|Vice President|Director|President|Founder|Partner|Managing Director|Executive Director/i,
    label: 'Senior Leader'
  },
  {
    key: 'mid',
    regex: /Manager|Lead|Senior|Supervisor|Coordinator|Head of/i,
    label: 'Mid-Level Professional'
  },
  {
    key: 'specialist',
    regex: /Engineer|Analyst|Designer|Developer|Architect|Specialist|Consultant|Advisor|Associate|Specialist/i,
    label: 'Specialist'
  }
];

export function clusterProfiles(profiles) {
  const clusters = { senior: [], mid: [], specialist: [] };

  for (const profile of profiles) {
    const headline = profile.headline || '';
    let matched = false;

    for (const pattern of ARCHETYPE_PATTERNS) {
      if (pattern.regex.test(headline)) {
        clusters[pattern.key].push(profile);
        matched = true;
        break;
      }
    }

    if (!matched) {
      clusters.specialist.push(profile);
    }
  }

  log.info('Profile clustering complete', {
    senior: clusters.senior.length,
    mid: clusters.mid.length,
    specialist: clusters.specialist.length
  });

  return clusters;
}

export async function synthesizePersona(cluster, category, archetypeIndex, usedNames = []) {
  const archetype = ARCHETYPE_PATTERNS[archetypeIndex];
  const sample = cluster.slice(0, 10);
  const headlines = sample.map(p => p.headline).filter(Boolean);
  const locations = sample.map(p => p.location).filter(Boolean);

  const nameConstraint = usedNames.length > 0
    ? `\nALREADY USED NAMES (do NOT reuse any of these): ${usedNames.join(', ')}\nChoose a COMPLETELY DIFFERENT first AND last name. Vary ethnicity, style, and surname origin. Do not default to Dutch surnames every time — mix in Polish, Latino, Black, Asian, and other backgrounds common in Grand Rapids.`
    : '\nVary name origins — Grand Rapids is diverse. Mix Dutch, Polish, Latino, Black, Asian, and other backgrounds.';

  const prompt = `You are synthesizing a FICTIONAL composite persona from real Grand Rapids, Michigan professional profiles.

CATEGORY: ${category}
ARCHETYPE: ${archetype.label}
${nameConstraint}

SAMPLE PROFILES (anonymized headlines & locations):
${JSON.stringify({ headlines, locations })}

Create ONE fictional persona that represents this professional archetype in Grand Rapids. The persona should:
1. Have a realistic West Michigan name (NOT any name from the profiles, NOT any already-used name)
2. Have a role that represents the common thread across these profiles
3. Have a bio rooted in Grand Rapids / West Michigan context
4. Have expertise tags relevant to Grand Rapids industries
5. Have a system prompt that makes this persona speak authentically as a GR professional

CRITICAL: DO NOT clone any individual profile. This is a COMPOSITE - blend traits from multiple profiles.

Respond with JSON:
{
  "displayName": "First Last",
  "initial": "F",
  "role": "Professional Title",
  "bio": "1-2 sentence bio mentioning Grand Rapids (50-100 chars)",
  "expertise": ["3-5 expertise tags"],
  "tone": "3 descriptive tone words",
  "categories": ["from: strategies, results, tips, jobs, keywords - pick 1-3 relevant ones"],
  "systemPrompt": "Detailed persona prompt (150-250 words). Include: GR context, professional perspective, speaking style, phrases they'd use, topics they care about. Reference Grand Rapids landmarks, industries (furniture, healthcare, food manufacturing, tech startups), and West Michigan culture."
}`;

  try {
    const raw = await chatCompletion({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      maxTokens: 1500
    });

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const persona = {
      id: parsed.displayName.toLowerCase().replace(/\s+/g, '-'),
      displayName: parsed.displayName,
      initial: parsed.initial,
      role: parsed.role,
      bio: parsed.bio,
      expertise: parsed.expertise,
      tone: parsed.tone,
      categories: parsed.categories,
      systemPrompt: parsed.systemPrompt,
      avatarColor: AVATAR_COLORS[category] || '#455a64',
      active: true,
      source: 'linkedin-synthesis',
      sourceCategory: category,
      sourceProfileCount: cluster.length,
      synthesizedAt: new Date().toISOString()
    };

    log.info(`Synthesized persona: ${persona.displayName}`, {
      id: persona.id,
      category,
      archetype: archetype.label
    });

    return persona;
  } catch (err) {
    log.error(`Failed to synthesize persona for ${category} / ${archetype.label}`, {
      error: err.message
    });
    throw err;
  }
}
