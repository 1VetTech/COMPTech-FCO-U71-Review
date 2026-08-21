import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Award, BookOpen, ClipboardCheck, Layers, Binary, TrendingDown, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOMAINS, getDomainConfig } from "@/lib/domains";
import { fetchStats } from "@/lib/studyUtils";

export default function FinalReview() {
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
  const weakCount = stats.progress.filter((p) => {
    const acc = p.questions_attempted ? (p.correct / p.questions_attempted) * 100 : 100;
    return acc < 70 && p.questions_attempted > 0;
  }).length;

  return (
    <div className="space-y-5">
      <BackLink />
      <div className="flex items-center gap-2">
        <Award className="h-6 w-6 text-amber-400" />
        <h1 className="text-xl font-bold text-white">Final Review</h1>
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
              <Award className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">CompTIA Tech+ Final Exam</p>
              <p className="text-xs text-slate-400">90 questions · 90 minutes · 900-point scale · 80% to pass</p>
            </div>
          </div>
          <Link to="/final-exam" className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400">
            Start Final Exam
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-sm font-semibold text-slate-300">Overall Accuracy</p>
        <div className="mt-2 flex items-center gap-4">
          <p className="text-4xl font-bold text-cyan-400">{stats.accuracy}%</p>
          <p className="text-sm text-slate-400">{stats.correct}/{stats.questionsAttempted} answered correctly</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard label="Questions Completed" value={stats.questionsAttempted} icon={CheckCircle2} color="text-blue-400" />
        <SummaryCard label="Questions Remaining" value={Math.max(0, questions.length - stats.questionsAttempted)} icon={BookOpen} color="text-slate-300" />
        <SummaryCard label="Mastered Concepts" value={masteredCount} icon={Award} color="text-emerald-400" />
        <SummaryCard label="Weak Concepts" value={weakCount} icon={AlertCircle} color="text-amber-400" />
        <SummaryCard label="Missed Questions" value={stats.missed.length} icon={TrendingDown} color="text-red-400" />
        <SummaryCard label="Review Due" value={stats.reviewDue} icon={AlertCircle} color="text-rose-400" />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="mb-3 text-sm font-semibold text-white">Domain Accuracy</p>
        <div className="space-y-2">
          {DOMAINS.map((d) => {
            const dd = stats.byDomain[d.name] || { attempted: 0, correct: 0 };
            const acc = dd.attempted ? Math.round((dd.correct / dd.attempted) * 100) : 0;
            return (
              <div key={d.id} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm text-slate-300">{d.short}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full rounded-full bg-gradient-to-r ${d.color}`} style={{ width: `${acc}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-xs text-slate-400">{dd.attempted ? `${acc}%` : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <ActionBtn to="/weak-areas" label="Review Weak" icon={AlertCircle} />
        <ActionBtn to="/missed" label="Missed Qs" icon={TrendingDown} />
        <ActionBtn to="/practice-test" label="Practice Test" icon={ClipboardCheck} />
        <ActionBtn to="/flashcards" label="Flashcards" icon={Layers} />
        <ActionBtn to="/binary" label="Binary Practice" icon={Binary} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }) {
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
    <Link to={to} className="flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center transition-colors hover:border-cyan-500/40 hover:bg-slate-800/60">
      <Icon className="h-6 w-6 text-cyan-400" />
      <span className="text-xs font-semibold text-slate-200">{label}</span>
    </Link>
  );
}

function BackLink() {
  return (
    <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
      <ChevronLeft className="h-4 w-4" /> Dashboard
    </Link>
  );
}
