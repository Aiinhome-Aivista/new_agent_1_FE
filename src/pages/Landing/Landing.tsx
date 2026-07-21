import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Workflow } from './components/Workflow';
import { DocumentTypes } from './components/DocumentTypes';
import { Statistics } from './components/Statistics';
import { Testimonials } from './components/Testimonials';
import { CTA } from './components/CTA';

const Landing: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left"
        style={{ scaleX }}
      />
      
      <Navbar />
      
      <main>
        <Hero />
        <Features />
        <Workflow />
        <DocumentTypes />
        <Statistics />
        <Testimonials />
        <CTA />
      </main>
      
      <footer className="py-4 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-center items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Autonomous Proposal Document Creator. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
