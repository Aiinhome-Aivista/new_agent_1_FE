import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  { value: '85%', label: 'Time Saved' },
  { value: '10x', label: 'Faster Generation' },
  { value: '99%', label: 'Format Accuracy' },
  { value: '24/7', label: 'Agent Availability' },
];

export const Statistics: React.FC = () => {
  return (
    <section className="py-16 border-y border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-border">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-center justify-center text-center px-4"
            >
              <div className="text-4xl md:text-5xl font-extrabold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm md:text-base font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
