export const API_ENDPOINTS = {
  login: '/api/auth/login',
  uploadProposal: '/api/proposals/upload',
  proposalsList: '/api/proposals',
  proposalStatus: (id: string) => `/api/proposals/status/${id}`,
  editProposal: (id: string) => `/api/proposals/edit/${id}`,
  downloadProposal: (id: string) => `/api/proposals/download/${id}`,
  knowledge: '/api/knowledge',
};
