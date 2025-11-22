import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
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

async function createChatCompletion(
  provider: LLMProvider,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<Response> {
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

  return new Response(OpenAIStream(stream as any), {
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
  maxTokens: number
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
  const startTime = Date.now();

  try {
    // Get client IP for rate limiting
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';

    // Check rate limit
    const rateLimitResult = await checkRateLimit(`chat:${ip}`, 'standard');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: new Date(rateLimitResult.reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

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
      maxTokens
    );

    return response;
  } catch (error) {
    console.error('Chat API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An error occurred',
      },
      { status: 500 }
    );
  }
}
