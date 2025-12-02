import { NextRequest } from 'next/server';
import { runAgent } from '@/lib/agent/runner';
import { AgentEvent, AgentRunRequest } from '@/lib/agent/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function formatSSE(event: AgentEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const body: AgentRunRequest = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentEvent) => {
        controller.enqueue(encoder.encode(formatSSE(event)));
      };

      try {
        await runAgent(body, send, req.signal);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Agent failed to respond';
        send({ type: 'final', content: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
