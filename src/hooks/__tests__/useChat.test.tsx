import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../useChat';
import { AIService } from '../../services/aiService';

// Mock the AI service
vi.mock('../../services/aiService', () => ({
  AIService: {
    generateResponse: vi.fn(),
  },
}));

const mockAIService = AIService as any;

describe('useChat', () => {
  beforeEach(() => {
    mockAIService.generateResponse.mockClear();
    // Mock window.alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with empty messages', () => {
    const { result } = renderHook(() => useChat('gpt-4-turbo'));

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('sends message and receives response', async () => {
    mockAIService.generateResponse.mockResolvedValue('AI response');

    const { result } = renderHook(() => useChat('gpt-4-turbo'));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].content).toBe('Hello');
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[1].content).toBe('AI response');
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('shows loading state while generating response', async () => {
    mockAIService.generateResponse.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('AI response'), 100))
    );

    const { result } = renderHook(() => useChat('gpt-4-turbo'));

    act(() => {
      result.current.sendMessage('Hello');
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles errors gracefully', async () => {
    mockAIService.generateResponse.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useChat('gpt-4-turbo'));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].content).toContain('Sorry, I encountered an error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('alerts when no model is selected', async () => {
    const { result } = renderHook(() => useChat(''));

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(window.alert).toHaveBeenCalledWith('Please select a model first');
    expect(result.current.messages).toHaveLength(0);
  });

  it('clears chat messages', () => {
    const { result } = renderHook(() => useChat('gpt-4-turbo'));

    act(() => {
      result.current.sendMessage('Hello');
    });

    act(() => {
      result.current.clearChat();
    });

    expect(result.current.messages).toEqual([]);
  });
});
  describe('Session Management', () => {
    beforeEach(() => {
      localStorage.clear();
      mockAIService.generateResponse.mockClear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('initializes with empty sessions array', () => {
      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      expect(result.current.sessions).toEqual([]);
      expect(result.current.currentSessionId).toBeUndefined();
    });

    it('auto-saves session when messages are sent', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1);
        expect(result.current.sessions[0].messages).toHaveLength(2);
        expect(result.current.sessions[0].model).toBe('gpt-4-turbo');
        expect(result.current.currentSessionId).toBeDefined();
      });
    });

    it('generates session title from first message', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('What is React?');
      });

      await waitFor(() => {
        expect(result.current.sessions[0].title).toBe('What is React?');
      });
    });

    it('truncates long titles with ellipsis', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      const longMessage = 'A'.repeat(100);

      await act(async () => {
        await result.current.sendMessage(longMessage);
      });

      await waitFor(() => {
        expect(result.current.sessions[0].title).toBe(longMessage.slice(0, 50) + '...');
      });
    });

    it('updates existing session when messages are added', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('First message');
      });

      const firstSessionId = result.current.currentSessionId;

      await act(async () => {
        await result.current.sendMessage('Second message');
      });

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1);
        expect(result.current.sessions[0].messages).toHaveLength(4);
        expect(result.current.currentSessionId).toBe(firstSessionId);
      });
    });

    it('loads a session correctly', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      // Create first session
      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      const savedSession = result.current.sessions[0];

      // Clear chat to simulate new session
      act(() => {
        result.current.clearChat();
      });

      // Load the saved session
      act(() => {
        result.current.loadSession(savedSession);
      });

      expect(result.current.messages).toEqual(savedSession.messages);
      expect(result.current.currentSessionId).toBe(savedSession.id);
    });

    it('deletes a session correctly', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      const sessionId = result.current.sessions[0].id;

      act(() => {
        result.current.deleteSession(sessionId);
      });

      expect(result.current.sessions).toHaveLength(0);
      expect(result.current.messages).toEqual([]);
      expect(result.current.currentSessionId).toBeUndefined();
    });

    it('clears current chat when deleting active session', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      const activeSessionId = result.current.currentSessionId;

      act(() => {
        result.current.deleteSession(activeSessionId!);
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.currentSessionId).toBeUndefined();
    });

    it('does not clear chat when deleting inactive session', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      // Create two sessions by simulating session storage
      await act(async () => {
        await result.current.sendMessage('First chat');
      });

      const firstSession = result.current.sessions[0];

      act(() => {
        result.current.newChat();
      });

      await act(async () => {
        await result.current.sendMessage('Second chat');
      });

      const currentMessages = [...result.current.messages];
      const currentSessionId = result.current.currentSessionId;

      // Delete the first (inactive) session
      act(() => {
        result.current.deleteSession(firstSession.id);
      });

      expect(result.current.messages).toEqual(currentMessages);
      expect(result.current.currentSessionId).toBe(currentSessionId);
      expect(result.current.sessions).toHaveLength(1);
    });

    it('creates new chat session', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.messages).toHaveLength(2);

      act(() => {
        result.current.newChat();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.currentSessionId).toBeUndefined();
    });

    it('clears currentSessionId when clearChat is called', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.currentSessionId).toBeDefined();

      act(() => {
        result.current.clearChat();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.currentSessionId).toBeUndefined();
    });
  });

  describe('LocalStorage Integration', () => {
    beforeEach(() => {
      localStorage.clear();
      mockAIService.generateResponse.mockClear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('persists sessions to localStorage', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        const stored = localStorage.getItem('ai-chat-sessions');
        expect(stored).not.toBeNull();
        const sessions = JSON.parse(stored!);
        expect(sessions).toHaveLength(1);
      });
    });

    it('loads sessions from localStorage on mount', async () => {
      // Pre-populate localStorage
      const mockSession = {
        id: 'test-session',
        title: 'Test Session',
        messages: [
          {
            id: '1',
            content: 'Hello',
            role: 'user',
            timestamp: new Date().toISOString(),
          },
        ],
        model: 'gpt-4-turbo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem('ai-chat-sessions', JSON.stringify([mockSession]));

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1);
        expect(result.current.sessions[0].id).toBe('test-session');
        expect(result.current.sessions[0].title).toBe('Test Session');
      });
    });

    it('handles corrupted localStorage data gracefully', () => {
      localStorage.setItem('ai-chat-sessions', 'invalid json');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      expect(result.current.sessions).toEqual([]);
    });

    it('handles missing localStorage data', () => {
      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      expect(result.current.sessions).toEqual([]);
    });

    it('converts date strings to Date objects when loading', () => {
      const mockSession = {
        id: 'test-session',
        title: 'Test Session',
        messages: [
          {
            id: '1',
            content: 'Hello',
            role: 'user',
            timestamp: '2024-01-15T10:00:00.000Z',
          },
        ],
        model: 'gpt-4-turbo',
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z',
      };

      localStorage.setItem('ai-chat-sessions', JSON.stringify([mockSession]));

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      waitFor(() => {
        expect(result.current.sessions[0].createdAt).toBeInstanceOf(Date);
        expect(result.current.sessions[0].updatedAt).toBeInstanceOf(Date);
        expect(result.current.sessions[0].messages[0].timestamp).toBeInstanceOf(Date);
      });
    });

    it('handles localStorage quota exceeded error', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      // Mock localStorage.setItem to throw quota exceeded error
      const originalSetItem = Storage.prototype.setItem;
      const quotaError = new DOMException('QuotaExceededError', 'QuotaExceededError');
      Storage.prototype.setItem = vi.fn(() => {
        throw quotaError;
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('localStorage quota exceeded')
        );
      });

      // Restore original implementation
      Storage.prototype.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });

    it('handles other localStorage errors gracefully', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      // Mock localStorage.setItem to throw generic error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Storage error');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error saving sessions to storage:',
          expect.any(Error)
        );
      });

      // Restore original implementation
      Storage.prototype.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Session Ordering and Updates', () => {
    beforeEach(() => {
      localStorage.clear();
      mockAIService.generateResponse.mockClear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('places new sessions at the beginning of the array', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('First chat');
      });

      act(() => {
        result.current.newChat();
      });

      await act(async () => {
        await result.current.sendMessage('Second chat');
      });

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(2);
        expect(result.current.sessions[0].title).toBe('Second chat');
        expect(result.current.sessions[1].title).toBe('First chat');
      });
    });

    it('updates session updatedAt timestamp when messages are added', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('First message');
      });

      const firstUpdatedAt = result.current.sessions[0].updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await act(async () => {
        await result.current.sendMessage('Second message');
      });

      await waitFor(() => {
        const secondUpdatedAt = result.current.sessions[0].updatedAt;
        expect(secondUpdatedAt.getTime()).toBeGreaterThan(firstUpdatedAt.getTime());
      });
    });

    it('preserves session createdAt when updating', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('First message');
      });

      const originalCreatedAt = result.current.sessions[0].createdAt;

      await act(async () => {
        await result.current.sendMessage('Second message');
      });

      await waitFor(() => {
        expect(result.current.sessions[0].createdAt).toEqual(originalCreatedAt);
      });
    });
  });

  describe('Model Changes', () => {
    beforeEach(() => {
      localStorage.clear();
      mockAIService.generateResponse.mockClear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('updates session model when sending messages with different model', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result, rerender } = renderHook(
        ({ model }) => useChat(model),
        { initialProps: { model: 'gpt-4-turbo' } }
      );

      await act(async () => {
        await result.current.sendMessage('Hello with GPT-4');
      });

      expect(result.current.sessions[0].model).toBe('gpt-4-turbo');

      // Change model
      rerender({ model: 'claude-3-opus' });

      await act(async () => {
        await result.current.sendMessage('Hello with Claude');
      });

      await waitFor(() => {
        expect(result.current.sessions[0].model).toBe('claude-3-opus');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      localStorage.clear();
      mockAIService.generateResponse.mockClear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('handles empty message content gracefully', async () => {
      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('');
      });

      // Empty messages should still be processed
      expect(result.current.messages).toHaveLength(0);
    });

    it('handles special characters in messages', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      const specialMessage = '<script>alert("xss")</script>';

      await act(async () => {
        await result.current.sendMessage(specialMessage);
      });

      await waitFor(() => {
        expect(result.current.messages[0].content).toBe(specialMessage);
        expect(result.current.sessions[0].title).toBe(specialMessage);
      });
    });

    it('handles very long messages', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      const longMessage = 'A'.repeat(10000);

      await act(async () => {
        await result.current.sendMessage(longMessage);
      });

      await waitFor(() => {
        expect(result.current.messages[0].content).toBe(longMessage);
      });
    });

    it('handles rapid successive messages', async () => {
      mockAIService.generateResponse.mockResolvedValue('AI response');

      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      await act(async () => {
        await result.current.sendMessage('Message 1');
        await result.current.sendMessage('Message 2');
        await result.current.sendMessage('Message 3');
      });

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Hook Return Values', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useChat('gpt-4-turbo'));

      expect(result.current).toHaveProperty('messages');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('sendMessage');
      expect(result.current).toHaveProperty('clearChat');
      expect(result.current).toHaveProperty('sessions');
      expect(result.current).toHaveProperty('currentSessionId');
      expect(result.current).toHaveProperty('loadSession');
      expect(result.current).toHaveProperty('deleteSession');
      expect(result.current).toHaveProperty('newChat');
    });

    it('provides stable function references', () => {
      const { result, rerender } = renderHook(() => useChat('gpt-4-turbo'));

      const firstSendMessage = result.current.sendMessage;
      const firstClearChat = result.current.clearChat;
      const firstLoadSession = result.current.loadSession;
      const firstDeleteSession = result.current.deleteSession;
      const firstNewChat = result.current.newChat;

      rerender();

      expect(result.current.sendMessage).toBe(firstSendMessage);
      expect(result.current.clearChat).toBe(firstClearChat);
      expect(result.current.loadSession).toBe(firstLoadSession);
      expect(result.current.deleteSession).toBe(firstDeleteSession);
      expect(result.current.newChat).toBe(firstNewChat);
    });
  });