import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, 
  Terminal, 
  Activity, 
  Users, 
  Zap, 
  ArrowRight, 
  Shield, 
  Cpu,
  BarChart3,
  MessageSquare,
  Globe,
  Lock,
  Briefcase,
  ArrowUpRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import ChatInterface from "./components/ChatInterface";
import Dashboard from "./components/Dashboard";
import StatsDisplay from "./components/StatsDisplay";
import AdminPanel from "./components/AdminPanel";
import LegalPage from "./components/LegalPage";

export default function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [view, setView] = useState<"public" | "internal">("public");

  // Listen for popstate for browser back/forward
  useEffect(() => {
    const handlePop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setRoute(path);
  };

  const base = import.meta.env.BASE_URL;

  const [dashboardStats, setDashboardStats] = useState({
    insights_generated: 0,
    active_sessions: 0,
    total_messages: 0,
  });
  const [cases, setCases] = useState<any[]>([]);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [caseFilter, setCaseFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`${base}api/cases`).then(r => r.json()).then(d => setCases(d)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const r = await fetch(`${base}api/dashboard-stats`);
        const d = await r.json();
        if (d) setDashboardStats(d);
      } catch {}
    };
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  // Admin route
  if (route === `${base}admin`) {
    return <AdminPanel onBack={() => navigate(base)} />;
  }

  // Legal pages (privacy / terms)
  if (route === `${base}privacy` || route === `${base}terms`) {
    const pageKey = route === `${base}privacy` ? "privacy" : "terms";
    return <LegalPage pageKey={pageKey} onBack={() => navigate(base)} />;
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#141414]/10 bg-[#E4E3E0]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="和毅智能" className="w-10 h-10 object-contain rounded-sm border border-white/10" />
            <div className="flex flex-col -space-y-1">
              <span className="font-bold tracking-tighter text-lg uppercase">和毅欢迎您！</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setView("public")}
              className={`text-xs uppercase tracking-widest font-bold ${view === "public" ? "underline underline-offset-4" : "opacity-50 hover:opacity-100 transition-opacity"}`}
            >
              官网首页
            </button>
            <button 
              onClick={() => setView("internal")}
              className={`text-xs uppercase tracking-widest font-bold flex items-center gap-2 ${view === "internal" ? "underline underline-offset-4" : "opacity-50 hover:opacity-100 transition-opacity"}`}
            >
              <Lock size={12} />
              透明工厂 (Glass Box)
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <AnimatePresence mode="wait">
          {view === "public" ? (
            <motion.div 
              key="public"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-7xl mx-auto px-6 py-12"
            >
              {/* Hero section - full width above grid */}
              <div className="mb-8 space-y-2">
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-5xl lg:text-7xl font-bold tracking-tighter leading-[0.9] uppercase"
                >
                  和 <span className="italic font-serif normal-case font-normal">&</span> 毅
                  <span className="text-2xl lg:text-3xl font-light tracking-tight ml-4 align-middle">数字合伙人</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm max-w-lg opacity-60 leading-relaxed"
                >
                  我们不只是交付代码，而是探索如何让硅基智能与您的团队和谐共生。
                </motion.p>
              </div>

              {/* Two-column grid - aligned at top */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Chat */}
              <div className="lg:col-span-7">
                {/* Chat Interface */}
                <div className="border border-[#141414] bg-white shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
                  <div className="p-4 border-b border-[#141414] flex items-center justify-between bg-[#141414] text-[#E4E3E0]">
                    <div className="flex items-center gap-2">
                      <Bot size={18} />
                      <span className="text-xs font-mono uppercase tracking-widest">数字合伙人智能体 v1.0</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                  </div>
                  <ChatInterface />
                </div>
              </div>

              {/* Right: Live Stats & Insights */}
              <div className="lg:col-span-5 space-y-6">
                <StatsDisplay />

                <div className="border border-[#141414] p-6 space-y-6 bg-[#141414] text-[#E4E3E0]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-widest flex items-center gap-2">
                      <Activity size={14} className="text-green-400" />
                      实时生产力看板
                    </h3>
                    <span className="text-[10px] opacity-50">实时更新</span>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { label: "已生成洞察", value: dashboardStats.insights_generated.toLocaleString(), trend: "实时" },
                      { label: "活跃会话", value: dashboardStats.active_sessions.toLocaleString(), trend: "在线" },
                      { label: "对话总数", value: dashboardStats.total_messages.toLocaleString(), trend: "累计" }
                    ].map((stat, i) => (
                      <div key={i} className="flex items-end justify-between border-b border-[#E4E3E0]/20 pb-2">
                        <div>
                          <p className="text-[10px] uppercase opacity-50">{stat.label}</p>
                          <p className="text-2xl font-mono">{stat.value}</p>
                        </div>
                        <span className="text-[10px] font-mono text-green-400">{stat.trend}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <p className="text-xs italic opacity-70">
                      "AI 产品的平庸与卓越，往往取决于排版、色彩、间距和交互是否在传递同一种情绪。"
                    </p>
                  </div>
                </div>
              </div>
              </div>

              {/* Case Library - full width */}
              <div className="lg:col-span-12 space-y-6 mt-8">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-50 mb-1">Case Library</p>
                    <h2 className="text-3xl font-bold tracking-tight">成功案例库</h2>
                    <p className="text-sm opacity-60 mt-1">每一个案例，都是一次人机协作的叙事实验</p>
                  </div>
                  <div className="flex gap-2">
                    {["all", "制造业", "金融", "软件", "法律", "电商", "医疗"].map(ind => (
                      <button
                        key={ind}
                        onClick={() => setCaseFilter(ind)}
                        className={`text-[10px] px-3 py-1 border transition-all ${
                          caseFilter === ind ? "bg-[#141414] text-white border-[#141414]" : "border-[#141414]/30 hover:border-[#141414]"
                        }`}
                      >
                        {ind === "all" ? "全部" : ind}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(caseFilter === "all" ? cases : cases.filter(c => c.industry === caseFilter)).map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="border border-[#141414] bg-white p-5 hover:shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] transition-all cursor-pointer group"
                      onClick={() => setExpandedCase(expandedCase === c.id ? null : c.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{c.cover_emoji || "💼"}</span>
                          <div>
                            <h4 className="font-bold text-sm tracking-tight">{c.title}</h4>
                            <span className="text-[10px] font-mono bg-[#141414] text-white px-2 py-0.5">{c.industry}</span>
                          </div>
                        </div>
                        {expandedCase === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} className="opacity-30 group-hover:opacity-100" />}
                      </div>

                      <p className="text-[11px] text-[#141414]/60 mb-2">{c.scenario}</p>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {(c.tags || "").split(",").map((t: string) => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 border border-[#141414]/20 opacity-60">{t.trim()}</span>
                        ))}
                      </div>

                      <AnimatePresence>
                        {expandedCase === c.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-3 border-t border-[#141414]/10 pt-3"
                          >
                            <div>
                              <p className="text-[9px] font-mono uppercase opacity-40 mb-1">挑战</p>
                              <p className="text-[11px] leading-relaxed">{c.challenge}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-mono uppercase opacity-40 mb-1">方案</p>
                              <p className="text-[11px] leading-relaxed">{c.solution}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-mono uppercase opacity-40 mb-1">成果</p>
                              <p className="text-[11px] leading-relaxed font-semibold text-green-700">{c.result}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>

                <p className="text-[10px] text-center opacity-40 italic">
                  💡 在左侧对话中咨询相关场景，数字合伙人将自动引用匹配的案例为您解答
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="internal"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="max-w-7xl mx-auto px-6 py-12"
            >
              <Dashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-24 border-t border-[#141414] py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="和毅智能" className="w-12 h-12 object-contain rounded-sm border border-white/10" />
              <div className="flex flex-col -space-y-1">
                <span className="font-bold uppercase tracking-tighter text-xl">和毅智能</span>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-50">HeYi Intelligent</span>
              </div>
            </div>
            <p className="text-sm max-w-xs opacity-60 leading-relaxed">
              通过坚持与和谐，构建人类与 AI 协作的未来。我们致力于将复杂的 AI 技术转化为简单、直观且具有叙事价值的业务工具。
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest">联系我们</p>
              <ul className="text-xs space-y-1 opacity-70">
                <li>
                  <a href="mailto:chenqinsi@hitech.xin" className="hover:underline">chenqinsi@hitech.xin</a>
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest">法律条款</p>
              <ul className="text-xs space-y-1 opacity-70">
                <li><button onClick={() => navigate(`${base}privacy`)} className="hover:underline text-left">隐私政策</button></li>
                <li><button onClick={() => navigate(`${base}terms`)} className="hover:underline text-left">服务条款</button></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-[#141414]/10 flex justify-between items-center">
          <p className="text-[10px] opacity-50">© 2026 和毅智能. 保留所有权利。</p>
          <div className="flex gap-4">
            <div className="w-2 h-2 rounded-full bg-[#141414]" />
            <div className="w-2 h-2 rounded-full bg-[#141414]/20" />
          </div>
        </div>
      </footer>
    </div>
  );
}
