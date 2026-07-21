import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, FileText, CheckCircle2, Sparkles, LayoutTemplate } from 'lucide-react';
import { ROUTES } from '../../../routes/routes.config';

export const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative pt-28 pb-20 lg:pt-32 lg:pb-28 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-50 translate-x-1/3 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] opacity-30 -translate-x-1/3 translate-y-1/3" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid gap-12 lg:gap-8 items-center justify-center">
          
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 border border-primary/20">
              <Sparkles size={16} />
              <span className="text-sm font-semibold tracking-wide uppercase">AI-Powered Enterprise Solution</span>
            </div>
            
            <h1 className="text-5xl text-center lg:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.1]">
              Create Enterprise Proposal Documents in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Minutes with AI
              </span>
            </h1>
            
            <p className="text-center text-lg text-muted-foreground mb-8 leading-relaxed max-w-4xl">
              Automate your RFP responses, architecture designs, and sales proposals with our multi-agent AI workflow. Deliver winning documents faster and with perfect accuracy.
            </p>
            
            <div className="flex justify-center flex-col sm:flex-row gap-4">
              <button 
                onClick={() => navigate(ROUTES.login)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-orange-600 hover:from-primary hover:to-primary text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-1"
              >
                Create Proposal <ArrowRight size={20} />
              </button>
              
              <button className="flex items-center justify-center gap-2 bg-card hover:bg-muted border border-border text-foreground px-8 py-4 rounded-xl font-semibold text-lg shadow-sm transition-all hover:-translate-y-1">
                <Play size={20} className="text-primary" /> Watch Demo
              </button>
            </div>

            <div className="mt-10 flex justify-center items-center gap-6 text-sm text-muted-foreground font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500" size={18} /> No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500" size={18} /> 14-day free trial
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
