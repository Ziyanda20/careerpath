"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "../../components/layout/Navbar";
import { api } from "../../lib/api";
import { getApsResult } from "../../lib/apsCache";

const GREETING = { role: "assistant", content: "Hi! I am CareerBot. I am here to help you find the right career. Tell me what subjects you enjoy most or what kind of work interests you?" };

const SUGGESTED_QUESTIONS = [
  "What bursaries can I apply for with my APS?",
  "What subjects do I need for Engineering?",
  "What's the difference between a university and TVET college?",
  "Ngingakhula isicelo nini sonyaka?",
];

export default function ChatbotPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const bottomRef = useRef();
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const apsData = user ? getApsResult(user.id) : null;

  useEffect(() => { if (!loading&&!user) router.push("/login"); }, [user,loading]);
  // Load saved conversation from the database so chats survive page changes
  useEffect(() => {
    if (!user) return;
    api.getChatHistory()
      .then((data) => {
        const saved = (data.history || []).map((h) => ({ role: h.role, content: h.content }));
        if (saved.length) setMessages([GREETING, ...saved]);
      })
      .catch(() => {});
  }, [user]);
  async function clearChat() {
    try { await api.clearChatHistory(); } catch {}
    setMessages([GREETING]);
  }
  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  async function send(overrideText) {
    const msg = (overrideText ?? input).trim(); if (!msg||sending) return;
    setInput(""); setMessages(prev=>[...prev,{role:"user",content:msg}]); setSending(true);
    try { const data = await api.sendMessage(msg,apsData?.aps_score); setMessages(prev=>[...prev,{role:"assistant",content:data.reply}]); }
    catch { setMessages(prev=>[...prev,{role:"assistant",content:"Sorry, I am having trouble connecting. Please try again."}]); }
    finally { setSending(false); }
  }
  function handleKey(e) { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); send(); } }

  if (loading||!user) return null;

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col">
      <Navbar/>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 flex flex-col">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-display text-xl font-bold text-[var(--ink)] m-0">CareerBot</h1>
              <p className="text-[var(--ink-60)] text-sm m-0">Your personal SA career guidance counsellor</p>
            </div>
            <span className="text-xs font-medium text-[var(--green-800)] bg-[var(--green-100)] rounded-full px-3 py-1">AI Career Advisor</span>
          </div>
          <button onClick={clearChat} disabled={sending} className="text-xs text-[var(--ink-60)] bg-white border border-[var(--line)] rounded-xl px-3 py-2 hover:text-[var(--ink)] disabled:opacity-50">Clear chat</button>
          {apsData && (
            <div className="bg-white border border-[var(--line)] rounded-xl px-4 py-2 text-sm">
              <span className="text-[var(--ink-60)]">APS: </span>
              <span className="font-bold text-[var(--green-700)]">{apsData.aps_score}</span>
            </div>
          )}
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          <aside className="hidden lg:block w-64 shrink-0">
            <p className="text-xs font-semibold text-[var(--ink-40)] uppercase tracking-wide mb-3">Suggested questions</p>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={sending}
                  className="block w-full text-left text-sm text-[var(--ink-60)] bg-white border border-[var(--line)] rounded-xl px-3.5 py-3 hover:border-[var(--green-700)]/40 hover:text-[var(--ink)] transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </aside>

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex-1 overflow-y-auto mb-4 flex flex-col gap-4 pr-1">
              {messages.map((m,i)=>(
                <div key={i} className={`flex ${m.role==="user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role==="user"
                      ? "bg-[var(--green-700)] text-white"
                      : "bg-white text-[var(--ink)] border border-[var(--line)]"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[var(--line)] rounded-2xl px-4 py-3 text-sm text-[var(--ink-40)]">CareerBot is typing...</div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>
            <div className="flex gap-2">
              <textarea
                className="flex-1 border border-[var(--line)] rounded-xl px-4 py-3 text-sm outline-none resize-none h-12 font-sans focus:ring-2 focus:ring-green-700/30 focus:border-green-700 bg-white"
                placeholder="Type your question in any of 5 supported languages..."
                value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} rows={1}
              />
              <button onClick={() => send()} disabled={sending||!input.trim()} className="btn-primary !w-auto !mt-0 !py-0 px-6 disabled:opacity-50">Send</button>
            </div>
            <p className="text-xs text-[var(--ink-40)] text-center mt-2">Press Enter to send</p>
          </div>
        </div>
      </main>
    </div>
  );
}