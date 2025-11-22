import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  Conversation,
  Message,
  Artifact,
  LLMProvider,
  ChatSettings,
} from './types';

interface ChatState {
  // Current conversation
  currentConversation: Conversation | null;
  conversations: Conversation[];

  // UI State
  selectedArtifact: Artifact | null;
  isStreaming: boolean;
  sidebarOpen: boolean;

  // Settings
  settings: ChatSettings;

  // Actions
  createConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Message;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  addArtifact: (artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => Artifact;
  updateArtifact: (id: string, content: string) => void;
  selectArtifact: (artifact: Artifact | null) => void;
  setStreaming: (streaming: boolean) => void;
  toggleSidebar: () => void;
  updateSettings: (settings: Partial<ChatSettings>) => void;
  clearConversation: () => void;
}

export const useChatStore = create<ChatState>()(
  persist<ChatState>(
    (set, get) => ({
      currentConversation: null,
      conversations: [],
      selectedArtifact: null,
      isStreaming: false,
      sidebarOpen: true,
      settings: {
        provider: 'openai',
        temperature: 0.7,
        maxTokens: 4096,
        enableStreaming: true,
      },

      createConversation: () => {
        const newConversation: Conversation = {
          id: nanoid(),
          title: 'New Conversation',
          messages: [],
          artifacts: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversation: newConversation,
        }));
      },

      selectConversation: (id: string) => {
        const conversation = get().conversations.find((c) => c.id === id);
        if (conversation) {
          set({ currentConversation: conversation });
        }
      },

      deleteConversation: (id: string) => {
        set((state) => {
          const conversations = state.conversations.filter((c) => c.id !== id);
          const currentConversation =
            state.currentConversation?.id === id ? null : state.currentConversation;

          return {
            conversations,
            currentConversation,
          };
        });
      },

      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: nanoid(),
          timestamp: new Date(),
        };

        set((state) => {
          if (!state.currentConversation) {
            const newConversation: Conversation = {
              id: nanoid(),
              title: message.content.slice(0, 50),
              messages: [newMessage],
              artifacts: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            return {
              currentConversation: newConversation,
              conversations: [newConversation, ...state.conversations],
            };
          }

          const updatedConversation = {
            ...state.currentConversation,
            messages: [...state.currentConversation.messages, newMessage],
            updatedAt: new Date(),
          };

          return {
            currentConversation: updatedConversation,
            conversations: state.conversations.map((c) =>
              c.id === updatedConversation.id ? updatedConversation : c
            ),
          };
        });

        return newMessage;
      },

      updateMessage: (id: string, updates: Partial<Message>) => {
        set((state) => {
          if (!state.currentConversation) return state;

          const updatedConversation = {
            ...state.currentConversation,
            messages: state.currentConversation.messages.map((m) =>
              m.id === id ? { ...m, ...updates } : m
            ),
            updatedAt: new Date(),
          };

          return {
            currentConversation: updatedConversation,
            conversations: state.conversations.map((c) =>
              c.id === updatedConversation.id ? updatedConversation : c
            ),
          };
        });
      },

      addArtifact: (artifact) => {
        const newArtifact: Artifact = {
          ...artifact,
          id: nanoid(),
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => {
          if (!state.currentConversation) return state;

          const updatedConversation = {
            ...state.currentConversation,
            artifacts: [...state.currentConversation.artifacts, newArtifact],
            updatedAt: new Date(),
          };

          return {
            currentConversation: updatedConversation,
            conversations: state.conversations.map((c) =>
              c.id === updatedConversation.id ? updatedConversation : c
            ),
            selectedArtifact: newArtifact,
          };
        });

        return newArtifact;
      },

      updateArtifact: (id: string, content: string) => {
        set((state) => {
          if (!state.currentConversation) return state;

          const updatedConversation = {
            ...state.currentConversation,
            artifacts: state.currentConversation.artifacts.map((a) =>
              a.id === id
                ? {
                    ...a,
                    content,
                    version: a.version + 1,
                    updatedAt: new Date(),
                  }
                : a
            ),
            updatedAt: new Date(),
          };

          const updatedArtifact = updatedConversation.artifacts.find((a) => a.id === id);

          return {
            currentConversation: updatedConversation,
            conversations: state.conversations.map((c) =>
              c.id === updatedConversation.id ? updatedConversation : c
            ),
            selectedArtifact: updatedArtifact || state.selectedArtifact,
          };
        });
      },

      selectArtifact: (artifact) => {
        set({ selectedArtifact: artifact });
      },

      setStreaming: (streaming: boolean) => {
        set({ isStreaming: streaming });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      updateSettings: (settings: Partial<ChatSettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },

      clearConversation: () => {
        set((state) => {
          if (!state.currentConversation) return state;

          const updatedConversation = {
            ...state.currentConversation,
            messages: [],
            artifacts: [],
            updatedAt: new Date(),
          };

          return {
            currentConversation: updatedConversation,
            conversations: state.conversations.map((c) =>
              c.id === updatedConversation.id ? updatedConversation : c
            ),
            selectedArtifact: null,
          };
        });
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state: any) => ({
        conversations: state.conversations,
        settings: state.settings,
      }),
    } as any
  )
);
