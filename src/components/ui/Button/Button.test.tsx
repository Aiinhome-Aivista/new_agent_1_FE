import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button component', () => {
  it('renders standard child text', () => {
    render(<Button>Generate Document</Button>);
    expect(screen.getByText('Generate Document')).toBeDefined();
  });

  it('triggers onClick handler on press', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger click when loading or disabled', () => {
    const handleClick = vi.fn();
    render(<Button isLoading onClick={handleClick}>Send</Button>);
    fireEvent.click(screen.getByText('Loading...'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
