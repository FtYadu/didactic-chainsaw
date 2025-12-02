'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PanelRightOpen, Sparkles, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils/cn';

export function AgentWorkspace() {
  const {
    currentConversation,
    selectedWorkspaceItemId,
    selectWorkspaceItem,
    removeWorkspaceItem,
  } = useChatStore();

  const workspaceItems = currentConversation?.workspaceItems || [];
  const selectedItem = workspaceItems.find((item) => item.id === selectedWorkspaceItemId);
  const firstWorkspaceItemId = workspaceItems[0]?.id;

  useEffect(() => {
    if (!selectedWorkspaceItemId && firstWorkspaceItemId) {
      selectWorkspaceItem(firstWorkspaceItemId);
    }
  }, [firstWorkspaceItemId, selectedWorkspaceItemId, selectWorkspaceItem]);

  if (!currentConversation) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <p>Start chatting to populate the workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <PanelRightOpen className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">Workspace</h2>
            <p className="text-xs text-muted-foreground">
              {workspaceItems.length} item{workspaceItems.length === 1 ? '' : 's'} pinned for this chat
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectWorkspaceItem(null)}
            disabled={!selectedWorkspaceItemId}
          >
            Clear selection
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-3 py-2">
        {workspaceItems.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Use “Open in workspace” to pin artifacts or notes</span>
          </div>
        ) : (
          workspaceItems.map((item) => (
            <button
              key={item.id}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors',
                selectedWorkspaceItemId === item.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-foreground hover:bg-muted'
              )}
              onClick={() => selectWorkspaceItem(item.id)}
            >
              <span className="font-medium">{item.title}</span>
              <span className="text-[10px] uppercase text-muted-foreground">{item.type}</span>
              <button
                className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeWorkspaceItem(item.id);
                }}
                title="Remove from workspace"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </button>
          ))
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!selectedItem ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
            <div className="text-center text-sm text-muted-foreground">
              Select a workspace item to see its preview here.
            </div>
          </div>
        ) : (
          <Card className="h-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">{selectedItem.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedItem.type === 'artifact' ? 'Artifact view' : 'Workspace note'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeWorkspaceItem(selectedItem.id)}
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-full overflow-auto p-4 text-sm">
              {selectedItem.type === 'artifact' ? (
                <ArtifactPreview artifactId={selectedItem.artifactId} />
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{selectedItem.content || 'Empty note'}</ReactMarkdown>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ArtifactPreview({ artifactId }: { artifactId?: string }) {
  const { currentConversation } = useChatStore();

  if (!artifactId) {
    return <p className="text-muted-foreground">Missing artifact reference.</p>;
  }

  const artifact = currentConversation?.artifacts.find((a) => a.id === artifactId);

  if (!artifact) {
    return <p className="text-muted-foreground">Artifact no longer exists in this chat.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-background p-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">{artifact.type}</div>
        <div className="text-sm font-medium">{artifact.title}</div>
        {artifact.language && (
          <div className="text-[11px] text-muted-foreground">{artifact.language}</div>
        )}
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs">
          {artifact.content}
        </pre>
      </div>
    </div>
  );
}
