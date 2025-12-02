'use client';

import { useChatStore } from '@/lib/store';
import { ArtifactViewer } from './artifact-viewer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code2, FileText, Image as ImageIcon, PanelRightOpen } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Artifact, ArtifactType } from '@/lib/types';

export function ArtifactPanel() {
  const store = useChatStore();
  const currentConversation = store.currentConversation;
  const selectedArtifact = store.selectedArtifact as Artifact | null;
  const selectArtifact = store.selectArtifact;
  const openArtifactInWorkspace = store.openArtifactInWorkspace;

  const getIcon = (type: ArtifactType) => {
    switch (type) {
      case 'code':
      case 'react':
        return <Code2 className="h-4 w-4" />;
      case 'markdown':
        return <FileText className="h-4 w-4" />;
      case 'mermaid':
      case 'chart':
        return <ImageIcon className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (!currentConversation) {
    return (
      <div className="flex h-full items-center justify-center border-l border-border bg-muted/20 p-8">
        <div className="text-center text-muted-foreground">
          <p>Artifacts will appear here</p>
        </div>
      </div>
    );
  }

  if (selectedArtifact) {
    return (
      <div className="h-full border-l border-border bg-background">
        <ArtifactViewer artifact={selectedArtifact} />
      </div>
    );
  }

  const artifacts: Artifact[] = (currentConversation.artifacts || []) as Artifact[];

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      <div className="border-b border-border p-4">
        <h2 className="font-semibold">Artifacts</h2>
        <p className="text-xs text-muted-foreground">
          {artifacts.length} item{artifacts.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {artifacts.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No artifacts yet</p>
              <p className="mt-1 text-xs">
                Ask AI to generate code or diagrams
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {(artifacts as any[]).map((artifact: any, index: number) => {
              const selectedId = selectedArtifact ? (selectedArtifact as any).id : null;
              const isSelected = selectedId === artifact.id;

              return (
                <Card
                  key={artifact.id || `artifact-${index}`}
                  className={cn(
                    'cursor-pointer p-3 transition-colors hover:bg-accent',
                    isSelected && 'ring-1 ring-primary'
                  )}
                  onClick={() => selectArtifact(artifact as Artifact)}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">{getIcon(artifact.type)}</div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="truncate text-sm font-medium">
                        {artifact.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {artifact.language || artifact.type} • v{artifact.version}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2"
                      title="Open in workspace"
                      onClick={(e) => {
                        e.stopPropagation();
                        openArtifactInWorkspace(artifact as Artifact);
                      }}
                    >
                      <PanelRightOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
