import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Menu, X } from 'lucide-react';
import { ROUTES } from '../../../routes/routes.config';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'Features', href: '#features' },
    { name: 'How it works', href: '#workflow' },
    { name: 'Templates', href: '#templates' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled ? 'glass shadow-sm py-4' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl"><BarChart3/></span>
            </div>
            <span className="font-bold text-xl tracking-tight">AutoProposal</span>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to={ROUTES.login}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <button 
              onClick={() => navigate(ROUTES.login)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-full font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-foreground"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border mt-4"
          >
            <div className="px-4 py-6 flex flex-col space-y-4">
              <hr className="border-border my-4" />
              <Link
                to={ROUTES.login}
                className="bg-primary px-6 py-3 text-center rounded-xl font-medium w-full mt-4 text-foreground hover:text-primary"
              >
                Sign In
              </Link>
              <button 
                onClick={() => navigate(ROUTES.login)}
                className="bg-primary text-white px-6 py-3 rounded-xl font-medium w-full mt-4"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
