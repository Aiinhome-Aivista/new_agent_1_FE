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
};

export const knowledgeApi = {
  list: async (): Promise<KnowledgeAsset[]> => {
    const res = await apiClient.get(API_ENDPOINTS.knowledge);
    return res.data;
  },
  add: async (asset: Omit<KnowledgeAsset, 'id'>): Promise<any> => {
    const res = await apiClient.post(API_ENDPOINTS.knowledge, asset);
    return res.data;
  },
};
