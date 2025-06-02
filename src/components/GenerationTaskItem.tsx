import { Progress } from './ui/progress';
import { Button } from './ui/button';
import type { GenerationTaskVM } from '../types';

interface GenerationTaskItemProps {
  task: GenerationTaskVM;
}

export function GenerationTaskItem({ task }: GenerationTaskItemProps) {
  const getStatusDisplay = (status: GenerationTaskVM['status']) => {
    switch (status) {
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Ready for review';
      case 'failed':
        return 'Generation failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown status';
    }
  };

  const handlePreviewClick = () => {
    window.location.href = `/generations/${task.id}`;
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-medium text-gray-900">
            Generation Task
          </h3>
          <p className="text-sm text-gray-500">
            Created: {new Date(task.createdAt).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">
            Model: {task.modelUsed}
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-block px-2 py-1 text-sm rounded ${
            task.status === 'completed' ? 'bg-green-100 text-green-800' :
            task.status === 'processing' ? 'bg-blue-100 text-blue-800' :
            task.status === 'failed' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {getStatusDisplay(task.status)}
          </span>
        </div>
      </div>

      {task.status === 'processing' && task.progress !== undefined && (
        <div className="space-y-2 mb-4">
          <Progress 
            value={task.progress} 
            className="w-full"
            aria-label="Generation progress"
          />
          <p className="text-sm text-gray-500 text-right">
            {Math.round(task.progress)}%
          </p>
        </div>
      )}

      {task.status === 'completed' && (
        <div className="mt-4">
          <Button
            onClick={handlePreviewClick}
            variant="outline"
            className="w-full"
          >
            Preview / Accept
          </Button>
        </div>
      )}
    </div>
  );
} 