import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, BarChart3, Target } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOMAINS, getDomainConfig } from "@/lib/domains";
import { fetchStats } from "@/lib/studyUtils";

const CATEGORY = (acc) => {
  if (acc >= 90) return { label: "Strong", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30" };
  if (acc >= 80) return { label: "Good", color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/30" };
  if (acc >= 70) return { label: "Needs Review", color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30" };
  return { label: "Weak", color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30" };
};

export default function WeakAreas() {
  const [stats, setStats] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchStats(),
      base44.entities.Question.filter({ active: true }, "-created_date", 1000),
    ]).then(([s, q]) => {
      setStats(s);
      setQuestions(q);
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

  const topicAcc = {};
  for (const p of stats.progress) {
    const acc = p.questions_attempted ? (p.correct / p.questions_attempted) * 100 : null;
    if (acc !== null) {
      topicAcc[`${p.domain}|${p.topic}`] = { acc, attempted: p.questions_attempted };
    }
  }
  const weakTopics = Object.entries(topicAcc)
    .filter(([, v]) => v.acc < 70 && v.attempted >= 1)
    .sort((a, b) => a[1].acc - b[1].acc);

  const weakestDomain = Object.entries(stats.byDomain)
    .filter(([, d]) => d.attempted > 0)
    .sort((a, b) => a[1].correct / a[1].attempted - b[1].correct / b[1].attempted)[0];

  const mostMissed = Object.entries(stats.byDomain)
    .filter(([, d]) => d.attempted > 0)
    .sort((a, b) => b[1].incorrect - a[1].incorrect)[0];

  const needsReview = stats.progress.filter((p) => {
    const acc = p.questions_attempted ? (p.correct / p.questions_attempted) * 100 : 0;
    return acc < 80 && p.questions_attempted > 0;
  });

  return (
    <div className="space-y-5">
      <BackLink />
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-amber-400" />
        <h1 className="text-xl font-bold text-white">Weak Areas</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-xs text-red-400">Weakest Domain</p>
          <p className="mt-1 text-lg font-bold text-white">{weakestDomain ? getDomainConfig(weakestDomain[0]).short : "—"}</p>
          <p className="text-xs text-slate-400">{weakestDomain ? `${Math.round((weakestDomain[1].correct / weakestDomain[1].attempted) * 100)}%` : "No data"}</p>
        </div>
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <p className="text-xs text-orange-400">Most Missed Concepts</p>
          <p className="mt-1 text-lg font-bold text-white">{mostMissed ? getDomainConfig(mostMissed[0]).short : "—"}</p>
          <p className="text-xs text-slate-400">{mostMissed ? `${mostMissed[1].incorrect} missed` : "No data"}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs text-amber-400">Topics Needing Review</p>
          <p className="mt-1 text-lg font-bold text-white">{needsReview.length}</p>
          <p className="text-xs text-slate-400">below 80% accuracy</p>
        </div>
      </div>

      {/* Category legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { label: "90-100% Strong", c: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
          { label: "80-89% Good", c: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
          { label: "70-79% Needs Review", c: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
          { label: "<70% Weak", c: "text-red-400 bg-red-500/15 border-red-500/30" },
        ].map((x) => (
          <span key={x.label} className={`rounded-full border px-2.5 py-1 font-semibold ${x.c}`}>{x.label}</span>
        ))}
      </div>

      {/* Domain accuracy breakdown */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="mb-3 text-sm font-semibold text-white">Domain Accuracy</p>
        <div className="space-y-3">
          {DOMAINS.map((d) => {
            const dd = stats.byDomain[d.name] || { attempted: 0, correct: 0 };
            const acc = dd.attempted ? Math.round((dd.correct / dd.attempted) * 100) : 0;
            const cat = CATEGORY(acc || 0);
            return (
              <div key={d.id} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm text-slate-300">{d.short}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full rounded-full bg-gradient-to-r ${d.color}`} style={{ width: `${acc}%` }} />
                </div>
                <span className={`w-24 shrink-0 text-right text-xs font-semibold ${cat.color}`}>{dd.attempted ? `${acc}% · ${cat.label}` : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weak topics */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="mb-3 text-sm font-semibold text-white">Weakest Topics</p>
        {weakTopics.length === 0 ? (
          <p className="text-sm text-slate-400">No weak topics yet. Keep studying!</p>
        ) : (
          <div className="space-y-2">
            {weakTopics.slice(0, 12).map(([key, v]) => {
              const [domain, topic] = key.split("|");
              const cat = CATEGORY(v.acc);
              return (
                <div key={key} className={`flex items-center justify-between rounded-lg border ${cat.border} ${cat.bg} px-3 py-2`}>
                  <div>
                    <p className="text-sm font-medium text-white">{topic}</p>
                    <p className="text-xs text-slate-400">{getDomainConfig(domain).short}</p>
                  </div>
                  <span className={`text-sm font-bold ${cat.color}`}>{Math.round(v.acc)}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link to="/study" className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
        <Target className="h-4 w-4" /> Review Weak Areas
      </Link>
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
