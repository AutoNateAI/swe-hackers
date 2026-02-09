/**
 * Basketball AI Service
 *
 * Generates play JSON from natural language descriptions using OpenAI.
 * Falls back to preset suggestions when API is unavailable.
 */

const BasketballAI = {

  _history: [],
  _apiKey: null,

  SYSTEM_PROMPT: `You are Coach AI, an expert basketball strategy assistant for AutoNateAI. You help coaches design plays and formations.

When asked to create a play, respond with valid JSON wrapped in a \`\`\`json code block. Use this exact structure:

\`\`\`json
{
  "name": "Play Name",
  "description": "Brief description of the play",
  "tags": ["halfcourt", "ball-screen"],
  "formation": {
    "offense": [
      { "id": "o1", "label": "PG", "x": 25, "y": 32 },
      { "id": "o2", "label": "SG", "x": 5, "y": 8 },
      { "id": "o3", "label": "SF", "x": 45, "y": 8 },
      { "id": "o4", "label": "PF", "x": 17, "y": 20 },
      { "id": "o5", "label": "C", "x": 33, "y": 20 }
    ],
    "defense": [
      { "id": "d1", "label": "1", "x": 23, "y": 29 },
      { "id": "d2", "label": "2", "x": 7, "y": 6 },
      { "id": "d3", "label": "3", "x": 43, "y": 6 },
      { "id": "d4", "label": "4", "x": 15, "y": 17 },
      { "id": "d5", "label": "5", "x": 31, "y": 17 }
    ],
    "ball": { "holder": "o1" }
  },
  "steps": [
    {
      "duration": 1200,
      "description": "Step description",
      "movements": [
        { "playerId": "o1", "toX": 30, "toY": 25, "type": "dribble" }
      ],
      "ball": { "holder": "o1" }
    }
  ]
}
\`\`\`

COURT COORDINATES:
- x: 0-50 (left sideline to right sideline)
- y: 0-47 (baseline to half-court line)
- Basket: (25, 5.25)
- Free throw line: y=19
- Three-point arc: ~23.75ft radius from basket

MOVEMENT TYPES: cut, dribble, screen, roll, fade, spot-up
BALL: Set "holder" to the player ID who has the ball. Add "passFrom" when a pass occurs.

RULES:
- Always include exactly 5 offense players (o1-o5: PG, SG, SF, PF, C)
- Always include exactly 5 defense players (d1-d5)
- Keep positions within court bounds (x: 2-48, y: 2-45)
- Each step should take 600-2000ms duration
- Use realistic basketball movements and spacing

When giving advice (not creating plays), just respond normally in text.`,

  /**
   * Initialize with API key
   */
  init(apiKey) {
    this._apiKey = apiKey;
    this._history = [];
  },

  /**
   * Send a message to the AI and get a response
   */
  async chat(message) {
    this._history.push({ role: 'user', content: message });

    // Try API call first
    if (this._apiKey) {
      try {
        const response = await this._callAPI(message);
        this._history.push({ role: 'assistant', content: response });
        return { text: response, play: this._extractPlay(response) };
      } catch (error) {
        console.warn('API call failed, using fallback:', error.message);
      }
    }

    // Fallback: pattern matching for common requests
    const fallback = this._generateFallback(message);
    this._history.push({ role: 'assistant', content: fallback.text });
    return fallback;
  },

  /**
   * Call OpenAI API
   */
  async _callAPI(message) {
    const messages = [
      { role: 'system', content: this.SYSTEM_PROMPT },
      ...this._history.slice(-10) // Keep last 10 messages for context
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this._apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  /**
   * Extract play JSON from AI response
   */
  _extractPlay(text) {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) return null;

    try {
      const play = JSON.parse(jsonMatch[1]);
      if (play.formation && play.name) {
        play.id = null;
        play.createdAt = new Date().toISOString();
        play.updatedAt = new Date().toISOString();
        return play;
      }
    } catch (e) {
      console.warn('Failed to parse play JSON:', e);
    }
    return null;
  },

  /**
   * Fallback response when API is unavailable
   */
  _generateFallback(message) {
    const lower = message.toLowerCase();

    // Check for play generation requests
    if (lower.includes('pick and roll') || lower.includes('pnr') || lower.includes('ball screen')) {
      const play = window.PlayData?.loadPreset('pick-and-roll');
      return {
        text: "Here's a classic Pick and Roll play. The PG uses a ball screen from the C at the top of the key, then attacks downhill while the C rolls to the basket. I've loaded it onto the court - hit Play to see it in action!",
        play: play
      };
    }

    if (lower.includes('give and go') || lower.includes('give & go')) {
      const play = window.PlayData?.loadPreset('give-and-go');
      return {
        text: "Give and Go loaded! The PG passes to the wing and immediately cuts to the basket for the return pass. Simple but effective when the defender falls asleep.",
        play: play
      };
    }

    if (lower.includes('backdoor') || lower.includes('back door') || lower.includes('back cut')) {
      const play = window.PlayData?.loadPreset('backdoor-cut');
      return {
        text: "Backdoor Cut set up! The SF fakes toward the ball to bait the defender, then reverses hard to the basket. Great against aggressive defenders who overplay the passing lanes.",
        play: play
      };
    }

    if (lower.includes('motion') || lower.includes('ball reversal') || lower.includes('weak side')) {
      const play = window.PlayData?.loadPreset('motion-weak');
      return {
        text: "Motion Weak Side action loaded! Ball reversal through the elbow with a screen on the weak side. Creates good movement and multiple scoring options.",
        play: play
      };
    }

    if (lower.includes('zone') || lower.includes('2-3') || lower.includes('3-2')) {
      return {
        text: "For zone offense, use the Spread (5-Out) formation to stretch the defense. Put shooters in the gaps of the zone and look for short corner opportunities. Use the Formation dropdown to switch to '5-Out Spread' and try different zone defenses from the Defense dropdown.",
        play: null
      };
    }

    if (lower.includes('formation') || lower.includes('lineup') || lower.includes('set up')) {
      return {
        text: "You can choose from several formations:\n- **Horns**: Two bigs at the elbows, great for ball screens\n- **1-4 High**: Four across the free throw line, good spacing\n- **1-3-1**: Classic set with the C on the block\n- **5-Out Spread**: Maximum spacing, all shooters\n- **Box Set**: Four in a box around the key\n\nUse the Formation dropdown to load any of these.",
        play: null
      };
    }

    // Default helpful response
    return {
      text: "I can help you design plays! Try asking me to:\n- **Create a pick and roll play**\n- **Set up a give and go**\n- **Design a backdoor cut**\n- **Run motion offense**\n- **Explain zone defense**\n\nOr describe any play concept and I'll set it up on the court for you.",
      play: null
    };
  },

  /**
   * Get chat history
   */
  getHistory() {
    return [...this._history];
  },

  /**
   * Clear chat history
   */
  clearHistory() {
    this._history = [];
  }
};

window.BasketballAI = BasketballAI;
