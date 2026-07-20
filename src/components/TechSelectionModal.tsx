import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal/Modal';
import { Button } from './ui/Button/Button';
import { useToast } from './ui/Toast/Toast';
import { proposalApi } from '../services/api/endpoints';
import { Bot, Sparkles, Cpu, CheckCircle2, Terminal, Check } from 'lucide-react';

interface TechOptionPackage {
  id: string;
  name: string;
  ui: string;
  backend: string;
  database: string;
  other_technologies: string[];
  rationale: string;
  ai_models?: string[];
}

interface TechSelectionModalProps {
  isOpen: boolean;
  proposalId: string;
  onComplete: () => void;
}

export const TechSelectionModal: React.FC<TechSelectionModalProps> = ({ isOpen, proposalId, onComplete }) => {
  const { toast } = useToast();
  
  // States
  const [techOptions, setTechOptions] = useState<TechOptionPackage[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [extractedTechs, setExtractedTechs] = useState<{ ui: string | null; backend: string | null; database: string | null } | null>(null);
  const [chatExplanation, setChatExplanation] = useState<string>('');
  const [originalBudget, setOriginalBudget] = useState<string>('$250,000');
  const [isLoading, setIsLoading] = useState(true);
  const [isResuming, setIsResuming] = useState(false);

  useEffect(() => {
    if (isOpen && proposalId) {
      setIsLoading(true);
      
      proposalApi.status(proposalId)
        .then((res) => {
          if (res && res.structured_ir) {
            const ir = res.structured_ir;
            setOriginalBudget(ir.budget || '$250,000');
            setExtractedTechs(ir.extracted_technologies || { ui: null, backend: null, database: null });
            setChatExplanation(ir.chat_explanation || 'Based on requirements and constraints, I have analyzed the document and prepared 3 optimal technology packages.');
            
            const options = ir.tech_options || [];
            if (options.length === 3) {
              setTechOptions(options);
              setSelectedOptionId(options[0].id); // Select first option by default
            } else {
              // Trigger default options if none were generated
              const defaults = getDefaultOptions();
              setTechOptions(defaults);
              setSelectedOptionId(defaults[0].id);
            }
          } else {
            const defaults = getDefaultOptions();
            setTechOptions(defaults);
            setSelectedOptionId(defaults[0].id);
            setChatExplanation('I have analyzed the project requirements. Please select from one of the three optimal technology stacks below to implement the project end-to-end.');
          }
        })
        .catch((e) => {
          console.error(e);
          toast('Failed to load technology suggestions.', 'error');
          // Load defaults on error
          const defaults = getDefaultOptions();
          setTechOptions(defaults);
          setSelectedOptionId(defaults[0].id);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, proposalId]);

  const getDefaultOptions = (): TechOptionPackage[] => [
    {
      id: "option_1",
      name: "Option 1: Modern Full-Stack JS/TS (Recommended)",
      ui: "react",
      backend: "nestjs",
      database: "postgresql",
      other_technologies: ["Docker", "Kubernetes", "GitHub Actions", "Tailwind CSS", "TypeORM", "JWT"],
      rationale: "Uses TypeScript end-to-end for rapid scaling, combined with PostgreSQL for enterprise relational database safety."
    },
    {
      id: "option_2",
      name: "Option 2: Python AI & Data Integration Stack",
      ui: "react",
      backend: "flask",
      database: "mysql",
      other_technologies: ["Docker", "Redis", "GitHub Actions", "Tailwind CSS", "Pydantic", "SQLAlchemy"],
      rationale: "Leverages Python backend for seamless AI model execution, with MySQL as a robust metadata store."
    },
    {
      id: "option_3",
      name: "Option 3: Enterprise Scale Java Stack",
      ui: "angular",
      backend: "spring_boot",
      database: "postgresql",
      other_technologies: ["Docker", "Kubernetes", "GitLab CI/CD", "Bootstrap", "Hibernate", "Spring Security"],
      rationale: "Offers industry-standard structure, security, and performance for heavy transactional workloads."
    }
  ];

  const handleConfirm = async () => {
    const selectedPkg = techOptions.find(opt => opt.id === selectedOptionId);
    if (!selectedPkg) {
      toast('Please select a technology package.', 'error');
      return;
    }
    
    setIsResuming(true);
    try {
      await proposalApi.resumeProposal(
        proposalId, 
        selectedPkg.ui, 
        selectedPkg.backend, 
        selectedPkg.database, 
        originalBudget
      );
      toast('Technology package confirmed. Resuming pipeline...', 'success');
      onComplete();
    } catch (e: any) {
      toast('Failed to confirm and resume pipeline.', 'error');
    } finally {
      setIsResuming(false);
    }
  };

  // Helper to render basic markdown bolding & lists into React elements
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    const lines = formatted.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-sm my-1.5 text-muted-foreground leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: trimmed.substring(2) }} />
          </li>
        );
      }
      if (trimmed.startsWith('* ')) {
        return (
          <li key={idx} className="ml-5 list-disc text-sm my-1.5 text-muted-foreground leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: trimmed.substring(2) }} />
          </li>
        );
      }
      if (trimmed === '') return <div key={idx} className="h-2" />;
      return (
        <p key={idx} className="text-sm leading-relaxed text-muted-foreground my-2" dangerouslySetInnerHTML={{ __html: trimmed }} />
      );
    });
  };

  // Format technology names to be user friendly
  const formatTechName = (slug: string) => {
    if (!slug) return '';
    return slug.replace('_', ' ').replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Check if a technology matches the extracted technologies from document
  const isExtracted = (category: 'ui' | 'backend' | 'database', tech: string) => {
    if (!extractedTechs) return false;
    const val = extractedTechs[category];
    if (!val) return false;
    return val.toLowerCase().replace(/[^a-z0-9]/g, '') === tech.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const selectedPkg = techOptions.find(opt => opt.id === selectedOptionId);

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Technology Stack & RAG Analysis" className="max-w-3xl">
      <div className="flex flex-col gap-6">
        
        {isLoading ? (
          <div className="flex flex-col gap-4 py-8 items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <span className="text-sm text-muted-foreground font-medium">Analyzing document for technology requirements...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* RAG Chat Assistant Bubble */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Bot size={18} className="text-primary animate-pulse" />
                <span>RAG Architect Assistant</span>
                <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                  <Sparkles size={8} /> Grounded Recommendation
                </span>
              </div>
              
              <div className="bg-muted/40 border border-border rounded-2xl p-5 shadow-inner">
                <div className="max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                  {renderMarkdown(chatExplanation)}
                </div>
              </div>
            </div>

            {/* Choose 3 suggested packages */}
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cpu size={14} /> Suggested Technology Packages (Choose one)
              </h4>
              
              <div className="flex flex-col gap-3">
                {techOptions.map((pkg) => {
                  const isSelected = selectedOptionId === pkg.id;
                  return (
                    <div 
                      key={pkg.id}
                      onClick={() => setSelectedOptionId(pkg.id)}
                      className={`flex flex-col md:flex-row gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSelected 
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                          : 'border-border bg-card hover:border-muted-foreground/30'
                      }`}
                    >
                      {/* Selection indicator */}
                      <div className="flex items-start justify-between md:justify-center md:items-center">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected 
                            ? 'border-primary bg-primary text-primary-foreground' 
                            : 'border-muted-foreground/30 bg-muted/40'
                        }`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className="md:hidden text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          {pkg.id === 'option_1' ? 'Primary' : 'Alternative'}
                        </span>
                      </div>

                      {/* Content details */}
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-foreground">{pkg.name}</span>
                          <span className="hidden md:inline text-[9px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                            {pkg.id === 'option_1' ? 'Primary' : 'Alternative'}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground leading-relaxed">{pkg.rationale}</p>
                        
                        {/* Stack badges */}
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-[10px] bg-card border border-border/80 text-foreground px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                            UI: <span className="font-bold text-primary">{formatTechName(pkg.ui)}</span>
                            {isExtracted('ui', pkg.ui) && (
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Explicitly mentioned in RFP document" />
                            )}
                          </span>
                          <span className="text-[10px] bg-card border border-border/80 text-foreground px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                            API: <span className="font-bold text-primary">{formatTechName(pkg.backend)}</span>
                            {isExtracted('backend', pkg.backend) && (
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Explicitly mentioned in RFP document" />
                            )}
                          </span>
                          <span className="text-[10px] bg-card border border-border/80 text-foreground px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                            DB: <span className="font-bold text-primary">{formatTechName(pkg.database)}</span>
                            {isExtracted('database', pkg.database) && (
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Explicitly mentioned in RFP document" />
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Other Recommended Tools Badges for currently selected package */}
              {selectedPkg && selectedPkg.other_technologies && selectedPkg.other_technologies.length > 0 && (
                <div className="flex flex-col gap-2 mt-2 bg-muted/20 border border-border/60 p-4 rounded-xl">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Terminal size={10} /> Supporting Tooling & Frameworks for Selected Package
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPkg.other_technologies.map((tech, i) => (
                      <span key={i} className="text-[10px] font-bold bg-muted-foreground/10 border border-muted-foreground/20 text-muted-foreground px-2.5 py-0.5 rounded-md">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended AI Models */}
              {selectedPkg && selectedPkg.ai_models && selectedPkg.ai_models.length > 0 && (
                <div className="flex flex-col gap-2 mt-2 bg-primary/5 border border-primary/20 p-4 rounded-xl">
                  <span className="text-[10px] font-bold text-primary uppercase flex items-center gap-1.5 font-semibold">
                    <Bot size={11} className="text-primary animate-pulse" /> Recommended AI Models
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPkg.ai_models.map((model, i) => (
                      <span key={i} className="text-[10px] font-bold bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-md">
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col gap-3 pt-4 border-t border-border">
          <Button 
            variant="primary" 
            className="w-full h-11 font-bold gap-2 text-sm shadow-sm" 
            onClick={handleConfirm} 
            disabled={isLoading || !selectedOptionId}
            isLoading={isResuming}
          >
            <CheckCircle2 size={16} /> Confirm Technology Stack & Resume Pipeline
          </Button>
        </div>
      </div>
    </Modal>
  );
};
