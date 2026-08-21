import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ClipboardCheck, Trophy, RotateCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOMAINS, getDomainConfig } from "@/lib/domains";
import { shuffle } from "@/lib/studyUtils";
import QuestionCard from "@/components/QuestionCard";

export default function PracticeTest() {
  const [phase, setPhase] = useState("setup"); // setup, running, results
  const [count, setCount] = useState(25);
  const [domain, setDomain] = useState("All Domains");
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState({ correct: 0, incorrect: 0, perDomain: {}, perTopic: {}, missed: [] });
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    let pool = await base44.entities.Question.filter({ active: true }, "-created_date", 1000);
    if (domain !== "All Domains") pool = pool.filter((q) => q.domain === domain);
    // Practice test uses multiple choice / multiple select / true-false questions only
    pool = pool.filter((q) => q.options && q.options.length > 0);
    pool = shuffle(pool).slice(0, Math.min(count, pool.length));
    setQuestions(pool);
    setIdx(0);
    setResults({ correct: 0, incorrect: 0, perDomain: {}, perTopic: {}, missed: [] });
    setPhase("running");
    setLoading(false);
  };

  if (phase === "setup") {
    return (
      <div className="space-y-5">
        <BackLink />
        <div className="max-w-lg rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white">Practice Test</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">Questions are randomized and never repeat within the same test. The correct answer is hidden until you submit.</p>

          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-300">Number of Questions</p>
              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 75].map((n) => (
                  <button key={n} onClick={() => setCount(n)} className={`rounded-lg border py-2 text-sm font-semibold transition-colors ${count === n ? "border-cyan-500 bg-cyan-500/15 text-cyan-300" : "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-300">Domain</p>
              <select value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
                <option>All Domains</option>
                {DOMAINS.map((d) => <option key={d.id}>{d.name}</option>)}
              </select>
            </div>
            <button onClick={start} disabled={loading} className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50">
              {loading ? "Preparing..." : "Start Practice Test"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "results") {
    const total = results.correct + results.incorrect;
    const pct = total ? Math.round((results.correct / total) * 100) : 0;
    const weakestTopic = Object.entries(results.perTopic).sort((a, b) => {
      const aa = a[1].attempted ? a[1].correct / a[1].attempted : 0;
      const bb = b[1].attempted ? b[1].correct / b[1].attempted : 0;
      return aa - bb;
    })[0];
    const strongestTopic = Object.entries(results.perTopic).sort((a, b) => {
      const aa = a[1].attempted ? a[1].correct / a[1].attempted : 0;
      const bb = b[1].attempted ? b[1].correct / b[1].attempted : 0;
      return bb - aa;
    })[0];

    return (
      <div className="space-y-5">
        <BackLink />
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
          <Trophy className="mx-auto h-12 w-12 text-amber-400" />
          <h1 className="mt-3 text-2xl font-bold text-white">{pct}%</h1>
          <p className="text-sm text-slate-400">{results.correct} correct · {results.incorrect} incorrect</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-800/60 p-3">
              <p className="text-xs text-slate-400">Score</p>
              <p className="text-lg font-bold text-white">{results.correct}/{total}</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-3">
              <p className="text-xs text-slate-400">Weakest Domain</p>
              <p className="text-sm font-bold text-orange-400">{Object.entries(results.perDomain).sort((a, b) => (a[1].correct/a[1].attempted||0) - (b[1].correct/b[1].attempted||0))[0]?.[0] ? getDomainConfig(Object.entries(results.perDomain).sort((a, b) => (a[1].correct/a[1].attempted||1) - (b[1].correct/b[1].attempted||1))[0][0]).short : "—"}</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-3">
              <p className="text-xs text-slate-400">Weakest Topic</p>
              <p className="text-sm font-bold text-orange-400">{weakestTopic ? weakestTopic[0] : "—"}</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-3">
              <p className="text-xs text-slate-400">Strongest Topic</p>
              <p className="text-sm font-bold text-emerald-400">{strongestTopic ? strongestTopic[0] : "—"}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button onClick={() => setPhase("setup")} className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400">New Test</button>
            <Link to="/missed" className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Review Missed</Link>
          </div>
        </div>

        {results.missed.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="mb-3 text-sm font-semibold text-white">Questions Missed ({results.missed.length})</p>
            <div className="space-y-3">
              {results.missed.map((q, i) => (
                <div key={i} className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                  <p className="text-sm font-medium text-white">{i + 1}. {q.question}</p>
                  <p className="mt-1 text-xs text-emerald-400">Correct: {q.answer}</p>
                  <p className="text-xs text-slate-400">{q.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // running
  if (questions.length === 0) {
    return (
      <div className="space-y-5">
        <BackLink />
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <p className="text-sm text-slate-400">No questions available for this selection.</p>
          <button onClick={() => setPhase("setup")} className="mt-4 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Back</button>
        </div>
      </div>
    );
  }

  const q = questions[idx];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <BackLink />
        <button onClick={() => setPhase("setup")} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <RotateCw className="h-3.5 w-3.5" /> Restart
        </button>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Question {idx + 1} of {questions.length}</span>
        <span>Domain: {getDomainConfig(q.domain).short}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>

      <QuestionCard
        key={q.id}
        question={q}
        explainOptions
        onAnswered={(correct) => {
          setResults((r) => {
            const pd = { ...r.perDomain };
            const pt = { ...r.perTopic };
            const d = pd[q.domain] || { attempted: 0, correct: 0 };
            d.attempted++; if (correct) d.correct++;
            pd[q.domain] = d;
            const t = pt[q.topic] || { attempted: 0, correct: 0 };
            t.attempted++; if (correct) t.correct++;
            pt[q.topic] = t;
            return {
              correct: r.correct + (correct ? 1 : 0),
              incorrect: r.incorrect + (correct ? 0 : 1),
              perDomain: pd,
              perTopic: pt,
              missed: correct ? r.missed : [...r.missed, q],
            };
          });
        }}
        onNext={() => {
          if (idx + 1 < questions.length) setIdx(idx + 1);
          else setPhase("results");
        }}
        nextLabel={idx + 1 < questions.length ? "Next Question" : "Finish Test"}
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
