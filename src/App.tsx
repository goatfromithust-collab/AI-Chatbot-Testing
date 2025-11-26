import React from 'react';
import { Trash2, Sparkles, PanelRightClose, PanelRight } from 'lucide-react';
import { ModelSelector } from './components/ModelSelector';
import { ChatArea } from './components/ChatArea';
import { ChatInput } from './components/ChatInput';
import { ChatHistory } from './components/ChatHistory';
import { useChat } from './hooks/useChat';
import { availableModels } from './data/models';

/**
 * Root UI component for the AI Assistant application.
 *
 * Manages the selected model and history panel visibility, connects chat state and actions
 * from the `useChat` hook to child components, and renders the main application layout:
 * header (branding and actions), model selector, chat area, chat input, optional history panel,
 * and footer. The chat input is disabled while a message is being sent or when no model is selected;
 * the Clear Chat action is shown when there are messages.
 *
 * @returns The top-level React element for the AI Assistant app containing header, model selector,
 * chat area and input, conditional history panel, and footer.
 */
function App() {
  const [selectedModel, setSelectedModel] = React.useState('gpt-4-turbo');
  const [showHistory, setShowHistory] = React.useState(true);
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    clearChat,
    sessions,
    currentSessionId,
    loadSession,
    deleteSession,
    newChat,
  } = useChat(selectedModel);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-6 h-screen flex flex-col max-w-7xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
              <p className="text-sm text-gray-300">Choose your model and start chatting</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors duration-200"
                aria-label="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
                Clear Chat
              </button>
            )}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200"
              aria-label="Toggle history panel"
            >
              {showHistory ? (
                <>
                  <PanelRightClose className="w-4 h-4" />
                  Hide History
                </>
              ) : (
                <>
                  <PanelRight className="w-4 h-4" />
                  Show History
                </>
              )}
            </button>
          </div>
        </header>

        {/* Model Selection */}
        <div className="mb-6">
          <ModelSelector
            models={availableModels}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Chat Container */}
          <div className={`${showHistory ? 'flex-1' : 'w-full'} bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl flex flex-col overflow-hidden transition-all duration-300`}>
            <ChatArea messages={messages} isLoading={isLoading} />
            {/* Input Area */}
            <div className="p-4 border-t border-white/10">
              <ChatInput
                onSendMessage={sendMessage}
                disabled={isLoading || !selectedModel}
                placeholder={selectedModel ? "Ask me anything..." : "Select a model to start chatting"}
              />
            </div>
          </div>

          {/* History Panel */}
          {showHistory && (
            <div className="w-80 flex-shrink-0 transition-all duration-300">
              <ChatHistory
                sessions={sessions}
                currentSessionId={currentSessionId}
                onLoadSession={loadSession}
                onDeleteSession={deleteSession}
                onNewChat={newChat}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-4 text-center text-sm text-gray-400">
          AI Assistant Client v1.0 - Built with React & TypeScript
        </footer>
      </div>
    </div>
  );
}

export default App;