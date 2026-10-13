import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react'
import { sendChatMessage } from '../api'

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m AdWise AI — your marketing analytics assistant. I can analyze your campaign performance, suggest optimizations, and help you understand your attribution data.\n\nTry asking me:\n- "Which ad is performing best?"\n- "How can I improve my ROAS?"\n- "Analyze my campaign spend"' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e?.preventDefault()
    const msg = input.trim()
    if (!msg || loading) return

    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.filter(m => m.role !== 'system')
      const { reply, tools_used } = await sendChatMessage(msg, history)
      setMessages(prev => [...prev, { role: 'assistant', content: reply, tools_used }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err.message || 'Failed to get response. Please try again.'}` }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-navy-600/30">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">AdWise AI</h1>
          <p className="text-xs text-gray-400">Marketing analytics assistant — powered by your live campaign data</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={16} className="text-purple-400" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-navy-800 border border-navy-600/30 text-gray-200'
            }`}>
              {msg.tools_used?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-navy-600/20">
                  {msg.tools_used.map((t, j) => (
                    <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-300 font-mono">
                      {t.replace('get_', '')}
                    </span>
                  ))}
                </div>
              )}
              <MessageContent content={msg.content} />
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-1">
                <User size={16} className="text-blue-400" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-purple-400" />
            </div>
            <div className="bg-navy-800 border border-navy-600/30 rounded-xl px-4 py-3">
              <Loader2 size={16} className="text-purple-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="pt-4 border-t border-navy-600/30">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about your campaigns, ROAS, attribution..."
            className="flex-1 bg-navy-800 border border-navy-600/30 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[11px] text-gray-600 mt-2 text-center">
          AdWise AI uses your live campaign data. Responses are AI-generated and should be verified.
        </p>
      </form>
    </div>
  )
}

function MessageContent({ content }) {
  // Simple markdown-like rendering
  const lines = content.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <div key={i} className="pl-3 flex gap-2"><span className="text-purple-400">•</span><span>{formatBold(line.slice(2))}</span></div>
        }
        if (line.match(/^\d+\.\s/)) {
          return <div key={i} className="pl-3">{formatBold(line)}</div>
        }
        return <p key={i}>{formatBold(line)}</p>
      })}
    </div>
  )
}

function formatBold(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}
