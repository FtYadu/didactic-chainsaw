import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  Conversation,
  Message,
  Artifact,
  LLMProvider,
  ChatSettings,
  WorkspaceItem,
} from './types';

interface ChatState {
  // Current conversation
  currentConversation: Conversation | null;
  conversations: Conversation[];

  // UI State
  selectedArtifact: Artifact | null;
  selectedWorkspaceItemId: string | null;
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
  addWorkspaceItem: (
    item: Omit<WorkspaceItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => WorkspaceItem | null;
  updateWorkspaceItem: (id: string, updates: Partial<WorkspaceItem>) => void;
  removeWorkspaceItem: (id: string) => void;
  selectWorkspaceItem: (id: string | null) => void;
  openArtifactInWorkspace: (artifact: Artifact) => void;
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
      selectedWorkspaceItemId: null,
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
          workspaceItems: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversation: newConversation,
          selectedWorkspaceItemId: null,
        }));
      },

      selectConversation: (id: string) => {
        const conversation = get().conversations.find((c) => c.id === id);
        if (conversation) {
          set({
            currentConversation: conversation,
            selectedWorkspaceItemId: conversation.workspaceItems?.[0]?.id || null,
          });
        }
      },

      deleteConversation: (id: string) => {
        set((state) => {
          const conversations = state.conversations.filter((c) => c.id !== id);
          const currentConversation =
            state.currentConversation?.id === id ? null : state.currentConversation;
          const selectedWorkspaceItemId =
            state.currentConversation?.id === id ? null : state.selectedWorkspaceItemId;

          return {
            conversations,
            currentConversation,
            selectedWorkspaceItemId,
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
            workspaceItems: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

            return {
              currentConversation: newConversation,
              conversations: [newConversation, ...state.conversations],
              selectedWorkspaceItemId: null,
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

      addWorkspaceItem: (item) => {
        const { currentConversation } = get();
        if (!currentConversation) return null;

        const newItem: WorkspaceItem = {
          ...item,
          id: nanoid(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => {
          const updatedConversation = {
            ...state.currentConversation!,
            workspaceItems: [
              ...(state.currentConversation!.workspaceItems || []),
              newItem,
            ],
            updatedAt: new Date(),
          };

          return {
            currentConversation: updatedConversation,
            conversations: state.conversations.map((c) =>
              c.id === updatedConversation.id ? updatedConversation : c
            ),
            selectedWorkspaceItemId: newItem.id,
          };
        });

        return newItem;
      },

      updateWorkspaceItem: (id, updates) => {
        set((state) => {
          if (!state.currentConversation) return state;

          const updatedConversation = {
            ...state.currentConversation,
            workspaceItems: (state.currentConversation.workspaceItems || []).map(
              (item) =>
                item.id === id
                  ? { ...item, ...updates, updatedAt: new Date() }
                  : item
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

      removeWorkspaceItem: (id) => {
        set((state) => {
          if (!state.currentConversation) return state;

          const updatedConversation = {
            ...state.currentConversation,
            workspaceItems: (state.currentConversation.workspaceItems || []).filter(
              (item) => item.id !== id
            ),
            updatedAt: new Date(),
          };

          const selectedWorkspaceItemId =
            state.selectedWorkspaceItemId === id
              ? updatedConversation.workspaceItems[0]?.id || null
              : state.selectedWorkspaceItemId;

          return {
            currentConversation: updatedConversation,
            conversations: state.conversations.map((c) =>
              c.id === updatedConversation.id ? updatedConversation : c
            ),
            selectedWorkspaceItemId,
          };
        });
      },

      selectWorkspaceItem: (id) => {
        set({ selectedWorkspaceItemId: id });
      },

      openArtifactInWorkspace: (artifact) => {
        const { currentConversation } = get();
        if (!currentConversation) return;

        const workspaceItems = currentConversation.workspaceItems || [];

        const existingItem = workspaceItems.find(
          (item) => item.type === 'artifact' && item.artifactId === artifact.id
        );

        if (existingItem) {
          set({ selectedWorkspaceItemId: existingItem.id });
          return;
        }

        get().addWorkspaceItem({
          title: artifact.title,
          type: 'artifact',
          artifactId: artifact.id,
        });
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
            workspaceItems: [],
            updatedAt: new Date(),
          };

          return {
            currentConversation: updatedConversation,
            conversations: state.conversations.map((c) =>
              c.id === updatedConversation.id ? updatedConversation : c
            ),
            selectedArtifact: null,
            selectedWorkspaceItemId: null,
          };
        });
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state: any) => ({
        conversations: state.conversations,
        settings: state.settings,
        selectedWorkspaceItemId: state.selectedWorkspaceItemId,
      }),
    } as any
  )
);
