import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { askChatbot, getChatbotUsage } from '../services/api.service';
import { Send, Bot, User as UserIcon, Loader2, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChatbotWidget({ lectureId, lectureTitle, currentUser }) {
  const [messages, setMessages]   = useState([
    {
      role: 'assistant',
      content: `Hi! I'm here to help with doubts about ${lectureTitle || 'this lecture'}. What would you like to know?`,
    },
  ]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [quota, setQuota]         = useState(null); // { used, limit, remaining }

  const scrollRef = useRef(null);

  useEffect(() => {
    getChatbotUsage()
      .then(({ data }) => setQuota(data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    if (quota && quota.remaining <= 0) {
      toast.error('Daily limit reached. Come back tomorrow.');
      return;
    }

    const userMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const { data } = await askChatbot({
        lectureId,
        message: trimmed,
        // send recent history (excluding the just-added user message, backend appends it itself)
        history: messages.slice(-6),
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: data.data.reply }]);
      setQuota(data.data.quota);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to get a response. Please try again.';
      toast.error(msg);
      if (err.response?.status === 429) {
        getChatbotUsage().then(({ data }) => setQuota(data.data)).catch(() => {});
      }
      // Roll back the optimistic user message on failure so it's clear it wasn't answered
      setMessages(messages);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const limitReached = quota && quota.remaining <= 0;

  return (
    <div className="glass rounded-2xl border border-white/[0.06] flex flex-col overflow-hidden" style={{ height: '480px' }}>

      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center">
            <Bot size={14} className="text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Ask a Doubt</p>
            <p className="text-xs text-slate-500 truncate max-w-[180px]">{lectureTitle}</p>
          </div>
        </div>
        {quota && (
          <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${
            limitReached ? 'bg-red-500/15 text-red-400' : 'bg-white/5 text-slate-400'
          }`}>
            <MessageCircle size={11} /> {quota.used}/{quota.limit} today
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              m.role === 'user' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary-500/20 text-primary-400'
            }`}>
              {m.role === 'user'
                ? <span className="text-[10px] font-semibold">{currentUser?.fullName?.[0]?.toUpperCase() || <UserIcon size={11} />}</span>
                : <Bot size={12} />
              }
            </div>
            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-primary-500/20 text-primary-200 rounded-tr-none'
                : 'bg-white/5 text-slate-200 rounded-tl-none'
            }`}>
              {m.content}
            </div>
          </motion.div>
        ))}

        {sending && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0">
              <Bot size={12} />
            </div>
            <div className="bg-white/5 text-slate-400 px-3 py-2 rounded-xl rounded-tl-none text-sm flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.06] flex-shrink-0">
        {limitReached ? (
          <p className="text-xs text-center text-yellow-400 py-2">
            Daily message limit reached. Come back tomorrow for more doubts.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your doubt here..."
              rows={1}
              disabled={sending}
              className="flex-1 px-3 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 resize-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="gradient-primary text-white p-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        )}
        {quota && !limitReached && (
          <p className="text-xs text-slate-600 mt-2 text-center">
            {quota.remaining} message{quota.remaining !== 1 ? 's' : ''} remaining today · Resets at midnight
          </p>
        )}
      </div>
    </div>
  );
}
