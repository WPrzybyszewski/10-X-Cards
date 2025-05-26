import { z } from 'zod';

export const CreateFlashcardCommandSchema = z.object({
  question: z.string().min(1).max(200),
  answer: z.string().min(1).max(500),
  categoryId: z.string().uuid().optional(),
});

export type CreateFlashcardCommand = z.infer<typeof CreateFlashcardCommandSchema>;

export const UpdateFlashcardCommandSchema = z.object({
  question: z.string().min(1).max(200).optional(),
  answer: z.string().min(1).max(500).optional(),
  categoryId: z.string().uuid().optional(),
}).refine(
  data => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export type UpdateFlashcardCommand = z.infer<typeof UpdateFlashcardCommandSchema>; 