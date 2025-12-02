import vm from 'node:vm';
import OpenAI from 'openai';
import { getProviderConfig } from '@/lib/providers/config';
import { AgentEvent, AgentPlan, AgentRunRequest } from './types';
import { LLMProvider } from '@/lib/types';

const promptTemplates: Record<string, string> = {
  gemini:
    'You are Gemini using a plan-act-observe loop. Keep steps concise, prefer markdown bullets, and propose concrete tool calls.',
  minimax:
    'You are Minimax with efficient decision making. Plan briefly, enumerate actions with required parameters, and be explicit about expected outputs.',
  wavespeed:
    'You are WaveSpeed optimized for rapid iteration. Keep plans short, prioritize parallelizable actions, and write executable code snippets when needed.',
  default:
    'You are an AI agent that plans actions, executes tools, and summarizes observations before responding.',
};

async function callModel(
  provider: LLMProvider,
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const config = getProviderConfig(provider);

  if (!config.apiKey) {
    throw new Error(`Provider ${provider} is not configured`);
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  const completion = await client.chat.completions.create({
    model: config.model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  });

  return completion.choices?.[0]?.message?.content || '';
}

function parsePlan(planText: string): AgentPlan {
  try {
    const parsed = JSON.parse(planText);
    if (parsed && parsed.steps && parsed.actions) {
      return {
        summary: parsed.summary || 'Planned actions',
        steps: parsed.steps || [],
        actions: parsed.actions || [],
      };
    }
  } catch (error) {
    // fallthrough to heuristic plan
  }

  const steps = planText
    .split(/\n|\r/)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);

  return {
    summary: steps[0] || 'Review request and respond concisely.',
    steps,
    actions: [],
  };
}

async function runHttpTool(input: Record<string, any>) {
  const url = input.url as string;
  const method = (input.method as string) || 'GET';
  const headers = (input.headers as Record<string, string>) || {};
  const body = input.body;

  if (!url) {
    throw new Error('HTTP tool requires a URL');
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();

  let parsed: any = raw;
  if (contentType.includes('application/json')) {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      // keep raw
    }
  }

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: parsed,
  };
}

function runCodeTool(input: Record<string, any>) {
  const code = (input.code as string) || input.snippet;
  const logs: string[] = [];

  if (!code) {
    throw new Error('Code tool requires a code snippet');
  }

  const sandbox = {
    console: {
      log: (...args: any[]) => {
        logs.push(args.map(String).join(' '));
      },
    },
    result: undefined as any,
  } as any;

  const context = vm.createContext(sandbox);
  try {
    const script = new vm.Script(code);
    const value = script.runInContext(context, { timeout: 1500 });
    return {
      result: value ?? context.result,
      logs,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Execution failed',
      logs,
    };
  }
}

function getTemplate(provider: LLMProvider) {
  return (
    promptTemplates[provider] ||
    promptTemplates[provider.toLowerCase?.() as string] ||
    promptTemplates.default
  );
}

async function generatePlan(
  provider: LLMProvider,
  userContent: string,
  temperature: number,
  maxTokens: number
): Promise<AgentPlan> {
  const planPrompt = `${getTemplate(provider)}\n\n` +
    `User request: ${userContent}\n` +
    'Create a short JSON plan with fields `summary`, `steps` (array of 3 bullet strings), and `actions` (array of tool calls).\n' +
    'Each action should include `tool` (http|code), `description`, and `input` with concrete parameters. Return JSON only.';

  const planText = await callModel(
    provider,
    [
      { role: 'system', content: 'You plan actions for a tool-using agent.' },
      { role: 'user', content: planPrompt },
    ],
    temperature,
    Math.min(maxTokens, 800)
  );

  return parsePlan(planText.trim());
}

async function generateFinal(
  provider: LLMProvider,
  userContent: string,
  observations: string[],
  temperature: number,
  maxTokens: number
) {
  const finalPrompt =
    'Use the observations from executed tools to provide a concise final answer. ' +
    'Cite the actions you took and summarize key outputs. If code was executed, describe the result.';

  return callModel(
    provider,
    [
      { role: 'system', content: finalPrompt },
      {
        role: 'user',
        content: `User request: ${userContent}\n\nObservations:\n${observations.join('\n')}`,
      },
    ],
    temperature,
    maxTokens
  );
}

export async function runAgent(
  request: AgentRunRequest,
  emit: (event: AgentEvent) => void | Promise<void>,
  signal?: AbortSignal
) {
  const { messages, provider = 'openai', temperature = 0.7, maxTokens = 2048 } = request;
  const latestUser = [...messages].reverse().find((m) => m.role === 'user');
  const userContent = latestUser?.content || messages[messages.length - 1]?.content || '';

  const observations: string[] = [];

  const guardAbort = () => {
    if (signal?.aborted) {
      throw new Error('Agent run cancelled');
    }
  };

  await emit({ type: 'thought', content: 'Planning next steps for the request.' });
  guardAbort();

  let plan: AgentPlan;
  try {
    plan = await generatePlan(provider, userContent, temperature, maxTokens);
  } catch (error) {
    plan = {
      summary: 'Fallback plan: respond directly based on the request.',
      steps: ['Understand the request', 'Use available tools if helpful', 'Provide a concise answer'],
      actions: [],
    };
    await emit({
      type: 'observation',
      content:
        'Unable to generate a full plan from the model. Using a simplified fallback approach.',
    });
  }

  await emit({
    type: 'thought',
    content: `Plan: ${plan.summary}`,
  });

  for (const action of plan.actions.slice(0, 4)) {
    guardAbort();
    await emit({
      type: 'action',
      content: action.description || `Execute ${action.tool} tool`,
      tool: action.tool,
    });

    try {
      let result: any;
      if (action.tool === 'http') {
        result = await runHttpTool(action.input || {});
      } else if (action.tool === 'code') {
        result = runCodeTool(action.input || {});
      } else {
        result = { error: `Unknown tool ${action.tool}` };
      }

      const serialized = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      const observation = `${action.tool} => ${serialized}`.slice(0, 4000);
      observations.push(observation);

      const artifactTitle = action.description || `${action.tool} output`;
      await emit({
        type: 'observation',
        content: observation,
        tool: action.tool,
        title: artifactTitle,
        artifact: {
          type: 'markdown',
          title: artifactTitle,
          content: `\n\n\`\`\`json\n${serialized}\n\`\`\``,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed';
      observations.push(`${action.tool} error: ${message}`);
      await emit({
        type: 'observation',
        content: message,
        tool: action.tool,
      });
    }
  }

  guardAbort();

  const finalContent = await generateFinal(
    provider,
    userContent,
    observations,
    temperature,
    Math.min(maxTokens, 2048)
  );

  await emit({ type: 'final', content: finalContent.trim() });
}
