import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { OpenAIStream } from 'ai';
import {
  getProviderConfig,
  getAvailableProviders,
  PROVIDER_FALLBACK_ORDER,
} from '@/lib/providers/config';
import { LLMProvider } from '@/lib/types';
import { checkRateLimit } from '@/lib/ratelimit';

// Edge runtime for better streaming performance
export const runtime = 'edge';
export const maxDuration = 60;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  provider?: LLMProvider;
  temperature?: number;
  maxTokens?: number;
}

type ProviderStreamFactory = (
  provider: LLMProvider,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
) => Promise<ReadableStream<Uint8Array>>;

class RateLimitError extends Error {
  limit: number;
  remaining: number;
  reset: number;

  constructor(limit: number, remaining: number, reset: number) {
    super('Rate limit exceeded. Please try again later.');
    this.limit = limit;
    this.remaining = remaining;
    this.reset = reset;
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function formatTextChunk(text: string) {
  const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return encoder.encode(`0:"${escaped}"\n`);
}

function createSSETextStream(
  response: Response,
  extractText: (data: any) => string | null
): ReadableStream<Uint8Array> {
  if (!response.body) {
    throw new Error('No response body from provider');
  }

  const reader = response.body.getReader();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line || line === 'data: [DONE]') continue;

          const dataLine = line.startsWith('data:')
            ? line.slice(5).trim()
            : line;

          try {
            const payload = JSON.parse(dataLine);
            const text = extractText(payload);
            if (text) {
              controller.enqueue(formatTextChunk(text));
            }
          } catch (err) {
            console.error('Failed to parse provider stream chunk', err, line);
          }
        }
      }

      if (buffer.trim()) {
        try {
          const payload = JSON.parse(buffer.trim());
          const text = extractText(payload);
          if (text) {
            controller.enqueue(formatTextChunk(text));
          }
        } catch (err) {
          console.error('Failed to parse remaining provider buffer', err);
        }
      }

      controller.close();
    },
  });
}

function normalizeOpenAIChoices(data: any): string | null {
  const choice = data?.choices?.[0];
  const delta = choice?.delta || choice?.message;

  if (!delta) return null;

  if (typeof delta.content === 'string') return delta.content;

  if (Array.isArray(delta.content)) {
    return delta.content
      .map((part) => (part?.text ? part.text : part?.type === 'text' ? part.text : ''))
      .join('');
  }

  if (delta?.content?.[0]?.text) return delta.content[0].text;

  return null;
}

function normalizeGeminiCandidates(data: any): string | null {
  const candidate = data?.candidates?.[0];
  if (!candidate) return null;

  if (candidate?.content?.parts) {
    return candidate.content.parts.map((part: any) => part?.text || '').join('');
  }

  if (candidate?.delta?.text) {
    return candidate.delta.text;
  }

  return null;
}

