import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-border py-3 px-6 text-center font-footer-text text-muted-foreground bg-card">
      Powered by PwC | © {new Date().getFullYear()} Autonomous Proposal Creator. All rights reserved.
    </footer>
  );
};
