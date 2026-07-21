import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: "AutoProposal has completely transformed how we respond to RFPs. What used to take two weeks now takes us two days, and the quality is even better.",
    name: "Sarah Jenkins",
    role: "VP of Sales, TechCorp Enterprise",
    initials: "SJ"
  },
  {
    quote: "The ability to generate a 50-page architecture document and instantly export a matching pitch deck is nothing short of magic. Incredible ROI.",
    name: "David Chen",
    role: "Chief Solutions Architect, CloudNine",
    initials: "DC"
  },
  {
    quote: "Our win rate has increased by 40% since implementing this platform. The AI agents ensure we never miss a critical requirement.",
    name: "Elena Rodriguez",
    role: "Director of Proposals, GlobalSystems",
    initials: "ER"
  }
];

export const Testimonials: React.FC = () => {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Enterprise Leaders</h2>
          <p className="text-muted-foreground text-lg">
            See how top organizations are scaling their proposal operations with AI.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card p-8 rounded-2xl border border-border shadow-md relative"
            >
              <div className="flex gap-1 mb-6 text-accent">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill="currentColor" />
                ))}
              </div>
              <p className="text-foreground text-lg mb-8 italic">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-4 mt-auto">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {t.initials}
                </div>
                <div>
                  <h4 className="font-bold">{t.name}</h4>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
