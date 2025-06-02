import { useQuery } from '@tanstack/react-query';
import { GenerateForm } from './GenerateForm';
import { GenerationTaskList } from './GenerationTaskList';
import { alertManager } from './ui/alert-stack';
import type { GenerationDTO, CategoryDTO } from '../types';

interface ApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

export default function GeneratePage() {
  // Fetch categories
  const { data: categoriesResponse, error: categoriesError } = useQuery<ApiResponse<CategoryDTO[]>>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/v1/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Fetch generation tasks
  const { data: tasksResponse, error: tasksError } = useQuery<ApiResponse<GenerationDTO[]>>({
    queryKey: ['generations'],
    queryFn: async () => {
      const response = await fetch('/api/v1/generations');
      if (!response.ok) throw new Error('Failed to fetch generations');
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds as specified in the plan
  });

  // Show errors if any
  if (categoriesError || tasksError) {
    alertManager.show('Failed to load required data', { 
      type: 'error',
      duration: 5000
    });
  }

  const handleGenerationSuccess = (generation: GenerationDTO) => {
    alertManager.show('Generation task started successfully', { 
      type: 'success' 
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Generate AI Cards</h1>
      
      <div className="space-y-8">
        <GenerateForm 
          categories={categoriesResponse?.data || []}
          onSuccess={handleGenerationSuccess}
        />
        
        <GenerationTaskList 
          tasks={tasksResponse?.data || []}
        />
      </div>
    </div>
  );
} 