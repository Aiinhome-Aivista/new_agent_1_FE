import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  password: z.string().min(5, { message: 'Password must be at least 5 characters' }),
});

export const proposalUploadSchema = z.object({
  clientName: z.string().min(2, { message: 'Client name must be at least 2 characters' }),
  projectDuration: z.string().min(2, { message: 'Duration details are required' }),
  budget: z.string().min(2, { message: 'Budget sizing details are required' }),
});
