import React from 'react';
import { useAuthStore } from '../../../store';
import { ThemeToggle } from './ThemeToggle';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '../../ui/Button/Button';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/85 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
          P
        </div>
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Advisory Bid Sentinel
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-border">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-semibold text-foreground">{user.username}</span>
              <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-medium">
              <UserIcon size={16} />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-2 border-border/80"
              onClick={logout}
              title="Sign Out"
            >
              <LogOut size={14} />
              <span className="hidden md:inline">Sign Out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
