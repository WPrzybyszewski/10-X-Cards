import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './ErrorBoundary';
import GeneratePage from './GeneratePage';
import { AlertStack } from './ui/alert-stack';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export default function GeneratePageWrapper() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gray-50">
          <AlertStack />
          <GeneratePage />
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  );
} 