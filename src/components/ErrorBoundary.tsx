import { Component, type PropsWithChildren } from 'react';
import { Button } from './ui/button';
import { alertManager } from './ui/alert-stack';

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error) {
    console.error('Uncaught error:', error);
    alertManager.show('An unexpected error occurred', { 
      type: 'error',
      duration: 5000
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-white rounded-lg shadow-sm border text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">
            We apologize for the inconvenience. Please try again or contact support if the problem persists.
          </p>
          <div className="space-x-4">
            <Button
              onClick={this.handleRetry}
              variant="default"
            >
              Try Again
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Reload Page
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-6 p-4 bg-gray-100 rounded text-left text-sm overflow-auto">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
} 