const providerStreams: Record<LLMProvider, ProviderStreamFactory> = {
  openai: async (provider, messages, temperature, maxTokens) => {
    const config = getProviderConfig(provider);
    if (!config.enabled || !config.apiKey) {
      throw new Error(`Provider ${provider} is not configured`);
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });

    const stream = await client.chat.completions.create({
      model: config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    return OpenAIStream(stream as any) as unknown as ReadableStream<Uint8Array>;
  },
  gemini: async (provider, messages, temperature, maxTokens) => {
    const config = getProviderConfig(provider);
    if (!config.enabled || !config.apiKey) {
      throw new Error(`Provider ${provider} is not configured`);
    }

    const url = `${config.baseURL}/models/${config.model}:streamGenerateContent?key=${config.apiKey}`;
    const geminiMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini request failed: ${errorText}`);
    }

    return createSSETextStream(response, normalizeGeminiCandidates);
  },
  minimax: async (provider, messages, temperature, maxTokens) => {
    const config = getProviderConfig(provider);
    if (!config.enabled || !config.apiKey) {
      throw new Error(`Provider ${provider} is not configured`);
    }

    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Minimax request failed: ${errorText}`);
    }

    return createSSETextStream(response, normalizeOpenAIChoices);
  },
  wavespeed: async (provider, messages, temperature, maxTokens) => {
    const config = getProviderConfig(provider);
    if (!config.enabled || !config.apiKey) {
      throw new Error(`Provider ${provider} is not configured`);
    }

    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WaveSpeed request failed: ${errorText}`);
    }

    return createSSETextStream(response, normalizeOpenAIChoices);
  },
  kimi: async (provider, messages, temperature, maxTokens) => {
    const config = getProviderConfig(provider);
    if (!config.enabled || !config.apiKey) {
      throw new Error(`Provider ${provider} is not configured`);
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });

    const stream = await client.chat.completions.create({
      model: config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    return OpenAIStream(stream as any) as unknown as ReadableStream<Uint8Array>;
  },
  qwen: async (provider, messages, temperature, maxTokens) => {
    const config = getProviderConfig(provider);
    if (!config.enabled || !config.apiKey) {
      throw new Error(`Provider ${provider} is not configured`);
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });

    const stream = await client.chat.completions.create({
      model: config.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    return OpenAIStream(stream as any) as unknown as ReadableStream<Uint8Array>;
  },
};

async function createChatCompletion(
  provider: LLMProvider,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<Response> {
  const streamFactory = providerStreams[provider];

  if (!streamFactory) {
    throw new Error(`Provider ${provider} is not supported`);
  }

  const stream = await streamFactory(provider, messages, temperature, maxTokens);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

async function tryProvidersWithFallback(
  preferredProvider: LLMProvider,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
  ip: string
): Promise<Response> {
  const availableProviders = getAvailableProviders();

  if (availableProviders.length === 0) {
    throw new Error('No providers are configured');
  }

  // Create fallback chain starting with preferred provider
  const fallbackChain = [
    preferredProvider,
    ...PROVIDER_FALLBACK_ORDER.filter((p) => p !== preferredProvider),
  ].filter((p) => availableProviders.includes(p));

  let lastError: Error | null = null;

  for (const provider of fallbackChain) {
    const rateLimitResult = await checkRateLimit(
      `chat:${provider}:${ip}`,
      'standard'
    );

    if (!rateLimitResult.success) {
      throw new RateLimitError(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.reset
      );
    }

    try {
      console.log(`Attempting to use provider: ${provider}`);
      const response = await createChatCompletion(
        provider,
        messages,
        temperature,
        maxTokens
      );

      // Add provider info to response headers
      response.headers.set('X-Provider-Used', provider);

      return response;
    } catch (error) {
      console.error(`Provider ${provider} failed:`, error);
      lastError = error as Error;

      // Continue to next provider in fallback chain
      if (provider === fallbackChain[fallbackChain.length - 1]) {
        // This was the last provider, throw the error
        throw lastError;
      }
    }
  }

  throw lastError || new Error('All providers failed');
}

export async function POST(req: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';

    const body: ChatRequest = await req.json();

    const {
      messages,
      provider = 'openai',
      temperature = 0.7,
      maxTokens = 4096,
    } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // Add system message for artifact generation
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `You are a helpful AI assistant with the ability to generate various types of artifacts. When creating code, diagrams, or other content, always wrap them in appropriate markdown code blocks with language tags.

For code artifacts, use:
\`\`\`language
code here
\`\`\`

For Mermaid diagrams, use:
\`\`\`mermaid
diagram here
\`\`\`

For HTML/React components, use:
\`\`\`html or \`\`\`jsx
component here
\`\`\`

Provide clear explanations and well-structured, production-ready code.`,
    };

    const messagesWithSystem = [systemMessage, ...messages];

    const response = await tryProvidersWithFallback(
      provider,
      messagesWithSystem,
      temperature,
      maxTokens,
      ip
    );

    return response;
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        {
          error: error.message,
          limit: error.limit,
          remaining: error.remaining,
          reset: new Date(error.reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': error.limit.toString(),
            'X-RateLimit-Remaining': error.remaining.toString(),
            'X-RateLimit-Reset': error.reset.toString(),
          },
        }
      );
    }

    console.error('Chat API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An error occurred',
      },
      { status: 500 }
    );
  }
}
