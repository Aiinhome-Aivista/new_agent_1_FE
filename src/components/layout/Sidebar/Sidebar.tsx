import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Database, ShieldAlert, History } from 'lucide-react';
import { cn } from '../../../utils/cn';

export const Sidebar: React.FC = () => {
  const menuItems = [
    { title: 'Proposal Dashboard', href: '/', icon: <LayoutDashboard size={18} /> },
    { title: 'Historical Drafts Archive', href: '/archive', icon: <History size={18} /> },
    { title: 'Asset Knowledge Base', href: '/settings', icon: <Database size={18} /> },
  ];

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

      <div className="flex flex-col gap-3 p-3 bg-muted/50 rounded-xl border border-border/80">
        <div className="flex items-center gap-2 text-primary">
          <ShieldAlert size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Agent Sandbox</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
        </p>
      </div>
    </aside>
  );
};
