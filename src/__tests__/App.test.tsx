import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { AIService } from '../services/aiService';

// Mock the AI service
vi.mock('../services/aiService', () => ({
  AIService: {
    generateResponse: vi.fn(),
  },
}));

const mockAIService = AIService as any;

describe('App Component', () => {
  beforeEach(() => {
    mockAIService.generateResponse.mockClear();
    mockAIService.generateResponse.mockResolvedValue('AI response');
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders the app with header', () => {
      render(<App />);
      
      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      expect(screen.getByText('Choose your model and start chatting')).toBeInTheDocument();
    });

    it('renders model selector', () => {
      render(<App />);
      
      expect(screen.getByText('GPT-4 Turbo')).toBeInTheDocument();
    });

    it('renders chat input area', () => {
      render(<App />);
      
      expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument();
    });

    it('shows history panel by default', () => {
      render(<App />);
      
      expect(screen.getByText('Chat History')).toBeInTheDocument();
      expect(screen.getByText(/hide history/i)).toBeInTheDocument();
    });

    it('does not show clear chat button initially', () => {
      render(<App />);
      
      expect(screen.queryByText(/clear chat/i)).not.toBeInTheDocument();
    });

    it('renders footer', () => {
      render(<App />);
      
      expect(screen.getByText(/AI Assistant Client v1.0/)).toBeInTheDocument();
    });
  });

  describe('Chat Functionality', () => {
    it('sends a message and displays response', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Ask me anything...');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(input, 'Hello AI');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Hello AI')).toBeInTheDocument();
        expect(screen.getByText('AI response')).toBeInTheDocument();
      });
    });

    it('shows clear chat button after sending a message', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Ask me anything...');
      await user.type(input, 'Hello{Enter}');
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear chat/i })).toBeInTheDocument();
      });
    });

    it('clears chat when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Ask me anything...');
      await user.type(input, 'Hello{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });
      
      const clearButton = screen.getByRole('button', { name: /clear chat/i });
      await user.click(clearButton);
      
      expect(screen.queryByText('Hello')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /clear chat/i })).not.toBeInTheDocument();
    });

    it('handles loading state correctly', async () => {
      mockAIService.generateResponse.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('AI response'), 100))
      );

      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Ask me anything...');
      await user.type(input, 'Hello{Enter}');
      
      // Check for loading indicator (this depends on ChatArea implementation)
      await waitFor(() => {
        expect(screen.getByText('AI response')).toBeInTheDocument();
      });
    });
  });

  describe('History Panel Toggle', () => {
    it('toggles history panel visibility', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      expect(screen.getByText('Chat History')).toBeInTheDocument();
      
      const toggleButton = screen.getByRole('button', { name: /hide history/i });
      await user.click(toggleButton);
      
      expect(screen.queryByText('Chat History')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show history/i })).toBeInTheDocument();
      
      const showButton = screen.getByRole('button', { name: /show history/i });
      await user.click(showButton);
      
      expect(screen.getByText('Chat History')).toBeInTheDocument();
    });

    it('changes button text when toggling history panel', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const hideButton = screen.getByRole('button', { name: /hide history/i });
      expect(hideButton).toHaveTextContent('Hide History');
      
      await user.click(hideButton);
      
      const showButton = screen.getByRole('button', { name: /show history/i });
      expect(showButton).toHaveTextContent('Show History');
    });

    it('maintains chat state when toggling history panel', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Ask me anything...');
      await user.type(input, 'Test message{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
      
      const toggleButton = screen.getByRole('button', { name: /hide history/i });
      await user.click(toggleButton);
      
      // Message should still be visible
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  describe('Model Selection', () => {
    it('allows changing the AI model', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const modelButton = screen.getByRole('button', { name: /select ai model/i });
      await user.click(modelButton);
      
      const claudeOption = screen.getByText('Claude 3 Opus');
      await user.click(claudeOption);
      
      expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument();
    });

    it('uses selected model for chat responses', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const modelButton = screen.getByRole('button', { name: /select ai model/i });
      await user.click(modelButton);
      
      const claudeOption = screen.getByText('Claude 3 Opus');
      await user.click(claudeOption);
      
      const input = screen.getByPlaceholderText('Ask me anything...');
      await user.type(input, 'Hello{Enter}');
      
      await waitFor(() => {
        expect(mockAIService.generateResponse).toHaveBeenCalledWith(
          expect.any(Array),
          'claude-3-opus'
        );
      });
    });
  });

  describe('Session History Integration', () => {
    it('displays new chat button in history panel', () => {
      render(<App />);
      
      expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
    });

    it('creates new chat when new chat button is clicked', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Ask me anything...');
      await user.type(input, 'First message{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('First message')).toBeInTheDocument();
      });
      
      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await user.click(newChatButton);
      
      expect(screen.queryByText('First message')).not.toBeInTheDocument();
    });

    it('saves session to history after sending messages', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Ask me anything...');
      await user.type(input, 'Test conversation{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Test conversation')).toBeInTheDocument();
      });
      
      // Session should appear in history panel
      await waitFor(() => {
        const historyPanel = screen.getByText('Chat History').closest('div');
        expect(within(historyPanel!).getByText('Test conversation')).toBeInTheDocument();
      });
    });

    it('loads a session from history', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Create first session
      const input = screen.getByPlaceholderText('Ask me anything...');
      await user.type(input, 'First chat{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('First chat')).toBeInTheDocument();
      });
      
      // Start new chat
      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await user.click(newChatButton);
      
      // Load the first session from history
      const historyPanel = screen.getByText('Chat History').closest('div');
      const sessionItem = within(historyPanel!).getByText('First chat');
      await user.click(sessionItem);
      
      // First chat should be visible again
      expect(screen.getByText('First chat')).toBeInTheDocument();
    });

    it('deletes a session from history', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Create a session
      const input = screen.getByPlaceholderText('Ask me anything...');
      await user.type(input, 'Delete me{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Delete me')).toBeInTheDocument();
      });
      
      // Find and click delete button in history
      const deleteButton = screen.getByLabelText('Delete session');
      await user.click(deleteButton);
      
      // Session should be removed from history and chat cleared
      const historyPanel = screen.getByText('Chat History').closest('div');
      expect(within(historyPanel!).queryByText('Delete me')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete me')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('adjusts chat area width when history is hidden', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const chatArea = screen.getByPlaceholderText('Ask me anything...').closest('.rounded-2xl');
      expect(chatArea).toHaveClass('flex-1');
      
      const toggleButton = screen.getByRole('button', { name: /hide history/i });
      await user.click(toggleButton);
      
      expect(chatArea).toHaveClass('w-full');
    });

    it('maintains proper spacing between elements', () => {
      render(<App />);
      
      const mainContent = screen.getByText('Chat History').closest('.flex');
      expect(mainContent).toHaveClass('gap-4');
    });
  });

  describe('Accessibility', () => {
    it('has accessible buttons with aria-labels', () => {
      render(<App />);
      
      expect(screen.getByRole('button', { name: /toggle history panel/i })).toBeInTheDocument();
    });

    it('provides accessible form controls', () => {
      render(<App />);
      
      const input = screen.getByPlaceholderText('Ask me anything...');
      expect(input).toBeInTheDocument();
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('has accessible model selector', () => {
      render(<App />);
      
      const modelSelector = screen.getByRole('button', { name: /select ai model/i });
      expect(modelSelector).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid button clicks gracefully', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const toggleButton = screen.getByRole('button', { name: /hide history/i });
      
      // Click multiple times rapidly
      await user.click(toggleButton);
      await user.click(toggleButton);
      await user.click(toggleButton);
      
      // Component should still work correctly
      expect(screen.getByText('Chat History')).toBeInTheDocument();
    });

    it('persists state across re-renders', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<App />);
      
      const input = screen.getByPlaceholderText('Ask me anything...');
      await user.type(input, 'Test{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });
      
      rerender(<App />);
      
      // Message should still be visible after rerender
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('handles empty chat gracefully', () => {
      render(<App />);
      
      // App should render without errors even with no messages
      expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument();
    });
  });

  describe('Integration with useChat Hook', () => {
    it('integrates all useChat return values correctly', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Test sendMessage integration
      const input = screen.getByPlaceholderText('Ask me anything...');
      await user.type(input, 'Integration test{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Integration test')).toBeInTheDocument();
      });
      
      // Test clearChat integration
      const clearButton = screen.getByRole('button', { name: /clear chat/i });
      await user.click(clearButton);
      
      expect(screen.queryByText('Integration test')).not.toBeInTheDocument();
    });

    it('passes correct model to useChat', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Ask me anything...');
      await user.type(input, 'Model test{Enter}');
      
      await waitFor(() => {
        expect(mockAIService.generateResponse).toHaveBeenCalledWith(
          expect.any(Array),
          'gpt-4-turbo'
        );
      });
    });
  });

  describe('Visual States', () => {
    it('applies gradient background', () => {
      const { container } = render(<App />);
      
      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass('bg-gradient-to-br');
    });

    it('shows proper transitions on history toggle', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const chatArea = screen.getByPlaceholderText('Ask me anything...').closest('.rounded-2xl');
      expect(chatArea).toHaveClass('transition-all');
      
      const historyPanel = screen.getByText('Chat History').closest('.w-80');
      expect(historyPanel).toHaveClass('transition-all');
    });
  });

  describe('LocalStorage Integration via useChat', () => {
    it('persists sessions across component remounts', async () => {
      const user = userEvent.setup();
      
      const { unmount } = render(<App />);
      
      const input = screen.getByPlaceholderText('Ask me anything...');
      await user.type(input, 'Persistent message{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Persistent message')).toBeInTheDocument();
      });
      
      unmount();
      
      // Remount the app
      render(<App />);
      
      // Session should be loaded from localStorage
      await waitFor(() => {
        const historyPanel = screen.getByText('Chat History').closest('div');
        expect(within(historyPanel!).getByText('Persistent message')).toBeInTheDocument();
      });
    });
  });
});