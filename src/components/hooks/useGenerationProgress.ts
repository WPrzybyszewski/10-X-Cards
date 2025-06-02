import { useState, useEffect } from 'react';
import type { GenerationStatus } from '../../types';

interface ProgressEvent {
  type: 'progress' | 'completed' | 'failed';
  progress?: number;
}

export function useGenerationProgress(id: string) {
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<GenerationStatus>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource;
    let pollInterval: NodeJS.Timeout;

    const setupSSE = () => {
      eventSource = new EventSource(`/api/generations/${id}`);

      eventSource.onmessage = (event) => {
        try {
          const data: ProgressEvent = JSON.parse(event.data);
          
          switch (data.type) {
            case 'progress':
              if (data.progress !== undefined) {
                setProgress(data.progress);
              }
              break;
            case 'completed':
              setStatus('completed');
              eventSource.close();
              break;
            case 'failed':
              setStatus('failed');
              eventSource.close();
              break;
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
          setError('Failed to parse progress data');
        }
      };

      eventSource.onerror = () => {
        console.warn('SSE connection failed, falling back to polling');
        eventSource.close();
        setupPolling();
      };
    };

    const setupPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/generations/${id}`);
          const data = await response.json();
          
          setStatus(data.status);
          if (data.progress !== undefined) {
            setProgress(data.progress);
          }

          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error('Polling error:', err);
          setError('Failed to fetch progress data');
        }
      }, 5000); // Poll every 5 seconds as specified in the plan
    };

    // Try SSE first
    setupSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [id]);

  return { progress, status, error };
} 