'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { ChatInterface } from '@/components/chat/chat-interface';
import { ArtifactPanel } from '@/components/artifacts/artifact-panel';
import { ProviderSelector } from '@/components/providers/provider-selector';
import { Button } from '@/components/ui/button';
import {
  PanelRightClose,
  PanelRightOpen,
  Plus,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function Home() {
  const {
    currentConversation,
    conversations,
    createConversation,
    selectConversation,
    sidebarOpen,
    toggleSidebar,
  } = useChatStore();

  useEffect(() => {
    if (!currentConversation && conversations.length === 0) {
      createConversation();
    }
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="glass glass-border flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">C1 AI Agent</h1>
            <p className="text-xs text-muted-foreground">
              Generative UI • Multi-Provider
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ProviderSelector />

          <Button
            variant="outline"
            size="sm"
            onClick={createConversation}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:flex"
          >
            {sidebarOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex flex-1 flex-col">
          <ChatInterface />
        </div>

        {/* Artifact Panel */}
        {sidebarOpen && (
          <div className="w-full md:w-96 lg:w-[500px]">
            <ArtifactPanel />
          </div>
        )}
      </div>

      {/* Conversation History (Optional - Bottom Drawer) */}
      {conversations.length > 1 && (
        <div className="glass glass-border border-t px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
            {conversations.slice(0, 5).map((conv) => (
              <Button
                key={conv.id}
                variant={
                  currentConversation?.id === conv.id ? 'secondary' : 'ghost'
                }
                size="sm"
                onClick={() => selectConversation(conv.id)}
                className="shrink-0"
              >
                <span className="max-w-[150px] truncate">{conv.title}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
