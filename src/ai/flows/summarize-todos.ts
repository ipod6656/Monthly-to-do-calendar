'use server';

import { getAi } from '@/ai/genkit';
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

/**
 * Server Action to summarize todos.
 * Uses lazy initialization of Genkit to prevent startup crashes.
 */
export async function summarizeTodosFlow(input: SummarizeTodosInput): Promise<SummarizeTodosOutput> {
  const ai = getAi();

  const prompt = `You are an intelligent, highly capable AI assistant analyzing a user's task list.
Given the following list of pending tasks, provide a concise, motivational, and strategic briefing (about 3-4 sentences in polite Korean).
Identify what the user should focus on first based on importance and date (especially tasks due today or strictly soon), and give them an encouraging push.

Tasks:
${input.todos.map(todo => `- Title: ${todo.title}
  Due Date: ${todo.date}
  Importance: ${todo.importance || 'Not specified'}
  Description: ${todo.description || 'No description'}`).join('\n')}

If there are no tasks, just say a friendly greeting in Korean telling them they have a free day and they deserve to relax!

Output strictly in JSON format matching the schema:
{
  "summary": "Your motivational briefing here in Korean"
}
`;

  try {
    const { output } = await ai.generate({
      prompt,
      output: { format: 'json', schema: SummarizeTodosOutputSchema },
    });

    if (!output) {
      throw new Error('AI failed to generate a summary');
    }

    return output;
  } catch (error) {
    console.error('Genkit summarization failed:', error);
    return {
      summary: '죄송합니다. 오늘 일정을 요약하는 중에 오류가 발생했습니다. 하지만 당신의 열정은 여전히 빛나고 있어요! 다시 한 번 시도해 주세요.',
    };
  }
}
