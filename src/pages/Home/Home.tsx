import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  FileUp, Play, Download, History, Layers, Clock, 
  CheckCircle2, Cpu, MoveRight, Edit, Trash2, Plus, X, Save, Eye, 
  Send, ShieldCheck, Award, AlertTriangle, Lock
} from 'lucide-react';
import { proposalApi, adminApi } from '../../services/api/endpoints';
import { useProposalStore, useAuthStore } from '../../store';
import { useRolePermissions } from '../../hooks';
import { proposalUploadSchema } from '../../utils/validators';
import { PageWrapper } from '../../components/layout/PageWrapper/PageWrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Badge } from '../../components/ui/Badge/Badge';
import { Modal } from '../../components/ui/Modal/Modal';
import { useToast } from '../../components/ui/Toast/Toast';
import { WorkflowStepper } from '../../components/ui/WorkflowStepper/WorkflowStepper';
import { TechSelectionModal } from '../../components/TechSelectionModal';

const STEP_PHASES = [
  { name: 'Ingesting',  label: 'Document parsing',      icon: <FileUp size={16} /> },
  { name: 'Analyzing',  label: 'RAG capability check',  icon: <Cpu size={16} /> },
  { name: 'Designing',  label: 'Solution architecture', icon: <Layers size={16} /> },
  { name: 'Planning',   label: 'Timeline & pricing',    icon: <Clock size={16} /> },
  { name: 'Assembling', label: 'Reflexion assembly',    icon: <CheckCircle2 size={16} /> },
  { name: 'Complete',   label: 'Render PowerPoint',     icon: <Download size={16} /> },
];

// Pipeline-only statuses (AI running, business workflow not yet started)
const AI_RUNNING_STATUSES = ['Ingesting', 'Analyzing', 'Designing', 'Planning', 'Assembling', 'Failed'];

// Business workflow statuses (AI done, human review in progress)
const BUSINESS_STATUSES = ['Complete', 'Draft', 'DeliveryReview', 'PartnerReview', 'Approved', 'Published'];

// Status badge variant helpers
function getProposalBadgeVariant(status: string) {
  if (['Approved', 'Published'].includes(status)) return 'success';
  if (status === 'Failed') return 'destructive';
  if (['Draft', 'DeliveryReview', 'PartnerReview'].includes(status)) return 'warning';
  if (BUSINESS_STATUSES.includes(status)) return 'success';
  return 'warning'; // AI running
}

