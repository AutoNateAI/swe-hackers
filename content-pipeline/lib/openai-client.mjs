import OpenAI from 'openai';

let client;

export function getOpenAI() {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  client = new OpenAI({ apiKey });
  return client;
}

export async function chatCompletion({ model = 'gpt-4o', messages, temperature = 0.7, maxTokens = 2000, responseFormat }) {
  const openai = getOpenAI();
  const params = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (responseFormat) params.response_format = responseFormat;

  const response = await openai.chat.completions.create(params);
  return response.choices[0].message.content;
}
