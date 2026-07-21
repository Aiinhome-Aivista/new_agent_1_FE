import React from 'react';
import { motion } from 'framer-motion';
import { Upload, BrainCircuit, Lightbulb, FileText, CheckSquare, Download } from 'lucide-react';

const steps = [
  { icon: <Upload size={24} />, title: 'Upload Requirements', desc: 'Drag and drop your RFP or raw notes.' },
  { icon: <BrainCircuit size={24} />, title: 'AI Analysis', desc: 'Agents extract key goals and constraints.' },
  { icon: <Lightbulb size={24} />, title: 'Solution Design', desc: 'Architecture and win themes are formulated.' },
  { icon: <FileText size={24} />, title: 'Proposal Generation', desc: 'Content is drafted across all sections.' },
  { icon: <CheckSquare size={24} />, title: 'Human Review', desc: 'Review, edit, and approve the draft.' },
  { icon: <Download size={24} />, title: 'Export & Send', desc: 'Export to PDF or PPT instantly.' }
];

export const Workflow: React.FC = () => {
  return (
    <section id="workflow" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Step-by-Step Workflow</h2>
          <p className="text-muted-foreground text-lg">
            From raw requirements to client-ready proposals in minutes, not days.
          </p>
        </div>

        <div className="relative">
          {/* Connecting Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 bg-border -translate-y-1/2 z-0" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="flex flex-col items-center text-center group"
              >
                <div className="w-20 h-20 rounded-2xl bg-card border-2 border-border shadow-lg flex items-center justify-center mb-6 text-muted-foreground group-hover:border-primary group-hover:text-primary transition-all duration-300 relative z-10">
                  {step.icon}
                </div>
                <div className="bg-card px-4 py-3 rounded-xl border border-border shadow-sm w-full h-full">
                  <h4 className="font-bold mb-2 text-sm">{step.title}</h4>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
