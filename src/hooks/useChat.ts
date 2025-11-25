import { useState, useCallback, useEffect } from 'react';
import { Message, ChatSession } from '../types';
import { AIService } from '../services/aiService';

const STORAGE_KEY = 'ai-chat-sessions';

// Helper functions for localStorage
const loadSessionsFromStorage = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const sessions = JSON.parse(stored);
    // Convert date strings back to Date objects
    return sessions.map((session: any) => ({
      ...session,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      messages: session.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    }));
  } catch (error) {
    console.error('Error loading sessions from storage:', error);
    return [];
  }
};

const saveSessionsToStorage = (sessions: ChatSession[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Consider clearing old sessions.');
      // Optionally: alert user, auto-prune old sessions, or implement alternative storage
    } else {
      console.error('Error saving sessions to storage:', error);
    }
  }
};

export const useChat = (selectedModel: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();

  // Function to load sessions and update state
  const loadSessionsToPanel = useCallback(() => {
    const loadedSessions = loadSessionsFromStorage();
    // Update sessions state
    setSessions(loadedSessions);
  }, []);

  // Load sessions from localStorage on mount
  useEffect(() => {
    loadSessionsToPanel();
  }, [loadSessionsToPanel]);

  // Note: Sessions are saved directly in auto-save useEffect above

  // Auto-save current chat as a session
  useEffect(() => {
    if (messages.length > 0) {
      const now = new Date();
      const title = messages[0]?.content.slice(0, 50) + (messages[0]?.content.length > 50 ? '...' : '');
      
      const sessionId = currentSessionId || `session-${Date.now()}`;
      
      if (!currentSessionId) {
        setCurrentSessionId(sessionId);
      }

      // Create session and save to localStorage
      const existingSessions = loadSessionsFromStorage();
      const existingIndex = existingSessions.findIndex(s => s.id === sessionId);
      
      const updatedSession: ChatSession = {
        id: sessionId,
        title,
        messages,
        model: selectedModel,
        createdAt: existingIndex >= 0 ? existingSessions[existingIndex].createdAt : now,
        updatedAt: now,
      };

      if (existingIndex >= 0) {
        existingSessions[existingIndex] = updatedSession;
      } else {
        existingSessions.unshift(updatedSession);
      }
      
      saveSessionsToStorage(existingSessions);
      
      // Reload sessions to panel after saving
      loadSessionsToPanel();
    }
  }, [messages, selectedModel, currentSessionId, loadSessionsToPanel]);

  const sendMessage = useCallback(async (content: string) => {
    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await AIService.generateResponse(
        [...messages, userMessage],
        selectedModel
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date(),
        model: selectedModel,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error while generating a response. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        model: selectedModel,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, selectedModel]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(undefined);
  }, []);

  const loadSession = useCallback((session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      saveSessionsToStorage(filtered);
      return filtered;
    });
    if (currentSessionId === sessionId) {
      clearChat();
    }
  }, [currentSessionId, clearChat]);

  const newChat = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(undefined);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    sessions,
    currentSessionId,
    loadSession,
    deleteSession,
    newChat,
  };
};