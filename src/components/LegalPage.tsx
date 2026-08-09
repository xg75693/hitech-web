import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function LegalPage({
  pageKey,
  onBack,
}: {
  pageKey: string;
  onBack: () => void;
}) {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${base}api/legal/${pageKey}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setPage(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [pageKey]);

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      <nav className="fixed top-0 w-full z-50 border-b border-[#141414]/10 bg-[#E4E3E0]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold hover:opacity-70 transition-opacity"
          >
            <ArrowLeft size={14} />
            返回官网
          </button>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="和毅智能" className="w-10 h-10 object-contain rounded-sm border border-white/10" />
            <span className="font-bold tracking-tighter text-lg uppercase">和毅智能</span>
          </div>
        </div>
      </nav>

      <main className="pt-16 max-w-3xl mx-auto px-6 py-12">
        {loading ? (
          <p className="text-sm opacity-50">加载中…</p>
        ) : error || !page ? (
          <p className="text-sm opacity-50">未找到该页面。</p>
        ) : (
          <article className="bg-white border border-[#141414] p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
            <div className="prose prose-sm prose-neutral max-w-none prose-headings:tracking-tighter prose-headings:font-bold prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h2:border-b prose-h2:border-[#141414]/10 prose-h2:pb-2 prose-a:text-[#141414] prose-a:underline leading-relaxed">
              <ReactMarkdown>{page.content}</ReactMarkdown>
            </div>
            {page.updated_at && (
              <p className="mt-8 text-[10px] font-mono opacity-40 uppercase">
                最后更新：{new Date(page.updated_at).toLocaleDateString()}
              </p>
            )}
          </article>
        )}
        <div className="mt-6">
          <button
            onClick={onBack}
            className="text-xs uppercase tracking-widest font-bold opacity-50 hover:opacity-100 transition-opacity"
          >
            ← 返回首页
          </button>
        </div>
      </main>
    </div>
  );
}
