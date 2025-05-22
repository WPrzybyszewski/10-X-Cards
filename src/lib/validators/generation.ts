import { z } from 'zod';

export const SubmitGenerationCommandSchema = z.object({
  sourceText: z.string().min(1000).max(10000),
  model: z.string().optional(),
  categoryId: z.string().uuid().optional(),
});

export type SubmitGenerationCommand = z.infer<typeof SubmitGenerationCommandSchema>; 