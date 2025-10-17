
'use server';

/**
 * @fileOverview An AI agent that suggests whether to use the Asset Tag, Serial Number, or neither for barcode generation.
 *
 * - suggestBarcodeStrategy - A function that suggests the best strategy for barcode generation.
 * - SuggestBarcodeStrategyInput - The input type for the suggestBarcodeStrategy function.
 * - SuggestBarcodeStrategyOutput - The return type for the suggestBarcodeStrategy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestBarcodeStrategyInputSchema = z.object({
  assetTag: z.string().describe('The asset tag of the item.'),
  serialNumber: z.string().describe('The serial number of the item.'),
});
export type SuggestBarcodeStrategyInput = z.infer<typeof SuggestBarcodeStrategyInputSchema>;

const SuggestBarcodeStrategyOutputSchema = z.object({
  suggestion: z.enum(['assetTag', 'serialNumber', 'neither']).describe('The suggested strategy for barcode generation.'),
  reason: z.string().describe('The reasoning behind the suggestion.'),
});
export type SuggestBarcodeStrategyOutput = z.infer<typeof SuggestBarcodeStrategyOutputSchema>;

export async function suggestBarcodeStrategy(input: SuggestBarcodeStrategyInput): Promise<SuggestBarcodeStrategyOutput> {
  return suggestBarcodeStrategyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBarcodeStrategyPrompt',
  input: {schema: SuggestBarcodeStrategyInputSchema},
  output: {schema: SuggestBarcodeStrategyOutputSchema},
  prompt: `You are an expert in barcode generation strategies. Given an asset tag and a serial number, you will suggest whether to use the asset tag, the serial number, or neither for generating a barcode. Explain your reasoning.

Asset Tag: {{{assetTag}}}
Serial Number: {{{serialNumber}}}

Consider these factors:
- Asset tags are typically shorter and easier to scan, but may not be unique.
- Serial numbers are typically unique, but longer and harder to scan.
- If both are present and seem valid, default to the asset tag for ease of use.
- If only one is present and seems valid, suggest that one.
- If neither is present or valid, suggest neither.

Your response should be in JSON format:
{
  "suggestion": "assetTag" | "serialNumber" | "neither",
  "reason": "explanation of the suggestion"
}
`,
});

const suggestBarcodeStrategyFlow = ai.defineFlow(
  {
    name: 'suggestBarcodeStrategyFlow',
    inputSchema: SuggestBarcodeStrategyInputSchema,
    outputSchema: SuggestBarcodeStrategyOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      
      const validSuggestions = ["assetTag", "serialNumber", "neither"] as const;
      const suggestion =
        validSuggestions.includes(output!.suggestion as any)
          ? (output!.suggestion as "assetTag" | "serialNumber" | "neither")
          : "neither";

      return {
        suggestion,
        reason: output!.reason || 'AI suggestion was invalid.',
      };

    } catch (error) {
      console.warn("AI suggestion call failed:", error);
      // Return a default/fallback value that matches the output schema
      return {
        suggestion: 'neither',
        reason: 'AI suggestion could not be generated due to a temporary error.'
      };
    }
  }
);
