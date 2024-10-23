import React, { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Add these new states
  const [stats, setStats] = useState({
    temperature: 0,
    topK: 0,
    tokensSoFar: 0,
    tokensLeft: 0,
    maxTokens: 0,
  });
  const [rawResponse, setRawResponse] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (!window.ai || !window.ai.languageModel) {
      setError(
        `Your browser doesn't support the Prompt API. If you're on Chrome, join the Early Preview Program to enable it.`
      );
      return;
    }
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      const { defaultTemperature, defaultTopK } =
        await window.ai.languageModel.capabilities();
      const newSession = await window.ai.languageModel.create({
        temperature: defaultTemperature,
        topK: defaultTopK,
      });
      setSession(newSession);

      // Add welcome message
      setMessages([
        {
          type: "assistant",
          content: "Hello! I'm Gemini Nano. How can I help you today?",
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setError("Failed to initialize: " + err.message);
    }
  };

  // Add this function to update stats
  const updateStats = (currentSession) => {
    if (currentSession) {
      const { maxTokens, temperature, tokensLeft, tokensSoFar, topK } =
        currentSession;
      setStats({ maxTokens, temperature, tokensLeft, tokensSoFar, topK });
    }
  };
  const updateTemperature = async (newTemperature) => {
    if (session) {
      try {
        const newSession = await window.ai.languageModel.create({
          temperature: newTemperature,
          topK: stats.topK,
        });
        setSession(newSession);
        updateStats(newSession);
      } catch (err) {
        setError("Failed to update temperature: " + err.message);
      }
    }
  };

  const updateTopK = async (newTopK) => {
    if (session) {
      try {
        const newSession = await window.ai.languageModel.create({
          temperature: stats.temperature,
          topK: newTopK,
        });
        setSession(newSession);
        updateStats(newSession);
      } catch (err) {
        setError("Failed to update topK: " + err.message);
      }
    }
  };
  // Modify handleSubmit to include raw response
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !session || isLoading) return;

    const userMessage = {
      type: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const assistantMessage = {
      type: "assistant",
      content: "...",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const stream = await session.promptStreaming(userMessage.content);
      let fullResponse = "";

      for await (const chunk of stream) {
        fullResponse = chunk.trim();
        setMessages((prev) =>
          prev.map((msg, idx) =>
            idx === prev.length - 1 ? { ...msg, content: fullResponse } : msg
          )
        );
        setRawResponse(fullResponse);
      }
      updateStats(session);
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === prev.length - 1
            ? { ...msg, content: `Error: ${err.message}` }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    if (session) {
      await session.destroy();
    }
    setMessages([
      {
        type: "assistant",
        content: "Chat cleared. How can I help you?",
        timestamp: new Date(),
      },
    ]);
    setInput("");
    initializeSession();
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] dark:bg-[#0f172a]">
      {/* Sidebar */}
      <aside
        role="complementary"
        aria-label="Chat settings"
        className="fixed left-0 top-0 h-full w-72 bg-white dark:bg-gray-800/50 backdrop-blur-lg border-r border-gray-200 dark:border-gray-700/50 p-4"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-xl">✨</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
              Gemini Nano in chrome
            </h1>
          </div>
          <a
            href="https://github.com/Rushikeshnimkar"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            title="View on GitHub"
          >
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>

        {/* Model Settings */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Model Settings
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">
                Temperature ({stats.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={stats.temperature}
                onChange={(e) => updateTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">
                Top-K ({stats.topK})
              </label>
              <input
                type="range"
                min="1"
                max="40"
                value={stats.topK}
                onChange={(e) => updateTopK(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Token Stats */}
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Token Usage
          </h2>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Used
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {stats.tokensSoFar}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Remaining
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {stats.tokensLeft}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{
                  width: `${(stats.tokensSoFar / stats.maxTokens) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={clearChat}
            className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors flex items-center justify-center space-x-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>Clear Chat</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main role="main" aria-label="Chat messages" className="ml-72">
        {error ? (
          <div className="p-4" role="alert" aria-live="polite">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-red-700 dark:text-red-200">{error}</p>
            </div>
          </div>
        ) : (
          <div className="h-screen flex flex-col">
            {/* Chat Messages */}
            <section
              aria-label="Chat conversation"
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.type === "user" ? "justify-end" : "justify-start"
                  } animate-fade-in`}
                >
                  {message.type === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-2">
                      <span className="text-sm">✨</span>
                    </div>
                  )}
                  <div
                    className={`max-w-2xl px-4 py-3 rounded-2xl shadow-sm ${
                      message.type === "user"
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white ml-12"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    }`}
                  >
                    <div
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          marked.parse(message.content)
                        ),
                      }}
                    />
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span>{message.timestamp.toLocaleTimeString()}</span>
                      {message.type === "assistant" && (
                        <button
                          onClick={() => setShowRaw(!showRaw)}
                          className="underline hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showRaw ? "Hide Raw" : "Show Raw"}
                        </button>
                      )}
                    </div>
                    {showRaw && message.type === "assistant" && (
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs overflow-x-auto">
                        {rawResponse}
                      </pre>
                    )}
                  </div>
                  {message.type === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center ml-2">
                      <svg
                        className="w-4 h-4 text-gray-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </section>

            {/* Input Area */}
            <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <form
                onSubmit={handleSubmit}
                className="max-w-4xl mx-auto flex items-end space-x-4"
                role="form"
                aria-label="Message input form"
              >
                <div className="flex-1">
                  <label htmlFor="chat-input" className="sr-only">
                    Type your message
                  </label>
                  <textarea
                    id="chat-input"
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="Type your message..."
                    rows={1}
                    className="w-full rounded-xl border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    aria-label="Chat message input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    isLoading || !input.trim()
                      ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  }`}
                  aria-label={isLoading ? "Sending message..." : "Send message"}
                >
                  {isLoading ? (
                    <svg
                      className="animate-spin h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  )}
                </button>
              </form>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
