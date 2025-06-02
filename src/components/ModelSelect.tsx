import { type Control as ControlType, Controller } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import type { ModelOption } from '../types';

// Available models - in real app this should come from API or env
const modelOptions: ModelOption[] = [
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  { label: 'GPT-4', value: 'gpt-4' },
  { label: 'Claude 2', value: 'claude-2' },
];

interface ModelSelectProps {
  control: ControlType<any>;
  error?: string;
}

export function ModelSelect({ control, error }: ModelSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="model">Model</Label>
      <Controller
        name="model"
        control={control}
        render={({ field }) => (
          <Select
            value={field.value}
            onValueChange={field.onChange}
          >
            <SelectTrigger 
              id="model" 
              className={error ? 'border-red-500' : ''}
              aria-invalid={!!error}
              aria-describedby={error ? 'model-error' : undefined}
            >
              <SelectValue placeholder="Select AI model" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error && (
        <p id="model-error" className="text-sm text-red-500" role="alert">{error}</p>
      )}
    </div>
  );
} 