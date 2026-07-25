import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Database, ShieldAlert, History, LogOut, FileText } from 'lucide-react';
import { cn } from '../../../utils/cn';

import { useAuthStore } from '../../../store';
import { Button } from '@/components/ui';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();

  const menuItems = [
    { title: 'Proposal Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { title: 'Historical Drafts Archive', href: '/archive', icon: <History size={18} /> },
  ];

  if (user?.role === 'admin' || user?.role === 'presales') {
    menuItems.push({ title: 'Case Study Upload', href: '/case-studies', icon: <FileText size={18} /> });
    menuItems.push({ title: 'Asset Knowledge Base', href: '/settings', icon: <Database size={18} /> });
  }

  return (
    <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col h-[calc(100vh-73px)] sticky top-[73px] p-4 gap-6 justify-between">
      <div className="flex flex-col gap-4">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Solutions Advisory
        </div>

        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer hover:bg-muted",
                  isActive
                    ? "bg-primary/10 text-primary border-l-4 border-primary pl-2 shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {item.icon}
              {item.title}
            </NavLink>
          ))}
        </nav>
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
    </aside>
  );
};
