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
  status: 'Ingesting' | 'Analyzing' | 'Designing' | 'Planning' | 'Assembling' | 'Complete' | 'Failed';
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
