'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SummarizeTodosInputSchema = z.object({
  todos: z.array(z.object({
    title: z.string(),
    description: z.string().optional().nullable(),
    importance: z.union([z.literal("High"), z.literal("Medium"), z.literal("Low")]).optional().nullable(),
    date: z.string(),
  })),
});

export type SummarizeTodosInput = z.infer<typeof SummarizeTodosInputSchema>;

const SummarizeTodosOutputSchema = z.object({
  summary: z.string(),
});

export type SummarizeTodosOutput = z.infer<typeof SummarizeTodosOutputSchema>;

const summarizeTodosPrompt = ai.definePrompt({
  name: 'summarizeTodosPrompt',
  input: { schema: SummarizeTodosInputSchema },
  output: { schema: SummarizeTodosOutputSchema },
  prompt: `You are an intelligent, highly capable AI assistant analyzing a user's task list.
Given the following list of pending tasks, provide a concise, motivational, and strategic briefing (about 3-4 sentences in polite Korean).
Identify what the user should focus on first based on importance and date (especially tasks due today or strictly soon), and give them an encouraging push.

Tasks:
{{#each todos}}
- Title: {{title}}
  Due Date: {{date}}
  Importance: {{importance}}
  Description: {{description}}
{{/each}}

If there are no tasks, just say a friendly greeting in Korean telling them they have a free day and they deserve to relax!

Output strictly in JSON format matching the schema:
{
  "summary": "Your motivational briefing here in Korean"
}
`,
});

export const summarizeTodosFlow = ai.defineFlow(
  {
    name: 'summarizeTodosFlow',
    inputSchema: SummarizeTodosInputSchema,
    outputSchema: SummarizeTodosOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeTodosPrompt(input);
    return output!;
  }
);
