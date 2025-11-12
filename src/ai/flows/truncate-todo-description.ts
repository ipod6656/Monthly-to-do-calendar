'use server';

/**
 * @fileOverview Uses an LLM to determine if a todo description should be truncated and displayed in a tooltip.
 *
 * - truncateTodoDescription - A function that intelligently truncates a todo description using an LLM.
 * - TruncateTodoDescriptionInput - The input type for the truncateTodoDescription function.
 * - TruncateTodoDescriptionOutput - The return type for the truncateTodoDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TruncateTodoDescriptionInputSchema = z.object({
  description: z
    .string()
    .describe('The full text of the todo description.'),
  maxLength: z
    .number()
    .default(50)
    .describe('The maximum length of the description before truncation.'),
});

export type TruncateTodoDescriptionInput = z.infer<
  typeof TruncateTodoDescriptionInputSchema
>;

const TruncateTodoDescriptionOutputSchema = z.object({
  truncatedDescription: z
    .string()
    .describe(
      'The truncated description, or the full description if truncation is not needed.'
    ),
  useTooltip: z
    .boolean()
    .describe(
      'Whether a tooltip should be used to display the full description.'
    ),
});

export type TruncateTodoDescriptionOutput = z.infer<
  typeof TruncateTodoDescriptionOutputSchema
>;

export async function truncateTodoDescription(
  input: TruncateTodoDescriptionInput
): Promise<TruncateTodoDescriptionOutput> {
  return truncateTodoDescriptionFlow(input);
}

const truncateDescriptionPrompt = ai.definePrompt({
  name: 'truncateDescriptionPrompt',
  input: {schema: TruncateTodoDescriptionInputSchema},
  output: {schema: TruncateTodoDescriptionOutputSchema},
  prompt: `You are a helpful assistant that determines if a todo description should be truncated.

Given a todo description and a maximum length, decide whether to truncate the description and display the full text in a tooltip, or display the full description on multiple lines if it enhances readability and prevents clutter in a calendar view.

Description: {{{description}}}
Maximum Length: {{{maxLength}}}

Consider these factors:
- Readability: Displaying the full description on multiple lines should enhance readability.
- Clutter: Avoid adding too many lines to a single calendar entry, which could make the calendar appear cluttered.
- Length: Truncate only if the description exceeds the maximum length and cannot be displayed neatly on multiple lines.

Output in JSON format:
{
  "truncatedDescription": "The truncated description or the full description if truncation is not needed.",
  "useTooltip": true or false, depending on whether a tooltip is needed.
}

Your response:`,
});

const truncateTodoDescriptionFlow = ai.defineFlow(
  {
    name: 'truncateTodoDescriptionFlow',
    inputSchema: TruncateTodoDescriptionInputSchema,
    outputSchema: TruncateTodoDescriptionOutputSchema,
  },
  async input => {
    const {output} = await truncateDescriptionPrompt(input);
    return output!;
  }
);
