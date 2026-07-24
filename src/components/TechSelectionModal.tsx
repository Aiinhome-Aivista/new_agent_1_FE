import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal/Modal';
import { Button } from './ui/Button/Button';
import { useToast } from './ui/Toast/Toast';
import { proposalApi } from '../services/api/endpoints';
import { Bot, Sparkles, Cpu, CheckCircle2, Terminal, Check, AlertTriangle, Database, Shield } from 'lucide-react';

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

interface AdvancedOption {
  id: string;
  name: string;
}

interface TechSelectionModalProps {
  isOpen: boolean;
  proposalId: string;
  onComplete: () => void;
  onClose: () => void;
}

export const TechSelectionModal: React.FC<TechSelectionModalProps> = ({ isOpen, proposalId, onComplete, onClose }) => {
  const { toast } = useToast();

  // States
  const [techOptions, setTechOptions] = useState<TechOptionPackage[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [extractedTechs, setExtractedTechs] = useState<{ ui: string | null; backend: string | null; database: string | null } | null>(null);
  const [chatExplanation, setChatExplanation] = useState<string>('');
  const [originalBudget, setOriginalBudget] = useState<string>('$250,000');
  const [isLoading, setIsLoading] = useState(true);
  const [isResuming, setIsResuming] = useState(false);
  const [selectedAiModel, setSelectedAiModel] = useState<string>('');

  // Advanced Options State
  const [ragOptions, setRagOptions] = useState<AdvancedOption[] | null>(null);
  const [selectedRag, setSelectedRag] = useState<string>('');

  const [guardrailOptions, setGuardrailOptions] = useState<AdvancedOption[] | null>(null);
  const [selectedGuardrail, setSelectedGuardrail] = useState<string>('');

  const [actionEngineOptions, setActionEngineOptions] = useState<AdvancedOption[] | null>(null);
  const [selectedActionEngine, setSelectedActionEngine] = useState<string>('');

  useEffect(() => {
    const pkg = techOptions.find(opt => opt.id === selectedOptionId);
    if (pkg && pkg.ai_models && pkg.ai_models.length > 0) {
      setSelectedAiModel(pkg.ai_models[0]);
    } else {
      setSelectedAiModel('');
    }
  }, [selectedOptionId, techOptions]);

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

            // Set advanced options
            const rOpts = Array.isArray(ir.rag_options) ? ir.rag_options : [];
            const gOpts = Array.isArray(ir.guardrail_options) ? ir.guardrail_options : [];
            const aOpts = Array.isArray(ir.action_engine_options) ? ir.action_engine_options : [];

            setRagOptions(rOpts);
            if (rOpts.length > 0) setSelectedRag(rOpts[0].id);

            setGuardrailOptions(gOpts);
            if (gOpts.length > 0) setSelectedGuardrail(gOpts[0].id);

            setActionEngineOptions(aOpts);
            if (aOpts.length > 0) setSelectedActionEngine(aOpts[0].id);

            const options = Array.isArray(ir.tech_options) ? ir.tech_options : [];
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
      ai_models: ["Claude 3.5 Sonnet and above", "Llama 3 8B and above", "GPT-4o and above", "Gemini 1.5 Pro and above"],
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
        originalBudget,
        selectedRag,
        selectedGuardrail,
        selectedActionEngine
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
  const formatTechName = (slug: any) => {
    if (!slug) return '';
    if (typeof slug !== 'string') slug = String(slug);
    return slug.replace('_', ' ').replace('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  };

  // Check if a technology matches the extracted technologies from document
  const isExtracted = (category: 'ui' | 'backend' | 'database', tech: any) => {
    if (!extractedTechs) return false;
    const val = extractedTechs[category];
    if (!val || !tech) return false;
    
    if (typeof tech !== 'string') tech = String(tech);

    // Safely handle if backend returned an array instead of a string
    const valStr = Array.isArray(val) ? val.join(' ') : String(val);

    return valStr.toLowerCase().replace(/[^a-z0-9]/g, '').includes(tech.toLowerCase().replace(/[^a-z0-9]/g, ''));
  };

  const selectedPkg = techOptions.find(opt => opt.id === selectedOptionId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Technology Stack & Capability Analysis" className="max-w-4xl">
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
              <div className="flex items-center gap-2 text-primary font-bold text-base">
                <Bot size={20} className="text-primary animate-pulse" />
                <span>AI Architecture Assistant</span>
                <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                  <Sparkles size={8} /> Grounded Recommendation
                </span>
              </div>

              <div className="bg-muted/40 border border-border rounded-2xl px-6 py-2 shadow-inner">
                <div className="max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                  {renderMarkdown(chatExplanation)}
                </div>
              </div>
            </div>

            {/* Choose 3 suggested packages */}
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <h4 className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Cpu size={20} /> Suggested Technology Packages (Choose one)
              </h4>

              <div className="flex flex-col gap-3">
                {techOptions.map((pkg, index) => {
                  const isSelected = selectedOptionId === pkg.id;
                  const isPrimary = index === 0;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedOptionId(pkg.id)}
                      className={`flex flex-col md:flex-row gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                          : 'border-border bg-card hover:border-muted-foreground/30'
                        }`}
                    >
                      {/* Selection indicator */}
                      <div className="flex items-start justify-between md:justify-center md:items-center">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/30 bg-muted/40'
                          }`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className="md:hidden text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          {isPrimary ? 'Primary' : 'Alternative'}
                        </span>
                      </div>

                      {/* Content details */}
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-foreground">{pkg.name}</span>
                          <span className="hidden md:inline text-[9px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                            {isPrimary ? 'Primary' : 'Alternative'}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">{pkg.rationale}</p>

                        {/* Stack badges */}
                        <div className="flex flex-wrap gap-2 mt-1">
                          {pkg.ui && pkg.ui.trim() !== '' && pkg.ui.toLowerCase() !== 'null' && pkg.ui.toLowerCase() !== 'none' && (
                            <span className="text-[10px] bg-card border border-border/80 text-foreground px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                              UI: <span className="font-bold text-primary">{formatTechName(pkg.ui)}</span>
                              {isExtracted('ui', pkg.ui) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Explicitly mentioned in RFP document" />
                              )}
                            </span>
                          )}
                          {pkg.backend && pkg.backend.trim() !== '' && pkg.backend.toLowerCase() !== 'null' && pkg.backend.toLowerCase() !== 'none' && (
                            <span className="text-[10px] bg-card border border-border/80 text-foreground px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                              API: <span className="font-bold text-primary">{formatTechName(pkg.backend)}</span>
                              {isExtracted('backend', pkg.backend) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Explicitly mentioned in RFP document" />
                              )}
                            </span>
                          )}
                          {pkg.database && pkg.database.trim() !== '' && pkg.database.toLowerCase() !== 'null' && pkg.database.toLowerCase() !== 'none' && (
                            <span className="text-[10px] bg-card border border-border/80 text-foreground px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                              DB: <span className="font-bold text-primary">{formatTechName(pkg.database)}</span>
                              {isExtracted('database', pkg.database) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Explicitly mentioned in RFP document" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Other Recommended Tools Badges for currently selected package */}
              {selectedPkg && selectedPkg.other_technologies && selectedPkg.other_technologies.length > 0 && (
                <div className="flex flex-col gap-2 mt-2 bg-muted/20 border border-border/60 p-4 rounded-xl">
                  <span className="text-base font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Terminal size={14} /> Supporting Tooling & Frameworks for Selected Package
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
                <div className="flex flex-col gap-3 mt-4 border-t border-border pt-4">
                  <h4 className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Bot size={14} className="text-primary animate-pulse" /> AI Model Selection (Choose one)
                  </h4>
                  <div className="flex flex-col gap-3">
                    {selectedPkg.ai_models.map((model, i) => {
                      const isSelected = selectedAiModel === model;
                      const isRecommended = i === 0;
                      return (
                        <div
                          key={i}
                          onClick={() => setSelectedAiModel(model)}
                          className={`flex flex-col md:flex-row gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected
                              ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                              : 'border-border bg-card hover:border-muted-foreground/30'
                            }`}
                        >
                          <div className="flex items-start justify-between md:justify-center md:items-center">
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/30 bg-muted/40'
                              }`}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                            <span className="md:hidden text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                              {isRecommended ? 'Recommended' : 'Alternative'}
                            </span>
                          </div>

                          <div className="flex-1 flex flex-col gap-1.5 justify-center">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-foreground">{model}</span>
                              <span className={`hidden md:inline text-[9px] font-bold px-2 py-0.5 rounded-md ${isRecommended ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                                }`}>
                                {isRecommended ? 'Recommended' : 'Alternative'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Advanced Options Sections */}
              {ragOptions !== null && (
                <div className="flex flex-col gap-3 mt-4 border-t border-border pt-4">
                  <h4 className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles size={20} className="text-primary" /> RAG Strategy Selection
                  </h4>
                  {ragOptions.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-lg border border-border/50">Not Required for this HLA</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {ragOptions.map((opt, i) => {
                        const isSelected = selectedRag === opt.id;
                        const isRecommended = i === 0;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => setSelectedRag(opt.id)}
                            className={`flex flex-col md:flex-row gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected
                                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                : 'border-border bg-card hover:border-muted-foreground/30'
                              }`}
                          >
                            <div className="flex items-start justify-between md:justify-center md:items-center">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/30 bg-muted/40'
                                }`}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                              <span className="md:hidden text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                {isRecommended ? 'Recommended' : 'Alternative'}
                              </span>
                            </div>

                            <div className="flex-1 flex gap-3 items-center">
                              <div className="bg-primary/10 p-2.5 rounded-xl text-primary flex items-center justify-center shrink-0">
                                <Database size={20} />
                              </div>
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-sm text-foreground">{opt.name}</span>
                                  <span className={`hidden md:inline text-[9px] font-bold px-2 py-0.5 rounded-md ${isRecommended ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {isRecommended ? 'Recommended' : 'Alternative'}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Integrate {opt.name} as the core semantic indexing and retrieval strategy to power context-aware LLM answers.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  <div className="flex gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl mt-2 shadow-inner">
                        <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Future Document Integration Suggestion</span>
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            If in the future text or PDF documents are used for retrieval, a vectorless RAG approach should be implemented to handle keyword-based and metadata-driven semantic search efficiently.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {guardrailOptions !== null && (
                <div className="flex flex-col gap-3 mt-4 border-t border-border pt-4">
                  <h4 className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Terminal size={20} className="text-primary" /> Guardrails (Data Protection)
                  </h4>
                  {guardrailOptions.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-lg border border-border/50">Not Required for this HLA</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {guardrailOptions.map((opt, i) => {
                        const isSelected = selectedGuardrail === opt.id;
                        const isRecommended = i === 0;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => setSelectedGuardrail(opt.id)}
                            className={`flex flex-col md:flex-row gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected
                                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                : 'border-border bg-card hover:border-muted-foreground/30'
                              }`}
                          >
                            <div className="flex items-start justify-between md:justify-center md:items-center">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/30 bg-muted/40'
                                }`}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                              <span className="md:hidden text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                {isRecommended ? 'Recommended' : 'Alternative'}
                              </span>
                            </div>

                            <div className="flex-1 flex gap-3 items-center">
                              <div className="bg-primary/10 p-2.5 rounded-xl text-primary flex items-center justify-center shrink-0">
                                <Shield size={20} />
                              </div>
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-sm text-foreground">{opt.name}</span>
                                  <span className={`hidden md:inline text-[9px] font-bold px-2 py-0.5 rounded-md ${isRecommended ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {isRecommended ? 'Recommended' : 'Alternative'}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Configure {opt.name} to enforce enterprise-grade security policies, data privacy masking, and threat boundary protection.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {actionEngineOptions !== null && (
                <div className="flex flex-col gap-3 mt-4 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Cpu size={20} className="text-primary" /> Action Engine Framework
                    </h4>
                    {actionEngineOptions.length > 0 && (
                      <span className="text-[18px] bg-transparent border border-primary/30 text-primary px-3 py-0.5 rounded-full flex items-center gap-1.5 font-bold animate-pulse">
                        <Bot size={22} className="animate-bounce shrink-0 text-primary" /> Agentic Solution Recommended
                      </span>
                    )}
                  </div>
                  {actionEngineOptions.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-lg border border-border/50">Not Required for this HLA</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {actionEngineOptions.map((opt, i) => {
                        const isSelected = selectedActionEngine === opt.id;
                        const isRecommended = i === 0;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => setSelectedActionEngine(opt.id)}
                            className={`flex flex-col md:flex-row gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected
                                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                : 'border-border bg-card hover:border-muted-foreground/30'
                              }`}
                          >
                            <div className="flex items-start justify-between md:justify-center md:items-center">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/30 bg-muted/40'
                                }`}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                              <span className="md:hidden text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                {isRecommended ? 'Recommended' : 'Alternative'}
                              </span>
                            </div>

                            <div className="flex-1 flex gap-3 items-center">
                              <div className="bg-primary/10 p-2.5 rounded-xl text-primary flex items-center justify-center shrink-0">
                                <Bot size={20} className={isRecommended ? 'animate-pulse' : ''} />
                              </div>
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-sm text-foreground">{opt.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`hidden md:inline text-[9px] font-bold px-2 py-0.5 rounded-md ${isRecommended ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                                      }`}>
                                      {isRecommended ? 'Recommended' : 'Alternative'}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Deploy a stateful multi-agent system utilizing {opt.name} to execute automated, complex workflows.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl mt-2 shadow-inner">
                        <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Disclaimer</span>
                          <span className="text-xs text-muted-foreground leading-relaxed">
                            Please note that the deployment, infrastructure, and maintenance cost for this Action Engine Framework is not included in the current core plan and will be billed separately.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
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
