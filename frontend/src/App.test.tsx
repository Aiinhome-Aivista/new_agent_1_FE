import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('App bootstrapping', () => {
  it('instantiates the router structure and boots the app', () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });
});
