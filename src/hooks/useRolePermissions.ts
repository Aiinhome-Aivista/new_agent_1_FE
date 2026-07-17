import { useAuthStore } from '../store';

/**
 * useRolePermissions — Centralized RBAC permissions hook.
 *
 * Business Roles:
 *   presales   — Pre-Sales / Solution Architect
 *   bidmanager — Bid / Proposal Manager
 *   delivery   — Delivery Lead
 *   partner    — Reviewing Partner
 *   admin      — Platform Administrator (full access)
 *
 * Workflow Stage:
 *   presales/bidmanager → create proposal → run AI pipeline
 *   ↓
 *   AI: Ingesting → Analyzing → Designing → Planning → Assembling → Complete
 *   ↓ (presales/bidmanager moves to Draft)
 *   Draft → DeliveryReview → PartnerReview → Approved → Published
 *                ↑                 ↓
 *              (reject)          Draft
 */
export function useRolePermissions() {
  const { user } = useAuthStore();
  const role = user?.role ?? '';

  // ── Role predicates ─────────────────────────────────────
  const isAdmin      = role === 'admin';
  const isPreSales   = role === 'presales';
  const isBidManager = role === 'bidmanager';
  const isDelivery   = role === 'delivery';
  const isPartner    = role === 'partner';

  // ── Feature permissions ──────────────────────────────────

  /** Can create a new proposal and upload RFP documents */
  const canCreateProposal = isPreSales || isBidManager || isAdmin;

  /** Can upload support documents (same as create) */
  const canUploadDocs = isPreSales || isBidManager || isAdmin;

  /** Can trigger / run the AI pipeline */
  const canRunPipeline = isPreSales || isBidManager || isAdmin;

  /** Can edit solution pillars, requirements, gaps, architecture */
  const canEditSolution = isPreSales || isBidManager || isAdmin;

  /** Can edit budget / financial figures */
  const canEditBudget = isBidManager || isAdmin;

  /** Can edit resource planning, timeline phases, skill matrix */
  const canEditDelivery = isDelivery || isAdmin;

  /** Can view all proposal content (everyone can view, partner is read-only) */
  const canViewProposal = true;

  /** Can view agent reasoning logs */
  const canViewAgentLogs = true; // All roles — partner needs it for review

  /** Can view audit trail logs */
  const canViewAuditLogs = isPartner || isAdmin;

  /** Can move a "Complete" proposal to "Draft" (start business review) */
  const canMoveToDraft = isPreSales || isBidManager || isAdmin;

  /** Can submit draft to delivery lead for review */
  const canSubmitToDelivery = isPreSales || isBidManager || isAdmin;

  /** Can submit to partner after delivery review */
  const canSubmitToPartner = isDelivery || isAdmin;

  /** Can approve a proposal in PartnerReview */
  const canApprove = isPartner || isAdmin;

  /** Can reject (send back to Draft from PartnerReview) */
  const canReject = isPartner || isAdmin;

  /** Can publish after approval */
  const canPublish = isPartner || isAdmin;

  /** Can download the generated PPTX */
  const canDownload = true; // All roles

  /** Can access the Admin Control Center panel */
  const canViewAdminPanel = isAdmin;

  /** Can manage users and assign roles */
  const canManageUsers = isAdmin;

  /** Can retry failed pipeline jobs */
  const canRetryJobs = isAdmin;

  /** Can update AI model configuration */
  const canManageAIModels = isAdmin;

  /** Can manage Knowledge Base (add/edit assets) */
  const canManageKnowledge = isAdmin;

  // ── Knowledge Base granular permissions (per image matrix) ───
  /** All roles can view the Knowledge Base */
  const canViewKnowledge = true;
  /** Pre-Sales + Admin can upload new knowledge nodes */
  const canUploadKnowledge = isPreSales || isAdmin;
  /** Pre-Sales + Admin can edit existing knowledge nodes */
  const canEditKnowledge = isPreSales || isAdmin;
  /** Only Admin can delete knowledge nodes */
  const canDeleteKnowledge = isAdmin;
  /** Pre-Sales + Admin can trigger RAG re-indexing */
  const canReindexKnowledge = isPreSales || isAdmin;

  /** Is the user strictly read-only (can only view and approve/reject) */
  const isReadOnly = isPartner;

  /** Role display label for UI */
  const roleLabel: Record<string, string> = {
    presales:   'Pre-Sales Architect',
    bidmanager: 'Bid Manager',
    delivery:   'Delivery Lead',
    partner:    'Reviewing Partner',
    admin:      'Administrator',
  };
  const displayRole = roleLabel[role] || role;

  /** Color class for role badge */
  const roleBadgeClass: Record<string, string> = {
    presales:   'role-badge--presales',
    bidmanager: 'role-badge--bidmanager',
    delivery:   'role-badge--delivery',
    partner:    'role-badge--partner',
    admin:      'role-badge--admin',
  };
  const badgeClass = roleBadgeClass[role] || 'role-badge--default';

  return {
    role,
    displayRole,
    badgeClass,
    isAdmin,
    isPreSales,
    isBidManager,
    isDelivery,
    isPartner,
    isReadOnly,
    // Proposal creation / pipeline
    canCreateProposal,
    canUploadDocs,
    canRunPipeline,
    // Editing
    canEditSolution,
    canEditBudget,
    canEditDelivery,
    // Viewing
    canViewProposal,
    canViewAgentLogs,
    canViewAuditLogs,
    // Workflow transitions
    canMoveToDraft,
    canSubmitToDelivery,
    canSubmitToPartner,
    canApprove,
    canReject,
    canPublish,
    // Download
    canDownload,
    // Admin
    canViewAdminPanel,
    canManageUsers,
    canRetryJobs,
    canManageAIModels,
    canManageKnowledge,
    // Knowledge Base (granular)
    canViewKnowledge,
    canUploadKnowledge,
    canEditKnowledge,
    canDeleteKnowledge,
    canReindexKnowledge,
  };
}
