import { C1_API_BASE_URL } from '@/lib/providers/config';
import { Artifact, ArtifactType } from '@/lib/types';
import { nanoid } from 'nanoid';

export interface C1Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface C1StreamChunk {
  type: 'text' | 'artifact' | 'done';
  content?: string;
  artifact?: Partial<Artifact>;
}

export class C1Client {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.THESYS_API_KEY || '';
    this.baseURL = C1_API_BASE_URL;
  }

  async createChatCompletion(
    messages: C1Message[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<Response> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4-turbo-preview',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 4096,
        stream: options.stream || false,
      }),
    });

    if (!response.ok) {
      throw new Error(`C1 API error: ${response.statusText}`);
    }

    return response;
  }

  async *streamChatCompletion(
    messages: C1Message[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<C1StreamChunk> {
    const response = await this.createChatCompletion(messages, {
      ...options,
      stream: true,
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        yield { type: 'done' };
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            yield { type: 'done' };
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;

            if (delta?.content) {
              yield {
                type: 'text',
                content: delta.content,
              };
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        }
      }
    }
  }
}

export function extractArtifactsFromContent(content: string): {
  text: string;
  artifacts: Artifact[];
} {
  const artifacts: Artifact[] = [];
  let text = content;

  // Extract code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]+?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || 'text';
    const code = match[2];

    // Determine artifact type based on language
    let type: ArtifactType = 'code';
    if (language === 'mermaid') type = 'mermaid';
    else if (language === 'html') type = 'html';
    else if (language === 'jsx' || language === 'tsx') type = 'react';

    artifacts.push({
      id: nanoid(),
      type,
      title: `${language} code`,
      content: code,
      language,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return { text, artifacts };
}

export function createC1Client(apiKey?: string): C1Client {
  return new C1Client(apiKey);
}
