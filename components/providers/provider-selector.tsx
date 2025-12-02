'use client';

import { useChatStore } from '@/lib/store';
import { LLMProvider } from '@/lib/types';
import { PROVIDER_CONFIGS } from '@/lib/providers/config';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

export function ProviderSelector() {
  const { settings, updateSettings } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProvider = (provider: LLMProvider) => {
    updateSettings({ provider });
    setIsOpen(false);
  };

  const currentProvider = PROVIDER_CONFIGS[settings.provider];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <span className="text-sm font-medium">{currentProvider.name}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg">
          <div className="mb-2 px-2 py-1.5">
            <p className="text-xs font-semibold text-muted-foreground">
              AI Provider
            </p>
          </div>

          {Object.values(PROVIDER_CONFIGS).map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSelectProvider(provider.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                settings.provider === provider.id && 'bg-accent'
              )}
            >
              <span className="font-medium">{provider.name}</span>
              {settings.provider === provider.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}

          <div className="mt-2 border-t border-border pt-2">
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground">
                Primary: OpenAI
                <br />
                Fallbacks: Gemini → Minimax → WaveSpeed → Kimi → Qwen
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
