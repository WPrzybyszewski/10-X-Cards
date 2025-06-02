import { GenerationTaskItem } from './GenerationTaskItem';
import type { GenerationTaskVM } from '../types';

interface GenerationTaskListProps {
  tasks: GenerationTaskVM[];
}

export function GenerationTaskList({ tasks = [] }: GenerationTaskListProps) {
  // Ensure tasks is always an array
  const taskList = Array.isArray(tasks) ? tasks : [];

  if (taskList.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No generation tasks yet
        </h3>
        <p className="text-gray-500">
          Start by pasting some text and clicking Generate
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">
        Generation Tasks
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {taskList.map((task) => (
          <GenerationTaskItem 
            key={task.id} 
            task={task}
          />
        ))}
      </div>
    </div>
  );
} 