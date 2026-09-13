export type AiSkillApi = {
  id: string;
  name: string;
  description: string | null;
  rolePrompt: string;
  servicesDescription: string;
  businessKnowledge: string;
  customInstructions: string | null;
  aiCredentialId: string | null;
  aiCredentialName: string | null;
  model: string | null;
  temperature: number;
  maxTokens: number | null;
  continuousChat: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AiSkillsListResponse = {
  skills: AiSkillApi[];
};

export type AiSkillDetailResponse = {
  skill: AiSkillApi;
};

export type CreateAiSkillPayload = {
  name: string;
  description?: string | null;
  rolePrompt: string;
  servicesDescription: string;
  businessKnowledge: string;
  customInstructions?: string | null;
  aiCredentialId?: string | null;
  model?: string | null;
  temperature?: number;
  maxTokens?: number | null;
  continuousChat?: boolean;
  active?: boolean;
};

export type UpdateAiSkillPayload = Partial<CreateAiSkillPayload>;
