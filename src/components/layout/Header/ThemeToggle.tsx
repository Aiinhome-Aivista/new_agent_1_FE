import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { Button } from '../../ui/Button/Button';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-full border border-border">
      <Button
        variant={theme === 'light' ? 'primary' : 'ghost'}
        size="sm"
        className="rounded-full h-8 w-8 p-0"
        onClick={() => setTheme('light')}
        title="Light Mode"
      >
        <Sun size={15} />
      </Button>
      <Button
        variant={theme === 'dark' ? 'primary' : 'ghost'}
        size="sm"
        className="rounded-full h-8 w-8 p-0"
        onClick={() => setTheme('dark')}
        title="Dark Mode"
      >
        <Moon size={15} />
      </Button>
      <Button
        variant={theme === 'system' ? 'primary' : 'ghost'}
        size="sm"
        className="rounded-full h-8 w-8 p-0"
        onClick={() => setTheme('system')}
        title="System Mode"
      >
        <Monitor size={15} />
      </Button>
    </div>
  );
};
