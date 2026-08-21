import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, TrendingDown as TrendingUp, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOMAINS, getDomainConfig, CONFIDENCE_LABELS, CONFIDENCE_COLORS } from "@/lib/domains";
import { fetchStats } from "@/lib/studyUtils";

export default function Progress() {
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

  const masteredCount = stats.progress.filter((p) => p.mastered).length;
  const totalTopics = new Set(questions.map((q) => `${q.domain}|${q.topic}`)).size;

  return (
    <div className="space-y-5">
      <BackLink />
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-cyan-400" />
        <h1 className="text-xl font-bold text-white">Progress Tracking</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Questions Attempted</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.questionsAttempted}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Overall Accuracy</p>
          <p className="mt-1 text-2xl font-bold text-cyan-400">{stats.accuracy}%</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Topics Mastered</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{masteredCount}</p>
          <p className="text-xs text-slate-500">of {totalTopics}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Review Due</p>
          <p className="mt-1 text-2xl font-bold text-rose-400">{stats.reviewDue}</p>
        </div>
      </div>

      {/* Per-domain progress bars */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="mb-4 text-sm font-semibold text-white">Domain Progress</p>
        <div className="space-y-4">
          {DOMAINS.map((d) => {
            const dd = stats.byDomain[d.name] || { attempted: 0, correct: 0, incorrect: 0, topics: 0 };
            const domainQs = questions.filter((q) => q.domain === d.name);
            const completion = domainQs.length ? Math.round((dd.attempted / domainQs.length) * 100) : 0;
            const acc = dd.attempted ? Math.round((dd.correct / dd.attempted) * 100) : 0;
            return (
              <div key={d.id} className={`rounded-xl border ${d.border} ${d.bg} p-4`}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{d.short}</p>
                  <span className={`text-xs font-semibold ${d.accent}`}>{d.weight}% of exam</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="mb-0.5 flex justify-between text-xs text-slate-400">
                      <span>Completion</span><span>{completion}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className={`h-full rounded-full bg-gradient-to-r ${d.color}`} style={{ width: `${completion}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-0.5 flex justify-between text-xs text-slate-400">
                      <span>Accuracy</span><span>{dd.attempted ? `${acc}%` : "—"}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${dd.attempted ? acc : 0}%` }} />
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex gap-3 text-xs text-slate-400">
                  <span>{dd.attempted} attempted</span>
                  <span className="text-emerald-400">{dd.correct} correct</span>
                  <span className="text-red-400">{dd.incorrect} incorrect</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confidence breakdown */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="mb-3 text-sm font-semibold text-white">Confidence Level Breakdown</p>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((lvl) => {
            const count = stats.cards.filter((c) => c.confidence_level === lvl).length;
            return (
              <div key={lvl} className="rounded-lg border border-slate-800 bg-slate-800/40 p-3 text-center">
                <div className={`mx-auto mb-2 h-2 w-2 rounded-full ${CONFIDENCE_COLORS[lvl]}`} />
                <p className="text-xs text-slate-400">{CONFIDENCE_LABELS[lvl]}</p>
                <p className="text-lg font-bold text-white">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent study activity */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="mb-3 text-sm font-semibold text-white">Recent Study Activity</p>
        <div className="space-y-2">
          {stats.progress.slice(0, 10).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-sm">
              <div>
                <p className="text-slate-200">{p.topic}</p>
                <p className="text-xs text-slate-500">{getDomainConfig(p.domain).short}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{p.questions_attempted} attempted</span>
                {p.mastered && <span className="text-emerald-400">★ Mastered</span>}
                {p.last_studied && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(p.last_studied).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
          {stats.progress.length === 0 && <p className="text-sm text-slate-500">No activity yet.</p>}
        </div>
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
