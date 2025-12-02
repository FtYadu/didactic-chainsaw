'use client';

import { Message } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { PanelRightOpen } from 'lucide-react';
import { useChatStore } from '@/lib/store';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { addWorkspaceItem } = useChatStore();
  const isUser = message.role === 'user';

  const handleOpenInWorkspace = () => {
    if (!message.content) return;

    addWorkspaceItem({
      title: `${isUser ? 'User' : 'Assistant'} note`,
      type: 'note',
      content: message.content,
    });
  };

  return (
    <div
      className={cn(
        'flex w-full gap-3 px-4 py-6',
        isUser ? 'bg-transparent' : 'bg-muted/30'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full',
          isUser
            ? 'bg-gradient-to-br from-purple-500 to-pink-500'
            : 'bg-gradient-to-br from-blue-500 to-cyan-500'
        )}
      >
        <span className="text-xs font-semibold text-white">
          {isUser ? 'U' : 'AI'}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              code(props: any) {
                const { node, inline, className, children, ...rest } = props;
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';

                if (!inline && language) {
                  return (
                    <div className="relative">
                      <div className="absolute right-2 top-2 rounded bg-gray-700 px-2 py-1 text-xs text-gray-300">
                        {language}
                      </div>
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={language}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                        }}
                        {...rest}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  );
                }

                return (
                  <code
                    className={cn(
                      'rounded bg-muted px-1 py-0.5 font-mono text-sm',
                      className
                    )}
                    {...rest}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {message.provider && <span>via {message.provider}</span>}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleOpenInWorkspace}
          >
            <PanelRightOpen className="h-3 w-3" />
            Open in workspace
          </Button>
        </div>
      </div>
    </div>
  );
}
