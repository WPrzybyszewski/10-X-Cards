import { z } from 'zod';

export const CreateCategoryCommandSchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(100, 'Category name cannot exceed 100 characters')
    .trim(),
});

export type CreateCategoryCommand = z.infer<typeof CreateCategoryCommandSchema>; 