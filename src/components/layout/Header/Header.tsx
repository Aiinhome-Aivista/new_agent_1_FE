import React from 'react';
import { useAuthStore } from '../../../store';
import { ThemeToggle } from './ThemeToggle';
import { User as UserIcon, Shield, BarChart3 } from 'lucide-react';
import { useRolePermissions } from '../../../hooks';

// Per-role badge color config
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  admin:      { bg: 'bg-rose-500/10',   text: 'text-rose-600 dark:text-rose-400',    border: 'border-rose-500/30',    dot: 'bg-rose-500' },
  presales:   { bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-400',    border: 'border-blue-500/30',    dot: 'bg-blue-500' },
  bidmanager: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-500' },
  delivery:   { bg: 'bg-emerald-500/10',text: 'text-emerald-600 dark:text-emerald-400',border: 'border-emerald-500/30',dot: 'bg-emerald-500' },
  partner:    { bg: 'bg-amber-500/10',  text: 'text-amber-600 dark:text-amber-400',  border: 'border-amber-500/30',   dot: 'bg-amber-500' },
};

const DEFAULT_COLOR = { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground' };

export const Header: React.FC = () => {
  const { user } = useAuthStore();
  const { displayRole, role } = useRolePermissions();
  const colors = ROLE_COLORS[role] ?? DEFAULT_COLOR;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/85 backdrop-blur-md px-6 py-3.5 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
          <BarChart3 size={18} />
        </div>
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
         Autonomous Proposal Creator
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-border">
            {/* User info + Role badge */}
            <div className="flex flex-col items-end hidden sm:flex gap-1">
              <span className="text-sm font-semibold text-foreground leading-none">{user.username}</span>
              {/* Colored role badge */}
              <span
                className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                  border leading-none ${colors.bg} ${colors.text} ${colors.border}
                `}
              >
                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                {displayRole}
              </span>
            </div>

            {/* Avatar */}
            <div
              className={`h-9 w-9 rounded-full border-2 flex items-center justify-center font-medium ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {role === 'admin' ? <Shield size={15} /> : <UserIcon size={15} />}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
