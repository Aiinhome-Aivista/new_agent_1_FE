import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-border py-4 px-6 text-center text-xs text-muted-foreground bg-card">
      © {new Date().getFullYear()} Agentic Proposal Creator. All rights reserved.
    </footer>
  );
};
