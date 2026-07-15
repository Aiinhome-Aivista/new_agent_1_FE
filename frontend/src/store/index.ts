import { create } from 'zustand';
import { authApi, proposalApi } from '../services/api/endpoints';
import { User, Proposal, ProposalStatusResponse } from '../types/api.types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
}

interface ProposalState {
  proposals: Proposal[];
  activeProposalId: string | null;
  statusDetails: ProposalStatusResponse | null;
  isPolling: boolean;
  fetchProposals: () => Promise<void>;
  setActiveProposalId: (id: string | null) => void;
  setStatusDetails: (details: ProposalStatusResponse | null) => void;
  setPolling: (isPolling: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('pwc_auth_token'),
  user: (() => {
    const raw = localStorage.getItem('pwc_auth_user');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  })(),
  isAuthenticated: !!localStorage.getItem('pwc_auth_token'),
  login: async (credentials) => {
    const data = await authApi.login(credentials);
    localStorage.setItem('pwc_auth_token', data.token);
    localStorage.setItem('pwc_auth_user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('pwc_auth_token');
    localStorage.removeItem('pwc_auth_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

export const useProposalStore = create<ProposalState>((set, get) => ({
  proposals: [],
  activeProposalId: null,
  statusDetails: null,
  isPolling: false,
  fetchProposals: async () => {
    try {
      const list = await proposalApi.list();
      set({ proposals: list });
    } catch (err) {
      console.error('Error fetching proposals list:', err);
    }
  },
  setActiveProposalId: (id) => set({ activeProposalId: id }),
  setStatusDetails: (details) => set({ statusDetails: details }),
  setPolling: (isPolling) => set({ isPolling }),
}));
