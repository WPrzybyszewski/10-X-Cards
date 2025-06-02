import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ModelSelect } from './ModelSelect';
import { CategorySelect } from './CategorySelect';
import type { CategoryDTO, GenerationDTO } from '../types';
import { Label } from './ui/label';

const generateFormSchema = z.object({
  sourceText: z.string().min(20, 'Text must be at least 20 characters long'),
  model: z.string().min(1, 'Please select a model'),
  categoryId: z.string().optional()
});

type GenerateFormData = z.infer<typeof generateFormSchema>;

interface GenerateFormProps {
  categories: CategoryDTO[];
  onSuccess: (generation: GenerationDTO) => void;
}

export function GenerateForm({ categories, onSuccess }: GenerateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control
  } = useForm<GenerateFormData>({
    resolver: zodResolver(generateFormSchema),
    defaultValues: {
      model: import.meta.env.DEFAULT_MODEL || ''
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: GenerateFormData) => {
      const response = await fetch('/api/v1/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      return response.json() as Promise<GenerationDTO>;
    },
    onSuccess: (data) => {
      onSuccess(data);
    }
  });

  const onSubmit = async (data: GenerateFormData) => {
    await mutation.mutateAsync(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor="sourceText">Source Text</Label>
          <Textarea
            id="sourceText"
            {...register('sourceText')}
            placeholder="Paste your text here..."
            className="min-h-[200px]"
          />
          {errors.sourceText && (
            <p className="text-sm text-red-500">{errors.sourceText.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModelSelect
          control={control}
          error={errors.model?.message}
        />

        <CategorySelect
          control={control}
          categories={categories}
          error={errors.categoryId?.message}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full md:w-auto"
      >
        {isSubmitting ? 'Generating...' : 'Generate'}
      </Button>
    </form>
  );
} 