import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, TrendingDown, BookOpen, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getDomainConfig } from "@/lib/domains";

export default function MissedQuestions() {
  const [missed, setMissed] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    const [m, q] = await Promise.all([
      base44.entities.MissedQuestion.list("-created_date", 200),
      base44.entities.Question.list("-created_date", 1000),
    ]);
    setMissed(m.filter((x) => !x.reviewed));
    setQuestions(q);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const reviewAll = async () => {
    for (const m of missed) {
      await base44.entities.MissedQuestion.update(m.id, { reviewed: true, review_count: (m.review_count || 0) + 1 });
    }
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <BackLink />
        {missed.length > 0 && (
          <button onClick={reviewAll} className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400">
            Review All Missed
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <TrendingDown className="h-6 w-6 text-red-400" />
        <h1 className="text-xl font-bold text-white">Missed Questions</h1>
        <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-300">{missed.length}</span>
      </div>

      {missed.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <Check className="mx-auto h-12 w-12 text-emerald-400" />
          <p className="mt-3 text-sm text-slate-400">No missed questions. Great work!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {missed.map((m) => {
            const q = questions.find((x) => x.id === m.question_id);
            const dCfg = getDomainConfig(m.domain);
            if (!q) return null;
            return (
              <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${dCfg.bg} ${dCfg.accent}`}>{dCfg.short}</span>
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">{m.topic}</span>
                </div>
                <p className="text-sm font-medium text-white">{q.question}</p>
                <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                  <p className="text-red-400">Your answer: <span className="text-slate-300">{m.user_answer || "—"}</span></p>
                  <p className="text-emerald-400">Correct: <span className="text-slate-300">{m.correct_answer || q.answer}</span></p>
                </div>
                {expanded === m.id ? (
                  <p className="mt-2 rounded-lg bg-slate-800/50 p-3 text-xs text-slate-300">{q.explanation}</p>
                ) : (
                  <button onClick={() => setExpanded(m.id)} className="mt-2 text-xs text-cyan-400 hover:underline">
                    Show explanation
                  </button>
                )}
                <Link to={`/study?domain=${encodeURIComponent(m.domain)}`} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                  <BookOpen className="h-3.5 w-3.5" /> Review Topic
                </Link>
              </div>
            );
          })}
        </div>
      )}
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
