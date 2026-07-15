import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  FileUp, Play, Download, History, RefreshCw, Layers, Clock, 
  CheckCircle2, Cpu, Edit, Trash2, Plus, X, Save
} from 'lucide-react';
import { proposalApi } from '../../services/api/endpoints';
import { useProposalStore } from '../../store';
import { Proposal, ProposalStep, ProposalStatusResponse } from '../../types';
import { proposalUploadSchema } from '../../utils/validators';
import { PageWrapper } from '../../components/layout/PageWrapper/PageWrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Badge } from '../../components/ui/Badge/Badge';
import { Modal } from '../../components/ui/Modal/Modal';
import { useToast } from '../../components/ui/Toast/Toast';
import { formatDate } from '../../utils/formatters';

const STEP_PHASES = [
  { name: 'Ingesting', label: 'Document parsing', icon: <FileUp size={16} /> },
  { name: 'Analyzing', label: 'RAG capability check', icon: <Cpu size={16} /> },
  { name: 'Designing', label: 'Solution architecture', icon: <Layers size={16} /> },
  { name: 'Planning', label: 'Timeline & pricing', icon: <Clock size={16} /> },
  { name: 'Assembling', label: 'Reflexion assembly', icon: <CheckCircle2 size={16} /> },
  { name: 'Complete', label: 'Render PowerPoint', icon: <Download size={16} /> }
];

