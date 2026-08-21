import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft, Clock, Flag, Award, AlertCircle, CheckCircle2, XCircle,
  ArrowRight, ArrowLeft, RotateCw, ListChecks, ClipboardCheck,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOMAINS, getDomainConfig } from "@/lib/domains";
import { shuffle, recordAnswer } from "@/lib/studyUtils";

const EXAM_QUESTIONS = 90;
const EXAM_MINUTES = 90;
const TOTAL_POINTS = 900;
const PASS_PERCENT = 80;

export default function FinalExam() {
  const [phase, setPhase] = useState("intro");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_MINUTES * 60);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [showNav, setShowNav] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showMissed, setShowMissed] = useState(false);

  const startExam = async () => {
    setLoading(true);
    let pool = await base44.entities.Question.filter({ active: true }, "-created_date", 2000);
    pool = pool.filter((q) => q.options && q.options.length > 0);
    pool = shuffle(pool).slice(0, Math.min(EXAM_QUESTIONS, pool.length));
    setQuestions(pool);
    setAnswers({});
    setFlagged({});
    setIdx(0);
    setTimeLeft(EXAM_MINUTES * 60);
    setStartedAt(Date.now());
    setResults(null);
    setConfirmSubmit(false);
    setPhase("running");
    setLoading(false);
  };

  const submitExam = useCallback(() => {
    let correct = 0;
    const perDomain = {};
    const missed = [];
    questions.forEach((q, i) => {
      const sel = answers[i] || [];
      const correctOpts = q.correct_options || [];
      let isCorrect = false;
      if (q.question_type === "Multiple Select") {
        isCorrect = sel.length === correctOpts.length && correctOpts.every((o) => sel.includes(o));
      } else {
        isCorrect = sel.length > 0 && sel[0] === correctOpts[0];
      }
      const dd = perDomain[q.domain] || { attempted: 0, correct: 0 };
      dd.attempted++;
      if (isCorrect) dd.correct++, correct++;
      else missed.push({ q, sel });
      perDomain[q.domain] = dd;
      recordAnswer(q, isCorrect, sel.map((s) => q.options[s]).join(", ")).catch(() => {});
    });
    const total = questions.length;
    const pointsEach = total ? TOTAL_POINTS / total : 0;
    const score = Math.round(correct * pointsEach);
    const pct = total ? (correct / total) * 100 : 0;
    const passed = pct >= PASS_PERCENT;
    const duration = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
    setResults({ correct, total, score, pct, passed, perDomain, missed, duration });
    setPhase("results");
    base44.entities.StudySession.create({
      session_type: "Final Exam",
      domain: "All Domains",
      total_questions: total,
      correct,
      incorrect: total - correct,
      score_percentage: Math.round(pct),
      duration_seconds: duration,
    }).catch(() => {});
  }, [answers, questions, startedAt]);

  useEffect(() => {
    if (phase !== "running") return;
    const interval = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === "running" && timeLeft === 0) submitExam();
  }, [phase, timeLeft, submitExam]);

  const toggleOption = (qIdx, optIdx) => {
    setAnswers((a) => {
      const cur = a[qIdx] || [];
      const q = questions[qIdx];
      if (q.question_type === "Multiple Select") {
        return { ...a, [qIdx]: cur.includes(optIdx) ? cur.filter((x) => x !== optIdx) : [...cur, optIdx] };
      }
      return { ...a, [qIdx]: [optIdx] };
    });
  };

  const toggleFlag = (qIdx) => setFlagged((f) => ({ ...f, [qIdx]: !f[qIdx] }));

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const answeredCount = Object.values(answers).filter((a) => a && a.length > 0).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
  const timerColor = timeLeft < 600 ? "text-red-400" : timeLeft < 1200 ? "text-amber-400" : "text-cyan-400";

  // ---- INTRO ----
  if (phase === "intro") {
    return (
      <div className="space-y-5">
        <BackLink />
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center gap-2">
            <Award className="h-7 w-7 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">CompTIA Tech+ Final Exam</h1>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Simulate the certification experience. Questions are randomized from the full bank and answers are hidden until you submit.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <RuleCard label="Questions" value={EXAM_QUESTIONS} icon={ListChecks} />
            <RuleCard label="Time Limit" value={`${EXAM_MINUTES} min`} icon={Clock} />
            <RuleCard label="Total Points" value={TOTAL_POINTS} icon={Award} />
            <RuleCard label="Pass Score" value={`${PASS_PERCENT}%`} icon={CheckCircle2} />
          </div>
          <div className="mt-5 space-y-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">Exam Rules</p>
            <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
              <li>{EXAM_QUESTIONS} questions, {EXAM_MINUTES} minutes — the exam auto-submits when time expires.</li>
              <li>Scored on a {TOTAL_POINTS}-point scale; each question is worth {TOTAL_POINTS / EXAM_QUESTIONS} points.</li>
              <li>You need at least {PASS_PERCENT}% ({Math.round(TOTAL_POINTS * PASS_PERCENT / 100)} points) to pass.</li>
              <li>Flag questions for review and navigate freely using the question navigator.</li>
              <li>Multiple-choice and multiple-select questions only; select all that apply when prompted.</li>
            </ul>
          </div>
          <button
            onClick={startExam}
            disabled={loading}
            className="mt-5 w-full rounded-xl bg-cyan-500 py-3.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "Preparing exam..." : "Start Final Exam"}
          </button>
        </div>
      </div>
    );
  }

  // ---- RESULTS ----
  if (phase === "results" && results) {
    const { correct, total, score, pct, passed, perDomain, missed, duration } = results;
    return (
      <div className="space-y-5">
        <BackLink />
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${passed ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
            {passed ? <CheckCircle2 className="h-9 w-9 text-emerald-400" /> : <XCircle className="h-9 w-9 text-red-400" />}
          </div>
          <h1 className={`mt-4 text-3xl font-bold ${passed ? "text-emerald-400" : "text-red-400"}`}>
            {passed ? "PASS" : "FAIL"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {passed ? "Congratulations — you meet the passing standard." : "Keep studying and try again when ready."}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Score" value={`${score} / ${TOTAL_POINTS}`} accent="text-cyan-400" />
            <StatCard label="Percentage" value={`${Math.round(pct)}%`} accent={passed ? "text-emerald-400" : "text-red-400"} />
            <StatCard label="Correct" value={`${correct} / ${total}`} accent="text-emerald-400" />
            <StatCard label="Time Used" value={formatTime(duration)} accent="text-slate-300" />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button onClick={startExam} className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
              <RotateCw className="h-4 w-4" /> Retake Exam
            </button>
            <Link to="/" className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Dashboard</Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="mb-3 text-sm font-semibold text-white">Domain Breakdown</p>
          <div className="space-y-2.5">
            {DOMAINS.map((d) => {
              const dd = perDomain[d.name] || { attempted: 0, correct: 0 };
              const acc = dd.attempted ? Math.round((dd.correct / dd.attempted) * 100) : 0;
              return (
                <div key={d.id} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm text-slate-300">{d.short}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full rounded-full bg-gradient-to-r ${d.color}`} style={{ width: `${acc}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-slate-400">{dd.correct}/{dd.attempted} · {dd.attempted ? `${acc}%` : "—"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {missed.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <button onClick={() => setShowMissed(!showMissed)} className="flex w-full items-center justify-between text-sm font-semibold text-white">
              <span>Review Missed Questions ({missed.length})</span>
              <span className="text-xs text-slate-400">{showMissed ? "Hide" : "Show"}</span>
            </button>
            {showMissed && (
              <div className="mt-4 space-y-3">
                {missed.map(({ q, sel }, i) => {
                  const correctOpts = q.correct_options || [];
                  return (
                    <div key={i} className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                      <p className="text-sm font-medium text-white">{i + 1}. {q.question}</p>
                      <p className="mt-2 text-xs text-red-300">
                        Your answer: {sel.length ? sel.map((s) => q.options[s]).join(", ") : "Not answered"}
                      </p>
                      <p className="text-xs text-emerald-400">Correct: {correctOpts.map((o) => q.options[o]).join(", ")}</p>
                      {q.explanation && <p className="mt-1 text-xs text-slate-400">{q.explanation}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ---- RUNNING ----
  if (questions.length === 0) {
    return (
      <div className="space-y-5">
        <BackLink />
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <p className="text-sm text-slate-400">Not enough questions available for the final exam.</p>
          <Link to="/" className="mt-4 inline-block rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const sel = answers[idx] || [];
  const correctOpts = q.correct_options || [];
  const isMulti = q.question_type === "Multiple Select";
  const dCfg = getDomainConfig(q.domain);

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNav(!showNav)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700">
            <ListChecks className="inline h-3.5 w-3.5" /> Navigator
          </button>
          <span className="text-xs text-slate-400">{answeredCount}/{questions.length} answered · {flaggedCount} flagged</span>
        </div>
        <div className={`flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-bold ${timerColor}`}>
          <Clock className="h-4 w-4" /> {formatTime(timeLeft)}
        </div>
      </div>

      {/* Navigator panel */}
      {showNav && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="grid grid-cols-8 gap-2 sm:grid-cols-12">
            {questions.map((_, i) => {
              const answered = answers[i] && answers[i].length > 0;
              const isFlagged = flagged[i];
              const isCurrent = i === idx;
              return (
                <button
                  key={i}
                  onClick={() => { setIdx(i); setShowNav(false); }}
                  className={`flex h-8 items-center justify-center rounded-md border text-xs font-semibold transition-colors ${
                    isCurrent ? "border-cyan-500 bg-cyan-500 text-slate-950"
                    : answered ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
                  } ${isFlagged && !isCurrent ? "ring-1 ring-amber-500" : ""}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>Question {idx + 1} of {questions.length}</span>
        <span className={`rounded-full ${dCfg.bg} px-2.5 py-0.5 text-xs font-semibold ${dCfg.accent}`}>{dCfg.short}</span>
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
        {isMulti && <p className="mb-3 text-xs font-semibold text-cyan-400">Select all that apply</p>}
        <h2 className="mb-5 text-lg font-semibold leading-snug text-white sm:text-xl">{q.question}</h2>
        <div className="space-y-2.5">
          {q.options.map((opt, optIdx) => {
            const isSelected = sel.includes(optIdx);
            return (
              <button
                key={optIdx}
                onClick={() => toggleOption(idx, optIdx)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  isSelected ? "border-cyan-500 bg-cyan-500/10 text-cyan-100" : "border-slate-700 bg-slate-800/50 text-slate-200 hover:border-slate-600"
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                  isSelected ? "border-cyan-500 bg-cyan-500 text-slate-950" : "border-slate-600 text-slate-400"
                }`}>{isMulti && isSelected ? "✓" : String.fromCharCode(65 + optIdx)}</span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIdx(Math.max(0, idx - 1))}
            disabled={idx === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>
          <button
            onClick={() => toggleFlag(idx)}
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
              flagged[idx] ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Flag className="h-4 w-4" /> {flagged[idx] ? "Flagged" : "Flag"}
          </button>
        </div>
        {idx + 1 < questions.length ? (
          <button
            onClick={() => setIdx(idx + 1)}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => setConfirmSubmit(true)}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400"
          >
            Submit Exam
          </button>
        )}
      </div>

      {/* Submit confirmation */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-400" />
            <h3 className="mt-3 text-lg font-bold text-white">Submit your exam?</h3>
            <p className="mt-1 text-sm text-slate-400">
              You answered {answeredCount} of {questions.length} questions. {answeredCount < questions.length ? `${questions.length - answeredCount} are unanswered. ` : ""}This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmSubmit(false)} className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Keep Working</button>
              <button onClick={submitExam} className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400">Submit Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/final-review" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
      <ChevronLeft className="h-4 w-4" /> Final Review
    </Link>
  );
}

function RuleCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3 text-center">
      <Icon className="mx-auto h-5 w-5 text-cyan-400" />
      <p className="mt-1.5 text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-lg bg-slate-800/60 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${accent}`}>{value}</p>
    </div>
  );
}
