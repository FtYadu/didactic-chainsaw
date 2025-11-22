'use client';

import { useState } from 'react';
import { Artifact } from '@/lib/types';
import { useChatStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  Download,
  Copy,
  Share2,
  Edit3,
  X,
  Check,
  Code2,
  FileText,
  Image,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils/cn';

interface ArtifactViewerProps {
  artifact: Artifact;
}

export function ArtifactViewer({ artifact }: ArtifactViewerProps) {
  const { updateArtifact, selectArtifact } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(artifact.content);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    updateArtifact(artifact.id, editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(artifact.content);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/\s+/g, '-')}.${artifact.language || 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: artifact.title,
          text: artifact.content,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopy();
    }
  };

  const getIcon = () => {
    switch (artifact.type) {
      case 'code':
      case 'react':
        return <Code2 className="h-4 w-4" />;
      case 'markdown':
        return <FileText className="h-4 w-4" />;
      case 'mermaid':
      case 'chart':
        return <Image className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          {getIcon()}
          <div>
            <h3 className="font-semibold">{artifact.title}</h3>
            <p className="text-xs text-muted-foreground">
              v{artifact.version} • {artifact.language || artifact.type}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => selectArtifact(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isEditing ? (
          <div className="flex h-full flex-col gap-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className={cn(
                'flex-1 resize-none rounded-lg border border-input bg-background p-4 font-mono text-sm',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              )}
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                Save Changes
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {artifact.type === 'code' || artifact.type === 'react' ? (
              <SyntaxHighlighter
                language={artifact.language || 'text'}
                style={vscDarkPlus as any}
                customStyle={{
                  margin: 0,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  height: '100%',
                }}
              >
                {artifact.content}
              </SyntaxHighlighter>
            ) : artifact.type === 'markdown' ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{artifact.content}</ReactMarkdown>
              </div>
            ) : artifact.type === 'mermaid' ? (
              <div className="rounded-lg border border-border bg-background p-4">
                <pre className="font-mono text-sm">{artifact.content}</pre>
                <p className="mt-2 text-xs text-muted-foreground">
                  Mermaid diagram - Use mermaid.live to render
                </p>
              </div>
            ) : (
              <pre className="rounded-lg border border-border bg-background p-4 font-mono text-sm">
                {artifact.content}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
