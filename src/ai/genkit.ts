import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

let instance: any = null;

export const getAi = () => {
  if (instance) return instance;

  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  instance = genkit({
    plugins: [
      googleAI({
        apiKey: apiKey || 'DUMMY_KEY_FOR_RUNTIME_FALLBACK', // Provide dummy key to avoid crash, will fail at runtime if key is missing when actually used
      }),
    ],
    model: 'googleai/gemini-2.5-flash',
  });

  return instance;
};
