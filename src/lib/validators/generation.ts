import { z } from 'zod';

export const SubmitGenerationCommandSchema = z.object({
  sourceText: z.string().min(500).max(10000),
  model: z.string().optional(),
  categoryId: z.string().uuid().optional(),
});

export type SubmitGenerationCommand = z.infer<typeof SubmitGenerationCommandSchema>;

export const GeneratedFlashcardPreviewSchema = z.object({
  question: z.string().min(1).max(200),
  answer: z.string().min(1).max(500),
});

export const AcceptGeneratedCardsCommandSchema = z.object({
  flashcards: z.array(GeneratedFlashcardPreviewSchema).optional(),
});

export type AcceptGeneratedCardsCommand = z.infer<typeof AcceptGeneratedCardsCommandSchema>;
export type GeneratedFlashcardPreview = z.infer<typeof GeneratedFlashcardPreviewSchema>; 