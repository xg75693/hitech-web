import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Zap, Users, MessageSquare, BarChart3 } from "lucide-react";

export default function StatsDisplay() {
  const [stats, setStats] = useState({
    insights_generated: 0,
    leads_captured: 0,
    active_sessions: 0
  });

  useEffect(() => {
    // Track this visitor
    const sessionId = localStorage.getItem("heyi_session_id") || "";
    if (sessionId) {
      fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }

    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats");
        const data = await response.json();
        if (data) setStats(data);
      } catch (error) {
        console.error("Fetch Stats Error:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="border border-[#141414] p-4 bg-white hover:shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] transition-all">
        <div className="flex items-center justify-between mb-2">
          <Zap size={16} className="text-yellow-500" />
          <span className="text-[10px] font-mono opacity-50">LIVE</span>
        </div>
        <p className="text-2xl font-bold tracking-tighter">{stats.insights_generated.toLocaleString()}</p>
        <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">已生成洞察</p>
      </div>

      <div className="border border-[#141414] p-4 bg-white hover:shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] transition-all">
        <div className="flex items-center justify-between mb-2">
          <Users size={16} className="text-blue-500" />
          <span className="text-[10px] font-mono opacity-50">累计</span>
        </div>
        <p className="text-2xl font-bold tracking-tighter">{stats.leads_captured.toLocaleString()}</p>
        <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">已捕获线索</p>
      </div>

      <div className="border border-[#141414] p-4 bg-white hover:shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] transition-all">
        <div className="flex items-center justify-between mb-2">
          <MessageSquare size={16} className="text-green-500" />
          <span className="text-[10px] font-mono opacity-50">活跃</span>
        </div>
        <p className="text-2xl font-bold tracking-tighter">{stats.active_sessions.toLocaleString()}</p>
        <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">当前会话</p>
      </div>
    </div>
  );
}
