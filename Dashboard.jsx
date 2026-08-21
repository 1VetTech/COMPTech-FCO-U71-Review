import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Layers,
  ClipboardCheck,
  Target,
  TrendingDown,
  Binary,
  Flame,
  Trophy,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOMAINS, getDomainConfig } from "@/lib/domains";
import { fetchStats } from "@/lib/studyUtils";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchStats(),
      base44.entities.Question.filter({ active: true }, "-created_date", 1000),
    ]).then(([s, q]) => {
      setStats(s);
      setQuestions(q);
      setRecent(q.slice(0, 6));
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

  const totalQuestions = questions.length;
  const weakestDomain = Object.entries(stats.byDomain).sort(
    (a, b) => {
      const aa = a[1].attempted ? a[1].correct / a[1].attempted : 100;
      const bb = b[1].attempted ? b[1].correct / b[1].attempted : 100;
      return aa - bb;
    }
  )[0];
  const strongestDomain = Object.entries(stats.byDomain).sort((a, b) => {
    const aa = a[1].attempted ? a[1].correct / a[1].attempted : 0;
    const bb = b[1].attempted ? b[1].correct / b[1].attempted : 0;
    return bb - aa;
  })[0];

  // streak: count distinct days studied from progress last_studied (simplified - count sessions)
  const streak = stats.progress.filter(
    (p) => p.last_studied && new Date(p.last_studied).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Study Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          CompTIA Tech+ (FCO-U71) Fundamentals Review
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Questions" value={totalQuestions} icon={BookOpen} color="text-cyan-400" />
        <StatCard label="Answered" value={stats.questionsAttempted} icon={CheckCircle2} color="text-blue-400" />
        <StatCard label="Correct" value={stats.correct} icon={CheckCircle2} color="text-emerald-400" />
        <StatCard label="Incorrect" value={stats.incorrect} icon={XCircle} color="text-red-400" />
        <StatCard label="Accuracy" value={`${stats.accuracy}%`} icon={Target} color="text-violet-400" />
        <StatCard label="Study Streak" value={streak} icon={Flame} color="text-amber-400" />
        <StatCard label="Review Due" value={stats.reviewDue} icon={Clock} color="text-rose-400" />
        <StatCard
          label="Weakest Domain"
          value={weakestDomain ? getDomainConfig(weakestDomain[0]).short : "—"}
          icon={AlertCircle}
          color="text-orange-400"
        />
      </div>

      {/* Progress ring + strongest */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-1">
          <p className="text-sm font-semibold text-slate-300">Overall Progress</p>
          <div className="mt-4 flex items-center gap-5">
            <ProgressRing value={stats.accuracy} />
            <div className="space-y-1 text-sm">
              <p className="text-slate-400">Questions completed</p>
              <p className="text-2xl font-bold text-white">{stats.questionsAttempted}</p>
              <p className="text-xs text-slate-500">of {totalQuestions} available</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-300">Domain Performance</p>
            <Link to="/domains" className="text-xs text-cyan-400 hover:underline">View all →</Link>
          </div>
          <div className="mt-4 space-y-3">
            {DOMAINS.map((d) => {
              const dd = stats.byDomain[d.name] || { attempted: 0, correct: 0 };
              const acc = dd.attempted ? Math.round((dd.correct / dd.attempted) * 100) : 0;
              return (
                <div key={d.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-300">{d.short}</span>
                    <span className="text-slate-400">{dd.attempted ? `${acc}%` : "—"}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full rounded-full bg-gradient-to-r ${d.color}`} style={{ width: `${acc}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <ActionBtn to="/study" label="Start Review" icon={BookOpen} />
        <ActionBtn to="/practice-test" label="Practice Test" icon={ClipboardCheck} />
        <ActionBtn to="/flashcards" label="Flashcards" icon={Layers} />
        <ActionBtn to="/domains" label="Domain Review" icon={Target} />
        <ActionBtn to="/missed" label="Missed Questions" icon={TrendingDown} />
        <ActionBtn to="/binary" label="Binary Practice" icon={Binary} />
      </div>

      {/* Domain cards */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-white">Domain Review</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINS.map((d) => {
            const dd = stats.byDomain[d.name] || { attempted: 0, correct: 0, incorrect: 0, topics: 0 };
            const acc = dd.attempted ? Math.round((dd.correct / dd.attempted) * 100) : 0;
            const domainQs = questions.filter((q) => q.domain === d.name);
            const completion = domainQs.length
              ? Math.round((dd.attempted / domainQs.length) * 100)
              : 0;
            return (
              <div key={d.id} className={`rounded-2xl border bg-slate-900/60 p-4 ${d.border}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-xs font-semibold uppercase ${d.accent}`}>Domain {d.id}</p>
                    <p className="mt-0.5 text-sm font-bold text-white">{d.short}</p>
                    <p className="text-xs text-slate-400">{d.weight}% of exam</p>
                  </div>
                  <span className={`rounded-full ${d.bg} px-2 py-1 text-xs font-bold ${d.accent}`}>
                    {domainQs.length} Q
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <MiniBar label="Completion" value={completion} />
                  <MiniBar label="Accuracy" value={acc} />
                </div>
                <Link
                  to={`/study?domain=${encodeURIComponent(d.name)}`}
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  Start Review <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recently studied + weakest/strongest */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-sm font-semibold text-slate-300">Recently Studied Topics</p>
          <div className="mt-3 space-y-2">
            {stats.progress.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-sm">
                <span className="text-slate-200">{p.topic}</span>
                <span className="text-xs text-slate-400">{getDomainConfig(p.domain).short}</span>
              </div>
            ))}
            {stats.progress.length === 0 && (
              <p className="text-sm text-slate-500">No topics studied yet. Start a review!</p>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-sm font-semibold text-slate-300">Strengths & Weaknesses</p>
          <div className="mt-3 space-y-3">
            {strongestDomain && (
              <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5">
                <Trophy className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-xs text-emerald-400">Strongest Domain</p>
                  <p className="text-sm font-semibold text-white">{getDomainConfig(strongestDomain[0]).short}</p>
                </div>
              </div>
            )}
            {weakestDomain && (
              <div className="flex items-center gap-3 rounded-lg bg-orange-500/10 border border-orange-500/30 px-3 py-2.5">
                <AlertCircle className="h-5 w-5 text-orange-400" />
                <div>
                  <p className="text-xs text-orange-400">Weakest Domain</p>
                  <p className="text-sm font-semibold text-white">{getDomainConfig(weakestDomain[0]).short}</p>
                </div>
              </div>
            )}
            <Link to="/missed" className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2.5 text-sm hover:bg-slate-800">
              <span className="text-slate-200">Review Due</span>
              <span className="font-bold text-rose-400">{stats.reviewDue}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function ActionBtn({ to, label, icon: Icon }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center transition-colors hover:border-cyan-500/40 hover:bg-slate-800/60"
    >
      <Icon className="h-6 w-6 text-cyan-400" />
      <span className="text-xs font-semibold text-slate-200">{label}</span>
    </Link>
  );
}

function MiniBar({ label, value }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ProgressRing({ value }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-24 w-24">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(30 41 59)" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke="rgb(34 211 238)" strokeWidth="7"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-white">{value}%</span>
      </div>
    </div>
  );
}
