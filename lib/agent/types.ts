import { Artifact, LLMProvider } from '@/lib/types';

export type AgentEventType = 'thought' | 'action' | 'observation' | 'final';

export interface AgentEvent {
  type: AgentEventType;
  content: string;
  title?: string;
  tool?: string;
  artifact?: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt' | 'version'>;
}

export interface AgentAction {
  tool: 'http' | 'code';
  input: Record<string, any>;
  description?: string;
}

export interface AgentPlan {
  summary: string;
  steps: string[];
  actions: AgentAction[];
}

export interface AgentRunRequest {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  provider?: LLMProvider;
  temperature?: number;
  maxTokens?: number;
}
