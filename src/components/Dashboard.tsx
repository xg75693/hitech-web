import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  FileText, 
  TrendingUp, 
  Clock,
  ShieldCheck,
  AlertCircle,
  BarChart3,
  Terminal,
  Activity
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

const FOLLOW_UP_STATUSES = [
  { value: "new", label: "新线索", color: "bg-blue-500" },
  { value: "contacted", label: "已联系", color: "bg-yellow-500" },
  { value: "qualified", label: "已确认", color: "bg-green-500" },
  { value: "proposal", label: "方案中", color: "bg-purple-500" },
  { value: "won", label: "已成交", color: "bg-emerald-600" },
  { value: "lost", label: "已流失", color: "bg-red-500" },
];

type Lead = {
  id: string;
  industry: string;
  pain_point_raw: string;
  ai_cognition_score: number;
  narrative_value_score: number;
  total_score: number;
  narrative_value_tags: string;
  contact_info: string;
  contact_name: string;
  contact_method: string;
  source: string;
  status: string;
  follow_up_status: string;
  follow_up_notes: string;
  assigned_to: string;
  created_at: string;
};

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [funnel, setFunnel] = useState({ total_visitors: 0, total_consultations: 0, high_value_leads: 0 });
  const [logs, setLogs] = useState<{ event: string; detail: string; created_at: string }[]>([]);
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch(`${base}api/leads`);
        const data = await response.json();
        setLeads(data);
      } catch (error) {
        console.error("Fetch Leads Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchFunnel = async () => {
      try {
        const r = await fetch(`${base}api/dashboard-stats`);
        const d = await r.json();
        setFunnel({
          total_visitors: d.total_visitors || 0,
          total_consultations: d.total_consultations || 0,
          high_value_leads: d.high_value_leads || 0,
        });
      } catch {}
    };

    const fetchLogs = async () => {
      try {
        const r = await fetch(`${base}api/activity-logs`);
        const data = await r.json();
        setLogs(data);
      } catch {}
    };

    fetchLeads();
    fetchFunnel();
    fetchLogs();
    const interval = setInterval(() => { fetchLeads(); fetchFunnel(); fetchLogs(); }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#141414] pb-8">
        <div className="space-y-2">
          <h2 className="text-5xl font-bold tracking-tighter uppercase">透明工厂 <span className="italic font-serif normal-case font-normal">&</span> 协作工作台</h2>
        </div>
        
        <div className="flex gap-4">
          <div className="border border-[#141414] px-4 py-2 bg-white flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-green-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest">系统状态:</span>
            </div>
            <span className="text-xs font-mono">运行正常</span>
          </div>
          <div className="border border-[#141414] px-4 py-2 bg-[#141414] text-white flex items-center gap-2">
            <Users size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">活跃线索: {leads.length}</span>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={14} />
              近期叙事咨询
            </h3>
            <div className="flex gap-2">
              <button className="p-1 border border-[#141414] hover:bg-[#141414] hover:text-white transition-colors">
                <Filter size={14} />
              </button>
              <button className="p-1 border border-[#141414] hover:bg-[#141414] hover:text-white transition-colors">
                <Search size={14} />
              </button>
            </div>
          </div>

            <div className="space-y-4">
            {isLoading ? (
              <div className="p-12 text-center border border-[#141414] border-dashed opacity-50">
                <Clock size={24} className="mx-auto mb-4 animate-spin" />
                <p className="text-xs font-mono uppercase">正在同步数字业务部数据...</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="p-12 text-center border border-[#141414] border-dashed opacity-50">
                <AlertCircle size={24} className="mx-auto mb-4" />
                <p className="text-xs font-mono uppercase">暂无活跃线索。</p>
              </div>
            ) : (
              leads.map((lead) => {
                const currentStatus = FOLLOW_UP_STATUSES.find(s => s.value === lead.follow_up_status) || FOLLOW_UP_STATUSES[0];

                return (
                <motion.div 
                  key={lead.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border border-[#141414] bg-white p-6 hover:shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono bg-[#141414] text-white px-2 py-0.5">
                          {lead.industry || "未知行业"}
                        </span>
                        <span className={`text-[10px] font-mono text-white px-2 py-0.5 ${currentStatus.color}`}>
                          {currentStatus.label}
                        </span>
                        <span className="text-[10px] font-mono border border-[#141414] px-2 py-0.5">
                          评分: {lead.total_score?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold tracking-tight line-clamp-1">
                        {lead.pain_point_raw || "新咨询"}
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase opacity-50">认知度</p>
                      <div className="h-1 bg-[#141414]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#141414]" style={{ width: `${(lead.ai_cognition_score || 0) * 100}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase opacity-50">叙事价值</p>
                      <div className="h-1 bg-[#141414]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#141414]" style={{ width: `${(lead.narrative_value_score || 0) * 100}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase opacity-50">可行性</p>
                      <div className="h-1 bg-[#141414]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#141414]" style={{ width: `${(lead.total_score || 0) * 100}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-[#141414]/10">
                    <div className="flex items-center gap-1 text-[10px] opacity-50">
                      <Clock size={12} />
                      {new Date(lead.created_at).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] opacity-50">
                      <FileText size={12} />
                      {lead.source || "ai_chat"}
                    </div>
                  </div>
                </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar: System Logs & Stats */}
        <div className="lg:col-span-4 space-y-8">
          <div className="border border-[#141414] p-6 bg-[#141414] text-[#E4E3E0] space-y-6">
            <h3 className="text-xs font-mono uppercase tracking-widest flex items-center gap-2">
              <Terminal size={14} className="text-green-400" />
              智能体活动日志
            </h3>
            <div className="space-y-3 font-mono text-[10px]">
              {logs.length === 0 ? (
                <div className="opacity-50">暂无活动日志</div>
              ) : (
                logs.slice(0, 6).map((log, i) => (
                  <div key={i} className="flex gap-4 opacity-70 hover:opacity-100 transition-opacity">
                    <span className="text-green-400 shrink-0">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                    <span className="line-clamp-1">{log.event}{log.detail ? ` - ${log.detail}` : ''}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border border-[#141414] p-6 bg-white space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <BarChart3 size={14} />
              转化漏斗
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase">
                  <span>总访客</span>
                  <span>{funnel.total_visitors}</span>
                </div>
                <div className="h-2 bg-[#141414]/10">
                  <div className="h-full bg-[#141414]" style={{ width: funnel.total_visitors > 0 ? "100%" : "0%" }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase">
                  <span>咨询量</span>
                  <span>{funnel.total_consultations}</span>
                </div>
                <div className="h-2 bg-[#141414]/10">
                  <div className="h-full bg-[#141414]" style={{ width: funnel.total_visitors > 0 ? `${Math.round((funnel.total_consultations / funnel.total_visitors) * 100)}%` : "0%" }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase">
                  <span>高价值线索</span>
                  <span>{funnel.high_value_leads}</span>
                </div>
                <div className="h-2 bg-[#141414]/10">
                  <div className="h-full bg-[#141414]" style={{ width: funnel.total_visitors > 0 ? `${Math.round((funnel.high_value_leads / funnel.total_visitors) * 100)}%` : "0%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
