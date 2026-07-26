import React, { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type ChatState = "hook" | "exploration" | "scoring" | "action";

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: "您好，我是和毅智能的数字合伙人。在这里，我们不只是交付代码，而是探索如何让硅基智能与您的团队和谐共生。在浏览我们的案例之前，我想先听听，在您理想的业务图景中，有哪些'人想做但做不到'的环节，是您最想用AI去重塑的？",
  timestamp: 0,
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatState, setChatState] = useState<ChatState>("exploration");
  const [sessionId, setSessionId] = useState<string>("");
  const [leadData, setLeadData] = useState<any>({
    id: crypto.randomUUID(),
    industry: "",
    pain_point_raw: "",
    ai_cognition_score: 0,
    narrative_value_score: 0,
    total_score: 0,
    narrative_value_tags: [],
    contact_info: "",
    contact_name: "",
    contact_method: "",
  });
  const [leadSaved, setLeadSaved] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize session and load history
  useEffect(() => {
    let sid = localStorage.getItem("heyi_session_id");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("heyi_session_id", sid);
    }
    setSessionId(sid);

    // Load chat history
    fetch(`/api/messages/${sid}`)
      .then((r) => r.json())
      .then((history: { role: string; content: string; created_at: string }[]) => {
        if (history.length > 0) {
          const loaded = history.map((m, i) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(m.created_at).getTime() || i,
          }));
          setMessages(loaded);
        } else {
          setMessages([{ ...WELCOME_MESSAGE, timestamp: Date.now() }]);
        }
      })
      .catch(() => {
        setMessages([{ ...WELCOME_MESSAGE, timestamp: Date.now() }]);
      });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          chatState,
          leadData,
          input,
          sessionId,
        }),
      });
    
      const data = await chatResponse.json();
    
      if (!chatResponse.ok) {
        throw new Error(data.message || "API error");
      }
    
      const assistantMessage: Message = {
        role: "assistant",
        content: data.text || "抱歉，我暂时无法回应。",
        timestamp: Date.now(),
      };
    
      setMessages((prev) => [...prev, assistantMessage]);
    
      // Perform internal scoring logic
      if (messages.length > 3 && chatState === "exploration") {
        setChatState("scoring");
      }

      // Auto-save lead ONLY when real contact info is detected
      if (chatState === "scoring" && !leadSaved) {
        const contactPattern = /(1[3-9]\d{9})|([\w.-]+@[\w.-]+\.[a-zA-Z]{2,})|(微信[：:号]?\s*[a-zA-Z0-9_-]{3,})|(wxid_[\w]+)/i;
        
        // Search all messages (including current input) for contact info
        const allTexts = [...messages.map(m => m.content), input];
        let contactInfo = "";
        let contactMethod = "";
        
        for (const text of allTexts) {
          const match = text.match(contactPattern);
          if (match) {
            contactInfo = match[0];
            contactMethod = /1[3-9]\d{9}/.test(contactInfo) ? "phone"
              : /@/.test(contactInfo) ? "email"
              : "wechat";
            break;
          }
        }

        // Only save if we found real contact info
        if (contactInfo) {
          const allMessages = [...messages, userMessage, assistantMessage];
          const userMsgs = allMessages.filter(m => m.role === "user");
          const aiMsgs = allMessages.filter(m => m.role === "assistant");

          // Extract industry from conversation
          const industryPatterns = /(制造业|金融|软件|法律|电商|医疗|互联网|教育|零售|物流|房地产|建筑|农业|能源|媒体)/;
          let extractedIndustry = "";
          for (const msg of userMsgs) {
            const indMatch = msg.content.match(industryPatterns);
            if (indMatch) { extractedIndustry = indMatch[0]; break; }
          }

          // Extract name hints
          const namePatterns = /(?:我[是叫]|姓名[：:]?\s*)([a-zA-Z\u4e00-\u9fa5]{2,4})/;
          let extractedName = "";
          for (const msg of userMsgs) {
            const nameMatch = msg.content.match(namePatterns);
            if (nameMatch) { extractedName = nameMatch[1]; break; }
          }

          const conversationSummary = {
            core_need: userMsgs[0]?.content?.substring(0, 200) || "",
            user_questions: userMsgs
              .filter(m => m.content.length > 5)
              .slice(0, 5)
              .map(m => m.content.substring(0, 150)),
            ai_proposals: aiMsgs
              .filter(m => m.content.length > 20 && !m.content.includes("欢迎") && !m.content.includes("你好"))
              .slice(0, 3)
              .map(m => m.content.substring(0, 200)),
            total_rounds: userMsgs.length,
          };

          const newLead = {
            ...leadData,
            contact_info: contactInfo,
            contact_method: contactMethod,
            contact_name: extractedName || leadData.contact_name,
            industry: extractedIndustry || leadData.industry,
            session_id: sessionId,
            ai_cognition_score: Math.min(1, userMsgs.length * 0.15),
            narrative_value_score: Math.min(1, userMsgs.length * 0.12),
            total_score: Math.min(1, userMsgs.length * 0.13),
            pain_point_raw: conversationSummary.core_need,
            conversation_summary: conversationSummary,
          };

          try {
            await fetch("/api/leads", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newLead),
            });
            setLeadData(newLead);
            setLeadSaved(true);
          } catch (e) {
            console.error("Save lead error:", e);
          }
        }
      }
    
      // Increment insights stat
      await fetch("/api/stats/increment-insights", { method: "POST" });
    
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "出现了一些技术问题，请稍后再试。",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-white">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#141414]/10"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.timestamp}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-4 max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-sm flex items-center justify-center shrink-0",
                msg.role === "user" ? "bg-[#141414] text-white" : "bg-[#E4E3E0] text-[#141414]"
              )}>
                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={cn(
                "p-4 rounded-sm text-sm leading-relaxed",
                msg.role === "user" 
                  ? "bg-[#141414] text-white" 
                  : "bg-[#F5F5F5] border border-[#141414]/5"
              )}>
                <div className="prose prose-sm prose-neutral max-w-none">
                  <ReactMarkdown>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-sm bg-[#E4E3E0] flex items-center justify-center">
              <Loader2 size={16} className="animate-spin" />
            </div>
            <div className="p-4 bg-[#F5F5F5] rounded-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-[#141414]/20 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-[#141414]/20 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-[#141414]/20 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#141414]/10 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={chatState === "scoring" ? "请留下您的联系方式（微信/电话）..." : "描述您的业务痛点或愿景..."}
            className="flex-1 bg-[#F5F5F5] border border-[#141414]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#141414] transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-[#141414] text-white px-6 py-3 flex items-center gap-2 hover:bg-[#141414]/90 disabled:opacity-50 transition-all"
          >
            <Send size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">发送</span>
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-tighter opacity-50">
              <Sparkles size={10} />
              AI 推理状态: {chatState === 'exploration' ? '需求探索' : chatState === 'scoring' ? '价值评估' : chatState}
            </div>
            {chatState === "scoring" && (
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-tighter text-green-600 font-bold">
                <CheckCircle2 size={10} />
                检测到高价值需求
              </div>
            )}
          </div>
          <span className="text-[10px] opacity-30 font-mono">TOKEN 使用估算: ~{messages.length * 150}</span>
        </div>
      </div>
    </div>
  );
}
