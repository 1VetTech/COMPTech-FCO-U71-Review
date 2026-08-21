import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Search as SearchIcon, BookOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DOMAINS, getDomainConfig } from "@/lib/domains";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [questions, setQuestions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({ questions: [], materials: [] });

  useEffect(() => {
    Promise.all([
      base44.entities.Question.filter({ active: true }, "-created_date", 1000),
      base44.entities.StudyMaterial.list("-created_date", 1000),
    ]).then(([q, m]) => {
      setQuestions(q);
      setMaterials(m);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ questions: [], materials: [] });
      return;
    }
    const q = query.toLowerCase();
    const mq = questions.filter(
      (x) =>
        x.question?.toLowerCase().includes(q) ||
        x.answer?.toLowerCase().includes(q) ||
        x.explanation?.toLowerCase().includes(q) ||
        x.topic?.toLowerCase().includes(q) ||
        x.domain?.toLowerCase().includes(q)
    );
    const mm = materials.filter(
      (x) =>
        x.concept?.toLowerCase().includes(q) ||
        x.definition?.toLowerCase().includes(q) ||
        x.topic?.toLowerCase().includes(q) ||
        x.domain?.toLowerCase().includes(q)
    );
    setResults({ questions: mq, materials: mm });
  }, [query, questions, materials]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BackLink />
      <div className="flex items-center gap-2">
        <SearchIcon className="h-6 w-6 text-cyan-400" />
        <h1 className="text-xl font-bold text-white">Search</h1>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions, definitions, topics, concepts..."
          className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500"
        />
      </div>

      {!query.trim() && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="mb-3 text-sm font-semibold text-slate-300">Try searching for:</p>
          <div className="flex flex-wrap gap-2">
            {["binary", "hexadecimal", "RAM", "CPU", "authentication", "encryption", "database", "SQL", "cloud", "networking"].map((t) => (
              <button key={t} onClick={() => setQuery(t)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {query.trim() && (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-300">
              Questions ({results.questions.length})
            </p>
            {results.questions.length === 0 ? (
              <p className="text-sm text-slate-500">No questions found.</p>
            ) : (
              <div className="space-y-2">
                {results.questions.slice(0, 20).map((q) => {
                  const dCfg = getDomainConfig(q.domain);
                  return (
                    <Link key={q.id} to={`/study?domain=${encodeURIComponent(q.domain)}`} className="block rounded-lg border border-slate-800 bg-slate-900/60 p-3 hover:bg-slate-800/60">
                      <div className="mb-1 flex gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${dCfg.bg} ${dCfg.accent}`}>{dCfg.short}</span>
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{q.topic}</span>
                      </div>
                      <p className="text-sm text-white">{q.question}</p>
                      <p className="mt-1 text-xs text-emerald-400">A: {q.answer}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-300">
              Concepts & Definitions ({results.materials.length})
            </p>
            {results.materials.length === 0 ? (
              <p className="text-sm text-slate-500">No concepts found.</p>
            ) : (
              <div className="space-y-2">
                {results.materials.map((m, i) => {
                  const dCfg = getDomainConfig(m.domain);
                  return (
                    <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                      <div className="mb-1 flex gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${dCfg.bg} ${dCfg.accent}`}>{dCfg.short}</span>
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{m.topic}</span>
                      </div>
                      <p className="flex items-center gap-1.5 text-sm font-bold text-cyan-300"><BookOpen className="h-3.5 w-3.5" /> {m.concept}</p>
                      <p className="mt-1 text-xs text-slate-300">{m.definition}</p>
                      {m.example && <p className="mt-1 text-xs text-slate-500">Example: {m.example}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
