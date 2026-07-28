import apiClient from './client';
import { API_ENDPOINTS } from '../../config/api.config';
import { AuthResponse, Proposal, ProposalStatusResponse, KnowledgeAsset } from '../../types/api.types';

export const authApi = {
  login: async (credentials: any): Promise<AuthResponse> => {
    const res = await apiClient.post(API_ENDPOINTS.login, credentials);
    return res.data;
  },
};

export const proposalApi = {
  upload: async (formData: FormData): Promise<{ message: string; proposal_id: string; status?: string }> => {
    const res = await apiClient.post(API_ENDPOINTS.uploadProposal, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  list: async (): Promise<Proposal[]> => {
    const res = await apiClient.get(API_ENDPOINTS.proposalsList);
    return res.data;
  },
  status: async (id: string): Promise<ProposalStatusResponse> => {
    const res = await apiClient.get(API_ENDPOINTS.proposalStatus(id));
    return res.data;
  },
  edit: async (id: string, irData: any): Promise<any> => {
    const res = await apiClient.post(API_ENDPOINTS.editProposal(id), irData);
    return res.data;
  },
  downloadUrl: (id: string) => {
    return API_ENDPOINTS.downloadProposal(id);
  },
  transition: async (id: string, status: string, userRole: string): Promise<any> => {
    const res = await apiClient.post(`/api/proposals/transition/${id}`, { status, user_role: userRole });
    return res.data;
  },
  pauseProposal: async (id: string): Promise<any> => {
    const res = await apiClient.post(`/api/proposals/${id}/pause`);
    return res.data;
  },
  resumeFailedProposal: async (id: string): Promise<any> => {
    const res = await apiClient.post(`/api/proposals/${id}/resume`);
    return res.data;
  },
  prioritizeProposal: async (id: string): Promise<any> => {
    const res = await apiClient.post(`/api/proposals/${id}/prioritize`);
    return res.data;
  },
  getTechOptions: async (): Promise<any> => {
    const res = await apiClient.get(API_ENDPOINTS.techOptions);
    return res.data;
  },
  calculateBudget: async (ui_tech: string, backend_tech: string, db_tech: string): Promise<any> => {
    const res = await apiClient.post(API_ENDPOINTS.calculateBudget, { ui_tech, backend_tech, db_tech });
    return res.data;
  },
  resumeProposal: async (id: string, ui_tech: string, backend_tech: string, db_tech: string, formatted_budget: string, selected_rag?: string, selected_guardrail?: string, selected_action_engine?: string): Promise<any> => {
    const res = await apiClient.post(API_ENDPOINTS.resumeProposal(id), {
      ui_tech,
      backend_tech,
      db_tech,
      formatted_budget,
      selected_rag,
      selected_guardrail,
      selected_action_engine
    });
    return res.data;
  },
  resumeRate: async (id: string, resources: any[]): Promise<any> => {
    const res = await apiClient.post(`/api/proposals/resume-rate/${id}`, { resources });
    return res.data;
  },
};

export const knowledgeApi = {
  list: async (): Promise<KnowledgeAsset[]> => {
    const res = await apiClient.get(API_ENDPOINTS.knowledge);
    return res.data;
  },
  upload: async (formData: FormData): Promise<any> => {
    const res = await apiClient.post(API_ENDPOINTS.knowledge, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  delete: async (id: number): Promise<any> => {
    const res = await apiClient.delete(`${API_ENDPOINTS.knowledge}/${id}`);
    return res.data;
  },
  reindex: async (): Promise<any> => {
    const res = await apiClient.post(`${API_ENDPOINTS.knowledge}/reindex`);
    return res.data;
  },
};

export const caseStudiesApi = {
  list: async (): Promise<any[]> => {
    const res = await apiClient.get('/api/case-studies');
    return res.data;
  },
  upload: async (formData: FormData): Promise<any> => {
    const res = await apiClient.post('/api/case-studies/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  delete: async (id: number | string): Promise<any> => {
    const res = await apiClient.delete(`/api/case-studies/${id}`);
    return res.data;
  },
  pause: async (id: number | string): Promise<any> => {
    const res = await apiClient.post(`/api/case-studies/queue/${id}/pause`);
    return res.data;
  },
  resume: async (id: number | string): Promise<any> => {
    const res = await apiClient.post(`/api/case-studies/queue/${id}/resume`);
    return res.data;
  },
  prioritize: async (id: number | string): Promise<any> => {
    const res = await apiClient.post(`/api/case-studies/queue/${id}/prioritize`);
    return res.data;
  },
};

export const adminApi = {
  getUsers: async (): Promise<any[]> => {
    const res = await apiClient.get('/admin/users');
    return res.data;
  },
  changeRole: async (username: string, role: string): Promise<any> => {
    const res = await apiClient.post('/admin/users/role', { username, role });
    return res.data;
  },
  getConfig: async (): Promise<any> => {
    const res = await apiClient.get('/admin/config');
    return res.data;
  },
  getAuditLogs: async (): Promise<any[]> => {
    const res = await apiClient.get('/admin/audit-logs');
    return res.data;
  },
  retryJob: async (id: string): Promise<any> => {
    const res = await apiClient.post(`/admin/retry/${id}`);
    return res.data;
  },
  updateModel: async (modelName: string): Promise<any> => {
    const res = await apiClient.post('/admin/model', { model_name: modelName });
    return res.data;
  },
};

