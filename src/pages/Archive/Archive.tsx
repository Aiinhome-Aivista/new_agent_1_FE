import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History, RefreshCw, Download, Edit, Eye, Plus, Save,
  AlertTriangle, Award, FileUp, Cpu, Layers, Clock, CheckCircle2, Send, Lock, Trash2, Play, Pause
} from 'lucide-react';
import { proposalApi, adminApi } from '../../services/api/endpoints';
import { useProposalStore, useAuthStore } from '../../store';
import { useRolePermissions } from '../../hooks';
import { Proposal } from '../../types';
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
  { name: 'Ingesting', label: 'Document parsing', icon: <FileUp size={16} /> },
  { name: 'Analyzing', label: 'Capability mapping', icon: <Cpu size={16} /> },
  { name: 'Designing', label: 'Solution architecture', icon: <Layers size={16} /> },
  { name: 'Planning', label: 'Timeline & pricing', icon: <Clock size={16} /> },
  { name: 'Assembling', label: 'Reflexion assembly', icon: <CheckCircle2 size={16} /> },
  { name: 'Complete', label: 'Render PowerPoint', icon: <Download size={16} /> },
];

const AI_RUNNING_STATUSES = ['Ingesting', 'Analyzing', 'Designing', 'Planning', 'Assembling', 'Failed'];
const BUSINESS_STATUSES = ['Complete', 'InReview', 'Approved', 'Published', 'Rejected'];

function getProposalBadgeVariant(status: string) {
  if (['Approved', 'Published'].includes(status)) return 'success';
  if (['Failed', 'Rejected', 'Cancelled'].includes(status)) return 'destructive';
  return 'warning';
}

