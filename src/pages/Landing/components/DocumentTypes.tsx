import React from 'react';
import { motion } from 'framer-motion';

const documentTypes = [
  'RFP Responses',
  'Statement of Work (SOW)',
  'Business Proposals',
  'Technical Proposals',
  'Architecture Documents',
  'Project Plans',
  'Executive Summaries',
  'Pitch Decks (PPT)',
];

export const DocumentTypes: React.FC = () => {
  return (
    <section id="templates" className="pb-20 pt-10 bg-brand-charcoal relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black -z-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Supported Document Types</h2>
          <p className="text-gray-400 text-lg">
            Train our AI once on your templates, and it can generate any of these formats.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          {documentTypes.map((type, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              className="px-6 py-3 rounded-full bg-card border border-border backdrop-blur-md hover:bg-primary/20 hover:border-primary/50 transition-colors duration-300 cursor-pointer"
            >
              <span className="font-medium text-foreground">{type}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
