// Core types for the application

export type LLMProvider =
  | 'openai'
  | 'gemini'
  | 'minimax'
  | 'wavespeed'
  | 'kimi'
  | 'qwen';

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
  | 'html'
  | 'image'
  | 'sql'
  | 'data-viz';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    imageUrl?: string;
    chartData?: any;
    queryResult?: any;
    sandbox?: string;
    gist?: string;
  };
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

export interface UsageStats {
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  byProvider: Record<
    LLMProvider,
    {
      messages: number;
      tokens: number;
      cost: number;
    }
  >;
  byArtifactType: Record<ArtifactType, number>;
  averageResponseTime: number;
}

export interface AnalyticsEvent {
  id: string;
  type: 'message' | 'artifact' | 'export' | 'error';
  provider?: LLMProvider;
  artifactType?: ArtifactType;
  tokens?: number;
  cost?: number;
  responseTime?: number;
  timestamp: Date;
}

export interface ExportOptions {
  format: 'pdf' | 'gist' | 'sandbox' | 'markdown' | 'json';
  includeMetadata?: boolean;
  theme?: 'light' | 'dark';
}
