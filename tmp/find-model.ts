import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as dotenv from 'dotenv';
dotenv.config();

const ai = genkit({
  plugins: [googleAI()],
});

async function listModels() {
  // In genkit v1, we can't easily list models from the 'ai' object without the CLI
  // but we can try to generate with a few and see which one doesn't 404.
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  
  for (const m of models) {
    try {
      console.log(`Testing model: ${m}...`);
      const res = await ai.generate({
        model: `googleai/${m}`,
        prompt: 'hi',
      });
      console.log(`✅ Model ${m} works! Result: ${res.text}`);
      break; 
    } catch (e: any) {
      console.log(`❌ Model ${m} failed: ${e.message}`);
    }
  }
}

listModels();
