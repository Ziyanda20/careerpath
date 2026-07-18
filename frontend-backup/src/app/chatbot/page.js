"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { api } from "@/lib/api";

export default function ChatbotPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const bottomRef = useRef();

  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm CareerBot 👋 I'm here to help you find the right career and course for you. Tell me — what subjects do you enjoy most at school, or what kind of work interests you?" }
  ]);
  const [input, setInput]   = useState("");
  const [sending, setSending] = useState(false);

  const apsData = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("aps_result") || "null")
    : null;

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setSending(true);
    try {
      const data = await api.sendMessage(msg, apsData?.aps_score);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 pb-24 md:pb-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">CareerBot 🤖</h1>
            <p className="text-gray-500 text-sm">Your personal SA career guidance counsellor</p>
          </div>
          {apsData && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm">
              <span className="text-gray-500">APS: </span>
              <span className="font-bold text-green-700">{apsData.aps_score}</span>
            </div>
          )}
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-green-700 text-white rounded-br-sm"
                  : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-400 shadow-sm">
                CareerBot is typing…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <textarea
            className="input-field flex-1 resize-none h-12 py-3"
            placeholder="Ask about careers, courses, or your interests…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
          />
          <button onClick={send} disabled={sending || !input.trim()} className="btn-primary px-5">
            Send
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </main>
    </div>
  );
}
