import { AnalyticsEvent, LLMProvider, ArtifactType, UsageStats } from './types';
import { nanoid } from 'nanoid';

// Token pricing per 1K tokens (input/output average)
const PROVIDER_PRICING: Record<LLMProvider, number> = {
  openai: 0.01, // GPT-4 Turbo average
  gemini: 0.0005, // Gemini Pro
  kimi: 0.002, // Moonshot K2
  qwen: 0.001, // Qwen Max
};

class AnalyticsTracker {
  private events: AnalyticsEvent[] = [];
  private readonly MAX_EVENTS = 1000;

  trackMessage(
    provider: LLMProvider,
    tokens: number,
    responseTime: number
  ): void {
    const cost = (tokens / 1000) * PROVIDER_PRICING[provider];

    this.addEvent({
      id: nanoid(),
      type: 'message',
      provider,
      tokens,
      cost,
      responseTime,
      timestamp: new Date(),
    });
  }

  trackArtifact(artifactType: ArtifactType): void {
    this.addEvent({
      id: nanoid(),
      type: 'artifact',
      artifactType,
      timestamp: new Date(),
    });
  }

  trackExport(format: string, artifactType?: ArtifactType): void {
    this.addEvent({
      id: nanoid(),
      type: 'export',
      artifactType,
      timestamp: new Date(),
    });
  }

  trackError(provider?: LLMProvider): void {
    this.addEvent({
      id: nanoid(),
      type: 'error',
      provider,
      timestamp: new Date(),
    });
  }

  private addEvent(event: AnalyticsEvent): void {
    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Persist to localStorage if available
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('analytics_events', JSON.stringify(this.events));
      } catch (error) {
        console.error('Failed to persist analytics:', error);
      }
    }
  }

  getStats(timeRange: 'hour' | 'day' | 'week' | 'all' = 'all'): UsageStats {
    const now = new Date();
    const cutoff = this.getCutoffTime(now, timeRange);

    const relevantEvents = this.events.filter(
      (e) => new Date(e.timestamp) >= cutoff
    );

    const messageEvents = relevantEvents.filter((e) => e.type === 'message');

    const totalTokens = messageEvents.reduce(
      (sum, e) => sum + (e.tokens || 0),
      0
    );
    const totalCost = messageEvents.reduce((sum, e) => sum + (e.cost || 0), 0);
    const totalResponseTime = messageEvents.reduce(
      (sum, e) => sum + (e.responseTime || 0),
      0
    );

    const byProvider: Record<LLMProvider, any> = {
      openai: { messages: 0, tokens: 0, cost: 0 },
      gemini: { messages: 0, tokens: 0, cost: 0 },
      kimi: { messages: 0, tokens: 0, cost: 0 },
      qwen: { messages: 0, tokens: 0, cost: 0 },
    };

    const byArtifactType: Record<ArtifactType, number> = {
      code: 0,
      markdown: 0,
      mermaid: 0,
      react: 0,
      chart: 0,
      html: 0,
      image: 0,
      sql: 0,
      'data-viz': 0,
    };

    messageEvents.forEach((event) => {
      if (event.provider) {
        byProvider[event.provider].messages++;
        byProvider[event.provider].tokens += event.tokens || 0;
        byProvider[event.provider].cost += event.cost || 0;
      }
    });

    relevantEvents
      .filter((e) => e.type === 'artifact' && e.artifactType)
      .forEach((event) => {
        if (event.artifactType) {
          byArtifactType[event.artifactType]++;
        }
      });

    return {
      totalMessages: messageEvents.length,
      totalTokens,
      totalCost,
      byProvider,
      byArtifactType,
      averageResponseTime:
        messageEvents.length > 0 ? totalResponseTime / messageEvents.length : 0,
    };
  }

  private getCutoffTime(now: Date, range: 'hour' | 'day' | 'week' | 'all'): Date {
    switch (range) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'all':
      default:
        return new Date(0);
    }
  }

  loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('analytics_events');
        if (stored) {
          this.events = JSON.parse(stored);
        }
      } catch (error) {
        console.error('Failed to load analytics:', error);
      }
    }
  }

  clearStats(): void {
    this.events = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('analytics_events');
    }
  }

  estimateCost(provider: LLMProvider, estimatedTokens: number): number {
    return (estimatedTokens / 1000) * PROVIDER_PRICING[provider];
  }
}

export const analytics = new AnalyticsTracker();
