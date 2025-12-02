import { LLMProvider, ProviderConfig } from '@/lib/types';

export const PROVIDER_CONFIGS: Record<LLMProvider, Omit<ProviderConfig, 'apiKey' | 'enabled'>> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    model: 'gpt-4-turbo-preview',
    baseURL: 'https://api.openai.com/v1',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    model: 'gemini-1.5-pro',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
  },
  minimax: {
    id: 'minimax',
    name: 'Minimax',
    model: 'abab6.5-chat',
    baseURL: 'https://api.minimax.chat/v1',
  },
  wavespeed: {
    id: 'wavespeed',
    name: 'WaveSpeed',
    model: 'wavespeed-large',
    baseURL: 'https://api.wavespeed.ai/v1',
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi (Moonshot AI)',
    model: 'moonshot-v1-128k',
    baseURL: 'https://api.moonshot.cn/v1',
  },
  qwen: {
    id: 'qwen',
    name: 'Qwen (Alibaba)',
    model: 'qwen-max',
    baseURL: 'https://dashscope.aliyuncs.com/api/v1',
  },
};

export const PROVIDER_FALLBACK_ORDER: LLMProvider[] = [
  'openai',
  'gemini',
  'minimax',
  'wavespeed',
  'kimi',
  'qwen',
];

export const C1_API_BASE_URL = 'https://api.thesys.dev/v1';

export function getProviderConfig(provider: LLMProvider): ProviderConfig {
  const config = PROVIDER_CONFIGS[provider];
  const apiKey = getProviderApiKey(provider);

  return {
    ...config,
    apiKey,
    enabled: !!apiKey,
  };
}

export function getProviderApiKey(provider: LLMProvider): string | undefined {
  const keyMap: Record<LLMProvider, string> = {
    openai: process.env.OPENAI_API_KEY || '',
    gemini: process.env.GOOGLE_API_KEY || '',
    minimax: process.env.MINIMAX_API_KEY || '',
    wavespeed: process.env.WAVESPEED_API_KEY || '',
    kimi: process.env.KIMI_API_KEY || '',
    qwen: process.env.QWEN_API_KEY || '',
  };

  return keyMap[provider];
}

export function getAvailableProviders(): LLMProvider[] {
  return PROVIDER_FALLBACK_ORDER.filter((provider) => {
    const apiKey = getProviderApiKey(provider);
    return !!apiKey;
  });
}

export function getPrimaryProvider(): LLMProvider {
  const primary = process.env.PRIMARY_PROVIDER as LLMProvider;
  if (primary && PROVIDER_FALLBACK_ORDER.includes(primary)) {
    return primary;
  }
  return 'openai';
}
