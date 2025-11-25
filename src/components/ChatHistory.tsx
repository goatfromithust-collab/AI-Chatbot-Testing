import React from 'react';
import { History, Trash2, MessageSquare, Clock } from 'lucide-react';
import { ChatSession } from '../types';

interface ChatHistoryProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  onLoadSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  sessions,
  currentSessionId,
  onLoadSession,
  onDeleteSession,
  onNewChat,
}) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const sessionDate = new Date(date);
    const diffMs = now.getTime() - sessionDate.getTime();
    if (diffMs < 0) return 'Just now'; // Handle future dates gracefully
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return sessionDate.toLocaleDateString();
  };
  return (
    <div className="h-full flex flex-col bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Chat History</h2>
        </div>
        <button
          onClick={onNewChat}
          className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <History className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No chat history yet</p>
            <p className="text-gray-500 text-xs mt-1">Start a conversation to save it here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  currentSessionId === session.id
                    ? 'bg-purple-500/20 border border-purple-400/30'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                }`}
                onClick={() => onLoadSession(session)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white text-sm font-medium truncate mb-1">
                      {session.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(session.updatedAt)}</span>
                      <span>•</span>
                      <span>{session.messages.length} messages</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Model: {session.model}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all duration-200"
                    aria-label="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

