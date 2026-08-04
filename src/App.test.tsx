import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

describe('App bootstrapping', () => {
  it('instantiates the router structure and boots the app', () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });
});
