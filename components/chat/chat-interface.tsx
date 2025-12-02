'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/lib/store';
import { MessageBubble } from './message-bubble';
import { ChatInput } from './chat-input';
import { extractArtifactsFromContent } from '@/lib/c1/client';
import { Loader2 } from 'lucide-react';
import { AgentEvent } from '@/lib/agent/types';

export function ChatInterface() {
  const {
    currentConversation,
    addMessage,
    updateMessage,
    addArtifact,
    selectArtifact,
    isStreaming,
    setStreaming,
    settings,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    addMessage({
      role: 'user',
      content,
    });

    setStreaming(true);
    setAgentEvents([]);

    try {
      // Create assistant message placeholder
      const assistantMessage = addMessage({
        role: 'assistant',
        content: '',
        provider: settings.provider,
      });

      setStreamingMessageId(assistantMessage.id);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Call agent API with streaming
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...(currentConversation?.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })) || []),
            {
              role: 'user',
              content,
            },
          ],
          provider: settings.provider,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedContent = '';
      let buffered = '';

      const handleAgentEvent = (rawEvent: string) => {
        const cleaned = rawEvent.trim().replace(/^data:\s*/, '');
        if (!cleaned) return;

        try {
          const event: AgentEvent = JSON.parse(cleaned);
          setAgentEvents((prev) => [...prev, event]);

          if (event.type === 'final') {
            accumulatedContent = event.content;
            updateMessage(assistantMessage.id, {
              content: accumulatedContent,
              provider: settings.provider,
            });
          }

          if (event.type === 'observation' && event.artifact) {
            const created = addArtifact(event.artifact);
            selectArtifact(created);
          }

          if (event.type === 'thought' || event.type === 'action') {
            const statusLine = `\n\n_${event.content}_`;
            updateMessage(assistantMessage.id, {
              content: accumulatedContent + statusLine,
            });
          }
        } catch (error) {
          console.error('Failed to parse agent event', error, rawEvent);
        }
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffered += chunk;

        const events = buffered.split('\n\n');
        buffered = events.pop() || '';

        for (const rawEvent of events) {
          handleAgentEvent(rawEvent);
        }
      }

      if (buffered.trim()) {
        handleAgentEvent(buffered);
      }

      if (accumulatedContent) {
        // Extract artifacts from the final content
        const { artifacts } = extractArtifactsFromContent(accumulatedContent);

        // Add artifacts to the conversation
        artifacts.forEach((artifact) => {
          addArtifact(artifact);
        });

        // Update message with artifacts
        if (artifacts.length > 0) {
          updateMessage(assistantMessage.id, {
            artifacts,
          });
        }
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        updateMessage(streamingMessageId || '', {
          content: 'Response cancelled.',
        });
      } else {
        console.error('Error sending message:', error);
        addMessage({
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        });
      }
    } finally {
      setStreaming(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStreaming(false);
    setStreamingMessageId(null);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto">
        {!currentConversation?.messages.length ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-4xl">👋</div>
              <h2 className="mb-2 text-2xl font-semibold">
                Welcome to C1 AI Agent
              </h2>
              <p className="text-muted-foreground">
                Start a conversation to generate code, diagrams, and more
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            {currentConversation.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {agentEvents.length > 0 && (
              <div className="px-4 py-2">
                <div className="rounded-lg border bg-muted/40 p-3 text-sm shadow-sm">
                  <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Agent activity
                  </div>
                  <div className="space-y-2">
                    {agentEvents.map((event, index) => (
                      <div
                        key={`${event.type}-${index}`}
                        className="flex items-start gap-2"
                      >
                        <div className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold uppercase text-primary">
                          {event.type}
                        </div>
                        <div className="space-y-1">
                          {event.title && (
                            <div className="text-xs font-semibold text-foreground">
                              {event.title}
                            </div>
                          )}
                          <div className="text-muted-foreground">{event.content}</div>
                          {event.tool && (
                            <div className="text-[11px] text-muted-foreground">
                              Tool: {event.tool}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isStreaming && (
              <div className="flex gap-3 px-4 py-6">
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">
                    Thinking...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        onCancel={handleCancel}
        disabled={isStreaming}
        isStreaming={isStreaming}
      />
    </div>
  );
}
