import React from 'react';
import { useAuthStore } from '../../../store';
import { ThemeToggle } from './ThemeToggle';
import { BarChart3 } from 'lucide-react';
import { useRolePermissions } from '../../../hooks';

// Per-role badge color config
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  admin: { bg: 'bg-[#FF8A55]/15', text: 'text-[#FF5A14]', border: 'border-[#FF8A55]', dot: 'bg-[#FF8A55]' },
  presales: { bg: 'bg-[#FF8A55]/15', text: 'text-[#FF5A14]', border: 'border-[#FF8A55]', dot: 'bg-[#FF8A55]' },
  bidmanager: { bg: 'bg-[#FF8A55]/15', text: 'text-[#FF5A14]', border: 'border-[#FF8A55]', dot: 'bg-[#FF8A55]' },
  delivery: { bg: 'bg-[#FF8A55]/15', text: 'text-[#FF5A14]', border: 'border-[#FF8A55]', dot: 'bg-[#FF8A55]' },
  partner: { bg: 'bg-[#FF8A55]/15', text: 'text-[#FF5A14]', border: 'border-[#FF8A55]', dot: 'bg-[#FF8A55]' },
};

const DEFAULT_COLOR = { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground' };

export const Header: React.FC = () => {
  const { user } = useAuthStore();
  const { displayRole, role } = useRolePermissions();
  const colors = ROLE_COLORS[role] ?? DEFAULT_COLOR;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-md px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold shadow-md transition-transform">
          <BarChart3 size={20} />
        </div>
        <h1 className="font-logo-title tracking-tight text-foreground leading-tight flex items-center gap-1.5">
          <span className="text-primary">Autonomous</span>
          <span>Proposal Creator</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />

        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-border">
            {/* User info + Role badge */}
            <div className="flex flex-col items-center hidden sm:flex gap-1">
              <span className="text-sm font-semibold text-foreground leading-none">{user.username}</span>
              {/* Colored role badge */}
              <span
                className={`
                  inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
                  border leading-none ${colors.bg} ${colors.text} ${colors.border}
                `}
              >
                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                {role === 'admin' ? 'Administrator' : displayRole}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
