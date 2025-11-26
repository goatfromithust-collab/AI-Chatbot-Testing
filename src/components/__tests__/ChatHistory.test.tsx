import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ChatHistory } from '../ChatHistory';
import { ChatSession } from '../../types';

describe('ChatHistory', () => {
  const mockSessions: ChatSession[] = [
    {
      id: 'session-1',
      title: 'First conversation about React',
      messages: [
        {
          id: 'msg-1',
          content: 'What is React?',
          role: 'user',
          timestamp: new Date('2024-01-15T10:00:00'),
        },
        {
          id: 'msg-2',
          content: 'React is a JavaScript library...',
          role: 'assistant',
          timestamp: new Date('2024-01-15T10:00:05'),
        },
      ],
      model: 'gpt-4-turbo',
      createdAt: new Date('2024-01-15T10:00:00'),
      updatedAt: new Date('2024-01-15T10:00:05'),
    },
    {
      id: 'session-2',
      title: 'TypeScript best practices',
      messages: [
        {
          id: 'msg-3',
          content: 'Tell me about TypeScript',
          role: 'user',
          timestamp: new Date('2024-01-14T15:30:00'),
        },
      ],
      model: 'claude-3-opus',
      createdAt: new Date('2024-01-14T15:30:00'),
      updatedAt: new Date('2024-01-14T15:30:00'),
    },
  ];

  const mockOnLoadSession = vi.fn();
  const mockOnDeleteSession = vi.fn();
  const mockOnNewChat = vi.fn();

  const defaultProps = {
    sessions: mockSessions,
    currentSessionId: undefined,
    onLoadSession: mockOnLoadSession,
    onDeleteSession: mockOnDeleteSession,
    onNewChat: mockOnNewChat,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with header', () => {
      render(<ChatHistory {...defaultProps} />);
      
      expect(screen.getByText('Chat History')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
    });

    it('renders all sessions correctly', () => {
      render(<ChatHistory {...defaultProps} />);
      
      expect(screen.getByText('First conversation about React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript best practices')).toBeInTheDocument();
    });

    it('displays message count for each session', () => {
      render(<ChatHistory {...defaultProps} />);
      
      expect(screen.getByText('2 messages')).toBeInTheDocument();
      expect(screen.getByText('1 messages')).toBeInTheDocument();
    });

    it('displays model name for each session', () => {
      render(<ChatHistory {...defaultProps} />);
      
      expect(screen.getByText('Model: gpt-4-turbo')).toBeInTheDocument();
      expect(screen.getByText('Model: claude-3-opus')).toBeInTheDocument();
    });

    it('renders empty state when no sessions exist', () => {
      render(<ChatHistory {...defaultProps} sessions={[]} />);
      
      expect(screen.getByText('No chat history yet')).toBeInTheDocument();
      expect(screen.getByText('Start a conversation to save it here')).toBeInTheDocument();
    });

    it('highlights current session', () => {
      render(<ChatHistory {...defaultProps} currentSessionId="session-1" />);
      
      const sessionElement = screen.getByText('First conversation about React').closest('div');
      expect(sessionElement?.parentElement).toHaveClass('bg-purple-500/20');
    });

    it('does not highlight any session when currentSessionId is undefined', () => {
      render(<ChatHistory {...defaultProps} currentSessionId={undefined} />);
      
      const sessions = screen.getAllByText(/messages/);
      sessions.forEach(session => {
        const sessionElement = session.closest('div');
        expect(sessionElement?.parentElement).not.toHaveClass('bg-purple-500/20');
      });
    });
  });

  describe('Date Formatting', () => {
    it('displays "Just now" for very recent sessions', () => {
      const recentSession: ChatSession = {
        ...mockSessions[0],
        id: 'recent',
        updatedAt: new Date(),
      };

      render(<ChatHistory {...defaultProps} sessions={[recentSession]} />);
      
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('displays minutes ago for sessions within the hour', () => {
      const now = new Date();
      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
      
      const recentSession: ChatSession = {
        ...mockSessions[0],
        id: 'recent',
        updatedAt: thirtyMinsAgo,
      };

      render(<ChatHistory {...defaultProps} sessions={[recentSession]} />);
      
      expect(screen.getByText('30m ago')).toBeInTheDocument();
    });

    it('displays hours ago for sessions within the day', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      
      const recentSession: ChatSession = {
        ...mockSessions[0],
        id: 'recent',
        updatedAt: threeHoursAgo,
      };

      render(<ChatHistory {...defaultProps} sessions={[recentSession]} />);
      
      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });

    it('displays "Yesterday" for sessions from previous day', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentSession: ChatSession = {
        ...mockSessions[0],
        id: 'recent',
        updatedAt: yesterday,
      };

      render(<ChatHistory {...defaultProps} sessions={[recentSession]} />);
      
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    it('displays days ago for sessions within a week', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      
      const recentSession: ChatSession = {
        ...mockSessions[0],
        id: 'recent',
        updatedAt: threeDaysAgo,
      };

      render(<ChatHistory {...defaultProps} sessions={[recentSession]} />);
      
      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });

    it('displays full date for sessions older than a week', () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      
      const recentSession: ChatSession = {
        ...mockSessions[0],
        id: 'recent',
        updatedAt: tenDaysAgo,
      };

      render(<ChatHistory {...defaultProps} sessions={[recentSession]} />);
      
      const expectedDate = tenDaysAgo.toLocaleDateString();
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });

    it('handles future dates gracefully', () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 1000 * 60 * 60);
      
      const futureSession: ChatSession = {
        ...mockSessions[0],
        id: 'future',
        updatedAt: futureDate,
      };

      render(<ChatHistory {...defaultProps} sessions={[futureSession]} />);
      
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onNewChat when New Chat button is clicked', () => {
      render(<ChatHistory {...defaultProps} />);
      
      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      fireEvent.click(newChatButton);
      
      expect(mockOnNewChat).toHaveBeenCalledTimes(1);
    });

    it('calls onLoadSession when a session is clicked', () => {
      render(<ChatHistory {...defaultProps} />);
      
      const firstSession = screen.getByText('First conversation about React');
      fireEvent.click(firstSession);
      
      expect(mockOnLoadSession).toHaveBeenCalledTimes(1);
      expect(mockOnLoadSession).toHaveBeenCalledWith(mockSessions[0]);
    });

    it('calls onDeleteSession when delete button is clicked', () => {
      render(<ChatHistory {...defaultProps} />);
      
      const deleteButtons = screen.getAllByLabelText('Delete session');
      fireEvent.click(deleteButtons[0]);
      
      expect(mockOnDeleteSession).toHaveBeenCalledTimes(1);
      expect(mockOnDeleteSession).toHaveBeenCalledWith('session-1');
    });

    it('stops propagation when delete button is clicked', () => {
      render(<ChatHistory {...defaultProps} />);
      
      const deleteButtons = screen.getAllByLabelText('Delete session');
      fireEvent.click(deleteButtons[0]);
      
      // onLoadSession should not be called when delete is clicked
      expect(mockOnLoadSession).not.toHaveBeenCalled();
      expect(mockOnDeleteSession).toHaveBeenCalledTimes(1);
    });

    it('allows multiple sessions to be loaded sequentially', () => {
      render(<ChatHistory {...defaultProps} />);
      
      const firstSession = screen.getByText('First conversation about React');
      const secondSession = screen.getByText('TypeScript best practices');
      
      fireEvent.click(firstSession);
      expect(mockOnLoadSession).toHaveBeenCalledWith(mockSessions[0]);
      
      fireEvent.click(secondSession);
      expect(mockOnLoadSession).toHaveBeenCalledWith(mockSessions[1]);
      expect(mockOnLoadSession).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty session title gracefully', () => {
      const sessionWithEmptyTitle: ChatSession = {
        ...mockSessions[0],
        title: '',
      };

      render(<ChatHistory {...defaultProps} sessions={[sessionWithEmptyTitle]} />);
      
      // Component should still render without crashing
      expect(screen.getByText('2 messages')).toBeInTheDocument();
    });

    it('handles session with no messages', () => {
      const sessionWithNoMessages: ChatSession = {
        ...mockSessions[0],
        messages: [],
      };

      render(<ChatHistory {...defaultProps} sessions={[sessionWithNoMessages]} />);
      
      expect(screen.getByText('0 messages')).toBeInTheDocument();
    });

    it('handles very long session titles with truncation', () => {
      const longTitle = 'A'.repeat(200);
      const sessionWithLongTitle: ChatSession = {
        ...mockSessions[0],
        title: longTitle,
      };

      render(<ChatHistory {...defaultProps} sessions={[sessionWithLongTitle]} />);
      
      const titleElement = screen.getByText(longTitle);
      expect(titleElement).toHaveClass('truncate');
    });

    it('handles large number of sessions', () => {
      const manySessions = Array.from({ length: 50 }, (_, i) => ({
        ...mockSessions[0],
        id: `session-${i}`,
        title: `Session ${i}`,
      }));

      render(<ChatHistory {...defaultProps} sessions={manySessions} />);
      
      // Should render all sessions
      expect(screen.getByText('Session 0')).toBeInTheDocument();
      expect(screen.getByText('Session 49')).toBeInTheDocument();
    });

    it('handles special characters in session titles', () => {
      const specialSession: ChatSession = {
        ...mockSessions[0],
        title: '<script>alert("xss")</script>',
      };

      render(<ChatHistory {...defaultProps} sessions={[specialSession]} />);
      
      // Should render as text, not execute as HTML
      expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible delete buttons', () => {
      render(<ChatHistory {...defaultProps} />);
      
      const deleteButtons = screen.getAllByLabelText('Delete session');
      expect(deleteButtons).toHaveLength(2);
    });

    it('maintains focus management for interactive elements', () => {
      render(<ChatHistory {...defaultProps} />);
      
      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      expect(newChatButton).toBeInTheDocument();
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete session/i });
      deleteButtons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it('provides semantic structure with proper elements', () => {
      const { container } = render(<ChatHistory {...defaultProps} />);
      
      // Check for heading
      expect(screen.getByRole('heading', { name: /chat history/i })).toBeInTheDocument();
      
      // Check for buttons
      expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('applies hover styles to non-current sessions', () => {
      render(<ChatHistory {...defaultProps} currentSessionId="session-1" />);
      
      const secondSessionElement = screen.getByText('TypeScript best practices').closest('div');
      expect(secondSessionElement?.parentElement).toHaveClass('hover:bg-white/10');
    });

    it('shows delete button on hover (via CSS classes)', () => {
      render(<ChatHistory {...defaultProps} />);
      
      const deleteButtons = screen.getAllByLabelText('Delete session');
      deleteButtons.forEach(button => {
        // Check that button has opacity-0 class (hidden until hover)
        expect(button).toHaveClass('opacity-0');
        expect(button).toHaveClass('group-hover:opacity-100');
      });
    });
  });

  describe('Session Ordering', () => {
    it('renders sessions in the order provided', () => {
      render(<ChatHistory {...defaultProps} />);
      
      const titles = screen.getAllByRole('heading', { level: 3 });
      expect(titles[0]).toHaveTextContent('First conversation about React');
      expect(titles[1]).toHaveTextContent('TypeScript best practices');
    });

    it('handles single session correctly', () => {
      render(<ChatHistory {...defaultProps} sessions={[mockSessions[0]]} />);
      
      expect(screen.getByText('First conversation about React')).toBeInTheDocument();
      expect(screen.queryByText('TypeScript best practices')).not.toBeInTheDocument();
    });
  });
});