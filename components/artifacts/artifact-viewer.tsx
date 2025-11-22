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
  FileJson,
  Github,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils/cn';
import {
  exportToPDF,
  exportToCodeSandbox,
  exportToGist,
  downloadArtifact,
} from '@/lib/utils/export';
import { analytics } from '@/lib/analytics';

interface ArtifactViewerProps {
  artifact: Artifact;
}

export function ArtifactViewer({ artifact }: ArtifactViewerProps) {
  const { updateArtifact, selectArtifact } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(artifact.content);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

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
    analytics.trackExport('copy', artifact.type);
  };

  const handleDownload = () => {
    downloadArtifact(artifact);
    analytics.trackExport('download', artifact.type);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const blob = await exportToPDF(artifact, {
        format: 'pdf',
        includeMetadata: true,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${artifact.title.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      analytics.trackExport('pdf', artifact.type);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF');
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleExportCodeSandbox = async () => {
    setExporting(true);
    try {
      const url = await exportToCodeSandbox(artifact);
      window.open(url, '_blank');
      analytics.trackExport('sandbox', artifact.type);
    } catch (error) {
      console.error('CodeSandbox export failed:', error);
      alert('Failed to export to CodeSandbox');
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleExportGist = async () => {
    const githubToken = prompt(
      'Enter your GitHub Personal Access Token (needs gist scope):'
    );
    if (!githubToken) return;

    setExporting(true);
    try {
      const url = await exportToGist(artifact, githubToken);
      window.open(url, '_blank');
      analytics.trackExport('gist', artifact.type);
    } catch (error) {
      console.error('Gist export failed:', error);
      alert('Failed to create GitHub Gist. Check your token and permissions.');
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: artifact.title,
          text: artifact.content,
        });
        analytics.trackExport('share', artifact.type);
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
                title="Edit"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                title="Copy"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting}
                  title="Export options"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
                    <button
                      onClick={handleDownload}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <FileText className="h-4 w-4" />
                      Download File
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <FileJson className="h-4 w-4" />
                      Export as PDF
                    </button>
                    {(artifact.type === 'code' || artifact.type === 'react') && (
                      <button
                        onClick={handleExportCodeSandbox}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open in CodeSandbox
                      </button>
                    )}
                    <button
                      onClick={handleExportGist}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Github className="h-4 w-4" />
                      Publish to Gist
                    </button>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => selectArtifact(null)}
            title="Close"
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
