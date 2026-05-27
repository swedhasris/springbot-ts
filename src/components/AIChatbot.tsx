import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, Copy, Check, Trash2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

/** Render plain text with basic markdown-like formatting */
function MessageText({ text }: { text: string }) {
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeLines: string[] = [];
  const elements: React.ReactNode[] = [];

  const parseBold = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, j) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={j} className="font-bold text-sn-dark dark:text-white">{part.slice(2, -2)}</strong>
        : part
    );
  };

  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="bg-gray-900 text-gray-100 p-4 rounded-2xl text-xs overflow-x-auto my-3 font-mono border border-gray-700 shadow-xl shadow-black/20">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="font-black text-sn-dark dark:text-white text-base mt-4 mb-1">{parseBold(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="font-black text-sn-dark dark:text-white text-lg mt-5 mb-2">{parseBold(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="font-black text-sn-dark dark:text-white text-xl mt-6 mb-3">{parseBold(line.slice(2))}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="pl-4 flex gap-3 my-1 group">
          <span className="text-sn-green font-black select-none group-hover:scale-150 transition-transform">•</span>
          <span className="flex-1">{parseBold(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\. /.test(line)) {
      const match = line.match(/^(\d+\. )(.*)/);
      elements.push(
        <div key={i} className="pl-4 flex gap-3 my-1">
          <span className="text-sn-green font-bold select-none">{match?.[1]}</span>
          <span className="flex-1">{parseBold(match?.[2] || "")}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-3" />);
    } else {
      elements.push(
        <p key={i} className="leading-relaxed">
          {parseBold(line)}
        </p>
      );
    }
  });

  return <div className="space-y-1 text-[13px] text-gray-700 dark:text-gray-300">{elements}</div>;
}

// Simulated real-time streaming helper
function streamWordByWord(fullText: string, onUpdate: (text: string) => void, onDone: () => void) {
  const words = fullText.split(" ");
  let currentText = "";
  let i = 0;
  const interval = setInterval(() => {
    if (i < words.length) {
      currentText += (i === 0 ? "" : " ") + words[i];
      onUpdate(currentText);
      i++;
    } else {
      clearInterval(interval);
      onDone();
    }
  }, 35);
}

export function AIChatbot() {
  const [isOpen, setIsOpen]       = useState(false);
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId]   = useState<string | null>(null);

  // Load chat history from localStorage
  const [messages, setMessages]   = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("kiru_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history:", e);
      }
    }
    return [
      {
        id: '1',
        sender: 'ai',
        text: "Hey there! 👋 I'm **Kiru**, your AI assistant powered by Gemini.\n\nI can help with:\n- IT tickets, incidents & SLA questions\n- Coding in PHP, React, TypeScript\n- General questions & brainstorming\n\nWhat's on your mind?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem("kiru_chat_history", JSON.stringify(messages));
  }, [messages]);

  // Smooth scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  }, [isOpen]);

  const callGemini = async (text: string, historyList: ChatMessage[]): Promise<string> => {
    const history = historyList.map(msg => ({
      sender: msg.sender,
      text: msg.text
    }));

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error || data?.message || `Error ${res.status}`;
      throw new Error(msg);
    }

    return data.response || "I couldn't generate a response. Please try again.";
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      sender: 'user', 
      text: textToSend.trim(),
      timestamp
    };
    
    const historyToPass = [...messages];
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await callGemini(userMsg.text, historyToPass);
      const tempId = (Date.now() + 1).toString();
      
      // Add empty reply placeholder
      setMessages(prev => [...prev, { 
        id: tempId, 
        sender: 'ai', 
        text: '', 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
      
      // Stream word by word
      streamWordByWord(
        reply,
        (currentText) => {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: currentText } : m));
        },
        () => {
          setIsLoading(false);
        }
      );
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        sender: 'ai', 
        text: "AI assistant is temporarily unavailable. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (confirm("Clear conversation history?")) {
      setMessages([
        {
          id: '1',
          sender: 'ai',
          text: "Conversation cleared. How can I help you now?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const quickPrompts = ['Help with a ticket', 'Explain SLA', 'PHP code help', 'What can you do?'];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-4 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
             style={{ width: '380px', height: '580px' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900"
               style={{ background: 'linear-gradient(135deg, #1d1d2c 0%, #2d3748 100%)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-sn-green flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Kiru AI</div>
                <div className="text-green-400 text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                  Gemini · Online
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button onClick={handleClearChat} className="text-gray-400 hover:text-white transition-colors p-1 rounded" title="Clear chat">
                <Trash2 size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 rounded">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8fafc] dark:bg-gray-950">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-sn-green flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={14} className="text-white" />
                  </div>
                )}
                
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl relative group/msg ${
                  msg.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-br-sm shadow-sm'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.sender === 'ai' ? <MessageText text={msg.text} /> : <p className="text-sm">{msg.text}</p>}
                  
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-[9px] opacity-40 font-mono">
                      {msg.timestamp}
                    </span>
                    {msg.text && (
                      <button 
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                      </button>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <User size={14} className="text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && !messages[messages.length - 1]?.text && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-sn-green flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex flex-col gap-1.5">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-sn-green rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-sn-green rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-sn-green rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] text-gray-400">AI is typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          {messages.length === 1 && !isLoading && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 bg-[#f8fafc] dark:bg-gray-950">
              {quickPrompts.map(p => (
                <button key={p} onClick={() => handleSend(p)}
                        className="text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-sn-green hover:text-sn-green transition-colors">
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }
                }}
                rows={1}
                placeholder="Ask Kiru anything..."
                className="flex-1 bg-transparent text-sm outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 resize-none h-6 py-0.5 custom-scrollbar"
              />
              <button onClick={() => handleSend()} disabled={isLoading || !input.trim()}
                      className="w-8 h-8 rounded-full bg-sn-green flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex-shrink-0">
                <Send size={14} className="text-white" />
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-1.5">Powered by Kiru AI Core</p>
          </div>
        </div>
      )}

      {/* FAB */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
                className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                style={{ background: 'linear-gradient(135deg, #62d84e, #3db82e)' }}>
          <MessageSquare size={24} className="text-white" />
        </button>
      )}
    </div>
  );
}
