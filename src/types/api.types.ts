export interface User {
  id: number;
  username: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Proposal {
  id: string;
  client_name: string;
  project_duration: string;
  budget: string;
  // AI pipeline statuses
  // Business workflow statuses: Complete → Draft → DeliveryReview → PartnerReview → Approved/Published
  status:
  | 'Ingesting' | 'Analyzing' | 'Designing' | 'Planning' | 'Assembling' | 'Complete' | 'Failed' | 'Paused' | 'Queued' | 'Rejected'
  | 'Draft' | 'DeliveryReview' | 'PartnerReview' | 'Approved' | 'Published' | 'WaitingForTechSelection';
  submitted_by_role?: string | null;   // Role that last transitioned the proposal
  last_transitioned_at?: string | null;
  generated_file_path?: string | null;
  structured_json_ir?: string | null;
  created_at: string;
}

export interface ProposalStep {
  step_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  log_message?: string | null;
  updated_at?: string;
}

export interface KnowledgeAsset {
  id: number;
  name: string;
  description: string;
  category: 'Asset' | 'Competency';
  capabilities: string;
  created_at?: string;
}

export interface ProposalStatusResponse {
  proposal: Proposal;
  steps: ProposalStep[];
  structured_ir: Record<string, any> | null;
}
