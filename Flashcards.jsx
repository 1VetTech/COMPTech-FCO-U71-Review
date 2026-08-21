import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, RotateCw, Check, AlertTriangle, X, Layers } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOMAINS, getDomainConfig, CONFIDENCE_LABELS, CONFIDENCE_COLORS } from "@/lib/domains";
import { shuffle, recordAnswer } from "@/lib/studyUtils";
import QuestionCard from "@/components/QuestionCard";

export default function Flashcards() {
  const [questions, setQuestions] = useState([]);
  const [progress, setProgress] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState("All Domains");
  const [mode, setMode] = useState("flip"); // "flip" | "mc"

  const loadCards = async () => {
    setLoading(true);
    let [qs, fp] = await Promise.all([
      base44.entities.Question.filter({ active: true }, "-created_date", 1000),
      base44.entities.FlashcardProgress.list("-updated_date", 1000),
    ]);
    setProgress(fp);
    const progMap = Object.fromEntries(fp.map((p) => [p.question_id, p]));
    if (domainFilter !== "All Domains") qs = qs.filter((q) => q.domain === domainFilter);
    if (mode === "mc") qs = qs.filter((q) => q.options && q.options.length > 0);
    // Sort: due cards first, then by lowest confidence, then new
    const now = new Date();
    qs = qs.sort((a, b) => {
      const pa = progMap[a.id];
      const pb = progMap[b.id];
      const aDue = pa && new Date(pa.next_review) <= now ? 1 : 0;
      const bDue = pb && new Date(pb.next_review) <= now ? 1 : 0;
      if (aDue !== bDue) return bDue - aDue;
      const ac = pa?.confidence_level || 1;
      const bc = pb?.confidence_level || 1;
      return ac - bc;
    });
    setQuestions(qs);
    setIdx(0);
    setFlipped(false);
    setLoading(false);
  };

  useEffect(() => {
    loadCards();
  }, [domainFilter, mode]);

  const rate = async (correct) => {
    const q = questions[idx];
    await recordAnswer(q, correct, correct ? q.answer : "missed");
    setFlipped(false);
    if (idx + 1 < questions.length) setIdx(idx + 1);
    else loadCards();
  };

  const nextMC = () => {
    if (idx + 1 < questions.length) setIdx(idx + 1);
    else loadCards();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-5">
        <BackLink />
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <Layers className="mx-auto h-12 w-12 text-cyan-400" />
          <p className="mt-3 text-sm text-slate-400">No flashcards available for this filter.</p>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const fp = progress.find((p) => p.question_id === q.id);
  const dCfg = getDomainConfig(q.domain);

  return (
    <div className="space-y-5">
      <BackLink />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white">Flashcards</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-700 bg-slate-800 p-0.5">
            <button onClick={() => setMode("flip")} className={`rounded-md px-3 py-1 text-xs font-semibold ${mode === "flip" ? "bg-cyan-500 text-slate-950" : "text-slate-400"}`}>Flip Cards</button>
            <button onClick={() => setMode("mc")} className={`rounded-md px-3 py-1 text-xs font-semibold ${mode === "mc" ? "bg-cyan-500 text-slate-950" : "text-slate-400"}`}>Multiple Choice</button>
          </div>
          <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white">
            <option>All Domains</option>
            {DOMAINS.map((d) => <option key={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Card {idx + 1} of {questions.length}</span>
        {fp && (
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${CONFIDENCE_COLORS[fp.confidence_level]}`} />
            {CONFIDENCE_LABELS[fp.confidence_level]} · {fp.review_count} reviews
          </span>
        )}
      </div>

      {mode === "mc" ? (
        <QuestionCard
          key={q.id}
          question={q}
          onAnswered={(correct) => recordAnswer(q, correct, correct ? q.answer : "missed")}
          onNext={nextMC}
          nextLabel={idx + 1 < questions.length ? "Next Card" : "Finish"}
        />
      ) : (
        <>
          {/* Card */}
          <div className="flip-card h-72 cursor-pointer" onClick={() => setFlipped(!flipped)}>
            <div className={`flip-inner h-full w-full transition-transform duration-500 ${flipped ? "flipped" : ""}`}>
              {/* Front */}
              <div className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-center">
                <span className={`absolute left-4 top-4 rounded-full ${dCfg.bg} px-2.5 py-1 text-xs font-semibold ${dCfg.accent}`}>{dCfg.short}</span>
                {fp && (
                  <span className="absolute right-4 top-4 rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                    {q.question_type}
                  </span>
                )}
                <p className="text-lg font-semibold text-white">{q.question}</p>
                <p className="mt-4 text-xs text-slate-500">Tap to reveal answer</p>
              </div>
              {/* Back */}
              <div className="flip-face back absolute inset-0 flex flex-col items-center justify-center overflow-auto rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-center">
                <p className="text-lg font-bold text-cyan-300">{q.answer}</p>
                {q.explanation && <p className="mt-3 text-sm text-slate-300">{q.explanation}</p>}
                {q.beginner_example && <p className="mt-2 text-xs text-slate-400">Example: {q.beginner_example}</p>}
              </div>
            </div>
          </div>

          {flipped ? (
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => rate(false)} className="flex flex-col items-center gap-1 rounded-xl border border-red-500/40 bg-red-500/10 py-3 text-red-300 hover:bg-red-500/20">
                <X className="h-5 w-5" /> <span className="text-xs font-semibold">Missed It</span>
              </button>
              <button onClick={() => rate(false)} className="flex flex-col items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/10 py-3 text-amber-300 hover:bg-amber-500/20">
                <AlertTriangle className="h-5 w-5" /> <span className="text-xs font-semibold">Needs Review</span>
              </button>
              <button onClick={() => rate(true)} className="flex flex-col items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-emerald-300 hover:bg-emerald-500/20">
                <Check className="h-5 w-5" /> <span className="text-xs font-semibold">Know It</span>
              </button>
            </div>
          ) : (
            <button onClick={() => setFlipped(true)} className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
              Reveal Answer
            </button>
          )}

          <p className="text-center text-xs text-slate-500">
            Cards are never removed when you get them correct—they appear less often as your confidence grows.
          </p>
        </>
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
