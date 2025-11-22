'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/lib/store';
import { MessageBubble } from './message-bubble';
import { ChatInput } from './chat-input';
import { extractArtifactsFromContent } from '@/lib/c1/client';
import { Loader2 } from 'lucide-react';

export function ChatInterface() {
  const {
    currentConversation,
    addMessage,
    updateMessage,
    addArtifact,
    isStreaming,
    setStreaming,
    settings,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );

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

    try {
      // Create assistant message placeholder
      const assistantMessage = addMessage({
        role: 'assistant',
        content: '',
        provider: settings.provider,
      });

      setStreamingMessageId(assistantMessage.id);

      // Call chat API with streaming
      const response = await fetch('/api/chat', {
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

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('0:')) {
            // Extract the actual content
            const content = line.slice(2).replace(/^"(.*)"$/, '$1');
            if (content) {
              accumulatedContent += content;
              updateMessage(assistantMessage.id, {
                content: accumulatedContent,
              });
            }
          }
        }
      }

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
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      });
    } finally {
      setStreaming(false);
      setStreamingMessageId(null);
    }
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
      <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
    </div>
  );
}