const Home: React.FC = () => {
  const { toast } = useToast();
  const { 
    proposals, 
    activeProposalId, 
    statusDetails, 
    isPolling, 
    fetchProposals, 
    setActiveProposalId, 
    setStatusDetails, 
    setPolling 
  } = useProposalStore();

  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editableIr, setEditableIr] = useState<any>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [savingIr, setSavingIr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(proposalUploadSchema),
    defaultValues: {
      clientName: '',
      projectDuration: '',
      budget: '',
    }
  });

  // Fetch proposals on mount
  useEffect(() => {
    fetchProposals();
  }, []);

  // Poll active proposal status
  useEffect(() => {
    let timerId: any = null;
    let isFetching = false;

    const poll = async () => {
      if (!activeProposalId || isFetching) return;
      isFetching = true;
      try {
        const details = await proposalApi.status(activeProposalId);
        setStatusDetails(details);
        
        const proposalStatus = details.proposal.status;
        if (proposalStatus === 'Complete') {
          setPolling(false);
          setActiveProposalId(null);
          toast('Proposal PowerPoint generation completed!', 'success');
          fetchProposals();
        } else if (proposalStatus === 'Failed') {
          setPolling(false);
          setActiveProposalId(null);
          toast('Proposal generation failed. Check step logs.', 'error');
          fetchProposals();
        } else {
          // Schedule next poll only if still running
          timerId = setTimeout(poll, 3000);
        }
      } catch (err) {
        console.error('Polling status failed:', err);
        // Retry after 3 seconds on error
        timerId = setTimeout(poll, 3000);
      } finally {
        isFetching = false;
      }
    };

    if (isPolling && activeProposalId) {
      poll();
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isPolling, activeProposalId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async (data: any) => {
    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('client_name', data.clientName);
      formData.append('project_duration', data.projectDuration);
      formData.append('budget', data.budget);
      
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await proposalApi.upload(formData);
      toast('Document intake complete. Initiating specialist agents workflow.', 'info');
      
      // Start polling
      setActiveProposalId(response.proposal_id);
      setStatusDetails(null);
      setPolling(true);
      setSelectedFiles([]);
      reset();
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      toast('Failed to trigger proposal creator: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleViewStatus = async (proposal: Proposal) => {
    try {
      const details = await proposalApi.status(proposal.id);
      setStatusDetails(details);
      
      if (proposal.status !== 'Complete' && proposal.status !== 'Failed') {
        setActiveProposalId(proposal.id);
        setPolling(true);
      }
    } catch (err) {
      toast('Failed to fetch details.', 'error');
    }
  };

  const openEditor = (structuredIr: any) => {
    if (!structuredIr) return;
    // Deep clone structured IR
    setEditableIr(JSON.parse(JSON.stringify(structuredIr)));
    setIsEditorOpen(true);
  };

  const saveUpdatedIr = async () => {
    if (!statusDetails?.proposal.id || !editableIr) return;
    try {
      setSavingIr(true);
      const response = await proposalApi.edit(statusDetails.proposal.id, editableIr);
      toast('Solution blueprint updated. PowerPoint deck regenerated.', 'success');
      
      // Update local state details
      setStatusDetails({
        ...statusDetails,
        proposal: {
          ...statusDetails.proposal,
          generated_file_path: response.file_path,
          structured_json_ir: JSON.stringify(response.structured_ir),
        },
        structured_ir: response.structured_ir
      });
      
      setIsEditorOpen(false);
      fetchProposals();
    } catch (err: any) {
      toast('Failed to save changes: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSavingIr(false);
    }
  };

  const editItemInList = (key: 'requirements' | 'gaps', index: number, val: string) => {
    if (!editableIr) return;
    const list = [...editableIr[key]];
    list[index] = val;
    setEditableIr({ ...editableIr, [key]: list });
  };

  const deleteItemFromList = (key: 'requirements' | 'gaps', index: number) => {
    if (!editableIr) return;
    const list = editableIr[key].filter((_: any, i: number) => i !== index);
    setEditableIr({ ...editableIr, [key]: list });
  };

  const addItemToList = (key: 'requirements' | 'gaps') => {
    if (!editableIr) return;
    const list = [...editableIr[key], 'New item description'];
    setEditableIr({ ...editableIr, [key]: list });
  };

  const updatePillar = (index: number, field: 'title' | 'desc', val: string) => {
    if (!editableIr?.solution_pillars) return;
    const pillars = [...editableIr.solution_pillars];
    pillars[index][field] = val;
    setEditableIr({ ...editableIr, solution_pillars: pillars });
  };

  const getStepStatusVariant = (stepName: string) => {
    if (!statusDetails?.steps) return 'outline';
    const step = statusDetails.steps.find((s) => s.step_name === stepName);
    if (!step) return 'outline';
    if (step.status === 'completed') return 'success';
    if (step.status === 'running') return 'warning';
    if (step.status === 'failed') return 'destructive';
    return 'outline';
  };

  return (
    <PageWrapper>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT WORKSPACE: Config & Stepper */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play size={18} className="text-primary" />
                Initialize Specialist Agent Pipeline
              </CardTitle>
              <CardDescription>
                Upload client RFP specification or questionnaires to run RAG grounding, solution design, estimation, and document assembly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleUpload)} className="flex flex-col gap-5">

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground/80">Support Documents (RFI, RFP, Questionnaire)</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <FileUp size={32} className="text-muted-foreground" />
                    <div className="text-xs text-muted-foreground text-center">
                      <span className="font-semibold text-primary cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>
                        Click to upload
                      </span> or drag & drop files here
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedFiles.map((file, idx) => (
                        <Badge key={idx} variant="secondary" className="gap-1">
                          {file.name}
                          <X size={12} className="cursor-pointer" onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button type="submit" variant="primary" isLoading={uploadLoading} className="w-full gap-2 mt-2">
                  <Play size={15} />
                  Assemble Solution Advisory Deck
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Stepper Status Panel */}
          {statusDetails && (
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold">
                    Pipeline Execution: {statusDetails.proposal.client_name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tracking multi-agent sequential/parallel orchestration
                  </CardDescription>
                </div>
                <Badge variant={
                  statusDetails.proposal.status === 'Complete' ? 'success' :
                  statusDetails.proposal.status === 'Failed' ? 'destructive' : 'warning'
                }>
                  {statusDetails.proposal.status}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                
                {/* Stepper Steps UI */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
                  {STEP_PHASES.map((phase) => {
                    const stepStatus = getStepStatusVariant(phase.name);
                    return (
                      <div
                        key={phase.name}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center gap-1 transition-all ${
                          stepStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium' :
                          stepStatus === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-medium animate-pulse' :
                          stepStatus === 'destructive' ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                          'bg-muted/40 border-border text-muted-foreground'
                        }`}
                      >
                        {phase.icon}
                        <span className="text-xs font-bold leading-none">{phase.name}</span>
                        <span className="text-[9px] text-muted-foreground leading-none">{phase.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Status logs detail */}
                <div className="bg-muted p-4 rounded-xl border border-border flex flex-col gap-2 max-h-[220px] overflow-y-auto font-mono text-xs">
                  <span className="text-xs font-bold text-foreground border-b border-border/60 pb-1.5 font-sans mb-1 flex items-center gap-1.5">
                    <History size={13} className="text-primary" />
                    Agent Reasoning Logs & State Changes
                  </span>
                  
                  {statusDetails.steps.length === 0 ? (
                    <span className="text-muted-foreground italic">No logs generated yet. Starting engine loop...</span>
                  ) : (
                    statusDetails.steps.map((step, idx) => (
                      <div key={idx} className="flex flex-col gap-1 border-b border-border/40 pb-2 mb-1 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-bold text-primary">[{step.step_name}]</span>
                          <Badge variant={step.status === 'completed' ? 'success' : step.status === 'running' ? 'warning' : step.status === 'failed' ? 'destructive' : 'secondary'} className="text-[9px] py-0 px-1.5">
                            {step.status}
                          </Badge>
                        </div>
                        {step.log_message && (
                          <p className="text-foreground/90 whitespace-pre-wrap pl-2 leading-relaxed text-[11px]">
                            {step.log_message}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* HITL / Download Area */}
                {statusDetails.proposal.status === 'Complete' && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => openEditor(statusDetails.structured_ir)}
                    >
                      <Edit size={15} />
                      Edit Solution Blueprint
                    </Button>
                    <a
                      href={proposalApi.downloadUrl(statusDetails.proposal.id)}
                      className="flex-1"
                      download
                    >
                      <Button variant="primary" className="w-full gap-2">
                        <Download size={15} />
                        Download PowerPoint Draft
                      </Button>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT WORKSPACE: Draft History */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History size={18} className="text-primary" />
                  Historical Drafts Archive
                </CardTitle>
                <CardDescription>
                  Review generated solution decks requiring human validation
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={fetchProposals} title="Refresh History">
                <RefreshCw size={15} />
              </Button>
            </CardHeader>
            <CardContent>
              {proposals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <History size={32} className="text-muted-foreground mb-3" />
                  <p className="text-sm font-semibold text-foreground">No proposal archives yet</p>
                  <p className="text-xs text-muted-foreground max-w-[200px] mt-1">
                    Upload an RFP specification to create your first client-presentable PPTX proposal deck.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[640px] overflow-y-auto pr-1">
                  {proposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      onClick={() => handleViewStatus(proposal)}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                        statusDetails?.proposal.id === proposal.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-card hover:border-primary/20 hover:bg-muted/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-sm text-foreground/90">{proposal.client_name}</span>
                          <span className="text-[11px] text-muted-foreground">Generated: {formatDate(proposal.created_at)}</span>
                        </div>
                        <Badge variant={
                          proposal.status === 'Complete' ? 'success' :
                          proposal.status === 'Failed' ? 'destructive' : 'warning'
                        } className="text-[10px] py-0 px-2 flex-shrink-0">
                          {proposal.status}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-1 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span>Timeline: <strong>{proposal.project_duration}</strong></span>
                          <span>Budget: <strong>{proposal.budget}</strong></span>
                        </div>
                        
                        {proposal.status === 'Complete' && (
                          <a
                            href={proposalApi.downloadUrl(proposal.id)}
                            onClick={(e) => e.stopPropagation()}
                            download
                            className="text-primary hover:text-primary/80 flex items-center gap-1 font-bold"
                          >
                            <Download size={13} />
                            PPTX
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* HITL SOLUTION REVIEW EDITOR MODAL */}
      <Modal 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
        title="Interactive Solution Blueprint Editor (Human-In-The-Loop)"
        className="max-w-4xl"
      >
        {editableIr && (
          <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-2 pb-4">
            
            {/* Meta Sizing details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/40 p-4 rounded-xl border border-border">
              <Input
                label="Target Client Name"
                value={editableIr.client_name}
                onChange={(e) => setEditableIr({ ...editableIr, client_name: e.target.value })}
              />
              <Input
                label="Duration Timeline"
                value={editableIr.project_duration}
                onChange={(e) => setEditableIr({ ...editableIr, project_duration: e.target.value })}
              />
              <Input
                label="Financial Sizing Budget"
                value={editableIr.budget}
                onChange={(e) => setEditableIr({ ...editableIr, budget: e.target.value })}
              />
            </div>

            {/* Requirements and Gaps lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Requirements */}
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-foreground flex items-center justify-between border-b border-border/60 pb-1.5">
                  Core Requirements List
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary" onClick={() => addItemToList('requirements')}>
                    <Plus size={12} />
                    Add
                  </Button>
                </span>
                <div className="flex flex-col gap-2">
                  {editableIr.requirements?.map((req: string, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        className="flex-1 h-9 rounded-md border border-input bg-card px-2.5 py-1 text-xs"
                        value={req}
                        onChange={(e) => editItemInList('requirements', idx, e.target.value)}
                      />
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10" onClick={() => deleteItemFromList('requirements', idx)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gaps / Mitigations */}
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-foreground flex items-center justify-between border-b border-border/60 pb-1.5">
                  Capability Gaps & Mitigations
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary" onClick={() => addItemToList('gaps')}>
                    <Plus size={12} />
                    Add
                  </Button>
                </span>
                <div className="flex flex-col gap-2">
                  {editableIr.gaps?.map((gap: string, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        className="flex-1 h-9 rounded-md border border-input bg-card px-2.5 py-1 text-xs"
                        value={gap}
                        onChange={(e) => editItemInList('gaps', idx, e.target.value)}
                      />
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10" onClick={() => deleteItemFromList('gaps', idx)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Solution Pillars */}
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <span className="text-sm font-bold text-foreground border-b border-border/60 pb-1.5">
                Technical Solution Pillars (PPTX Slide 3 Layout)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {editableIr.solution_pillars?.map((pillar: any, idx: number) => (
                  <div key={idx} className="p-3 bg-muted/30 border border-border rounded-xl flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-primary uppercase">Pillar 0{idx+1}</span>
                    <input
                      type="text"
                      className="h-8 rounded-md border border-input bg-card px-2 text-xs font-semibold"
                      value={pillar.title}
                      onChange={(e) => updatePillar(idx, 'title', e.target.value)}
                    />
                    <textarea
                      rows={4}
                      className="rounded-md border border-input bg-card p-2 text-[11px] leading-relaxed resize-none"
                      value={pillar.desc}
                      onChange={(e) => updatePillar(idx, 'desc', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex gap-3 justify-end border-t border-border pt-5 mt-2">
              <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                Cancel Changes
              </Button>
              <Button variant="primary" className="gap-2" isLoading={savingIr} onClick={saveUpdatedIr}>
                <Save size={15} />
                Regenerate PowerPoint Draft
              </Button>
            </div>

          </div>
        )}
      </Modal>
    </PageWrapper>
  );
};

export default Home;
