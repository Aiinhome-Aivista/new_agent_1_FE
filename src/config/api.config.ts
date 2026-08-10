export const API_ENDPOINTS = {
  login: '/api/auth/login',
  uploadProposal: '/api/proposals/upload',
  proposalsList: '/api/proposals',
  proposalStatus: (id: string) => `/api/proposals/status/${id}`,
  editProposal: (id: string) => `/api/proposals/edit/${id}`,
  downloadProposal: (id: string) => `/api/proposals/download/${id}`,
  calculateBudget: '/api/proposals/calculate-budget',
  refineProposal: '/api/proposals/refine-slide',
  pauseProposal: (id: string) => `/api/proposals/${id}/pause`,
  resumeProposal: (id: string) => `/api/proposals/resume/${id}`,
  techOptions: '/api/tech-options',
  knowledge: '/api/knowledge',
};
