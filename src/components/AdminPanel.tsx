import React, { useState, useEffect } from "react";
import { Lock, LogOut, Users, Briefcase, Plus, Trash2, Edit3, Save, X, Eye, EyeOff, MessageSquare, ChevronDown, ChevronUp, Phone, Mail, MessageCircle, Clock, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const FOLLOW_UP_STATUSES = [
  { value: "new", label: "新线索", color: "#3b82f6" },
  { value: "contacted", label: "已联系", color: "#eab308" },
  { value: "qualified", label: "已确认", color: "#22c55e" },
  { value: "proposal", label: "方案中", color: "#a855f7" },
  { value: "won", label: "已成交", color: "#059669" },
  { value: "lost", label: "已流失", color: "#ef4444" },
];

export default function AdminPanel({ onBack }: { onBack: () => void }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<"leads" | "cases" | "legal">("leads");
  const [leads, setLeads] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [legalPages, setLegalPages] = useState<any[]>([]);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [editingCase, setEditingCase] = useState<any>(null);
  const [editingLegal, setEditingLegal] = useState<any>(null);
  const [showNewCase, setShowNewCase] = useState(false);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [leadConversation, setLeadConversation] = useState<any[]>([]);

  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const base = import.meta.env.BASE_URL;

  // Verify token on mount
  useEffect(() => {
    if (token) {
      fetch(`${base}api/admin/verify`, { headers: authHeaders })
        .then(r => { if (!r.ok) { setToken(null); localStorage.removeItem("admin_token"); } })
        .catch(() => { setToken(null); localStorage.removeItem("admin_token"); });
    }
  }, []);

  // Fetch data when authenticated
  useEffect(() => {
    if (!token) return;
    fetchLeads();
    fetchCases();
    fetchLegal();
    const interval = setInterval(() => { fetchLeads(); fetchCases(); fetchLegal(); }, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchLeads = () => fetch(`${base}api/admin/leads`, { headers: authHeaders }).then(r => r.json()).then(setLeads).catch(() => {});
  const fetchCases = () => fetch(`${base}api/admin/cases`, { headers: authHeaders }).then(r => r.json()).then(setCases).catch(() => {});
  const fetchLegal = () => fetch(`${base}api/admin/legal`, { headers: authHeaders }).then(r => r.json()).then(setLegalPages).catch(() => {});

  const saveLegal = async (key: string, data: any) => {
    await fetch(`${base}api/admin/legal/${key}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ title: data.title, content: data.content }),
    });
    setEditingLegal(null);
    fetchLegal();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await fetch(`${base}api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (r.ok) {
        setToken(d.token);
        localStorage.setItem("admin_token", d.token);
        setLoginError("");
      } else {
        setLoginError(d.error || "登录失败");
      }
    } catch { setLoginError("网络错误"); }
  };

  const handleLogout = () => {
    fetch(`${base}api/admin/logout`, { method: "POST", headers: authHeaders });
    setToken(null);
    localStorage.removeItem("admin_token");
  };

  const updateLead = async (id: string, data: any) => {
    await fetch(`${base}api/admin/leads/${id}`, { method: "PUT", headers: authHeaders, body: JSON.stringify(data) });
    fetchLeads();
    setEditingLead(null);
  };

  const deleteLead = async (id: string) => {
    if (confirm("确定删除该线索？")) {
      await fetch(`${base}api/admin/leads/${id}`, { method: "DELETE", headers: authHeaders });
      fetchLeads();
    }
  };

  const saveCase = async (data: any, id?: string) => {
    if (id) {
      await fetch(`${base}api/admin/cases/${id}`, { method: "PUT", headers: authHeaders, body: JSON.stringify(data) });
    } else {
      await fetch(`${base}api/admin/cases`, { method: "POST", headers: authHeaders, body: JSON.stringify(data) });
    }
    fetchCases();
    setEditingCase(null);
    setShowNewCase(false);
  };

  const deleteCase = async (id: string) => {
    if (confirm("确定删除该案例？")) {
      await fetch(`${base}api/admin/cases/${id}`, { method: "DELETE", headers: authHeaders });
      fetchCases();
    }
  };

  const togglePublish = async (c: any) => {
    await fetch(`${base}api/admin/cases/${c.id}`, {
      method: "PUT", headers: authHeaders,
      body: JSON.stringify({ published: !c.published }),
    });
    fetchCases();
  };

  const fetchConversation = async (leadId: string) => {
    if (expandedLead === leadId) { setExpandedLead(null); setLeadConversation([]); return; }
    setExpandedLead(leadId);
    try {
      const r = await fetch(`${base}api/admin/leads/${leadId}/conversation`, { headers: authHeaders });
      const d = await r.json();
      setLeadConversation(d);
    } catch { setLeadConversation([]); }
  };

  // Login Screen
  if (!token) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleLogin}
          className="bg-white p-8 w-full max-w-sm space-y-6"
        >
          <div className="text-center space-y-2">
            <Lock size={32} className="mx-auto" />
            <h2 className="text-xl font-bold tracking-tight">管理后台</h2>
            <p className="text-xs opacity-50">Admin Panel · 和毅智能</p>
          </div>
          <div className="space-y-4">
            <input
              type="text" placeholder="用户名" value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-[#141414] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#141414]"
            />
            <input
              type="password" placeholder="密码" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-[#141414] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#141414]"
            />
            {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
          </div>
          <button type="submit" className="w-full bg-[#141414] text-white py-3 text-sm font-bold uppercase tracking-widest hover:bg-[#333] transition-colors">
            登 录
          </button>
          <button type="button" onClick={onBack} className="w-full text-xs opacity-50 hover:opacity-100 transition-opacity">
            ← 返回官网
          </button>
        </motion.form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="bg-[#141414] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="font-bold tracking-tight">管理后台</h1>
          <span className="text-xs opacity-50">Admin Panel</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-xs opacity-70 hover:opacity-100">← 官网</button>
          <button onClick={handleLogout} className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100">
            <LogOut size={12} /> 退出
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex gap-1 mb-6">
          {[
            { key: "leads", label: "线索管理", icon: <Users size={14} />, count: leads.length },
            { key: "cases", label: "案例管理", icon: <Briefcase size={14} />, count: cases.length },
            { key: "legal", label: "法律页面", icon: <FileText size={14} />, count: legalPages.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                tab === t.key ? "bg-[#141414] text-white" : "bg-white border border-[#141414]/10 hover:border-[#141414]"
              }`}>
              {t.icon} {t.label} <span className="text-[10px] opacity-60">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Leads Tab */}
        <AnimatePresence mode="wait">
          {tab === "leads" && (
            <motion.div key="leads" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {leads.length === 0 ? (
                <div className="bg-white border p-12 text-center opacity-50">暂无线索数据</div>
              ) : leads.map(lead => {
                const status = FOLLOW_UP_STATUSES.find(s => s.value === lead.follow_up_status) || FOLLOW_UP_STATUSES[0];
                return (
                  <div key={lead.id} className="bg-white border border-[#141414]/10 p-5 hover:shadow-md transition-shadow">
                    {editingLead?.id === lead.id ? (
                      /* Edit Mode */
                      <div className="space-y-3">
                        {/* Show extracted context for reference */}
                        {lead.conversation_summary && (() => {
                          const summary = typeof lead.conversation_summary === "string" ? JSON.parse(lead.conversation_summary) : lead.conversation_summary;
                          return summary.core_need ? (
                            <div className="p-3 bg-blue-50 border-l-2 border-blue-400 text-[12px]">
                              <p className="text-[10px] font-mono uppercase text-blue-600 mb-1">💡 对话中表达的核心需求（参考）</p>
                              <p className="leading-relaxed">{summary.core_need}</p>
                            </div>
                          ) : null;
                        })()}

                        {/* Lead title - editable */}
                        <div>
                          <label className="text-[10px] uppercase opacity-50">线索标题（可重命名）</label>
                          <input value={editingLead.pain_point_raw || ""} onChange={e => setEditingLead({...editingLead, pain_point_raw: e.target.value})}
                            placeholder="输入线索标题" className="w-full border px-3 py-2 text-sm font-medium" />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[10px] uppercase opacity-50">行业</label>
                            <input value={editingLead.industry || ""} onChange={e => setEditingLead({...editingLead, industry: e.target.value})}
                              placeholder="未识别" className="w-full border px-2 py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase opacity-50">联系人姓名</label>
                            <input value={editingLead.contact_name || ""} onChange={e => setEditingLead({...editingLead, contact_name: e.target.value})}
                              placeholder="未识别" className="w-full border px-2 py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase opacity-50">联系方式 ({editingLead.contact_method})</label>
                            <input value={editingLead.contact_info || ""} onChange={e => setEditingLead({...editingLead, contact_info: e.target.value})}
                              placeholder="电话/邮箱/微信" className="w-full border px-2 py-1.5 text-sm" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase opacity-50">负责人</label>
                            <input value={editingLead.assigned_to || ""} onChange={e => setEditingLead({...editingLead, assigned_to: e.target.value})}
                              placeholder="分配给谁" className="w-full border px-2 py-1.5 text-sm" />
                          </div>
                        </div>

                        {/* Show extracted questions as reference for notes */}
                        {lead.conversation_summary && (() => {
                          const summary = typeof lead.conversation_summary === "string" ? JSON.parse(lead.conversation_summary) : lead.conversation_summary;
                          return summary.user_questions?.length > 0 ? (
                            <div className="p-3 bg-gray-50 border border-gray-200 text-[11px]">
                              <p className="text-[10px] font-mono uppercase text-gray-500 mb-1">📝 访客咨询的问题（可用于填写备注）</p>
                              {summary.user_questions.slice(0, 3).map((q: string, i: number) => (
                                <p key={i} className="py-0.5 opacity-80">{i + 1}. {q}</p>
                              ))}
                            </div>
                          ) : null;
                        })()}

                        <div>
                          <label className="text-[10px] uppercase opacity-50">跟进备注</label>
                          <textarea value={editingLead.follow_up_notes || ""} onChange={e => setEditingLead({...editingLead, follow_up_notes: e.target.value})}
                            placeholder="填写跟进计划或备注..." className="w-full border px-2 py-1.5 text-sm" rows={2} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => updateLead(lead.id, editingLead)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 text-xs"><Save size={12}/> 保存</button>
                          <button onClick={() => setEditingLead(null)} className="flex items-center gap-1 border px-3 py-1 text-xs"><X size={12}/> 取消</button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div>
                        {/* Header: tags + score */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono bg-[#141414] text-white px-2 py-0.5">{lead.industry || "未知行业"}</span>
                            <span className="text-[10px] font-mono text-white px-2 py-0.5" style={{ background: status.color }}>{status.label}</span>
                            <span className="text-[10px] opacity-50">评分: {(lead.total_score || 0).toFixed(2)}</span>
                            <span className="text-[10px] opacity-50">对话 {lead.conversation_summary ? JSON.parse(lead.conversation_summary).total_rounds || 0 : 0} 轮</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => setEditingLead({...lead})} className="p-2 hover:bg-[#F5F5F5] transition-colors"><Edit3 size={14}/></button>
                            <button onClick={() => deleteLead(lead.id)} className="p-2 hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14}/></button>
                          </div>
                        </div>

                        {/* Core need */}
                        {lead.pain_point_raw && (
                          <div className="mb-3 p-3 bg-blue-50 border-l-2 border-blue-400">
                            <p className="text-[10px] font-mono uppercase text-blue-600 mb-1">💡 核心需求</p>
                            <p className="text-sm leading-relaxed">{lead.pain_point_raw}</p>
                          </div>
                        )}

                        {/* Contact info */}
                        <div className="flex flex-wrap gap-4 mb-3 text-sm">
                          <span className="flex items-center gap-1">
                            {lead.contact_method === "phone" ? <Phone size={13}/> : lead.contact_method === "email" ? <Mail size={13}/> : <MessageCircle size={13}/>}
                            <strong>{lead.contact_info || "未留联系方式"}</strong>
                            <span className="text-[10px] opacity-50">({lead.contact_method})</span>
                          </span>
                          <span className="text-[11px] opacity-60">👤 {lead.contact_name || "未填姓名"}</span>
                          <span className="text-[11px] opacity-60">👨‍💼 {lead.assigned_to || "未分配"}</span>
                          <span className="text-[11px] opacity-60 flex items-center gap-1"><Clock size={11}/> {new Date(lead.created_at).toLocaleString()}</span>
                        </div>

                        {/* Structured summary */}
                        {lead.conversation_summary && (() => {
                          const summary = typeof lead.conversation_summary === "string" ? JSON.parse(lead.conversation_summary) : lead.conversation_summary;
                          return (
                            <div className="mb-3 space-y-2">
                              {summary.user_questions?.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-mono uppercase text-gray-500 mb-1">📝 访客咨询的问题</p>
                                  {summary.user_questions.map((q: string, i: number) => (
                                    <p key={i} className="text-[12px] pl-3 py-1 border-l border-gray-200 mb-1">{q}</p>
                                  ))}
                                </div>
                              )}
                              {summary.ai_proposals?.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-mono uppercase text-gray-500 mb-1">🤖 AI 给出的方案/建议</p>
                                  {summary.ai_proposals.map((a: string, i: number) => (
                                    <p key={i} className="text-[12px] pl-3 py-1 border-l border-green-200 mb-1 text-green-800">{a}...</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Follow-up notes */}
                        {lead.follow_up_notes && (
                          <p className="text-[11px] italic opacity-60 mb-2">📝 跟进备注: {lead.follow_up_notes}</p>
                        )}

                        {/* View full conversation button */}
                        <button
                          onClick={() => fetchConversation(lead.id)}
                          className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 mb-3"
                        >
                          <MessageSquare size={12}/>
                          {expandedLead === lead.id ? "收起对话记录" : "查看完整对话记录"}
                          {expandedLead === lead.id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                        </button>

                        {/* Full conversation history */}
                        <AnimatePresence>
                          {expandedLead === lead.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-[#141414]/10 pt-3 space-y-2 max-h-96 overflow-y-auto">
                                {leadConversation.length === 0 ? (
                                  <p className="text-[11px] opacity-40 italic">暂无对话记录</p>
                                ) : leadConversation.map((msg: any, i: number) => (
                                  <div key={i} className={`p-3 text-[12px] leading-relaxed ${
                                    msg.role === "user" ? "bg-gray-50 border-l-2 border-gray-300" : "bg-blue-50 border-l-2 border-blue-300"
                                  }`}>
                                    <p className="text-[9px] font-mono uppercase opacity-40 mb-1">
                                      {msg.role === "user" ? "👤 访客" : "🤖 AI"} · {new Date(msg.created_at).toLocaleTimeString()}
                                    </p>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    {/* Status quick-change */}
                    <div className="flex gap-1 mt-3 pt-3 border-t border-[#141414]/5">
                      {FOLLOW_UP_STATUSES.map(s => (
                        <button key={s.value}
                          onClick={() => updateLead(lead.id, { follow_up_status: s.value })}
                          className={`text-[9px] px-2 py-1 transition-all ${
                            lead.follow_up_status === s.value ? "text-white" : "opacity-50 hover:opacity-100 border border-[#141414]/10"
                          }`}
                          style={lead.follow_up_status === s.value ? { background: s.color } : {}}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Cases Tab */}
          {tab === "cases" && (
            <motion.div key="cases" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <button onClick={() => { setShowNewCase(true); setEditingCase({ title: "", industry: "", scenario: "", challenge: "", solution: "", result: "", tags: "", cover_emoji: "💼" }); }}
                className="flex items-center gap-2 bg-[#141414] text-white px-4 py-2 text-sm hover:bg-[#333] transition-colors">
                <Plus size={14}/> 新增案例
              </button>

              {/* New/Edit Case Form */}
              <AnimatePresence>
                {(showNewCase || editingCase) && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="bg-white border p-5 space-y-3">
                      <h3 className="font-bold text-sm">{editingCase?.id ? "编辑案例" : "新增案例"}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] uppercase opacity-50">Emoji</label>
                          <input value={editingCase?.cover_emoji || ""} onChange={e => setEditingCase({...editingCase, cover_emoji: e.target.value})} className="w-full border px-2 py-1 text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase opacity-50">标题 *</label>
                          <input value={editingCase?.title || ""} onChange={e => setEditingCase({...editingCase, title: e.target.value})} className="w-full border px-2 py-1 text-sm" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase opacity-50">行业</label>
                          <input value={editingCase?.industry || ""} onChange={e => setEditingCase({...editingCase, industry: e.target.value})} className="w-full border px-2 py-1 text-sm" />
                        </div>
                        <div className="col-span-2 md:col-span-3">
                          <label className="text-[10px] uppercase opacity-50">场景</label>
                          <input value={editingCase?.scenario || ""} onChange={e => setEditingCase({...editingCase, scenario: e.target.value})} className="w-full border px-2 py-1 text-sm" />
                        </div>
                        <div className="col-span-2 md:col-span-3">
                          <label className="text-[10px] uppercase opacity-50">挑战</label>
                          <textarea value={editingCase?.challenge || ""} onChange={e => setEditingCase({...editingCase, challenge: e.target.value})} className="w-full border px-2 py-1 text-sm" rows={2} />
                        </div>
                        <div className="col-span-2 md:col-span-3">
                          <label className="text-[10px] uppercase opacity-50">方案</label>
                          <textarea value={editingCase?.solution || ""} onChange={e => setEditingCase({...editingCase, solution: e.target.value})} className="w-full border px-2 py-1 text-sm" rows={2} />
                        </div>
                        <div className="col-span-2 md:col-span-3">
                          <label className="text-[10px] uppercase opacity-50">成果</label>
                          <textarea value={editingCase?.result || ""} onChange={e => setEditingCase({...editingCase, result: e.target.value})} className="w-full border px-2 py-1 text-sm" rows={2} />
                        </div>
                        <div className="col-span-2 md:col-span-3">
                          <label className="text-[10px] uppercase opacity-50">标签（逗号分隔）</label>
                          <input value={editingCase?.tags || ""} onChange={e => setEditingCase({...editingCase, tags: e.target.value})} className="w-full border px-2 py-1 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveCase(editingCase, editingCase?.id)} className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 text-xs"><Save size={12}/> 保存</button>
                        <button onClick={() => { setShowNewCase(false); setEditingCase(null); }} className="flex items-center gap-1 border px-4 py-2 text-xs"><X size={12}/> 取消</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Cases List */}
              {cases.map(c => (
                <div key={c.id} className="bg-white border border-[#141414]/10 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{c.cover_emoji}</span>
                      <div>
                        <h4 className="font-bold text-sm">{c.title}</h4>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] font-mono bg-[#141414] text-white px-2 py-0.5">{c.industry}</span>
                          <span className={`text-[10px] px-2 py-0.5 ${c.published ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {c.published ? "已发布" : "已隐藏"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => togglePublish(c)} className="p-2 hover:bg-[#F5F5F5]" title={c.published ? "隐藏" : "发布"}>
                        {c.published ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                      <button onClick={() => setEditingCase({...c})} className="p-2 hover:bg-[#F5F5F5]"><Edit3 size={14}/></button>
                      <button onClick={() => deleteCase(c.id)} className="p-2 hover:bg-red-50 text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </div>
                  <p className="text-[11px] opacity-50 mt-2">{c.scenario}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(c.tags || "").split(",").map((t: string) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 border border-[#141414]/20 opacity-60">{t.trim()}</span>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Legal Tab */}
          {tab === "legal" && (
            <motion.div key="legal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {legalPages.length === 0 ? (
                <div className="bg-white border p-12 text-center opacity-50">暂无法律页面</div>
              ) : (
                legalPages.map((p) => (
                  <div key={p.page_key} className="bg-white border border-[#141414]/10 p-5 space-y-3">
                    {editingLegal?.page_key === p.page_key ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] uppercase opacity-50">页面标题</label>
                          <input value={editingLegal.title} onChange={(e) => setEditingLegal({ ...editingLegal, title: e.target.value })} className="w-full border px-3 py-2 text-sm mt-1" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase opacity-50">正文（支持 Markdown，# 为标题）</label>
                          <textarea value={editingLegal.content} onChange={(e) => setEditingLegal({ ...editingLegal, content: e.target.value })} rows={18} className="w-full border px-3 py-2 text-sm mt-1 font-mono leading-relaxed" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveLegal(p.page_key, editingLegal)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 text-xs"><Save size={12}/> 保存</button>
                          <button onClick={() => setEditingLegal(null)} className="flex items-center gap-1 border px-3 py-1 text-xs"><X size={12}/> 取消</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="font-bold text-sm">{p.title}</h3>
                          <p className="text-[10px] font-mono opacity-40 uppercase">/{p.page_key} · 更新于 {p.updated_at ? new Date(p.updated_at).toLocaleString() : "-"}</p>
                          <p className="text-xs opacity-60 line-clamp-2">{(p.content || "").replace(/[#*`>\-\n]/g, " ").slice(0, 120)}</p>
                        </div>
                        <button onClick={() => setEditingLegal({ ...p })} className="p-2 hover:bg-[#F5F5F5] transition-colors shrink-0"><Edit3 size={14}/></button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