const Home: React.FC = () => {
  const { toast } = useToast();
  const { 
    activeProposalId, 
    statusDetails, 
    isPolling, 
    fetchProposals, 
    setActiveProposalId, 
    setStatusDetails, 
    setPolling 
  } = useProposalStore();

  // RBAC — all permission checks come from this hook
  const perms = useRolePermissions();
  const { user } = useAuthStore();

  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editableIr, setEditableIr] = useState<any>(null);
  const [savingIr, setSavingIr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Audit logs for partner review
  useEffect(() => {
    if (perms.isPartner && statusDetails) {
      adminApi.getAuditLogs().then(setAuditLogs).catch(() => {});
    }
  }, [perms.isPartner, statusDetails]);



  // ── Workflow transitions ────────────────────────────────
  const handleTransition = async (targetStatus: string) => {
    if (!statusDetails?.proposal.id) return;
    try {
      await proposalApi.transition(statusDetails.proposal.id, targetStatus, user?.role || 'presales');
      toast(`Proposal moved to "${targetStatus}" successfully.`, 'success');
      const details = await proposalApi.status(statusDetails.proposal.id);
      setStatusDetails(details);
      fetchProposals();
    } catch (err: any) {
      toast('Transition failed: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  // ── Form setup ──────────────────────────────────────────
  const {
    handleSubmit,
    reset,
  } = useForm({
    resolver: zodResolver(proposalUploadSchema),
    defaultValues: { clientName: '', projectDuration: '', budget: '' }
  });

  // ── Fetch on mount ──────────────────────────────────────
  useEffect(() => {
    fetchProposals();
  }, []);

  const [showTechSelection, setShowTechSelection] = useState(false);

  // ── Poll active proposal status ─────────────────────────
  useEffect(() => {
    let timerId: any = null;
    let isFetching = false;

    const poll = async () => {
      if (!activeProposalId || isFetching) return;
      isFetching = true;
      try {
        const details = await proposalApi.status(activeProposalId);
        const currentDetails = useProposalStore.getState().statusDetails;
        if (!currentDetails || currentDetails.proposal.id === activeProposalId) {
          setStatusDetails(details);
        }
        const proposalStatus = details.proposal.status;
        
        if (proposalStatus === 'WaitingForTechSelection') {
          setPolling(false);
          setShowTechSelection(true);
        } else {
          const isRunning = AI_RUNNING_STATUSES.filter(s => s !== 'Failed').includes(proposalStatus);
          if (!isRunning) {
            setPolling(false);
            setActiveProposalId(null);
            if (proposalStatus === 'Failed') {
              toast('Proposal generation failed. Check step logs.', 'error');
            } else {
              toast('Proposal PowerPoint generation completed!', 'success');
            }
            fetchProposals();
          } else {
            timerId = setTimeout(poll, 3000);
          }
        }
      } catch (err) {
        console.error('Polling status failed:', err);
        timerId = setTimeout(poll, 3000);
      } finally {
        isFetching = false;
      }
    };

    if (isPolling && activeProposalId) poll();
    return () => { if (timerId) clearTimeout(timerId); };
  }, [isPolling, activeProposalId]);

  // ── File handling ───────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleUpload = async (data: any) => {
    if (!perms.canCreateProposal) {
      toast('Your role does not have permission to create proposals.', 'error');
      return;
    }
    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append('client_name', data.clientName);
      formData.append('project_duration', data.projectDuration);
      formData.append('budget', data.budget);
      selectedFiles.forEach((file) => formData.append('files', file));

      const response = await proposalApi.upload(formData);
      toast('Document intake complete. Initiating specialist agents workflow.', 'info');
      
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



  // ── IR Editor ───────────────────────────────────────────
  const openEditor = (structuredIr: any) => {
    if (!structuredIr) return;
    setEditableIr(JSON.parse(JSON.stringify(structuredIr)));
    setIsEditorOpen(true);
  };

  const saveUpdatedIr = async () => {
    if (!statusDetails?.proposal.id || !editableIr) return;
    try {
      setSavingIr(true);
      const response = await proposalApi.edit(statusDetails.proposal.id, editableIr);
      toast('Solution blueprint updated. PowerPoint deck regenerated.', 'success');
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
    const list = [...editableIr[key]]; list[index] = val;
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
    const pillars = [...editableIr.solution_pillars]; pillars[index][field] = val;
    setEditableIr({ ...editableIr, solution_pillars: pillars });
  };

  const updateArchitectureComponent = (layerIndex: number, compIndex: number, val: string) => {
    if (!editableIr?.architecture) return;
    const arch = [...editableIr.architecture]; arch[layerIndex].components[compIndex] = val;
    setEditableIr({ ...editableIr, architecture: arch });
  };

  const updateTimelinePhase = (index: number, field: 'phase' | 'duration' | 'deliverables', val: string) => {
    if (!editableIr?.timeline_phases) return;
    const phases = [...editableIr.timeline_phases]; phases[index][field] = val;
    setEditableIr({ ...editableIr, timeline_phases: phases });
  };

  const updateResource = (index: number, field: 'role' | 'loc' | 'fte' | 'rate' | 'total', val: string) => {
    if (!editableIr?.resources) return;
    const res = [...editableIr.resources]; res[index][field] = val;
    setEditableIr({ ...editableIr, resources: res });
  };

  const updateSkillMapping = (index: number, field: 'skill' | 'role' | 'asset' | 'conf', val: string) => {
    if (!editableIr?.skills_mapping) return;
    const skills = [...editableIr.skills_mapping]; skills[index][field] = val;
    setEditableIr({ ...editableIr, skills_mapping: skills });
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

  const currentStatus = statusDetails?.proposal.status ?? '';
  const isBusinessWorkflow = BUSINESS_STATUSES.includes(currentStatus);

  // Transition button availability based on state machine + current role
  const canMoveToWorkflow     = currentStatus === 'Complete'       && perms.canMoveToDraft;
  const canSubmitToDelivery   = currentStatus === 'Draft'          && perms.canSubmitToDelivery;
  const canSubmitToPartnerNow = currentStatus === 'DeliveryReview' && perms.canSubmitToPartner;
  const canApproveNow         = currentStatus === 'PartnerReview'  && perms.canApprove;
  const canRejectNow          = currentStatus === 'PartnerReview'  && perms.canReject;
  const canPublishNow         = currentStatus === 'Approved'       && perms.canPublish;

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Role access notice for restricted roles */}
        {(perms.isDelivery || perms.isPartner) && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
            perms.isPartner
              ? 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400'
              : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
          }`}>
            {perms.isPartner ? <ShieldCheck size={18} className="flex-0 mt-0.5" /> : <Award size={18} className="flex-0 mt-0.5" />}
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">{perms.displayRole} — Restricted Mode</span>
              <span className="text-xs opacity-80">
                {perms.isPartner
                  ? 'You can read the full proposal, view agent reasoning, and approve / reject / publish.'
                  : 'You can review and edit resource planning, timeline phases, and skill matrix.'}
              </span>
            </div>
          </div>
        )}

        {/* Upload / Pipeline Card — hidden for delivery and partner */}
        {perms.canCreateProposal && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play size={18} className="text-primary" />
                Initialize Specialist Agent Pipeline
              </CardTitle>
              {/* <CardDescription>
                Upload client RFP specification or questionnaires to run RAG grounding, solution design, estimation, and document assembly.
              </CardDescription> */}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleUpload)} className="flex flex-col gap-5">

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground/80">Support Documents (RFI, RFP, Questionnaire)</label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${isDragActive ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:bg-muted/40'}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDragOver}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
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

                <Button type="submit" variant="primary" isLoading={uploadLoading} disabled={selectedFiles.length === 0} className="w-full gap-2 mt-2 disabled:opacity-80 disabled:cursor-not-allowed disabled:pointer-events-auto">
                  <Play size={15} />
                  Assemble Solution Advisory Deck
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Pipeline Status + Workflow Panel */}
        {statusDetails && (
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">
                  {AI_RUNNING_STATUSES.includes(currentStatus)
                    ? `Pipeline Execution: ${statusDetails.proposal.client_name}`
                    : `Proposal Review: ${statusDetails.proposal.client_name}`}
                </CardTitle>
                <CardDescription className="text-xs">
                  {AI_RUNNING_STATUSES.includes(currentStatus)
                    ? 'Tracking multi-agent sequential/parallel orchestration'
                    : 'Business review workflow — human-in-the-loop approval chain'}
                </CardDescription>
              </div>
              <Badge variant={getProposalBadgeVariant(currentStatus)}>
                {currentStatus}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">

              {/* AI Pipeline Stepper — only show when AI is running or just finished */}
              {(AI_RUNNING_STATUSES.includes(currentStatus) || currentStatus === 'Complete') && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {STEP_PHASES.map((phase, idx) => {
                    const stepStatus = getStepStatusVariant(phase.name);
                    return (
                      <React.Fragment key={phase.name}>
                        <div
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center gap-1 transition-all ${
                            stepStatus === 'success'     ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium' :
                            stepStatus === 'warning'     ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-medium animate-pulse' :
                            stepStatus === 'destructive' ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                            'bg-muted/40 border-border text-muted-foreground'
                          }`}
                        >
                          {phase.icon}
                          <span className="text-xs font-bold leading-none">{phase.name}</span>
                          <span className="text-[9px] text-muted-foreground leading-none">{phase.label}</span>
                        </div>
                        {idx < STEP_PHASES.length - 1 && (
                          <MoveRight size={18} className="text-muted-foreground" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Business Workflow Stepper */}
              {isBusinessWorkflow && (
                <div className="bg-muted/20 border border-border rounded-xl p-4">
                  <WorkflowStepper
                    currentStatus={currentStatus}
                    submittedByRole={statusDetails.proposal.submitted_by_role}
                  />
                </div>
              )}

              {/* Agent Reasoning Logs */}
              {perms.canViewAgentLogs && (
                <div className="bg-muted p-4 rounded-xl border border-border flex flex-col gap-2 max-h-55 overflow-y-auto font-mono text-xs">
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
              )}

              {/* Workflow Transition Actions + Download — show once AI pipeline done */}
              {!AI_RUNNING_STATUSES.includes(currentStatus) && (
                <div className="flex flex-col gap-4 pt-2 border-t border-border/40">
                  {/* Status + transition buttons */}
                  <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg border border-border text-xs flex-wrap gap-2">
                    <span>
                      Approval State: <strong>{currentStatus}</strong>
                      {statusDetails.proposal.submitted_by_role && (
                        <span className="text-muted-foreground ml-2">
                          (last: {statusDetails.proposal.submitted_by_role})
                        </span>
                      )}
                    </span>
                    <div className="flex gap-2 flex-wrap">

                      {/* Move Complete → Draft */}
                      {canMoveToWorkflow && (
                        <Button size="sm" variant="primary" className="text-[10px] py-1 h-7 gap-1" onClick={() => handleTransition('Draft')}>
                          <Send size={11} /> Start Review Workflow
                        </Button>
                      )}

                      {/* Draft → DeliveryReview */}
                      {canSubmitToDelivery && (
                        <Button size="sm" variant="primary" className="text-[10px] py-1 h-7 gap-1" onClick={() => handleTransition('DeliveryReview')}>
                          <Send size={11} /> Submit to Delivery Lead
                        </Button>
                      )}

                      {/* DeliveryReview → PartnerReview */}
                      {canSubmitToPartnerNow && (
                        <Button size="sm" variant="primary" className="text-[10px] py-1 h-7 gap-1" onClick={() => handleTransition('PartnerReview')}>
                          <Send size={11} /> Submit to Partner
                        </Button>
                      )}

                      {/* PartnerReview → Approved */}
                      {canApproveNow && (
                        <Button size="sm" variant="success" className="text-[10px] py-1 h-7 gap-1" onClick={() => handleTransition('Approved')}>
                          <CheckCircle2 size={11} /> Approve
                        </Button>
                      )}

                      {/* PartnerReview → Draft (reject) */}
                      {canRejectNow && (
                        <Button size="sm" variant="destructive" className="text-[10px] py-1 h-7 gap-1" onClick={() => handleTransition('Draft')}>
                          <AlertTriangle size={11} /> Reject
                        </Button>
                      )}

                      {/* Approved → Published */}
                      {canPublishNow && (
                        <Button size="sm" variant="success" className="text-[10px] py-1 h-7 gap-1" onClick={() => handleTransition('Published')}>
                          <Award size={11} /> Publish Proposal
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Edit / View + Download row */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => openEditor(statusDetails.structured_ir)}
                    >
                      {perms.isReadOnly ? <Eye size={15} /> : <Edit size={15} />}
                      {perms.isReadOnly ? 'View Solution Blueprint' : 'Edit Solution Blueprint'}
                    </Button>
                    {currentStatus === 'Published' && perms.canDownload && (
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
                    )}
                  </div>

                  {/* Partner — show audit logs inline */}
                  {perms.isPartner && Array.isArray(auditLogs) && auditLogs.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-foreground border-b border-border pb-1">Audit Trail</span>
                      <div className="bg-muted p-2 rounded-lg font-mono text-[9px] max-h-30 overflow-y-auto border border-border leading-relaxed">
                        {auditLogs
                          .filter(log => log.proposal_id === statusDetails.proposal.id)
                          .map((log: any, idx: number) => (
                            <div key={idx} className="border-b border-border/40 pb-1.5 mb-1.5 last:border-0">
                              <span className="text-primary font-bold">[{log.proposal_id}]</span>{' '}
                              <strong>{log.step_name}</strong> — {log.log_message}{' '}
                              <span className="text-muted-foreground">({log.updated_at})</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* HITL SOLUTION REVIEW EDITOR MODAL */}
      <Modal 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
        title={
          perms.isReadOnly
            ? 'Solution Blueprint Viewer (Read-Only — Reviewing Partner)'
            : 'Interactive Solution Blueprint Editor (Human-In-The-Loop)'
        }
        className="max-w-4xl"
      >
        {editableIr && (
          <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-2 pb-4">

            {/* Read-only notice for partner */}
            {perms.isReadOnly && (
              <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                <Lock size={14} className="flex-0" />
                <span><strong>Read-Only Access.</strong> As Reviewing Partner, you can view all content but cannot make edits. Use Approve / Reject buttons to action this proposal.</span>
              </div>
            )}

            {/* Meta Sizing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/40 p-4 rounded-xl border border-border">
              <Input
                label="Target Client Name"
                value={editableIr.client_name}
                disabled={!perms.canEditSolution}
                onChange={(e) => setEditableIr({ ...editableIr, client_name: e.target.value })}
              />
              <Input
                label="Duration Timeline"
                value={editableIr.project_duration}
                disabled={!perms.canEditSolution}
                onChange={(e) => setEditableIr({ ...editableIr, project_duration: e.target.value })}
              />
              <Input
                label="Financial Sizing Budget"
                value={editableIr.budget}
                disabled={!perms.canEditBudget}
                onChange={(e) => setEditableIr({ ...editableIr, budget: e.target.value })}
              />
            </div>

            {/* Requirements and Gaps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Requirements */}
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-foreground flex items-center justify-between border-b border-border/60 pb-1.5">
                  Core Requirements List
                  {perms.canEditSolution && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-primary" onClick={() => addItemToList('requirements')}>
                      <Plus size={12} /> Add
                    </Button>
                  )}
                </span>
                <div className="flex flex-col gap-2">
                  {editableIr.requirements?.map((req: string, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        disabled={!perms.canEditSolution}
                        className="flex-1 h-9 rounded-md border border-input bg-card px-2.5 py-1 text-xs truncate"
                        title={req}
                        value={req}
                        onChange={(e) => editItemInList('requirements', idx, e.target.value)}
                      />
                      {perms.canEditSolution && (
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10" onClick={() => deleteItemFromList('requirements', idx)}>
                          <Trash2 size={13} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Gaps / Mitigations */}
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-foreground flex items-center justify-between border-b border-border/60 pb-1.5">
                  Capability Gaps & Mitigations
                  {perms.canEditSolution && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-primary" onClick={() => addItemToList('gaps')}>
                      <Plus size={12} /> Add
                    </Button>
                  )}
                </span>
                <div className="flex flex-col gap-2">
                  {editableIr.gaps?.map((gap: string, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        disabled={!perms.canEditSolution}
                        className="flex-1 h-9 rounded-md border border-input bg-card px-2.5 py-1 text-xs truncate"
                        title={gap}
                        value={gap}
                        onChange={(e) => editItemInList('gaps', idx, e.target.value)}
                      />
                      {perms.canEditSolution && (
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10" onClick={() => deleteItemFromList('gaps', idx)}>
                          <Trash2 size={13} />
                        </Button>
                      )}
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
                      disabled={!perms.canEditSolution}
                      className="h-8 rounded-md border border-input bg-card px-2 text-xs font-semibold"
                      value={pillar.title}
                      onChange={(e) => updatePillar(idx, 'title', e.target.value)}
                    />
                    <textarea
                      rows={4}
                      disabled={!perms.canEditSolution}
                      className="rounded-md border border-input bg-card p-2 text-[11px] leading-relaxed resize-none"
                      value={pillar.desc}
                      onChange={(e) => updatePillar(idx, 'desc', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Architecture */}
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <span className="text-sm font-bold text-foreground border-b border-border/60 pb-1.5">
                Landscape Architecture & Components (PPTX Slide 4 Layout)
              </span>
              <div className="flex flex-col gap-4">
                {editableIr.architecture?.map((layer: any, layerIdx: number) => (
                  <div key={layerIdx} className="p-3 bg-muted/20 border border-border rounded-xl flex flex-col gap-2">
                    <span className="text-xs font-bold text-foreground">{layer.name}</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {layer.components?.map((comp: string, compIdx: number) => (
                        <input
                          key={compIdx}
                          type="text"
                          disabled={!perms.canEditSolution}
                          className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                          value={comp}
                          onChange={(e) => updateArchitectureComponent(layerIdx, compIdx, e.target.value)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Phases — Delivery editable */}
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <span className="text-sm font-bold text-foreground border-b border-border/60 pb-1.5 flex items-center justify-between">
                Timeline Phases & Milestones (PPTX Slide 5 Layout)
                {!perms.canEditDelivery && <span className="text-[10px] text-muted-foreground font-normal flex items-center gap-1"><Lock size={10} /> Delivery Lead editable</span>}
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {editableIr.timeline_phases?.map((phase: any, idx: number) => (
                  <div key={idx} className="p-3 bg-muted/20 border border-border rounded-xl flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-primary uppercase">Phase 0{idx+1}</span>
                    <input type="text" disabled={!perms.canEditDelivery} className="h-8 rounded-md border border-input bg-card px-2 text-xs font-semibold" value={phase.phase} onChange={(e) => updateTimelinePhase(idx, 'phase', e.target.value)} />
                    <input type="text" disabled={!perms.canEditDelivery} className="h-8 rounded-md border border-input bg-card px-2 text-xs" value={phase.duration} onChange={(e) => updateTimelinePhase(idx, 'duration', e.target.value)} />
                    <textarea rows={3} disabled={!perms.canEditDelivery} className="rounded-md border border-input bg-card p-2 text-[11px] leading-relaxed resize-none" value={phase.deliverables} onChange={(e) => updateTimelinePhase(idx, 'deliverables', e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <span className="text-sm font-bold text-foreground border-b border-border/60 pb-1.5 flex items-center justify-between">
                Resource Distribution & Sizing Table (PPTX Slide 6 Layout)
                {!perms.canEditDelivery && <span className="text-[10px] text-muted-foreground font-normal flex items-center gap-1"><Lock size={10} /> Delivery Lead editable</span>}
              </span>
              <div className="flex flex-col gap-2 max-h-55 overflow-y-auto pr-1">
                {editableIr.resources?.map((res: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 bg-muted/20 p-2 border border-border rounded-lg items-center">
                    {[
                      { label: 'Role',         field: 'role',  ph: 'Role' },
                      { label: 'Location',     field: 'loc',   ph: 'Location' },
                      { label: 'FTE Count',    field: 'fte',   ph: 'FTE' },
                      { label: 'Monthly Rate', field: 'rate',  ph: 'Rate' },
                      { label: 'Total Cost',   field: 'total', ph: 'Total' },
                    ].map(({ label, field, ph }) => (
                      <div key={field} className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold">{label}</span>
                        <input
                          type="text"
                          disabled={!perms.canEditDelivery}
                          className="h-8 rounded-md border border-input bg-card px-2 text-[11px]"
                          placeholder={ph}
                          value={res[field]}
                          onChange={(e) => updateResource(idx, field as any, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Mapping */}
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <span className="text-sm font-bold text-foreground border-b border-border/60 pb-1.5 flex items-center justify-between">
                Skills Inventory & Competency Mapping (PPTX Slide 7 Layout)
                {!perms.canEditDelivery && <span className="text-[10px] text-muted-foreground font-normal flex items-center gap-1"><Lock size={10} /> Delivery Lead editable</span>}
              </span>
              <div className="flex flex-col gap-2 max-h-55 overflow-y-auto pr-1">
                {editableIr.skills_mapping?.map((mapping: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-muted/20 p-2 border border-border rounded-lg items-center">
                    {[
                      { label: 'Skill Keyword', field: 'skill', ph: 'Skill' },
                      { label: 'Target Role',   field: 'role',  ph: 'Role' },
                      { label: 'PwC Competency',field: 'asset', ph: 'Asset' },
                      { label: 'Confidence',    field: 'conf',  ph: 'Confidence' },
                    ].map(({ label, field, ph }) => (
                      <div key={field} className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold">{label}</span>
                        <input
                          type="text"
                          disabled={!perms.canEditDelivery}
                          className="h-8 rounded-md border border-input bg-card px-2 text-[11px]"
                          placeholder={ph}
                          value={mapping[field]}
                          onChange={(e) => updateSkillMapping(idx, field as any, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Save / Close */}
            <div className="flex gap-3 justify-end border-t border-border pt-5 mt-2">
              <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                {perms.isReadOnly ? 'Close View' : 'Cancel Changes'}
              </Button>
              {!perms.isReadOnly && (
                <Button variant="primary" className="gap-2" isLoading={savingIr} onClick={saveUpdatedIr}>
                  <Save size={15} />
                  Regenerate PowerPoint Draft
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
      {activeProposalId && (
        <TechSelectionModal
          isOpen={showTechSelection}
          proposalId={activeProposalId}
          onComplete={() => {
            setShowTechSelection(false);
            setPolling(true); // resume polling to catch next phase
          }}
        />
      )}
    </PageWrapper>
  );
};

export default Home;
