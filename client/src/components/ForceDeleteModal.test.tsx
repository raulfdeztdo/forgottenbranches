import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ForceDeleteModal from './ForceDeleteModal';
import type { FailedBranch } from './ForceDeleteModal';

vi.mock('lucide-react', () => ({
  AlertTriangle: () => null,
  Trash2: () => null,
  X: () => null,
  GitBranch: () => null,
}));

function makeBranches(names: string[]): FailedBranch[] {
  return names.map((name) => ({ branch: name, message: `Cannot delete ${name}` }));
}

describe('ForceDeleteModal', () => {
  it('renders the list of failed branches', () => {
    const branches = makeBranches(['feature/a', 'feature/b']);
    render(
      <ForceDeleteModal
        failedBranches={branches}
        repoPath="/fake/repo"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('feature/a')).toBeInTheDocument();
    expect(screen.getByText('feature/b')).toBeInTheDocument();
    expect(screen.getByText('Cannot delete feature/a')).toBeInTheDocument();
    expect(screen.getByText('Cannot delete feature/b')).toBeInTheDocument();
  });

  it('shows the force delete button with correct count', () => {
    const branches = makeBranches(['feature/a', 'feature/b']);
    render(
      <ForceDeleteModal
        failedBranches={branches}
        repoPath="/fake/repo"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Force delete 2 branches')).toBeInTheDocument();
  });

  it('shows singular text for one branch', () => {
    const branches = makeBranches(['feature/a']);
    render(
      <ForceDeleteModal
        failedBranches={branches}
        repoPath="/fake/repo"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Force delete 1 branch')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const branches = makeBranches(['feature/a']);
    render(
      <ForceDeleteModal
        failedBranches={branches}
        repoPath="/fake/repo"
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    const branches = makeBranches(['feature/a']);
    render(
      <ForceDeleteModal
        failedBranches={branches}
        repoPath="/fake/repo"
        onConfirm={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onConfirm with selected branch names', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const branches = makeBranches(['feature/a', 'feature/b']);
    render(
      <ForceDeleteModal
        failedBranches={branches}
        repoPath="/fake/repo"
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByText('Force delete 2 branches')
      );
    });

    expect(onConfirm).toHaveBeenCalledWith(['feature/a', 'feature/b']);
  });

  it('deselects a branch when toggled off', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const branches = makeBranches(['feature/a', 'feature/b']);
    render(
      <ForceDeleteModal
        failedBranches={branches}
        repoPath="/fake/repo"
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />
    );

    // Deselect feature/a by clicking its checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // uncheck feature/a

    await act(async () => {
      fireEvent.click(
        screen.getByText('Force delete 1 branch')
      );
    });

    expect(onConfirm).toHaveBeenCalledWith(['feature/b']);
  });
});
