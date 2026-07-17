import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  FileUp, Play, Download, History, RefreshCw, Layers, Clock, 
  CheckCircle2, Cpu, Edit, Trash2, Plus, X, Save, Eye, 
  Send, ShieldCheck, Award, AlertTriangle, Lock
} from 'lucide-react';
import { proposalApi, adminApi } from '../../services/api/endpoints';
import { useProposalStore, useAuthStore } from '../../store';
import { useRolePermissions } from '../../hooks';
import { Proposal, ProposalStep, ProposalStatusResponse } from '../../types';
import { proposalUploadSchema } from '../../utils/validators';
import { PageWrapper } from '../../components/layout/PageWrapper/PageWrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Badge } from '../../components/ui/Badge/Badge';
import { Modal } from '../../components/ui/Modal/Modal';
import { useToast } from '../../components/ui/Toast/Toast';
import { WorkflowStepper } from '../../components/ui/WorkflowStepper/WorkflowStepper';
import { formatDate } from '../../utils/formatters';

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
    proposals, 
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
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editableIr, setEditableIr] = useState<any>(null);
  const [savingIr, setSavingIr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'archive' | 'admin'>('archive');
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminConfig, setAdminConfig] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [newModelName, setNewModelName] = useState('');
  const [selectedRetryId, setSelectedRetryId] = useState('');

  // ── Admin data ──────────────────────────────────────────
  const fetchAdminData = async () => {
    if (!perms.canViewAdminPanel) return;

    // Fetch each resource independently so a failing endpoint
    // (e.g. ArangoDB down → getConfig throws) never blocks the others.
    try {
      const usersData = await adminApi.getUsers();
      setAdminUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Admin: failed to load users', err);
    }

    try {
      const configData = await adminApi.getConfig();
      if (configData && typeof configData === 'object') {
        setAdminConfig(configData);
        setNewModelName(configData.active_ai_model || '');
      }
    } catch (err) {
      console.error('Admin: failed to load config', err);
    }

    try {
      const logsData = await adminApi.getAuditLogs();
      setAuditLogs(Array.isArray(logsData) ? logsData : []);
    } catch (err) {
      console.error('Admin: failed to load audit logs', err);
    }
  };


  useEffect(() => {
    if (perms.canViewAdminPanel && activeTab === 'admin') {
      fetchAdminData();
      const interval = setInterval(fetchAdminData, 5000);
      return () => clearInterval(interval);
    }
  }, [perms.canViewAdminPanel, activeTab]);

  // Audit logs for partner review
  useEffect(() => {
    if (perms.isPartner && statusDetails) {
      adminApi.getAuditLogs().then(setAuditLogs).catch(() => {});
    }
  }, [perms.isPartner, statusDetails]);

  // ── Admin actions ───────────────────────────────────────
  const handleUserRoleChange = async (username: string, role: string) => {
    try {
      await adminApi.changeRole(username, role);
      toast(`User ${username} role updated to ${role}`, 'success');
      fetchAdminData();
    } catch (err: any) {
      toast('Failed to change role: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleModelUpdate = async () => {
    if (!newModelName) return;
    try {
      await adminApi.updateModel(newModelName);
      toast(`Active AI Model updated to ${newModelName}`, 'success');
      fetchAdminData();
    } catch (err: any) {
      toast('Failed to update AI model: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

  const handleRetryJob = async () => {
    if (!selectedRetryId) return;
    try {
      await adminApi.retryJob(selectedRetryId);
      toast(`Job retry started for proposal ${selectedRetryId}`, 'success');
      setSelectedRetryId('');
      fetchProposals();
    } catch (err: any) {
      toast('Failed to retry job: ' + (err.response?.data?.error || err.message), 'error');
    }
  };

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
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(proposalUploadSchema),
    defaultValues: { clientName: '', projectDuration: '', budget: '' }
  });

  // ── Fetch on mount ──────────────────────────────────────
  useEffect(() => {
    fetchProposals();
  }, []);

  // ── Poll active proposal status ─────────────────────────
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

  const handleViewStatus = async (proposal: Proposal) => {
    try {
      const details = await proposalApi.status(proposal.id);
      setStatusDetails(details);
      if (AI_RUNNING_STATUSES.filter(s => s !== 'Failed').includes(proposal.status)) {
        setActiveProposalId(proposal.id);
        setPolling(true);
      }
    } catch (err) {
      toast('Failed to fetch details.', 'error');
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT WORKSPACE */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* Role access notice for restricted roles */}
          {(perms.isDelivery || perms.isPartner) && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
              perms.isPartner
                ? 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400'
                : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
            }`}>
              {perms.isPartner ? <ShieldCheck size={18} className="flex-shrink-0 mt-0.5" /> : <Award size={18} className="flex-shrink-0 mt-0.5" />}
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
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
                    {STEP_PHASES.map((phase) => {
                      const stepStatus = getStepStatusVariant(phase.name);
                      return (
                        <div
                          key={phase.name}
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

                    {/* Partner — show audit logs inline */}
                    {perms.isPartner && Array.isArray(auditLogs) && auditLogs.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-foreground border-b border-border pb-1">Audit Trail</span>
                        <div className="bg-muted p-2 rounded-lg font-mono text-[9px] max-h-[120px] overflow-y-auto border border-border leading-relaxed">
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

        {/* RIGHT WORKSPACE: Archive + Admin Panel */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {perms.canViewAdminPanel && (
            <div className="flex bg-muted/60 p-1 border border-border rounded-xl gap-1">
              <button
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'archive' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}
                onClick={() => setActiveTab('archive')}
              >
                Drafts Archive
              </button>
              <button
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeTab === 'admin' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}
                onClick={() => setActiveTab('admin')}
              >
                Admin Control Center
              </button>
            </div>
          )}

          {activeTab === 'archive' || !perms.canViewAdminPanel ? (
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <History size={18} className="text-primary" />
                    Historical Drafts Archive
                  </CardTitle>
                  <CardDescription className="text-xs">
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
                      {perms.canCreateProposal
                        ? 'Upload an RFP specification to create your first client-presentable PPTX proposal deck.'
                        : 'No proposals are available for review yet.'}
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
                          <Badge variant={getProposalBadgeVariant(proposal.status)} className="text-[10px] py-0 px-2 flex-shrink-0">
                            {proposal.status}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-1 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span>Timeline: <strong>{proposal.project_duration}</strong></span>
                            <span>Budget: <strong>{proposal.budget}</strong></span>
                          </div>
                          
                          {BUSINESS_STATUSES.includes(proposal.status) && perms.canDownload && (
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
          ) : (
            // Admin Control Center
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Cpu size={18} className="text-primary" />
                  Admin Control Center
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure active LLM configurations, adjust user role scopes, and run diagnostics logs.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 max-h-[640px] overflow-y-auto pr-1">
                {/* 1. Diagnostics */}
                <div className="flex flex-col gap-2 bg-muted/40 p-3 border border-border rounded-xl">
                  <span className="text-xs font-bold text-foreground border-b border-border pb-1 font-sans">Diagnostics & Config</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground mt-1">
                    <span>MySQL: <strong className={adminConfig?.mysql_status?.includes("Online") ? "text-emerald-500" : "text-amber-500"}>{adminConfig?.mysql_status || "Checking..."}</strong></span>
                    <span>ArangoDB: <strong className={adminConfig?.arango_status === "Online" ? "text-emerald-500" : "text-rose-500"}>{adminConfig?.arango_status || "Checking..."}</strong></span>
                    <span className="col-span-2">Active LLM: <strong>{adminConfig?.active_ai_model || "mistral-small:24b"}</strong></span>
                  </div>
                  {/* Model Update */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      className="flex-1 h-8 rounded-md border border-input bg-card px-2 text-xs"
                      placeholder="Change LLM Model name"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                    />
                    <Button size="sm" className="h-8 text-[10px] py-1 px-2.5" onClick={handleModelUpdate}>Update</Button>
                  </div>
                </div>

                {/* 2. User & Role Management */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-foreground border-b border-border pb-1">User & Role Directory</span>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                    {(Array.isArray(adminUsers) ? adminUsers : []).map((u: any) => (
                      <div key={u.id} className="flex justify-between items-center bg-muted/20 p-2 border border-border rounded-lg text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold">{u.username}</span>
                          <span className="text-muted-foreground text-[10px]">{u.created_at}</span>
                        </div>
                        <select
                          className="bg-card border border-border rounded px-1.5 py-0.5 text-[11px]"
                          value={u.role}
                          onChange={(e) => handleUserRoleChange(u.username, e.target.value)}
                        >
                          <option value="admin">Admin</option>
                          <option value="presales">Pre-Sales</option>
                          <option value="bidmanager">Bid Manager</option>
                          <option value="delivery">Delivery Lead</option>
                          <option value="partner">Reviewing Partner</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Retry Failed Jobs */}
                <div className="flex flex-col gap-2 bg-muted/40 p-3 border border-border rounded-xl">
                  <span className="text-xs font-bold text-foreground border-b border-border pb-1">Failed Jobs Retries</span>
                  <div className="flex gap-2 items-center">
                    <select
                      className="flex-1 h-8 bg-card border border-border rounded-md px-2 text-xs"
                      value={selectedRetryId}
                      onChange={(e) => setSelectedRetryId(e.target.value)}
                    >
                      <option value="">-- Select proposal to retry --</option>
                      {proposals.map((p) => (
                        <option key={p.id} value={p.id}>{p.client_name} ({p.id})</option>
                      ))}
                    </select>
                    <Button variant="outline" size="sm" className="h-8 text-[10px] text-primary hover:bg-primary/10" onClick={handleRetryJob}>
                      Retry Job
                    </Button>
                  </div>
                </div>

                {/* 4. Global Audit Logs */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-foreground border-b border-border pb-1">Global System Audit Logs</span>
                  <div className="bg-muted p-2 rounded-lg font-mono text-[9px] max-h-[150px] overflow-y-auto border border-border leading-relaxed">
                    {!Array.isArray(auditLogs) || auditLogs.length === 0 ? (
                      <span className="italic text-muted-foreground">No system activities logged yet.</span>
                    ) : (
                      auditLogs.map((log: any, idx: number) => (
                        <div key={idx} className="border-b border-border/40 pb-1.5 mb-1.5 last:border-0 last:pb-0 last:mb-0">
                          <span className="text-primary font-bold">[{log.proposal_id}]</span> <strong>{log.step_name}</strong> — {log.log_message} <span className="text-muted-foreground">({log.updated_at})</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
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
                <Lock size={14} className="flex-shrink-0" />
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
                        className="flex-1 h-9 rounded-md border border-input bg-card px-2.5 py-1 text-xs"
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
                        className="flex-1 h-9 rounded-md border border-input bg-card px-2.5 py-1 text-xs"
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
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
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
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
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
    </PageWrapper>
  );
};

export default Home;
