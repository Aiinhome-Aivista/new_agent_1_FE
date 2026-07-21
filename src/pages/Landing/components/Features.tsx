import React from 'react';
import { motion } from 'framer-motion';
import { Brain, FileOutput, FilePlus2, Presentation, Users, Network } from 'lucide-react';

const features = [
  {
    icon: <Brain className="w-8 h-8 text-primary" />,
    title: 'Requirement Analysis',
    description: 'Our AI agents instantly extract and analyze critical requirements from your raw inputs, RFPs, and emails.'
  },
  {
    icon: <Network className="w-8 h-8 text-primary" />,
    title: 'Multi-Agent Workflow',
    description: 'Specialized AI agents collaborate to draft, review, and refine your proposal simultaneously for maximum quality.'
  },
  {
    icon: <FilePlus2 className="w-8 h-8 text-primary" />,
    title: 'Proposal Generation',
    description: 'Automatically generate comprehensive, tailored proposals aligned with your enterprise brand guidelines.'
  },
  {
    icon: <Presentation className="w-8 h-8 text-primary" />,
    title: 'PPT Creation',
    description: 'Transform dense proposal documents into visually engaging PowerPoint presentations with a single click.'
  },
  {
    icon: <FileOutput className="w-8 h-8 text-primary" />,
    title: 'PDF Export',
    description: 'Export finalized documents as polished, client-ready PDFs with enterprise-grade formatting.'
  },
  {
    icon: <Users className="w-8 h-8 text-primary" />,
    title: 'Collaboration',
    description: 'Seamlessly invite team members to review, comment, and edit alongside our AI agents in real-time.'
  }
];

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise Features Powered by AI</h2>
          <p className="text-muted-foreground text-lg">
            A comprehensive suite of tools designed to streamline your entire document creation lifecycle.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-card p-8 rounded-2xl border border-border shadow-sm hover:shadow-xl transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
