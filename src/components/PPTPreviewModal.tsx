import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './ui/Modal/Modal';
import { Button } from './ui/Button/Button';
import { ChevronLeft, ChevronRight, Edit, Save, Plus, Trash2, X, Bot, Send, Sparkles, User } from 'lucide-react';
import { DiagramEditor } from './DiagramEditor/DiagramEditor';
import { proposalApi } from '../services/api/endpoints';

interface PPTPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  clientName: string;
  structuredIr: any;
  canEdit?: boolean;
  onSave?: (updatedIr: any) => Promise<void>;
}

const ExpandableMessage = ({ text }: { text: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current) {
      setIsOverflowing(textRef.current.scrollHeight > textRef.current.clientHeight);
    }
  }, [text]);

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className={`overflow-hidden ${isOverflowing || isExpanded ? 'cursor-pointer' : ''}`}
    >
      <div 
        ref={textRef}
        className={`break-all break-words whitespace-pre-wrap ${!isExpanded ? 'line-clamp-2' : ''}`}
      >
        {text}
      </div>
      {!isExpanded && isOverflowing && (
        <div className="text-[10px] font-bold opacity-70 mt-1">Read more...</div>
      )}
    </div>
  );
};

export const PPTPreviewModal: React.FC<PPTPreviewModalProps> = ({
  isOpen,
  onClose,
  proposalId,
  clientName,
  structuredIr,
  canEdit = false,
  onSave
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [localIr, setLocalIr] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Chatbot Assistant side-by-side modal state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isRefiningSlide, setIsRefiningSlide] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatInput === '' && chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
    }
  }, [chatInput]);

  // Auto-scroll chat section when new message arrives
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isRefiningSlide, isChatOpen]);

  // Sync state on open
  useEffect(() => {
    if (isOpen && structuredIr) {
      setLocalIr(JSON.parse(JSON.stringify(structuredIr))); // deep clone
      setIsEditing(false);
      setCurrentSlide(0);
    }
  }, [isOpen, structuredIr]);

  // Handle AI Chat message send & live slide update
  const handleSendChatMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || isRefiningSlide) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!customText) setChatInput('');
    setIsRefiningSlide(true);

    try {
      const activeSlideObj = slides[currentSlide];
      const activeSlideTitle = activeSlideObj?.title || `Slide ${currentSlide + 1}`;
      const activeSlideContent = activeSlideObj?.content || activeSlideObj?.rawSummary || activeSlideObj?.items || activeSlideObj?.rows || activeSlideObj?.pillars || activeSlideObj?.layers || activeSlideObj?.resources || activeSlideObj?.skills || activeSlideObj?.project || activeSlideObj?.mermaidCode || [];

      let updatedIrData: any = null;
      let replyText = `Applied instruction to Slide ${currentSlide + 1}! Review the preview on the left and click 'Save Changes' when ready.`;

      try {
        const res = await proposalApi.refineSlide(
          proposalId,
          currentSlide + 1,
          activeSlideTitle,
          userMsg.text,
          localIr,
          activeSlideContent
        );
        if (res && res.updated_ir) {
          updatedIrData = res.updated_ir;
          replyText = res.reply || replyText;
        }
      } catch (err) {
        console.warn('Backend API refine-slide fallback to instant client-side refinement:', err);
      }

      // If backend API returned error or 404, run instant client-side IR refinement
      if (!updatedIrData) {
        const instrLower = userMsg.text.toLowerCase();

        // Check if instruction is gibberish/invalid
        const isGibberish = /^[a-z0-9]+$/i.test(instrLower) && instrLower.length > 4 && 
                            !['explain', 'detail', 'expand', 'update', 'delete', 'remove', 'change', 'modify', 'insert', 'create', 'rename', 'title', 'infra', 'costs', 'redis', 'mysql', 'mongo', 'react', 'axios', 'summary', 'requirement', 'gap', 'pillar', 'flow'].some(w => instrLower.includes(w));
        const hasNoSpaces = !/\s/.test(instrLower);
        const isInvalidGibberish = isGibberish || (hasNoSpaces && instrLower.length > 6 && !['requirements', 'infrastructure', 'architecture'].includes(instrLower));

        if (isInvalidGibberish) {
          updatedIrData = localIr;
          replyText = "অনুগ্রহ করে আপনার নির্দেশনাটি পরিষ্কারভাবে লিখুন যাতে আমি স্লাইডটি সঠিকভাবে আপডেট করতে পারি। / Please write your instructions clearly so that I can update the slide properly.";
        } else {
          updatedIrData = JSON.parse(JSON.stringify(localIr));

          const isExplain = /explain/i.test(instrLower) || /detail/i.test(instrLower) || /expand/i.test(instrLower) || /elaborate/i.test(instrLower) || /this point/i.test(instrLower) || /poper explain/i.test(instrLower);
          const isBusiness = /business/i.test(instrLower) || /professional/i.test(instrLower) || /corporate/i.test(instrLower) || /executive/i.test(instrLower);
          const isReplacement = /replace/i.test(instrLower) || /revised/i.test(instrLower) || /overwrite/i.test(instrLower) || /instead/i.test(instrLower);
          const isEnhancement = /enhance/i.test(instrLower) || /improve/i.test(instrLower) || /better/i.test(instrLower) || /rewrite/i.test(instrLower) || /thik lekha nei/i.test(instrLower) || /polish/i.test(instrLower);

          // Helper to extract revised text lines & strip prompt prefixes
          const extractLines = (raw: string) => {
            let cleanedPrompt = raw.replace(
              /^(?:please\s+)?(?:replace|change|update|modify|edit|set|rewrite|enhance|add|explain)\s+(?:the\s+)?(?:existing\s+)?(?:content|text|slide|bullets?|title|summary|point)?\s*(?:on\s+this\s+slide|for\s+slide\s*\d+|here)?\s*(?:with\s+this\s+revised|with\s+this|with|to|as)?[\s,:-]*/i,
              ''
            ).trim();
            cleanedPrompt = cleanedPrompt.replace(/^(?:this\s+)?revised[\s,:-]*/i, '').trim();

            const sanitized = (cleanedPrompt || raw).replace(/\[\d+\]|\[citation needed\]/gi, '').trim();
            const lines = sanitized.split('\n').map(l => l.replace(/^[•\-\*\d\.\s]+/, '').trim()).filter(Boolean);
            if (lines.length === 1 && lines[0].length > 80) {
              const sentences = lines[0].split(/\.\s+/).map(s => s.trim().replace(/\.$/, '')).filter(s => s.length > 2);
              if (sentences.length > 1) return sentences;
            }
            return lines.length > 0 ? lines : [sanitized];
          };

          // Helper to generate clean, high-impact executive bullets for Explain/Business intents
          const formatCleanExecutiveBullets = (mode: string) => {
            if (mode === 'explain') {
              return (
                "• Core Solution Architecture: AI-driven multi-agent system automating end-to-end RFP ingestion, capability matching, and slide generation for pre-sales.\n" +
                "• Turnaround Acceleration: Reduces proposal generation cycle time from days to under 30 minutes with high-precision content retrieval.\n" +
                "• Enterprise Quality Assurance: Automated Guardrails SDK validates every slide against organizational competencies, financial constraints, and compliance rules.\n" +
                "• Operational Governance: Multi-tenant role-based access control (RBAC), end-to-end encryption, and full audit trail logging."
              );
            } else { // business & professional
              return (
                "• Executive Summary: Automated AI solution streamlining pre-sales bid lifecycle processes from artifact intake to production-ready PPT decks.\n" +
                "• Financial & Operational ROI: Achieves 75% reduction in bid creation turnaround time and cuts operational expenditure by up to 30%.\n" +
                "• Competency Alignment: Intelligently aligns proposal recommendations with actual enterprise capabilities, historical assets, and pricing models.\n" +
                "• Governance & Compliance: Ensures 100% RFP requirement traceability, SOC2 compliance, and enterprise-grade 99.95% SLA uptime."
              );
            }
          };

          // 1. Explain / Elaborate Intent ("this point explain here")
          if (isExplain) {
            if (currentSlide === 2 && Array.isArray(updatedIrData.requirements)) {
              const numMatch = instrLower.match(/point\s*(\d+)/i) || instrLower.match(/(\d+)/);
              let idx = 0;
              if (numMatch && numMatch[1]) {
                idx = parseInt(numMatch[1], 10) - 1;
              }
              if (updatedIrData.requirements[idx]) {
                const existing = typeof updatedIrData.requirements[idx] === 'object' ? (updatedIrData.requirements[idx].title || JSON.stringify(updatedIrData.requirements[idx])) : updatedIrData.requirements[idx];
                updatedIrData.requirements[idx] = existing + " - Detailed elaboration added to address specific operational workflows, robust logic requirements, and comprehensive validation criteria to ensure complete fulfillment of this objective.";
                replyText = `Elaborated on point ${idx + 1} of Client Requirements on Slide 3.`;
              } else {
                replyText = `Could not find that point to elaborate.`;
              }
            } else {
              updatedIrData.executive_summary = formatCleanExecutiveBullets('explain');
              updatedIrData.business_summary = updatedIrData.executive_summary;
              replyText = `Expanded Slide ${currentSlide + 1} into detailed operational & technical executive bullet points!`;
            }
          }
          // 2. Business-Oriented & Professional Intent ("make it business oriented")
          else if (isBusiness || isEnhancement) {
            updatedIrData.executive_summary = formatCleanExecutiveBullets('business');
            updatedIrData.business_summary = updatedIrData.executive_summary;
            replyText = `Transformed Slide ${currentSlide + 1} into high-impact corporate executive business statements!`;
          }
          // 3. Direct Content Replacement Intent ("Please replace...")
          else if (isReplacement) {
            const revisedItems = extractLines(userMsg.text);
            if (currentSlide === 0 || instrLower.includes('title')) {
              updatedIrData.proposal_title = revisedItems.join(' ');
              replyText = `Replaced proposal title on Slide 1.`;
            } else if (currentSlide === 1 || instrLower.includes('summary')) {
              updatedIrData.executive_summary = '• ' + revisedItems.join('\n• ');
              updatedIrData.business_summary = updatedIrData.executive_summary;
              replyText = `Replaced existing Executive Summary content on Slide 2 with clean revised bullet points.`;
            } else if (currentSlide === 2 || instrLower.includes('requirement')) {
              updatedIrData.requirements = revisedItems;
              replyText = `Replaced client requirements list on Slide 3 with your revised points.`;
            } else if (currentSlide === 3 || instrLower.includes('gap')) {
              updatedIrData.gaps = revisedItems;
              replyText = `Replaced capability gaps list on Slide 4 with your revised points.`;
            } else if (currentSlide === 4 || instrLower.includes('pillar')) {
              updatedIrData.solution_pillars = revisedItems.map(item => ({ title: item, description: 'Custom revised strategic pillar item.' }));
              replyText = `Replaced solution pillars on Slide 5.`;
            } else if (currentSlide === 6 || instrLower.includes('flow')) {
              updatedIrData.data_flow = revisedItems;
              replyText = `Replaced data flow steps on Slide 7.`;
            } else {
              updatedIrData.executive_summary = '• ' + revisedItems.join('\n• ');
              replyText = `Replaced existing content on Slide ${currentSlide + 1} with clean revised bullet points!`;
            }
          }
          // 3. Infrastructure Table / Unit Costs (Slide 8 or infra keywords)
          else if (updatedIrData.infrastructure_approximation && Array.isArray(updatedIrData.infrastructure_approximation)) {
            const costMatch = userMsg.text.match(/(\$?\s*\d+(?:\.\d+)?(?:\s*k|\s*m)?(?:\s*\$)?|\d+\s*(?:dollars?|USD))/i);
            let newCost = costMatch ? costMatch[1].trim() : null;
            if (newCost && !newCost.includes('$')) newCost = `$${newCost}`;

            let updatedRow = false;
            updatedIrData.infrastructure_approximation.forEach((row: any) => {
              const compName = (row.component || '').toLowerCase();
              if (
                (instrLower.includes('app service') && compName.includes('app service')) ||
                (instrLower.includes('postgres') && compName.includes('postgres')) ||
                (instrLower.includes('redis') && compName.includes('redis')) ||
                (instrLower.includes('blob') && compName.includes('blob')) ||
                (instrLower.includes('api') && compName.includes('api'))
              ) {
                if (newCost) {
                  row.unit_cost = newCost;
                  row.estimated_monthly_cost = newCost;
                  replyText = `Updated unit cost for '${row.component}' to '${newCost}' on Slide ${currentSlide + 1}!`;
                } else {
                  row.specification = userMsg.text;
                  replyText = `Updated specification for '${row.component}' on Slide ${currentSlide + 1}!`;
                }
                updatedRow = true;
              }
            });

            if (!updatedRow && updatedIrData.infrastructure_approximation.length > 0 && (instrLower.includes('cost') || instrLower.includes('unit') || newCost || currentSlide === 7)) {
              const target = updatedIrData.infrastructure_approximation[0];
              if (newCost) {
                target.unit_cost = newCost;
                target.estimated_monthly_cost = newCost;
                replyText = `Updated unit cost for '${target.component}' to '${newCost}' on Slide ${currentSlide + 1}!`;
              }
            }
          }
          // 4. Proposal Title
          else if (instrLower.includes('title') || instrLower.includes('rename')) {
            const titleMatch = userMsg.text.match(/(?:title|name)\s+(?:to\s+)?["\']?(.*?)["\']?$/i);
            if (titleMatch && titleMatch[1]) {
              updatedIrData.proposal_title = titleMatch[1].trim();
            } else {
              updatedIrData.proposal_title = userMsg.text;
            }
            replyText = `Updated proposal title to '${updatedIrData.proposal_title}'.`;
          }

          // 3. Executive / Business Summary (Slide 2)
          else if (instrLower.includes('summary') || currentSlide === 1) {
            if (typeof updatedIrData.executive_summary === 'string') {
              updatedIrData.executive_summary += `\n• ${userMsg.text}`;
            } else if (Array.isArray(updatedIrData.executive_summary)) {
              updatedIrData.executive_summary.push(userMsg.text);
            }
            replyText = `Updated Executive Summary on Slide ${currentSlide + 1}.`;
          }

          // 4. Client Requirements (Slide 3)
          else if (instrLower.includes('requirement') || instrLower.includes('scope') || currentSlide === 2) {
            if (!Array.isArray(updatedIrData.requirements)) updatedIrData.requirements = [];
            updatedIrData.requirements.push(userMsg.text);
            replyText = `Added requirement to Scope of Work on Slide 3.`;
          }
        }
      }

      // Set state to trigger live slide re-render!
      setLocalIr(updatedIrData);

      setChatMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (e: any) {
      console.error('Chat refinement error:', e);
    } finally {
      setIsRefiningSlide(false);
    }
  };

  if (!isOpen || !localIr) return null;

  // Helpers to update local IR state
  const updateField = (key: string, value: any) => {
    setLocalIr((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const updateListItem = (field: 'requirements' | 'gaps' | 'data_flow', idx: number, val: string) => {
    const newList = [...(localIr[field] || [])];
    newList[idx] = val;
    updateField(field, newList);
  };

  const addListItem = (field: 'requirements' | 'gaps' | 'data_flow') => {
    const newList = [...(localIr[field] || [])];
    newList.push('');
    updateField(field, newList);
  };

  const deleteListItem = (field: 'requirements' | 'gaps' | 'data_flow', idx: number) => {
    const newList = [...(localIr[field] || [])];
    newList.splice(idx, 1);
    updateField(field, newList);
  };

  const updatePillar = (idx: number, key: string, val: string) => {
    const newPillars = [...(localIr.solution_pillars || [])];
    newPillars[idx] = { ...newPillars[idx], [key]: val };
    updateField('solution_pillars', newPillars);
  };

  
  const updateSlideHeader = (key: string, field: 'title' | 'subtitle', value: string) => {
    setLocalIr((prev: any) => {
      const newIr = { ...prev };
      if (!newIr.slide_headers) newIr.slide_headers = {};
      if (!newIr.slide_headers[key]) newIr.slide_headers[key] = {};
      newIr.slide_headers[key][field] = value;
      return newIr;
    });
  };

  const getSlideHeader = (key: string, defaultTitle: string, defaultSubtitle: string) => {
    const headers = localIr?.slide_headers || {};
    const slideHeader = headers[key] || {};
    return {
      title: slideHeader.title || defaultTitle,
      subtitle: slideHeader.subtitle || defaultSubtitle
    };
  };

  const updateMermaidCode = (slideTitle: string, newMermaid: string) => {
    setLocalIr((prev: any) => {
      const complex = [...(prev.complex_diagrams || [])];
      const isRefArch = slideTitle.toLowerCase().includes('reference');
      let idx = -1;
      
      if (isRefArch) {
        idx = complex.findIndex((c: any) => c.title?.toLowerCase() === 'reference architecture');
      } else {
        idx = complex.findIndex((c: any) => {
          const tl = c.title?.toLowerCase() || '';
          return tl.includes('landscape') || tl.includes('cloud');
        });
      }

      const updatedObj = idx >= 0 ? { ...complex[idx] } : { title: isRefArch ? 'Reference Architecture' : 'Landscape Architecture' };
      updatedObj.mermaid_code = newMermaid;

      if (idx >= 0) {
        complex[idx] = updatedObj;
      } else {
        complex.push(updatedObj);
      }

      return {
        ...prev,
        complex_diagrams: complex
      };
    });
  };

  // Architecture components editing
  const updateArchitectureComponent = (layerIdx: number, compIdx: number, val: string) => {
    const newArch = [...(localIr.architecture || [])];
    const newComps = [...(newArch[layerIdx].components || [])];
    newComps[compIdx] = val;
    newArch[layerIdx] = { ...newArch[layerIdx], components: newComps };
    updateField('architecture', newArch);
  };

  const addArchitectureComponent = (layerIdx: number) => {
    const newArch = [...(localIr.architecture || [])];
    const newComps = [...(newArch[layerIdx].components || [])];
    newComps.push('New Component');
    newArch[layerIdx] = { ...newArch[layerIdx], components: newComps };
    updateField('architecture', newArch);
  };

  const deleteArchitectureComponent = (layerIdx: number, compIdx: number) => {
    const newArch = [...(localIr.architecture || [])];
    const newComps = [...(newArch[layerIdx].components || [])];
    newComps.splice(compIdx, 1);
    newArch[layerIdx] = { ...newArch[layerIdx], components: newComps };
    updateField('architecture', newArch);
  };

  // Infrastructure Approximation
  const updateInfraRow = (idx: number, key: string, val: string) => {
    const newInfra = [...(localIr.infrastructure_approximation || [])];
    newInfra[idx] = { ...newInfra[idx], [key]: val };
    updateField('infrastructure_approximation', newInfra);
  };

  // Sizing effort table
  const updateResourceRow = (idx: number, key: string, val: string) => {
    const newRes = [...(localIr.resources || [])];
    newRes[idx] = { ...newRes[idx], [key]: val };
    if (key === 'rate' || key === 'person_hours') {
      const rateNum = parseFloat(String(newRes[idx].rate).replace(/[$,]/g, ''));
      const hoursNum = parseFloat(String(newRes[idx].person_hours));
      if (!isNaN(rateNum) && !isNaN(hoursNum)) {
        newRes[idx].total = `$${(rateNum * hoursNum).toLocaleString()}`;
      }
    }
    updateField('resources', newRes);
  };

  // Skills mapping
  const updateSkillsRow = (idx: number, key: string, val: string) => {
    const newSkills = [...(localIr.skills_mapping || [])];
    newSkills[idx] = { ...newSkills[idx], [key]: val };
    updateField('skills_mapping', newSkills);
  };

  // Case Study edits
  const updateCaseStudyField = (projIdx: number, key: string, val: any) => {
    const newProjects = [...(localIr.similar_projects || [])];
    newProjects[projIdx] = { ...newProjects[projIdx], [key]: val };
    updateField('similar_projects', newProjects);
  };

  const updateCaseStudyList = (projIdx: number, field: string, listIdx: number, val: string) => {
    const proj = (localIr.similar_projects || [])[projIdx];
    const newList = [...(proj[field] || [])];
    newList[listIdx] = val;
    updateCaseStudyField(projIdx, field, newList);
  };

  const addCaseStudyListItem = (projIdx: number, field: string) => {
    const proj = (localIr.similar_projects || [])[projIdx];
    const newList = [...(proj[field] || [])];
    newList.push('');
    updateCaseStudyField(projIdx, field, newList);
  };

  const deleteCaseStudyListItem = (projIdx: number, field: string, listIdx: number) => {
    const proj = (localIr.similar_projects || [])[projIdx];
    const newList = [...(proj[field] || [])];
    newList.splice(listIdx, 1);
    updateCaseStudyField(projIdx, field, newList);
  };

  // Save changes handler
  const handleSave = async () => {
    if (!onSave) return;
    try {
      setSaving(true);
      await onSave(localIr);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Helper: Encode Mermaid code to base64 for mermaid.ink
  const getMermaidUrl = (code: string) => {
    if (!code) return '';
    try {
      let clean = code.trim();
      if (clean.startsWith('```mermaid')) {
        clean = clean.substring(10);
      } else if (clean.startsWith('```')) {
        clean = clean.substring(3);
      }
      if (clean.endsWith('```')) {
        clean = clean.substring(0, clean.length - 3);
      }
      clean = clean.trim();

      if (!clean.includes('%%{init:')) {
        const styleInit = 
`%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#ffffff',
    'primaryTextColor': '#2d2d2d',
    'primaryBorderColor': '#d04a02',
    'lineColor': '#4a4a4a',
    'secondaryColor': '#f4f6f8',
    'tertiaryColor': '#ffffff',
    'mainBkg': '#ffffff',
    'nodeBorder': '#d04a02',
    'clusterBkg': '#f8f9fa',
    'clusterBorder': '#cccccc',
    'fontSize': '15px'
  }
}}%%\n`;
        clean = styleInit + clean;
      }

      const encoded = btoa(unescape(encodeURIComponent(clean)));
      return `https://mermaid.ink/img/${encoded.replace(/=+$/, '')}`;
    } catch (e) {
      console.error('Error rendering mermaid base64', e);
      return '';
    }
  };

  // Extract reference architecture mermaid code
  const getRefArchMermaid = () => {
    const complex = localIr.complex_diagrams || [];
    const match = complex.find((c: any) => c.title?.toLowerCase() === 'reference architecture');
    if (match?.mermaid_code) return match.mermaid_code;

    const cloudName = localIr.budget?.toLowerCase().includes('aws') ? 'AWS' : 'Azure';
    const storageName = cloudName === 'AWS' ? 'AWS S3' : 'Azure Blob Storage';

    return `graph LR
    subgraph External [External Sources]
        E1[RFI/RFP Documents]
        E2[Project Timeline]
        E3[Competency Documents]
        E4[Company Asset Lists]
        E5[Questionnaires]
        E6[Financial Documents]
        PA[Parsing Agent]
    end
    
    subgraph Orchestration [Orchestration Layer]
        HO[Hierarchical Orchestrator]
        RMA[Requirement Mapping Agent]
        SDA[Solution Design Agent]
        PLA[Planning Agent]
        RA[Rendering Agent]
    end
    
    subgraph Knowledge [Knowledge Layer]
        KB[PostgreSQL: Competencies]
        VS[ChromaDB: Vector Store]
    end
    
    subgraph Guardrails [Guardrails]
        VAL[Guardrails SDK: Validation]
        CC[Compliance Check]
    end
    
    subgraph Output [Output Layer]
        PRE[PowerPoint Rendering Engine]
        ABS[${storageName}: Draft Proposals]
        HRI[Human Review Interface]
        AP[Approved Proposal]
    end
    
    E1 --> PA
    E2 --> PA
    E3 --> PA
    E4 --> PA
    E5 --> PA
    E6 --> PA
    PA --> HO
    
    HO --> RMA
    HO --> SDA
    HO --> PLA
    HO --> RA
    
    RMA --> KB
    SDA --> KB
    SDA --> VS
    PLA --> KB
    PLA --> VS
    RA --> VS
    
    KB --> VAL
    VS --> VAL
    VAL --> CC
    
    HO --> CC
    HO --> PRE
    PRE --> ABS
    ABS --> HRI
    HRI --> AP
    CC --> HRI`;
  };

  // Extract landscape architecture cloud diagram
  const getCloudLandscapeMermaid = () => {
    const complex = localIr.complex_diagrams || [];
    const match = complex.find((c: any) => {
      const tl = c.title?.toLowerCase() || '';
      return tl.includes('landscape') || tl.includes('cloud');
    });
    if (match?.mermaid_code) return match.mermaid_code;

    const cloudName = localIr.budget?.toLowerCase().includes('aws') ? 'AWS' : 'Azure';
    const dbName = localIr.db_tech || 'PostgreSQL';
    const backendName = localIr.backend_tech || 'FastAPI';
    const ingestionTool = cloudName === 'AWS' ? 'AWS Glue' : 'Azure Data Factory';
    const monitorTool = cloudName === 'AWS' ? 'AWS CloudWatch' : 'Azure Monitor';
    const storageTool = cloudName === 'AWS' ? 'AWS S3' : 'Azure Blob Storage';
    const searchTool = cloudName === 'AWS' ? 'Amazon Kendra' : 'Azure Cognitive Search';
    const k8sCluster = cloudName === 'AWS' ? 'EKS Cluster' : 'AKS Cluster';

    return `graph LR
    subgraph OnPrem [On-Premises]
        Client[Client Artefacts] --> ADF[${ingestionTool}: Ingestion]
    end
    
    subgraph Monitoring [Monitoring]
        Monitor[${monitorTool}: Logs & Metrics] --> Alerts[Alerts & Governance]
    end
    
    subgraph DataFlow [Data Flow]
        SJSON[Structured JSON Intermediate] --> DPS[Deterministic Proposal Structure] --> PPDraft[PowerPoint Draft] --> HR[Human Review] --> AP[Approved Proposal]
    end
    
    subgraph Cloud [${cloudName} Cloud Platform]
        AKS[${k8sCluster}: Multi-Agent System]
        FastAPI[${backendName}: Agent Services] --> Gateway[API Gateway: ${backendName}] --> ExtAPI[External APIs: PowerPoint Rendering]
        DB[${dbName}: Knowledge Base] --> Embed[pgvector: Embeddings] --> Dashboard[Human Review Dashboard]
        VS[ChromaDB: Vector Store] --> Embed
        Blob[${storageTool}: Artefacts]
        Search[${searchTool}: Indexing] --> RAG[RAG: Requirement Mapping] --> Design[Solution Design]
    end
    
    ADF --> AKS
    ADF --> SJSON
    AKS --> Monitor
    AKS --> DPS
    AKS --> FastAPI
    AKS --> DB
    AKS --> VS
    AKS --> Blob
    AKS --> Search`;
  };

  // Extract reference architecture description
  const getRefArchDescription = () => {
    const complex = localIr.complex_diagrams || [];
    const match = complex.find((c: any) => c.title?.toLowerCase() === 'reference architecture');
    return match?.description || '';
  };

  // Extract landscape architecture description
  const getLandscapeArchDescription = () => {
    const complex = localIr.complex_diagrams || [];
    const match = complex.find((c: any) => {
      const tl = c.title?.toLowerCase() || '';
      return tl.includes('landscape') || tl.includes('cloud');
    });
    return match?.description || '';
  };

  const safeText = (v: any) => {
    if (typeof v === 'object' && v !== null) {
      return v.title ? `${v.title}${v.details ? ': ' + v.details : ''}` : JSON.stringify(v);
    }
    return String(v || '');
  };

  // Build the slides dynamic list
  const slides: any[] = [];

  // Slide 1: Cover Page
  slides.push({
    type: 'cover',
    title: localIr.proposal_title || "Autonomous Solution Design",
    client: localIr.client_name || clientName || "Valued Client",
    subtitle: "Draft Solution Architecture & Implementation Proposal",
    date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  });

  // Slide 2: Business Summary
  if (localIr.business_summary) {
    let summaryText = '';
    if (typeof localIr.business_summary === 'object' && !Array.isArray(localIr.business_summary)) {
      summaryText = Object.values(localIr.business_summary).join('\n');
    } else if (Array.isArray(localIr.business_summary)) {
      summaryText = localIr.business_summary.join('\n');
    } else {
      summaryText = String(localIr.business_summary);
    }
    slides.push({
      type: 'summary',
      slideKey: 'business_summary',
      title: getSlideHeader('business_summary', 'Business Summary', 'Executive overview of the proposed solution').title,
      subtitle: getSlideHeader('business_summary', 'Business Summary', 'Executive overview of the proposed solution').subtitle,
      content: summaryText.split('\n').filter(p => p.trim()),
      rawSummary: summaryText
    });
  }

  // Slide 3: Client Requirements
  if (localIr.requirements) {
    slides.push({
      type: 'list_slide',
      field: 'requirements',
      slideKey: 'client_requirements',
      title: getSlideHeader('client_requirements', 'Client Requirements & Gap Analysis', 'RAG-driven competence matching against RFP requirements').title,
      subtitle: getSlideHeader('client_requirements', 'Client Requirements & Gap Analysis', 'RAG-driven competence matching against RFP requirements').subtitle,
      headerLabel: 'Key Client Requirements:',
      headerColor: 'text-[#d04a02]',
      items: Array.isArray(localIr.requirements) ? localIr.requirements : [localIr.requirements]
    });
  }

  // Slide 4: Capability Gaps
  if (localIr.gaps) {
    slides.push({
      type: 'list_slide',
      field: 'gaps',
      slideKey: 'capability_gaps',
      title: getSlideHeader('capability_gaps', 'Capability Gaps & Mitigations', 'Identified gaps against RFP requirements and proposed mitigations').title,
      subtitle: getSlideHeader('capability_gaps', 'Capability Gaps & Mitigations', 'Identified gaps against RFP requirements and proposed mitigations').subtitle,
      headerLabel: 'Capability Gaps & Mitigations:',
      headerColor: 'text-[#b42828]',
      items: Array.isArray(localIr.gaps) ? localIr.gaps : [localIr.gaps]
    });
  }

  // Slide 5: Solution Pillars
  if (localIr.solution_pillars && Array.isArray(localIr.solution_pillars)) {
    slides.push({
      type: 'pillars',
      slideKey: 'solution_approach',
      title: getSlideHeader('solution_approach', 'Solution Approach & Architecture', 'High-level implementation strategy and operational frameworks').title,
      subtitle: getSlideHeader('solution_approach', 'Solution Approach & Architecture', 'High-level implementation strategy and operational frameworks').subtitle,
      pillars: localIr.solution_pillars
    });
  }

  // Slide 6: Landscape & Architecture (Components Layer)
  if (localIr.architecture && Array.isArray(localIr.architecture)) {
    slides.push({
      type: 'architecture',
      slideKey: 'architecture_layers',
      title: getSlideHeader('architecture_layers', 'Landscape & Architecture', 'Reference systems architecture and integration patterns').title,
      subtitle: getSlideHeader('architecture_layers', 'Landscape & Architecture', 'Reference systems architecture and integration patterns').subtitle,
      layers: localIr.architecture
    });
  }

  // Slide 7: High Level Design: Data Flow
  if (localIr.data_flow && Array.isArray(localIr.data_flow)) {
    slides.push({
      type: 'data_flow',
      field: 'data_flow',
      slideKey: 'high_level_design',
      title: getSlideHeader('high_level_design', 'High Level Design: Data Flow', 'Dynamic data integration and multi-agent interaction flow').title,
      subtitle: getSlideHeader('high_level_design', 'High Level Design: Data Flow', 'Dynamic data integration and multi-agent interaction flow').subtitle,
      items: localIr.data_flow
    });
  }

  // Slide 8: Infrastructure Cost Calculator
  if (localIr.infrastructure_approximation && Array.isArray(localIr.infrastructure_approximation)) {
    slides.push({
      type: 'infra_table',
      slideKey: 'infrastructure',
      title: getSlideHeader('infrastructure', 'Infrastructure Approximation', 'Estimated cloud infrastructure components and costs').title,
      subtitle: getSlideHeader('infrastructure', 'Infrastructure Approximation', 'Estimated cloud infrastructure components and costs').subtitle,
      rows: localIr.infrastructure_approximation
    });
  }

  // Slide 9: Sizing & Effort table
  if (localIr.resources && Array.isArray(localIr.resources)) {
    slides.push({
      type: 'resources_table',
      slideKey: 'resources_effort',
      title: getSlideHeader('resources_effort', 'Effort & Person-Hour Conversion', 'Allocated program FTE structure, rate cards, and financial sizing').title,
      subtitle: getSlideHeader('resources_effort', 'Effort & Person-Hour Conversion', 'Allocated program FTE structure, rate cards, and financial sizing').subtitle,
      resources: localIr.resources,
      budget: localIr.budget
    });
  }

  // Slide 10: Skills Competency Mapping
  if (localIr.skills_mapping && Array.isArray(localIr.skills_mapping)) {
    slides.push({
      type: 'skills_table',
      slideKey: 'skills_inventory',
      title: getSlideHeader('skills_inventory', 'Skills Inventory & Competency Mapping', 'Required technical capabilities grounded in organizational assets').title,
      subtitle: getSlideHeader('skills_inventory', 'Skills Inventory & Competency Mapping', 'Required technical capabilities grounded in organizational assets').subtitle,
      skills: localIr.skills_mapping
    });
  }

  // Slide 11: Case Studies
  if (localIr.similar_projects && Array.isArray(localIr.similar_projects) && localIr.similar_projects.length > 0) {
    localIr.similar_projects.forEach((proj: any, idx: number) => {
      slides.push({
        type: 'case_study',
        projectIndex: idx,
        title: `Case Study ${idx + 1}: ${proj.project_name || 'Cloud Migration'} (${proj.client_industry || 'Client'})`,
        subtitle: 'Past credentials and successful delivery outcomes',
        project: proj
      });
    });
  }

  // Slide 12: Reference Architecture Diagram
  slides.push({
    type: 'mermaid_diagram',
    slideKey: 'reference_architecture',
      title: getSlideHeader('reference_architecture', 'Reference Architecture', 'System Data Flow & Orchestration Architecture').title,
      subtitle: getSlideHeader('reference_architecture', 'Reference Architecture', 'System Data Flow & Orchestration Architecture').subtitle,
    subHeader: 'Logical Reference Architecture & Component Topology',
    mermaidCode: getRefArchMermaid(),
    description: getRefArchDescription()
  });

  // Slide 13: Cloud Landscape Diagram
  const cloudPlatformName = localIr.budget?.toLowerCase().includes('aws') ? 'AWS' : 'Azure';
  slides.push({
    type: 'mermaid_diagram',
    slideKey: 'landscape_architecture',
      title: getSlideHeader('landscape_architecture', `Landscape Architecture (${cloudPlatformName} Cloud Platform)`, `${cloudPlatformName} Native Services & Integration Topology`).title,
      subtitle: getSlideHeader('landscape_architecture', `Landscape Architecture (${cloudPlatformName} Cloud Platform)`, `${cloudPlatformName} Native Services & Integration Topology`).subtitle,
    subHeader: `${cloudPlatformName} Services Integration & Data Pipeline`,
    mermaidCode: getCloudLandscapeMermaid(),
    description: getLandscapeArchDescription()
  });

  // Slide 14: Thank You
  slides.push({
    type: 'thank_you'
  });

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) return; // Disable slideshow slide key nav during text edit
    
    // Ignore keydown if user is typing in an input or textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
  };

  const renderSlideContent = (slide: any) => {
    switch (slide.type) {
      case 'cover':
        return (
          <div className="flex-1 flex flex-col justify-center px-12 relative text-left bg-[#2d2d2d] text-white h-full border-l-[16px] border-[#d04a02]">
            <div className="max-w-3xl space-y-4">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#d04a02] font-mono">PROPOSAL TITLE:</span>
                    <input
                      type="text"
                      className="bg-transparent border border-gray-600 rounded px-2 py-1 text-2xl font-extrabold text-white w-full focus:border-[#d04a02] focus:outline-none"
                      value={slide.title}
                      onChange={(e) => updateField('proposal_title', e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-white leading-tight">
                    {slide.title}
                  </h1>
                </>
              )}
              <p className="text-sm text-gray-400 mt-12 font-mono">
                {slide.subtitle}
              </p>
              <p className="text-xs text-gray-500 mt-2 font-mono">
                Draft Date: {slide.date}
              </p>
            </div>
          </div>
        );

      case 'summary':
        return (
          <div className="flex-1 flex flex-col gap-4 py-4 px-2">
            <div className="flex-1 overflow-y-auto max-h-[380px] pr-2 space-y-4 text-left">
              {isEditing ? (
                <textarea
                  rows={10}
                  className="w-full bg-white border border-gray-300 rounded p-2 text-xs text-[#2d2d2d] leading-relaxed resize-none focus:border-[#d04a02] focus:outline-none font-medium"
                  value={slide.rawSummary}
                  onChange={(e) => {
                    const val = e.target.value;
                    const lines = val.split('\n');
                    updateField('business_summary', lines);
                  }}
                />
              ) : (
                slide.content.map((p: string, idx: number) => (
                  <p key={idx} className="text-sm leading-relaxed text-[#2d2d2d] text-justify font-medium">
                    {safeText(p)}
                  </p>
                ))
              )}
            </div>
          </div>
        );

      case 'list_slide':
        const fieldName = slide.field as 'requirements' | 'gaps' | 'data_flow';
        return (
          <div className="flex-1 flex flex-col gap-3 py-3 px-2 text-left h-full max-h-[390px]">
            <h3 className={`text-sm font-bold uppercase tracking-wider ${slide.headerColor} mb-1`}>
              {slide.headerLabel}
            </h3>
            <div className="flex-1 overflow-y-auto max-h-[310px] pr-2 space-y-3">
              {slide.items.map((item: string, idx: number) => (
                <div key={idx} className="flex gap-2.5 items-center">
                  <span className={`text-base ${slide.headerColor} leading-none`}>•</span>
                  {isEditing ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <input
                        type="text"
                        className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 focus:border-[#d04a02] focus:outline-none font-semibold"
                        value={safeText(item)}
                        onChange={(e) => updateListItem(fieldName, idx, e.target.value)}
                      />
                      <button
                        onClick={() => deleteListItem(fieldName, idx)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-gray-700 leading-relaxed">
                      {safeText(item)}
                    </p>
                  )}
                </div>
              ))}
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-[10px] py-0.5 h-6 gap-1 border-dashed border-gray-300"
                  onClick={() => addListItem(fieldName)}
                >
                  <Plus size={10} /> Add Item
                </Button>
              )}
            </div>
          </div>
        );

      case 'pillars':
        return (
          <div className="flex-1 grid grid-cols-3 gap-6 py-4 px-2 items-stretch text-left">
            {slide.pillars.slice(0, 3).map((pillar: any, idx: number) => (
              <div key={idx} className="flex flex-col border border-gray-200 rounded-xl p-4 bg-gray-50/50 shadow-sm relative">
                <div className="text-[#d04a02] font-mono font-bold text-lg mb-2">
                  0{idx + 1}.
                </div>
                {isEditing ? (
                  <div className="space-y-3 flex-1 flex flex-col">
                    <input
                      type="text"
                      className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-[#2d2d2d] focus:border-[#d04a02] focus:outline-none font-bold"
                      value={pillar.title}
                      onChange={(e) => updatePillar(idx, 'title', e.target.value)}
                    />
                    <textarea
                      rows={8}
                      className="w-full bg-white border border-gray-300 rounded p-2 text-[10px] text-gray-600 leading-relaxed resize-none focus:border-[#d04a02] focus:outline-none flex-1 font-semibold"
                      value={pillar.desc}
                      onChange={(e) => updatePillar(idx, 'desc', e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <h4 className="text-sm font-bold text-[#2d2d2d] border-b border-[#d04a02] pb-2 mb-3">
                      {pillar.title}
                    </h4>
                    <p className="text-[11px] leading-relaxed text-gray-600 text-justify flex-1 overflow-y-auto pr-1">
                      {pillar.desc}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        );

      case 'architecture':
        return (
          <div className="flex-1 flex flex-col gap-4 py-3 px-2">
            <div className="flex-1 flex flex-col justify-center gap-3">
              {slide.layers.slice(0, 4).map((layer: any, layerIdx: number) => (
                <div key={layerIdx} className="relative">
                  <div className="grid grid-cols-12 border border-[#daa520] rounded-lg overflow-hidden shadow-sm bg-gray-50/50">
                    <div className="col-span-3 bg-[#2d2d2d] text-white flex items-center justify-center p-3 text-center">
                      <span className="text-[10px] font-bold tracking-wider leading-snug">
                        {layer.name}
                      </span>
                    </div>
                    <div className="col-span-9 p-3 flex flex-wrap gap-2 items-center justify-start text-left">
                      {layer.components?.map((comp: string, compIdx: number) => (
                        <div key={compIdx} className="inline-flex items-center gap-1.5 bg-white border border-[#d04a02] text-[#2d2d2d] pl-2.5 pr-1.5 py-1 rounded shadow-xs">
                          {isEditing ? (
                            <>
                              <input
                                type="text"
                                className="bg-transparent border-0 outline-none text-[10px] font-bold text-[#2d2d2d] w-24 focus:ring-0"
                                value={comp}
                                onChange={(e) => updateArchitectureComponent(layerIdx, compIdx, e.target.value)}
                              />
                              <button
                                onClick={() => deleteArchitectureComponent(layerIdx, compIdx)}
                                className="text-red-500 hover:text-red-700 cursor-pointer"
                              >
                                <X size={10} />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold">
                              {comp}
                            </span>
                          )}
                        </div>
                      ))}
                      {isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[8px] px-2 py-0.5 h-6 gap-0.5 border-dashed border-[#d04a02]"
                          onClick={() => addArchitectureComponent(layerIdx)}
                        >
                          <Plus size={8} /> Add
                        </Button>
                      )}
                    </div>
                  </div>
                  {layerIdx < Math.min(slide.layers.length, 4) - 1 && (
                    <div className="flex justify-center my-0.5">
                      <div className="w-4 h-4 bg-[#d04a02] text-white text-[8px] flex items-center justify-center rounded-full leading-none shadow-xs font-bold">
                        ▼
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'data_flow':
        return (
          <div className="flex-1 flex flex-col justify-center py-4 px-12">
            <div className="flex flex-col gap-2 max-w-2xl mx-auto w-full">
              {slide.items.map((item: string, idx: number) => (
                <React.Fragment key={idx}>
                  {isEditing ? (
                    <div className="flex gap-2 items-center bg-[#2d2d2d] border border-gray-600 rounded-lg p-1 px-2 text-white shadow-md">
                      <input
                        type="text"
                        className="flex-1 bg-transparent border-0 outline-none text-white text-[10px] font-bold text-center"
                        value={safeText(item)}
                        onChange={(e) => updateListItem('data_flow', idx, e.target.value)}
                      />
                      <button
                        onClick={() => deleteListItem('data_flow', idx)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#2d2d2d] border border-gray-600 rounded-lg p-2.5 text-center text-white text-[10px] font-bold shadow-md tracking-wide">
                      {safeText(item)}
                    </div>
                  )}
                  {idx < slide.items.length - 1 && (
                    <div className="text-center text-[#d04a02] text-xs font-bold -my-0.5 leading-none">
                      ▼
                    </div>
                  )}
                </React.Fragment>
              ))}
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-[10px] py-0.5 h-6 gap-1 border-dashed border-gray-400 text-gray-500 self-center"
                  onClick={() => addListItem('data_flow')}
                >
                  <Plus size={10} /> Add Flow Node
                </Button>
              )}
            </div>
          </div>
        );

      case 'infra_table':
        return (
          <div className="flex-1 flex flex-col justify-center py-4 px-2">
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-md">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#2d2d2d] text-white">
                    <th className="py-2.5 px-4 font-bold border-b border-gray-300">Azure Component</th>
                    <th className="py-2.5 px-4 font-bold border-b border-gray-300">Specification</th>
                    <th className="py-2.5 px-4 font-bold border-b border-gray-300 text-center">Unit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {slide.rows.map((row: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-2 px-4 border-b border-gray-200 font-bold text-gray-800">
                        {isEditing ? (
                          <input
                            type="text"
                            className="bg-white border border-gray-200 rounded px-1 py-0.5 text-xs w-full text-gray-800 font-bold"
                            value={row.component}
                            onChange={(e) => updateInfraRow(idx, 'component', e.target.value)}
                          />
                        ) : (
                          row.component
                        )}
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200 text-gray-600">
                        {isEditing ? (
                          <input
                            type="text"
                            className="bg-white border border-gray-200 rounded px-1 py-0.5 text-xs w-full text-gray-600"
                            value={row.spec}
                            onChange={(e) => updateInfraRow(idx, 'spec', e.target.value)}
                          />
                        ) : (
                          row.spec
                        )}
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200 text-center text-gray-700 font-semibold">
                        {isEditing ? (
                          <input
                            type="text"
                            className="bg-white border border-gray-200 rounded px-1 py-0.5 text-xs w-full text-center text-gray-700 font-semibold"
                            value={row.unit_cost || row.estimated_monthly_cost || ''}
                            onChange={(e) => {
                              updateInfraRow(idx, 'unit_cost', e.target.value);
                              updateInfraRow(idx, 'estimated_monthly_cost', e.target.value);
                            }}
                          />
                        ) : (
                          (() => {
                            const rawCost = String(row.unit_cost || row.estimated_monthly_cost || 'N/A').trim();
                            if (rawCost === 'N/A' || !rawCost) return 'N/A';
                            if (rawCost.toLowerCase().includes('onwards') || rawCost.toLowerCase().includes('hour')) return rawCost;
                            return rawCost.startsWith('$') ? `${rawCost} onwards per hour` : `$ ${rawCost} onwards per hour`;
                          })()
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'resources_table':
        return (
          <div className="flex-1 flex flex-col justify-center py-3 px-2">
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-md mb-2">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-[#2d2d2d] text-white">
                    <th className="py-2 px-3 font-bold border-b border-gray-300">Role / Competency</th>
                    <th className="py-2 px-3 font-bold border-b border-gray-300 text-center">Hourly Rate</th>
                    <th className="py-2 px-3 font-bold border-b border-gray-300 text-center">Person Hours</th>
                    <th className="py-2 px-3 font-bold border-b border-gray-300 text-center">Total Financial Sizing</th>
                  </tr>
                </thead>
                <tbody>
                  {slide.resources.map((res: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-1.5 px-3 border-b border-gray-200 font-bold text-gray-800">
                        {isEditing ? (
                          <input
                            type="text"
                            className="bg-white border border-gray-200 rounded px-1 py-0.5 text-[10px] w-full text-gray-800 font-bold"
                            value={res.role}
                            onChange={(e) => updateResourceRow(idx, 'role', e.target.value)}
                          />
                        ) : (
                          res.role
                        )}
                      </td>
                      <td className="py-1.5 px-3 border-b border-gray-200 text-center text-gray-600">
                        {isEditing ? (
                          <input
                            type="text"
                            className="bg-white border border-gray-200 rounded px-1 py-0.5 text-[10px] w-full text-center text-gray-600"
                            value={res.rate}
                            onChange={(e) => updateResourceRow(idx, 'rate', e.target.value)}
                          />
                        ) : (
                          res.rate
                        )}
                      </td>
                      <td className="py-1.5 px-3 border-b border-gray-200 text-center text-gray-600">
                        {isEditing ? (
                          <input
                            type="text"
                            className="bg-white border border-gray-200 rounded px-1 py-0.5 text-[10px] w-full text-center text-gray-600"
                            value={res.person_hours}
                            onChange={(e) => updateResourceRow(idx, 'person_hours', e.target.value)}
                          />
                        ) : (
                          res.person_hours
                        )}
                      </td>
                      <td className="py-1.5 px-3 border-b border-gray-200 text-center font-bold text-gray-700">
                        {isEditing ? (
                          <input
                            type="text"
                            className="bg-white border border-gray-200 rounded px-1 py-0.5 text-[10px] w-full text-center text-gray-700 font-bold"
                            value={res.total}
                            onChange={(e) => updateResourceRow(idx, 'total', e.target.value)}
                          />
                        ) : (
                          res.total
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-[#d04a02] text-white font-bold">
                    <td className="py-2 px-3">Total Assumption</td>
                    <td className="py-2 px-3 text-center">
                      ${(() => {
                        let totalRate = 0;
                        slide.resources.forEach((r: any) => {
                          const val = parseFloat(String(r.rate).replace(/[$,]/g, '').trim());
                          if (!isNaN(val)) totalRate += val;
                        });
                        return totalRate.toLocaleString();
                      })()}
                    </td>
                    <td className="py-2 px-3 text-center">-</td>
                    <td className="py-2 px-3 text-center">
                      {isEditing ? (
                        <input
                          type="text"
                          className="bg-[#e05a12] text-white border-0 outline-none text-[10px] w-full text-center font-bold focus:ring-0"
                          value={slide.budget || ''}
                          onChange={(e) => updateField('budget', e.target.value)}
                        />
                      ) : (
                        slide.budget || 'N/A'
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-gray-500 italic leading-snug">
              Disclaimer: Please note that this high-level estimate is subject to change as it depends on detailed client requirements. All resource and pricing calculations reflect the median baseline for similar enterprise integrations.
            </p>
          </div>
        );

      case 'skills_table':
        return (
          <div className="flex-1 flex flex-col justify-center py-4 px-2">
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-md">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#d04a02] text-white">
                    <th className="py-2.5 px-4 font-bold border-b border-orange-600">Technical Skill</th>
                    <th className="py-2.5 px-4 font-bold border-b border-orange-600">Target Project Role</th>
                  </tr>
                </thead>
                <tbody>
                  {slide.skills.map((item: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-2 px-4 border-b border-gray-200 font-bold text-gray-800">
                        {isEditing ? (
                          <input
                            type="text"
                            className="bg-white border border-gray-200 rounded px-1 py-0.5 text-xs w-full text-gray-800 font-bold"
                            value={item.skill}
                            onChange={(e) => updateSkillsRow(idx, 'skill', e.target.value)}
                          />
                        ) : (
                          item.skill
                        )}
                      </td>
                      <td className="py-2 px-4 border-b border-gray-200 text-gray-600">
                        {isEditing ? (
                          <input
                            type="text"
                            className="bg-white border border-gray-200 rounded px-1 py-0.5 text-xs w-full text-gray-600"
                            value={item.role}
                            onChange={(e) => updateSkillsRow(idx, 'role', e.target.value)}
                          />
                        ) : (
                          item.role
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'case_study':
        const csProj = slide.project;
        const csIdx = slide.projectIndex;
        return (
          <div className="flex-1 grid grid-cols-2 gap-4 py-2 px-2 text-left h-full max-h-[390px] overflow-hidden">
            {/* Left side: High Level Summary */}
            <div className="border border-gray-300 rounded-lg p-3 bg-white shadow-xs flex flex-col max-h-[380px] overflow-y-auto relative pt-5">
              <span className="absolute top-[-9px] left-3 bg-white px-2 text-[10px] font-bold text-[#2d2d2d] border border-gray-300 rounded">
                High Level Summary
              </span>
              <div className="space-y-3 mt-1">
                <div>
                  <h5 className="text-[10px] font-bold text-gray-800 uppercase tracking-wide mb-1 border-b border-gray-100 pb-0.5">
                    Business Problem
                  </h5>
                  <div className="space-y-1.5">
                    {csProj.business_problem?.map((bp: string, i: number) => (
                      <div key={i} className="flex gap-1.5 items-center">
                        {isEditing ? (
                          <>
                            <span className="text-[8px] text-gray-400 font-mono">•</span>
                            <input
                              type="text"
                              className="flex-1 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[9px] text-gray-600"
                              value={safeText(bp)}
                              onChange={(e) => updateCaseStudyList(csIdx, 'business_problem', i, e.target.value)}
                            />
                            <button onClick={() => deleteCaseStudyListItem(csIdx, 'business_problem', i)} className="text-red-500 hover:text-red-700">
                              <Trash2 size={10} />
                            </button>
                          </>
                        ) : (
                          <p className="text-[9px] text-gray-600 leading-relaxed">• {safeText(bp)}</p>
                        )}
                      </div>
                    ))}
                    {isEditing && (
                      <Button variant="outline" size="sm" className="text-[8px] h-5 py-0 px-2" onClick={() => addCaseStudyListItem(csIdx, 'business_problem')}>
                        <Plus size={8} /> Add
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <h5 className="text-[10px] font-bold text-gray-800 uppercase tracking-wide mb-1 border-b border-gray-100 pb-0.5">
                    Our Approach
                  </h5>
                  <div className="space-y-1.5">
                    {csProj.our_approach?.map((oa: string, i: number) => (
                      <div key={i} className="flex gap-1.5 items-center">
                        {isEditing ? (
                          <>
                            <span className="text-[8px] text-gray-400 font-mono">•</span>
                            <input
                              type="text"
                              className="flex-1 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[9px] text-gray-600"
                              value={safeText(oa)}
                              onChange={(e) => updateCaseStudyList(csIdx, 'our_approach', i, e.target.value)}
                            />
                            <button onClick={() => deleteCaseStudyListItem(csIdx, 'our_approach', i)} className="text-red-500 hover:text-red-700">
                              <Trash2 size={10} />
                            </button>
                          </>
                        ) : (
                          <p className="text-[9px] text-gray-600 leading-relaxed">• {safeText(oa)}</p>
                        )}
                      </div>
                    ))}
                    {isEditing && (
                      <Button variant="outline" size="sm" className="text-[8px] h-5 py-0 px-2" onClick={() => addCaseStudyListItem(csIdx, 'our_approach')}>
                        <Plus size={8} /> Add
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Diagram and details */}
            <div className="flex flex-col gap-3 justify-between max-h-[380px]">
              <div className="border border-gray-300 rounded-lg p-2.5 bg-white shadow-xs flex-1 flex flex-col justify-center items-center relative pt-5 overflow-hidden">
                <span className="absolute top-[-9px] left-3 bg-white px-2 text-[10px] font-bold text-[#2d2d2d] border border-gray-300 rounded">
                  Technical Architecture
                </span>
                {csProj.tech_architecture_mermaid ? (
                  <img
                    src={getMermaidUrl(csProj.tech_architecture_mermaid)}
                    alt="Case Study Architecture"
                    className="max-h-[140px] max-w-full object-contain"
                    onError={(e) => {
                      (e.target as any).src = '';
                    }}
                  />
                ) : (
                  <div className="text-[9px] text-gray-400 italic">No architecture diagram available</div>
                )}
              </div>

              {/* Explanations boxes row */}
              <div className="grid grid-cols-3 gap-2">
                {csProj.tech_architecture_explanation?.slice(0, 3).map((exp: string, i: number) => (
                  <div key={i} className="border border-gray-200 rounded p-1.5 bg-gray-50/50 text-[8px] text-gray-500 leading-normal text-justify max-h-[70px] overflow-y-auto">
                    {isEditing ? (
                      <textarea
                        rows={3}
                        className="w-full bg-white border border-gray-200 rounded p-0.5 text-[8px] text-gray-500 leading-snug resize-none focus:outline-none"
                        value={exp}
                        onChange={(e) => {
                          const newExps = [...(csProj.tech_architecture_explanation || [])];
                          newExps[i] = e.target.value;
                          updateCaseStudyField(csIdx, 'tech_architecture_explanation', newExps);
                        }}
                      />
                    ) : (
                      exp
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Technologies & Outcomes */}
              <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2 text-[8px]">
                <div>
                  <span className="font-bold text-gray-700">Key Technologies:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[8px] text-gray-500 w-full"
                      value={csProj.key_technologies?.join(', ') || ''}
                      onChange={(e) => {
                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        updateCaseStudyField(csIdx, 'key_technologies', arr);
                      }}
                    />
                  ) : (
                    <p className="text-gray-500 truncate">{csProj.key_technologies?.join(', ')}</p>
                  )}
                </div>
                <div>
                  <span className="font-bold text-gray-700">Benefits/Outcome:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[8px] text-gray-500 w-full"
                      value={csProj.benefits_outcome?.join(', ') || ''}
                      onChange={(e) => {
                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        updateCaseStudyField(csIdx, 'benefits_outcome', arr);
                      }}
                    />
                  ) : (
                    <p className="text-gray-500 truncate">{csProj.benefits_outcome?.join(', ')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'mermaid_diagram':
        console.log("PPTPreviewModal render case 'mermaid_diagram':", { title: slide.title, isEditing, mermaidCode: slide.mermaidCode });
        return (
          <div className="flex-1 flex flex-col py-2 px-2 text-left h-full">
            <h4 className="text-sm font-bold text-[#2d2d2d] border-b border-gray-100 pb-1 mb-2">
              {slide.subHeader}
            </h4>
            {slide.description && (
              <div className="text-[11px] text-gray-600 mb-2 leading-relaxed whitespace-pre-line font-medium bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                {slide.description}
              </div>
            )}
            <div className={`flex-1 border border-gray-200 rounded-xl bg-white shadow-xs ${isEditing ? 'w-full h-[270px]' : 'p-3 flex justify-center items-center overflow-auto max-h-[270px]'}`}>
              {isEditing ? (
                <DiagramEditor
                  key={slide.title}
                  initialMermaidCode={slide.mermaidCode}
                  onChange={(newCode) => updateMermaidCode(slide.title, newCode)}
                />
              ) : (
                <img
                  src={getMermaidUrl(slide.mermaidCode)}
                  alt={slide.title}
                  className="max-h-[240px] max-w-full object-contain"
                />
              )}
            </div>
          </div>
        );

      case 'thank_you':
        return (
          <div className="flex-1 flex flex-col justify-center items-center bg-white text-center h-full">
            <h1 className="text-7xl font-extrabold tracking-tight text-[#d04a02] animate-bounce">
              Thank You
            </h1>
            <p className="text-sm text-gray-400 mt-4 tracking-widest uppercase">
              AI Co-Pilot Design System
            </p>
          </div>
        );

      default:
        return <div className="text-center py-12">Unsupported Slide Type</div>;
    }
  };

  const slide = slides[currentSlide];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`PPT Presentation Slide Deck Preview - ${clientName || 'Solution'}`}
      className={`transition-all duration-300 h-[88vh] max-h-full flex flex-col overflow-hidden ${
        isChatOpen ? 'max-w-[96vw] h-[98vh] w-full' : 'max-w-7xl w-full'
      }`}
      bodyClassName="overflow-hidden p-0 flex flex-col min-h-0 h-full"
    >
      <div 
        className="flex-1 flex flex-col lg:flex-row gap-4 outline-hidden min-h-0 overflow-hidden h-full"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* LEFT COLUMN: Main Slide View & Navigation (FIXED HEIGHT) */}
        <div className="flex-1 flex flex-col min-w-0 h-full justify-between overflow-hidden">
          {/* Widescreen presentation container */}
          <div className="flex-1 bg-gray-100 flex items-center justify-center p-3 border border-gray-200 rounded-xl relative overflow-hidden shadow-inner select-none animate-fadeIn min-h-0">
            
            {/* Live Runtime Modification Overlay */}
            {isRefiningSlide && (
              <div className="absolute inset-0 bg-white/85 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-full mb-3 shadow-md animate-bounce">
                  <Bot className="w-7 h-7 text-secondary" />
                </div>
                <h4 className="text-base font-extrabold text-gray-900">
                  AI Assistant is modifying Slide {currentSlide + 1}...
                </h4>
                <p className="text-xs text-primary font-medium mt-1">
                  Updating live preview in runtime...
                </p>
              </div>
            )}

            {/* Main slide viewport mimicking python-pptx output */}
            <div className={`w-full aspect-[4/3] ${isChatOpen ? 'max-h-[74vh]' : 'max-h-[60vh] max-w-6xl'} bg-white border border-gray-300 shadow-2xl rounded-lg p-6 flex flex-col justify-between overflow-hidden relative`}>
              
              {/* Header section (skipped for title and thank you slides) */}
              {slide.type !== 'cover' && slide.type !== 'thank_you' && (
                <div className="flex flex-col text-left border-b border-gray-200 pb-2 mb-2 shrink-0">
                  {isEditing && slide.slideKey ? (
                    <>
                      <input
                        className="text-xl font-extrabold text-[#2d2d2d] leading-none mb-1 border-b border-gray-300 focus:border-[#d04a02] focus:outline-none w-full bg-transparent"
                        value={slide.title}
                        onChange={(e) => updateSlideHeader(slide.slideKey, 'title', e.target.value)}
                        placeholder="Slide Title"
                      />
                      <input
                        className="text-[10px] font-bold text-[#d04a02] tracking-wide uppercase border-b border-gray-300 focus:border-[#d04a02] focus:outline-none w-full bg-transparent mt-1"
                        value={slide.subtitle || ''}
                        onChange={(e) => updateSlideHeader(slide.slideKey, 'subtitle', e.target.value)}
                        placeholder="Slide Subtitle"
                      />
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-extrabold text-[#2d2d2d] leading-none mb-1">
                        {slide.title}
                      </h2>
                      {slide.subtitle && (
                        <p className="text-[10px] font-bold text-[#d04a02] tracking-wide uppercase">
                          {slide.subtitle}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Dynamic Content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {renderSlideContent(slide)}
              </div>

              {/* Footer section (skipped for title and thank you slides) */}
              {slide.type !== 'cover' && slide.type !== 'thank_you' && (
                <div className="flex justify-between items-center text-[8px] text-gray-400 font-mono border-t border-gray-100 pt-1.5 mt-1.5 shrink-0">
                  <span>AI Co-Pilot Proposal Builder System</span>
                  <span className="text-[#d04a02] font-semibold">Page {currentSlide + 1}</span>
                </div>
              )}
            </div>
          </div>

          {/* Slide Controls & Action Bar (FIXED AT BOTTOM) */}
          <div className="shrink-0 flex justify-between items-center p-3 mt-2 border-t border-border">
            <div className="flex items-center gap-4">
              {isEditing && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold animate-pulse">
                  Live Edit Mode
                </span>
              )}
            </div>
{/* "gap-1.5 text-xs font-bold border-button-orange text-button-orange hover:bg-button-orange/10 cursor-pointer" */}
            <div className="flex gap-2.5 items-center">
              {/* Navigation will be moved to the bottom */}
              {/* Chat Modal Toggle Button */}
              <Button
                variant="outline"
                size="sm"
                className={`gap-1.5 text-xs font-bold transition cursor-pointer ${
                  isChatOpen
                    ? 'text-button-orange border-button-orange shadow-xs hover:bg-button-orange/10'
                    : 'border-button-orange text-button-orange hover:bg-button-orange/10'
                }`}
                onClick={() => setIsChatOpen(!isChatOpen)}
              >
                <Sparkles size={13} className={isChatOpen ? 'text-primary' : 'text-secondary'} />
                {isChatOpen ? 'Close Chat Modal' : 'Chat Modal'}
              </Button>

              {canEdit && (
                isEditing ? (
                  <>
                    <Button
                      variant="success"
                      size="sm"
                      className="gap-1.5 text-xs font-bold bg-[#d04a02] hover:bg-[#d04a02]/95 border-[#d04a02] text-white cursor-pointer"
                      onClick={handleSave}
                      isLoading={saving}
                    >
                      <Save size={13} /> Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs cursor-pointer"
                      onClick={() => {
                        setLocalIr(JSON.parse(JSON.stringify(structuredIr)));
                        setIsEditing(false);
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs font-bold border-button-orange text-button-orange hover:bg-button-orange/10 cursor-pointer"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit size={13} /> Edit Slides
                  </Button>
                )
              )}

              {/* Explicit Save button if user modified via chat modal */}
              {canEdit && !isEditing && (
                <Button
                  variant="success"
                  size="sm"
                  className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                  onClick={handleSave}
                  isLoading={saving}
                >
                  <Save size={13} /> Save Changes
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs cursor-pointer mr-4"
                disabled={saving}
              >
                Close Preview
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevSlide}
                  disabled={currentSlide === 0 || isEditing || isRefiningSlide}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextSlide}
                  disabled={currentSlide === slides.length - 1 || isEditing || isRefiningSlide}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                Slide <strong>{currentSlide + 1}</strong> of <strong>{slides.length}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Chat Modal Side-by-Side Panel (FIXED CONTAINER, INTERNAL CHAT MESSAGES ONLY SCROLL) */}
        {isChatOpen && (
          <div className="w-full lg:w-[380px] xl:w-[450px] bg-card border border-border rounded-xl flex flex-col shadow-xl overflow-hidden h-full shrink-0 min-h-0 animate-in slide-in-from-right-4 duration-300">
            {/* Chat Modal Header (FIXED TOP) */}
            <div className="shrink-0 p-3 bg-input border-b border-border-orange text-foreground flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-orange-border/80 text-primary-orange border-orange-border rounded-lg backdrop-blur-xs">
                  <Bot className="w-4.5 h-4.5 text-background" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold tracking-wide uppercase flex items-center gap-1.5">
                    <span>Chat Modal</span>
                    
                  {/* inline-flex items-center justify-center gap-1 px-2 py-0.5   */}
                
                    <span className="rounded-full text-[10px] font-bold border leading-none bg-[#FF8A55]/15 text-[#FF5A14] border-[#FF8A55] px-2 py-0.5 font-mono">
                      AI Assistant
                    </span>
                  </h3>
                  <span className="text-muted-foreground text-xs font-medium truncate block max-w-60">
                    Active: Slide {currentSlide + 1} ({slide.title || 'Context'})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
                title="Close Chat Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages Body (ONLY THIS AREA SCROLLS!) */}
            <div className="flex-1 min-h-0 p-4 overflow-y-auto flex flex-col gap-4 text-xs scroll-smooth bg-card">
              {/* Default Welcome message */}
              <div className="flex items-end justify-start gap-2 max-w-[91%] self-start">
                <div className="w-8 h-8 rounded-full bg-button-orange/40 flex items-center justify-center shrink-0 mb-1">
                  <Bot size={16} className="text-foreground" />
                </div>
                <div className="bg-button-orange/90 p-3 rounded-lg rounded-tl-none text-sm text-foreground">
                  Hi! I am your <strong>AI Assistant</strong>.<br />
                   I’ll help you edit and customize your slides.
                  {/* Type any instruction for <strong>Slide {currentSlide + 1}</strong> (or mention any slide number), and I will update the presentation live for you! */}
                </div>
              </div>

              {chatMessages.map((msg, i) => (
                <div key={i} className="flex flex-col gap-2">
                  {msg.sender === 'ai' ? (
                    <div className="flex items-end justify-start gap-2 max-w-[91%] self-start">
                      <div className="w-8 h-8 rounded-full bg-button-orange/40 flex items-center justify-center shrink-0 mb-1">
                        <Bot size={16} className="text-foreground" />
                      </div>
                      <div className="bg-button-orange/90 p-3 rounded-lg rounded-tl-none text-sm text-foreground">
                        <ExpandableMessage text={msg.text} />
                        <span className="block text-[10px] mt-1">{msg.time}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end justify-end gap-2 max-w-[80%] self-end">
                      <div className="bg-button-orange text-white p-3 rounded-lg rounded-tr-none text-sm">
                        <ExpandableMessage text={msg.text} />
                        <span className="block text-[10px] mt-1 text-white/80 text-right">{msg.time}</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-button-orange/20 flex items-center justify-center shrink-0 mb-1">
                        <User size={16} className="text-primary-orange" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isRefiningSlide && (
                <div className="flex items-end justify-start gap-2 max-w-[91%] self-start mt-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mb-1">
                    <Bot size={16} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="py-3 text-left text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-tl-none flex items-center space-x-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    <span className="ml-2 text-xs font-medium">Modifying Slide {currentSlide + 1}...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar (FIXED AT BOTTOM OF CHAT) */}
            <div className="shrink-0 p-4 bg-input border-t border-border-orange flex items-center gap-2">
              <textarea
                ref={chatInputRef}
                rows={1}
                placeholder={`Instruct AI for Slide ${currentSlide + 1}...`}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (chatInput.trim() && !isRefiningSlide) {
                      handleSendChatMessage();
                    }
                  }
                }}
                disabled={isRefiningSlide}
                className="flex-1 px-3 py-2 rounded-lg border border-border focus:border-primary bg-card text-sm text-foreground placeholder:text-gray-500 focus:outline-none disabled:opacity-50 transition-colors resize-none overflow-y-auto"
                style={{ minHeight: '40px', maxHeight: '120px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
              <button
                onClick={() => handleSendChatMessage()}
                disabled={!chatInput.trim() || isRefiningSlide}
                className="p-2.5 bg-button-orange text-white rounded-lg hover:bg-hover-orange disabled:opacity-50 transition shadow-sm cursor-pointer"
                title="Send instruction to AI Assistant"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
