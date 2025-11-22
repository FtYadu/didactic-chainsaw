// Core types for the application

export type LLMProvider = 'openai' | 'gemini' | 'kimi' | 'qwen';

export interface ProviderConfig {
  id: LLMProvider;
  name: string;
  apiKey?: string;
  baseURL?: string;
  model: string;
  enabled: boolean;
}

export type ArtifactType =
  | 'code'
  | 'markdown'
  | 'mermaid'
  | 'react'
  | 'chart'
  | 'html';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  artifacts?: Artifact[];
  timestamp: Date;
  provider?: LLMProvider;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  artifacts: Artifact[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatSettings {
  provider: LLMProvider;
  temperature: number;
  maxTokens: number;
  enableStreaming: boolean;
}

export interface ProviderHealth {
  provider: LLMProvider;
  healthy: boolean;
  lastChecked: Date;
  errorCount: number;
}
