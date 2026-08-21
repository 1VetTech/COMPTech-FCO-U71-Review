import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ArrowRight, BookOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOMAINS, getDomainConfig } from "@/lib/domains";
import { fetchStats } from "@/lib/studyUtils";

export default function Domains() {
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Question.filter({ active: true }, "-created_date", 1000),
      fetchStats(),
    ]).then(([q, s]) => {
      setQuestions(q);
      setStats(s);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
      </div>
    );
  }

  if (selected) {
    const dCfg = getDomainConfig(selected);
    const domainQs = questions.filter((q) => q.domain === selected);
    const topics = [...new Set(domainQs.map((q) => q.topic))];
    return (
      <div className="space-y-5">
        <Link to="/domains" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ChevronLeft className="h-4 w-4" /> All Domains
        </Link>
        <div className={`rounded-2xl border bg-slate-900/60 p-6 ${dCfg.border}`}>
          <p className={`text-xs font-semibold uppercase ${dCfg.accent}`}>Domain {dCfg.id} · {dCfg.weight}% of exam</p>
          <h1 className="mt-1 text-2xl font-bold text-white">{selected}</h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link to={`/study?domain=${encodeURIComponent(selected)}`} className="flex items-center justify-between rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4 hover:bg-cyan-500/20">
            <span className="flex items-center gap-2 text-sm font-semibold text-cyan-200"><BookOpen className="h-4 w-4" /> Study Domain ({domainQs.length} Q)</span>
            <ArrowRight className="h-4 w-4 text-cyan-300" />
          </Link>
          <Link to={`/practice-test`} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 p-4 hover:bg-slate-700">
            <span className="text-sm font-semibold text-white">Take Practice Test</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
          <Link to={`/flashcards`} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 p-4 hover:bg-slate-700">
            <span className="text-sm font-semibold text-white">Domain Flashcards</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Topics in this Domain</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {topics.map((t) => {
              const tQs = domainQs.filter((q) => q.topic === t);
              return (
                <div key={t} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm">
                  <span className="text-slate-200">{t}</span>
                  <span className="text-xs text-slate-400">{tQs.length} Q</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BackLink />
      <h1 className="text-xl font-bold text-white">CompTIA Tech+ Domains</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {DOMAINS.map((d) => {
          const dd = stats.byDomain[d.name] || { attempted: 0, correct: 0 };
          const acc = dd.attempted ? Math.round((dd.correct / dd.attempted) * 100) : 0;
          const domainQs = questions.filter((q) => q.domain === d.name);
          const completion = domainQs.length ? Math.round((dd.attempted / domainQs.length) * 100) : 0;
          return (
            <button key={d.id} onClick={() => setSelected(d.name)} className={`rounded-2xl border bg-slate-900/60 p-5 text-left transition-colors hover:bg-slate-800/60 ${d.border}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase ${d.accent}`}>Domain {d.id}</p>
                  <p className="mt-1 text-base font-bold text-white">{d.name}</p>
                  <p className="text-xs text-slate-400">{d.weight}% of exam · {domainQs.length} questions</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full rounded-full bg-gradient-to-r ${d.color}`} style={{ width: `${completion}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Completion {completion}%</span>
                  <span>Accuracy {dd.attempted ? `${acc}%` : "—"}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                Start Review <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
      <ChevronLeft className="h-4 w-4" /> Dashboard
    </Link>
  );
}