const Archive: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
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

  const perms = useRolePermissions();
  const { user } = useAuthStore();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editableIr, setEditableIr] = useState<any>(null);
  const [savingIr, setSavingIr] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 400);

    return () => clearInterval(interval);
  }, []);

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
        const currentDetails = useProposalStore.getState().statusDetails;
        if (!currentDetails || currentDetails.proposal.id === activeProposalId) {
          setStatusDetails(details);
        }
        const proposalStatus = details.proposal.status;
        const isRunning = AI_RUNNING_STATUSES.filter(s => s !== 'Failed').includes(proposalStatus) || proposalStatus === 'Queued';
        if (!isRunning) {
          setPolling(false);
          if (proposalStatus === 'Failed') {
            setActiveProposalId(null);
            toast('Proposal generation failed. Check step logs.', 'error');
          } else if (proposalStatus === 'Complete') {
            setActiveProposalId(null);
            toast('Proposal PowerPoint generation completed!', 'success');
          } else if (proposalStatus === 'Paused') {
            // Keep viewing the paused pipeline
          } else {
            setActiveProposalId(null);
          }
          fetchProposals();
        }
      } catch (err) {
        console.error('Error polling status:', err);
      } finally {
        isFetching = false;
      }
    };

    if (isPolling && activeProposalId) {
      timerId = setInterval(poll, 3000);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isPolling, activeProposalId]);

  // Audit logs for partner review
  useEffect(() => {
    if (perms.isPartner && statusDetails) {
      adminApi.getAuditLogs().then(setAuditLogs).catch(() => { });
    }
  }, [perms.isPartner, statusDetails]);

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

  const currentStatus = statusDetails?.proposal.status ?? '';
  const isBusinessWorkflow = BUSINESS_STATUSES.includes(currentStatus);

  const canApproveNow = currentStatus === 'Complete' || currentStatus === 'Rejected';
  const canRejectNow = currentStatus === 'Complete';
  const canPublishNow = currentStatus === 'Approved';

  return (
    <PageWrapper>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT WORKSPACE: Historical Archive list */}
        <div className="lg:col-span-5 flex flex-col gap-6">
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
                  <p className="text-xs text-muted-foreground max-w-50 mt-1">
                    {perms.canCreateProposal
                      ? 'Upload an RFP specification to create your first client-presentable PPTX proposal deck.'
                      : 'No proposals are available for review yet.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                  {proposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      onClick={() => handleViewStatus(proposal)}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${statusDetails?.proposal.id === proposal.id
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
        </div>

        {/* RIGHT WORKSPACE: Selected Draft details / workflow */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {statusDetails ? (
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold">
                    {AI_RUNNING_STATUSES.includes(currentStatus)
                      ? <div className="flex items-center gap-1">
                        <span>Pipeline Execution{dots}</span>
                      </div>
                      : `Proposal Review: completed`}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {AI_RUNNING_STATUSES.includes(currentStatus)
                      ? 'Tracking multi-agent sequential/parallel orchestration'
                      : 'Business review workflow — human-in-the-loop approval chain'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {currentStatus === 'Paused' || currentStatus === 'Queued' ? (
                    <>
                      <Button variant="destructive" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={async () => {
                        if (confirm('Are you sure you want to cancel this proposal?')) {
                          try {
                            await proposalApi.cancelProposal(statusDetails.proposal.id);
                            toast('Proposal cancelled.', 'success');
                            const details = await proposalApi.status(statusDetails.proposal.id);
                            setStatusDetails(details);
                            fetchProposals();
                          } catch (e) {
                            toast('Failed to cancel.', 'error');
                          }
                        }
                      }}>
                        <Trash2 size={10} /> Cancel
                      </Button>
                      <Button variant="primary" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={async () => {
                        try {
                          await proposalApi.resumeProposal(statusDetails.proposal.id);
                          toast('Proposal pipeline resumed.', 'success');
                          fetchProposals();
                        } catch (e) {
                          toast('Failed to resume.', 'error');
                        }
                      }}>
                        <Play size={10} /> Start
                      </Button>
                    </>
                  ) : null}
                  {(AI_RUNNING_STATUSES.includes(currentStatus) && currentStatus !== 'Complete' && currentStatus !== 'Failed') ? (
                    <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2 border-border text-foreground hover:bg-muted" onClick={async () => {
                      try {
                        await proposalApi.pauseProposal(statusDetails.proposal.id);
                        toast('Proposal pipeline paused.', 'success');
                        fetchProposals();
                      } catch (e) {
                        toast('Failed to pause.', 'error');
                      }
                    }}>
                      <Pause size={10} /> Pause
                    </Button>
                  ) : null}
                  {(currentStatus === 'Failed' || currentStatus === 'WaitingForTechSelection' || currentStatus === 'WaitingForRateConfirmation' || AI_RUNNING_STATUSES.includes(currentStatus)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[10px] gap-1"
                      onClick={async () => {
                        try {
                          setActiveProposalId(statusDetails.proposal.id);

                          if (currentStatus === 'Failed') {
                            await proposalApi.resumeFailedProposal(statusDetails.proposal.id);
                            toast('Pipeline resumed successfully.', 'success');
                          } else {
                            toast('Switched to live tracking.', 'success');
                          }

                          setPolling(true);
                          if (currentStatus === 'Failed') fetchProposals();
                          navigate('/dashboard');
                        } catch (err: any) {
                          toast('Failed to resume: ' + (err.response?.data?.error || err.message), 'error');
                        }
                      }}
                    >
                      {currentStatus === 'WaitingForTechSelection' || currentStatus === 'WaitingForRateConfirmation' ? (
                        <>Review Details</>
                      ) : (
                        <><Play size={12} className="text-primary fill-primary/20" /> Resume</>
                      )}
                    </Button>
                  )}
                  <Badge variant={getProposalBadgeVariant(currentStatus)}>
                    {currentStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {/* AI Pipeline Stepper */}
                {(AI_RUNNING_STATUSES.includes(currentStatus) || currentStatus === 'Complete') && (
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
                    {STEP_PHASES.map((phase) => {
                      const stepStatus = getStepStatusVariant(phase.name);
                      return (
                        <div
                          key={phase.name}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center gap-1 transition-all ${stepStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium' :
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
                )}

                {/* Business Workflow Stepper removed */}

                {/* Agent Reasoning Logs */}
                {perms.canViewAgentLogs && (
                  <div className="bg-muted p-4 rounded-xl border border-border flex flex-col gap-2 max-h-57 overflow-y-auto font-mono text-xs">
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

                {/* Workflow actions + download */}
                {!AI_RUNNING_STATUSES.includes(currentStatus) && (
                  <div className="flex flex-col gap-4 pt-2 border-t border-border/40">
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
                        {canApproveNow && (
                          <Button size="sm" variant="success" className="text-[10px] py-1 h-7 gap-1" onClick={() => handleTransition('Approved')}>
                            <CheckCircle2 size={11} /> Approve
                          </Button>
                        )}
                        {canRejectNow && (
                          <Button size="sm" variant="destructive" className="text-[10px] py-1 h-7 gap-1" onClick={() => handleTransition('Rejected')}>
                            <AlertTriangle size={11} /> Reject
                          </Button>
                        )}
                        {canPublishNow && (
                          <Button size="sm" variant="outline" className="text-[10px] py-1 h-7 gap-1" onClick={() => handleTransition('Published')}>
                            <Award size={11} /> Mark as Published
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => openEditor(statusDetails.structured_ir)}
                      >
                        {perms.isReadOnly ? <Eye size={15} /> : <Edit size={15} />}
                        {perms.isReadOnly ? 'View Solution Blueprint' : 'Edit Solution Blueprint'}
                      </Button>
                      {['Approved', 'Published'].includes(currentStatus) && perms.canDownload && (
                        <a
                          href={proposalApi.downloadUrl(statusDetails.proposal.id)}
                          className="flex-1"
                          download
                        >
                          <Button variant="primary" className="w-full gap-2 font-bold shadow-md shadow-primary/20 bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white">
                            <Download size={15} /> Download Solution PPTX
                          </Button>
                        </a>
                      )}
                    </div>

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
          ) : (
            <Card className="h-full flex flex-col items-center justify-center py-32 text-center border-dashed border-2">
              <History size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-base font-bold text-foreground">No Draft Selected</h3>
              <p className="text-xs text-muted-foreground max-w-[260px] mt-1">
                Select a draft from the historical archive list to view its pipeline execution status, business review workflow, and download options.
              </p>
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
            {perms.isReadOnly && (
              <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                <Lock size={14} className="flex-shrink-0" />
                <span><strong>Read-Only Access.</strong> As Reviewing Partner, you can view all content but cannot make edits. Use Approve / Reject buttons to action this proposal.</span>
              </div>
            )}

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

            {/* REQUIREMENTS & GAP ANALYSIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-foreground border-b border-border pb-1">Functional & Scope Requirements</span>
                <div className="flex flex-col gap-2">
                  {editableIr.requirements.map((req: string, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        value={req}
                        disabled={!perms.canEditSolution}
                        onChange={(e) => editItemInList('requirements', idx, e.target.value)}
                        className="flex-1"
                      />
                      {!perms.isReadOnly && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItemFromList('requirements', idx)}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                  {!perms.isReadOnly && (
                    <Button variant="outline" size="sm" className="self-start gap-1 mt-1 text-[11px]" onClick={() => addItemToList('requirements')}>
                      <Plus size={12} /> Add Requirement
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-foreground border-b border-border pb-1">Identified Capability & Scope Gaps</span>
                <div className="flex flex-col gap-2">
                  {editableIr.gaps.map((gap: string, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        value={gap}
                        disabled={!perms.canEditSolution}
                        onChange={(e) => editItemInList('gaps', idx, e.target.value)}
                        className="flex-1"
                      />
                      {!perms.isReadOnly && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteItemFromList('gaps', idx)}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                  {!perms.isReadOnly && (
                    <Button variant="outline" size="sm" className="self-start gap-1 mt-1 text-[11px]" onClick={() => addItemToList('gaps')}>
                      <Plus size={12} /> Add Gap
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* SOLUTION PILLARS */}
            {editableIr.solution_pillars && (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-foreground border-b border-border pb-1">Key Solution Pillars</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editableIr.solution_pillars.map((pillar: any, idx: number) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-xl border border-border flex flex-col gap-2">
                      <Input
                        label={`Pillar #${idx + 1} Title`}
                        value={pillar.title}
                        disabled={!perms.canEditSolution}
                        onChange={(e) => updatePillar(idx, 'title', e.target.value)}
                      />
                      <label className="text-xs font-medium text-foreground/75">Description</label>
                      <textarea
                        rows={2}
                        className="w-full text-xs bg-card border border-input rounded-md p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                        value={pillar.desc}
                        disabled={!perms.canEditSolution}
                        onChange={(e) => updatePillar(idx, 'desc', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ARCHITECTURE LAYERS */}
            {editableIr.architecture && (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-foreground border-b border-border pb-1">Proposed System Architecture Layers</span>
                <div className="flex flex-col gap-4">
                  {editableIr.architecture.map((layer: any, idx: number) => (
                    <div key={idx} className="p-4 bg-muted/20 border border-border rounded-xl flex flex-col gap-3">
                      <span className="text-xs font-bold text-primary tracking-wide uppercase">{layer.layer} Layer</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {layer.components.map((comp: string, cIdx: number) => (
                          <Input
                            key={cIdx}
                            label={`Component #${cIdx + 1}`}
                            value={comp}
                            disabled={!perms.canEditSolution}
                            onChange={(e) => updateArchitectureComponent(idx, cIdx, e.target.value)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RESOURCE PLAN */}
            {editableIr.resources && (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-foreground border-b border-border pb-1">Resource & Staffing Matrix</span>
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="min-w-full divide-y divide-border text-xs text-left">
                    <thead className="bg-muted text-muted-foreground uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Role Label</th>
                        <th className="px-3 py-2">Location</th>
                        <th className="px-3 py-2">FTE Count</th>
                        <th className="px-3 py-2">Daily Rate</th>
                        <th className="px-3 py-2">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {editableIr.resources.map((res: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5">
                            <input
                              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs font-semibold"
                              value={res.role}
                              disabled={!perms.canEditDelivery}
                              onChange={(e) => updateResource(idx, 'role', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs"
                              value={res.loc}
                              disabled={!perms.canEditDelivery}
                              onChange={(e) => updateResource(idx, 'loc', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs"
                              value={res.fte}
                              disabled={!perms.canEditDelivery}
                              onChange={(e) => updateResource(idx, 'fte', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs"
                              value={res.rate}
                              disabled={!perms.canEditDelivery}
                              onChange={(e) => updateResource(idx, 'rate', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs font-bold"
                              value={res.total}
                              disabled={!perms.canEditDelivery}
                              onChange={(e) => updateResource(idx, 'total', e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TIMELINE PHASES */}
            {editableIr.timeline_phases && (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-foreground border-b border-border pb-1">Project Phase Deliverables & Timeline</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editableIr.timeline_phases.map((phase: any, idx: number) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-xl border border-border flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Phase Name"
                          value={phase.phase}
                          disabled={!perms.canEditDelivery}
                          onChange={(e) => updateTimelinePhase(idx, 'phase', e.target.value)}
                        />
                        <Input
                          label="Duration"
                          value={phase.duration}
                          disabled={!perms.canEditDelivery}
                          onChange={(e) => updateTimelinePhase(idx, 'duration', e.target.value)}
                        />
                      </div>
                      <Input
                        label="Key Deliverables"
                        value={phase.deliverables}
                        disabled={!perms.canEditDelivery}
                        onChange={(e) => updateTimelinePhase(idx, 'deliverables', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SKILLS MAPPING */}
            {editableIr.skills_mapping && (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-bold text-foreground border-b border-border pb-1">Skill & Credential Requirements Mapping</span>
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="min-w-full divide-y divide-border text-xs text-left">
                    <thead className="bg-muted text-muted-foreground uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Skill / Credential</th>
                        <th className="px-3 py-2">Mapped Role</th>
                        <th className="px-3 py-2">Knowledge Asset</th>
                        <th className="px-3 py-2">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {editableIr.skills_mapping.map((skill: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5">
                            <input
                              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs font-semibold"
                              value={skill.skill}
                              disabled={!perms.canEditDelivery}
                              onChange={(e) => updateSkillMapping(idx, 'skill', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs"
                              value={skill.role}
                              disabled={!perms.canEditDelivery}
                              onChange={(e) => updateSkillMapping(idx, 'role', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs font-mono"
                              value={skill.asset}
                              disabled={!perms.canEditDelivery}
                              onChange={(e) => updateSkillMapping(idx, 'asset', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              className="w-full bg-transparent border-0 focus:ring-0 p-0 text-xs font-bold"
                              value={skill.conf}
                              disabled={!perms.canEditDelivery}
                              onChange={(e) => updateSkillMapping(idx, 'conf', e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SAVE ACTION */}
            {!perms.isReadOnly && (
              <Button type="button" variant="primary" isLoading={savingIr} className="w-full gap-2 mt-4" onClick={saveUpdatedIr}>
                <Save size={15} /> Save Blueprint changes & Regenerate Deck
              </Button>
            )}
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
};

export default Archive;
