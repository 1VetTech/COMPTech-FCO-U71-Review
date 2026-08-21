import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ChevronLeft, Settings, Brain, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOMAINS } from "@/lib/domains";
import { shuffle } from "@/lib/studyUtils";
import QuestionCard from "@/components/QuestionCard";

export default function Study() {
  const [params] = useSearchParams();
  const domainParam = params.get("domain");
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [beginnerMode, setBeginnerMode] = useState(false);
  const [finished, setFinished] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [count, setCount] = useState(20);
  const [includeMissed, setIncludeMissed] = useState(true);

  const startSession = async () => {
    setLoading(true);
    setIdx(0);
    setSessionCorrect(0);
    setSessionTotal(0);
    setFinished(false);

    let pool = await base44.entities.Question.filter({ active: true }, "-created_date", 1000);
    if (domainParam && domainParam !== "All Domains") {
      pool = pool.filter((q) => q.domain === domainParam);
    }

    // Smart selection: missed first, then weak, then new, then random
    let ordered = [...pool];
    if (includeMissed) {
      const missed = await base44.entities.MissedQuestion.filter({ reviewed: false }, "-created_date", 200);
      const missedIds = new Set(missed.map((m) => m.question_id));
      const missedQs = pool.filter((q) => missedIds.has(q.id));
      const rest = pool.filter((q) => !missedIds.has(q.id));
      ordered = [...shuffle(missedQs), ...shuffle(rest)];
    } else {
      ordered = shuffle(pool);
    }

    setQuestions(ordered.slice(0, count));
    setLoading(false);
  };

  useEffect(() => {
    startSession();
  }, [domainParam, count, includeMissed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
      </div>
    );
  }

  if (questions.length === 0 || finished) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <Trophy className="mx-auto h-12 w-12 text-amber-400" />
          <h2 className="mt-3 text-xl font-bold text-white">Session Complete!</h2>
          <p className="mt-1 text-sm text-slate-400">
            You answered {sessionCorrect} of {sessionTotal} correctly ({sessionTotal ? Math.round((sessionCorrect / sessionTotal) * 100) : 0}%)
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={startSession} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
              New Session
            </button>
            <Link to="/" className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[idx];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBeginnerMode(!beginnerMode)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              beginnerMode
                ? "border-blue-500 bg-blue-500/15 text-blue-300"
                : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Brain className="h-3.5 w-3.5" /> Beginner Mode
          </button>
          <button onClick={() => setConfigOpen(!configOpen)} className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-white">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {configOpen && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="mb-3 text-sm font-semibold text-white">Session Settings</p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm text-slate-300">
              Questions:
              <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="ml-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-white">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={includeMissed} onChange={(e) => setIncludeMissed(e.target.checked)} className="accent-cyan-500" />
              Prioritize missed questions
            </label>
            <button onClick={startSession} className="rounded-lg bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
              Restart
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Question {idx + 1} of {questions.length}</span>
        <span>Score: {sessionCorrect}/{sessionTotal}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${((idx) / questions.length) * 100}%` }} />
      </div>

      <QuestionCard
        key={q.id}
        question={q}
        beginnerMode={beginnerMode}
        onAnswered={(correct) => {
          setSessionTotal((t) => t + 1);
          if (correct) setSessionCorrect((c) => c + 1);
        }}
        onNext={() => {
          if (idx + 1 < questions.length) setIdx(idx + 1);
          else setFinished(true);
        }}
      />
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
