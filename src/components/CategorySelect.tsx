import { type Control as ControlType, Controller } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import type { CategoryDTO } from '../types';

interface CategorySelectProps {
  control: ControlType<any>;
  categories: CategoryDTO[];
  error?: string;
}

export function CategorySelect({ control, categories, error }: CategorySelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="categoryId">Category (optional)</Label>
      <Controller
        name="categoryId"
        control={control}
        render={({ field }) => (
          <Select
            value={field.value || "none"}
            onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
          >
            <SelectTrigger 
              id="categoryId"
              className={error ? 'border-red-500' : ''}
              aria-invalid={!!error}
              aria-describedby={error ? 'category-error' : undefined}
            >
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error && (
        <p id="category-error" className="text-sm text-red-500" role="alert">{error}</p>
      )}
    </div>
  );
} 