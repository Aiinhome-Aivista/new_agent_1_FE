import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, CheckCircle2, Sparkles, Building2, BrainCircuit, Globe, Rocket, ShieldCheck, Target, Bot } from 'lucide-react';
import { ROUTES } from '../../../routes/routes.config';

export const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center pt-20 pb-10 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-50 translate-x-1/3 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] opacity-40 -translate-x-1/4 translate-y-1/4" />
      
      {/* Floating Animated Icons in Background */}
      <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/3 left-[10%] z-10 opacity-30 text-primary">
        <BrainCircuit size={48} />
      </motion.div>
      <motion.div animate={{ y: [0, 25, 0], rotate: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-1/3 right-[15%] z-10 opacity-20 text-accent">
        <Target size={64} />
      </motion.div>
      <motion.div animate={{ y: [0, -15, 0], rotate: [0, -15, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/3 right-[10%] z-10 opacity-20 text-blue-500">
        <ShieldCheck size={56} />
      </motion.div>
      
      <motion.div animate={{ y: [0, -35, 0], rotate: [0, -25, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-1/3 left-[10%] z-10 opacity-20 text-green-500">
        <Bot size={56} />
      </motion.div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative w-full flex-1 flex flex-col justify-center">
        <div className="flex flex-col items-center justify-center">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-5xl flex flex-col items-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8 border border-primary/20 shadow-sm backdrop-blur-sm">
              <Sparkles size={16} />
              <span className="text-sm font-semibold tracking-wide uppercase">AI-Powered Enterprise Solution</span>
            </div>
            
            <h1 className="text-5xl text-center xl:text-[4rem] font-extrabold tracking-tight text-foreground mb-6 leading-[1.15]">
              Create Enterprise Proposals in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-accent">
                Minutes with AI
              </span>
            </h1>
            
            <p className="text-center text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-4xl mx-auto">
              Automate your RFP responses, architecture designs, and sales proposals with our multi-agent workflow. Deliver winning documents faster and with perfect accuracy.
            </p>
            
            <div className="flex justify-center flex-col sm:flex-row gap-6 mb-12">
              <button 
                onClick={() => navigate(ROUTES.login)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-orange-600 hover:from-primary hover:to-primary text-white px-10 py-4 rounded-xl font-semibold text-lg shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-1"
              >
                Create Proposal <ArrowRight size={20} />
              </button>
              
              <button className="flex items-center justify-center gap-2 bg-card hover:bg-muted border border-border text-foreground px-10 py-4 rounded-xl font-semibold text-lg shadow-sm transition-all hover:-translate-y-1">
                <Play size={20} className="text-primary" /> Watch Demo
              </button>
            </div>

            <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground font-medium mb-10 bg-background/50 backdrop-blur-sm px-8 py-3 rounded-2xl border border-border/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500" size={18} /> No credit card required
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-border" />
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-500" size={18} /> 14-day free trial
              </div>
            </div>
          </motion.div>

        </div>
      </div>
      
      {/* Trusted By Section - Kept at bottom of the hero screen */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="w-full mt-auto border-t border-border/50 bg-background/40 backdrop-blur-md pt-8"
      >
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
          Trusted by Innovative Teams Worldwide
        </p>
        <div className="flex justify-center items-center gap-12 md:gap-24 opacity-60 flex-wrap px-4">
          <div className="flex items-center gap-2"><Globe size={24} /><span className="font-bold text-lg">GlobalTech</span></div>
          <div className="flex items-center gap-2"><Building2 size={24} /><span className="font-bold text-lg">Enterprise.io</span></div>
          <div className="flex items-center gap-2"><Rocket size={24} /><span className="font-bold text-lg">LaunchPad</span></div>
          <div className="flex items-center gap-2 hidden sm:flex"><Target size={24} /><span className="font-bold text-lg">Precision</span></div>
        </div>
      </motion.div>
    </section>
  );
};

