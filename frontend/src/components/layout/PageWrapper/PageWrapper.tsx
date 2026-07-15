import React from 'react';
import { Header } from '../Header/Header';
import { Sidebar } from '../Sidebar/Sidebar';
import { Footer } from '../Footer/Footer';

interface PageWrapperProps {
  children: React.ReactNode;
  simple?: boolean;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({ children, simple = false }) => {
  if (simple) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-background">
        <main className="flex-1 flex items-center justify-center">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};
