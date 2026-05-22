import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

vi.mock('lucide-react', () => {
  const MockIcon = () => null;
  return {
    CheckCircle: MockIcon,
    XCircle: MockIcon,
    Info: MockIcon,
    X: MockIcon,
  };
});

function Tester() {
  const { toast } = useToast();
  return (
    <div>
      <button onClick={() => toast('success', 'Success Title', 'Success message')}>
        Success
      </button>
      <button onClick={() => toast('error', 'Error Title')}>
        Error
      </button>
      <button onClick={() => toast('info', 'Info Title', 'Info message')}>
        Info
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <Tester />
    </ToastProvider>
  );
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows success toast with title and message', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Success'));

    expect(screen.getByText('Success Title')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('shows error toast without message', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Error'));

    expect(screen.getByText('Error Title')).toBeInTheDocument();
  });

  it('shows info toast', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Info'));

    expect(screen.getByText('Info Title')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('dismisses toast after timeout', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Success'));
    expect(screen.getByText('Success Title')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Success Title')).not.toBeInTheDocument();
  });

  it('dismisses toast when close button is clicked', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Success'));

    const closeButtons = screen.getAllByLabelText('Dismiss');
    fireEvent.click(closeButtons[0]);

    expect(screen.queryByText('Success Title')).not.toBeInTheDocument();
  });

  it('renders multiple toasts simultaneously', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('Success'));
    fireEvent.click(screen.getByText('Error'));

    expect(screen.getByText('Success Title')).toBeInTheDocument();
    expect(screen.getByText('Error Title')).toBeInTheDocument();
  });
});
