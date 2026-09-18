import React, { useState } from 'react';
import {
  X,
  Bot,
  Send,
  Sparkles,
  Terminal,
  Shield,
  HelpCircle,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeBlockedCount: number;
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  isOpen,
  onClose,
  activeBlockedCount
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([
    {
      sender: 'assistant',
      text: `Hello, Security Analyst. I am your GCP Cyber Threat Intelligence Copilot.
I am monitoring your end-to-end pipeline (Pub/Sub \`ip-traffic-ingest\`, Vertex AI endpoint \`threat-detection-endpoint\`, and BigQuery alert sink).
How can I assist with threat containment, forensic queries, or pipeline tuning today?`,
      time: new Date().toLocaleTimeString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const quickPrompts = [
    'How do I block 198.51.100.22 with Cloud Armor?',
    'Write a BigQuery query to find exfiltration flows',
    'Explain the anatomy of the detected C2 beacon',
    'How can I tune the Vertex AI anomaly threshold?'
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg = {
      sender: 'user' as const,
      text,
      time: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/copilot-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      const botMsg = {
        sender: 'assistant' as const,
        text: data.reply || 'Analysis completed.',
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Copilot error:', err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Encountered an issue communicating with the AI Copilot. Please check your connection.',
          time: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white font-display">
                  GCP Cyber Copilot
                </h3>
                <span className="px-1.5 py-0.2 rounded bg-purple-900/60 border border-purple-700/50 text-[10px] font-tech text-purple-300">
                  Gemini
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Connected to project: <span className="text-blue-400 font-tech">cyber-threat-detection</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
          {messages.map((msg, i) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={i}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-tech mb-1 px-1">
                  <span>{isUser ? 'You' : 'Gemini Cyber Copilot'}</span>
                  <span>•</span>
                  <span>{msg.time}</span>
                </div>

                <div
                  className={`p-3.5 rounded-xl max-w-[92%] leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-xs font-medium'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-xs font-normal'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-slate-850 flex justify-end">
                      <button
                        onClick={() => handleCopy(msg.text, i)}
                        className="text-slate-400 hover:text-white text-[10px] font-tech flex items-center gap-1 transition-colors"
                      >
                        {copiedIndex === i ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-purple-400 font-tech text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Copilot is formulating security guidance...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-850 space-y-1.5">
          <div className="text-[10px] text-slate-500 font-tech uppercase">Suggested Prompts:</div>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors text-left font-tech truncate max-w-full"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask Copilot about GCP threat containment or queries..."
            className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-tech"
          />
          <button
            disabled={!inputMessage.trim() || isLoading}
            onClick={() => handleSend()}
            className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
