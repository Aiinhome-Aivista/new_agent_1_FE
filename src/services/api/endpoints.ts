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
  upload: async (formData: FormData): Promise<{ message: string; proposal_id: string }> => {
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
};

export const knowledgeApi = {
  list: async (): Promise<KnowledgeAsset[]> => {
    const res = await apiClient.get(API_ENDPOINTS.knowledge);
    return res.data;
  },
  add: async (asset: Omit<KnowledgeAsset, 'id' | 'created_at'>): Promise<any> => {
    const res = await apiClient.post(API_ENDPOINTS.knowledge, asset);
    return res.data;
  },
  update: async (id: number, asset: Omit<KnowledgeAsset, 'id' | 'created_at'>): Promise<any> => {
    const res = await apiClient.put(`${API_ENDPOINTS.knowledge}/${id}`, asset);
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

