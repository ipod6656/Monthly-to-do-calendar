import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as dotenv from 'dotenv';
dotenv.config();

console.log('Testing Genkit with model googleai/gemini-2.5-flash...');
console.log('API Key present:', !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_GENAI_API_KEY);

const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});

async function test() {
  try {
    const response = await ai.generate('Hi, tell me a short joke.');
    console.log('--- SUCCESSFUL RESPONSE ---');
    console.log(response.text);
    console.log('---------------------------');
  } catch (e: any) {
    console.log('--- ERROR TRIGGERED ---');
    console.error('Error message:', e.message);
    if (e.stack) console.error('Stack trace:', e.stack);
  }
}

test();
