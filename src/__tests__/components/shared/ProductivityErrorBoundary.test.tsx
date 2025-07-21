import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductivityErrorBoundary, useErrorHandler, withProductivityErrorBoundary } from '@/app/components/shared/ProductivityErrorBoundary';

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Test component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Test component using error handler hook
const ComponentWithErrorHandler = () => {
  const { handleError } = useErrorHandler();

  return (
    <div>
      <button onClick={() => handleError(new Error('Handled error'))}>
        Trigger Error
      </button>
      <span>Component content</span>
    </div>
  );
};

describe('ProductivityErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when no error occurs', () => {
    render(
      <ProductivityErrorBoundary>
        <div>Test content</div>
      </ProductivityErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch and display error when child component throws', () => {
    render(
      <ProductivityErrorBoundary feature="notes">
        <ThrowError shouldThrow={true} />
      </ProductivityErrorBoundary>
    );

    expect(screen.getByText(/Notes Error/)).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong while loading the notes feature/)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('should display custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ProductivityErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ProductivityErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ProductivityErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ProductivityErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should reset error state when Try Again is clicked', () => {
    const { rerender } = render(
      <ProductivityErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductivityErrorBoundary>
    );

    expect(screen.getByText(/Error/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Try Again'));

    rerender(
      <ProductivityErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ProductivityErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
  });

  it('should display feature-specific error messages', () => {
    render(
      <ProductivityErrorBoundary feature="kanban">
        <ThrowError shouldThrow={true} />
      </ProductivityErrorBoundary>
    );

    expect(screen.getByText(/Kanban Board Error/)).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong while loading the kanban board feature/)).toBeInTheDocument();
  });

  it('should show debug information in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ProductivityErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductivityErrorBoundary>
    );

    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Debug Info')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should hide debug information in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ProductivityErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductivityErrorBoundary>
    );

    expect(screen.queryByText(/Error ID:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Debug Info')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('useErrorHandler', () => {
  it('should throw error when handleError is called', () => {
    expect(() => {
      render(
        <ProductivityErrorBoundary>
          <ComponentWithErrorHandler />
        </ProductivityErrorBoundary>
      );

      fireEvent.click(screen.getByText('Trigger Error'));
    }).not.toThrow(); // The error boundary should catch it

    expect(screen.getByText(/Error/)).toBeInTheDocument();
  });
});

describe('withProductivityErrorBoundary', () => {
  it('should wrap component with error boundary', () => {
    const TestComponent = () => <div>Wrapped component</div>;
    const WrappedComponent = withProductivityErrorBoundary(TestComponent, 'calendar');

    render(<WrappedComponent />);

    expect(screen.getByText('Wrapped component')).toBeInTheDocument();
  });

  it('should catch errors in wrapped component', () => {
    const WrappedThrowError = withProductivityErrorBoundary(ThrowError, 'calendar');

    render(<WrappedThrowError shouldThrow={true} />);

    expect(screen.getByText(/Calendar Error/)).toBeInTheDocument();
  });

  it('should set correct display name', () => {
    const TestComponent = () => <div>Test</div>;
    TestComponent.displayName = 'TestComponent';

    const WrappedComponent = withProductivityErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe('withProductivityErrorBoundary(TestComponent)');
  });
});