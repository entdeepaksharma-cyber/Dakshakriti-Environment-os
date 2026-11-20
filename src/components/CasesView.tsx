import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Judgment } from '../types';
import { VerificationLabel } from './StatusText';

export function CasesView() {
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Judgment[]>('/judgments')
      .then((data) => {
        setJudgments(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = judgments.filter((j) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      j.case_title.toLowerCase().includes(q) ||
      j.citation.toLowerCase().includes(q) ||
      j.summary.toLowerCase().includes(q) ||
      j.principles.some((p) => p.principle_name.toLowerCase().includes(q))
    );
  });

  const active = judgments.find((j) => j.id === selectedId) ?? filtered[0];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Case-Law Research Centre
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Landmark Supreme Court and NGT judgments mapped to statutory provisions and enduring environmental law doctrines.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search case, citation, or doctrine..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-[#14532D] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading case-law repository...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-2.5">
            {filtered.map((j) => {
              const isSelected = active?.id === j.id;
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => setSelectedId(j.id)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-[#14532D] bg-[#14532D]/5'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      {j.judgment_date}
                    </span>
                    <VerificationLabel status={j.verification_status} />
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-slate-900">
                    {j.case_title}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-slate-600">{j.citation}</div>
                  <div className="mt-1.5 text-xs text-slate-500 line-clamp-2">{j.summary}</div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 space-y-6 rounded-lg border border-slate-200 bg-white p-6 h-fit">
            {active ? (
              <>
                <div className="border-b border-slate-200 pb-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{active.court_name}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{active.judgment_date}</span>
                    <span aria-hidden="true">·</span>
                    <VerificationLabel status={active.verification_status} />
                  </div>
                  <h2 className="mt-2 font-display text-xl font-bold text-slate-900">
                    {active.case_title}
                  </h2>
                  <div className="mt-1 font-mono text-xs text-slate-600">
                    {active.citation} · {active.case_number}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Bench: {active.bench}</div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Case Ratio & Judicial Holding
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{active.summary}</p>
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold text-slate-800">Key Excerpt</div>
                  <blockquote className="mt-1.5 text-sm italic leading-relaxed text-slate-700">
                    “{active.full_excerpt}”
                  </blockquote>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Extracted Legal Principles
                  </h3>
                  {active.principles.map((p) => (
                    <div key={p.id} className="rounded-md border border-slate-200 p-3.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {p.principle_name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 shrink-0">
                          {p.relevant_paragraphs}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                        {p.explanation}
                      </p>
                    </div>
                  ))}
                </div>

                {active.linked_provisions && active.linked_provisions.length > 0 && (
                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Linked Statutory Provisions
                    </h3>
                    <div className="mt-2 space-y-1.5">
                      {active.linked_provisions.map((lp) => (
                        <div key={lp.id} className="text-xs text-slate-700">
                          <span className="font-mono font-semibold text-[#14532D]">
                            {lp.legislation_title} · {lp.provision_number}
                          </span>{' '}
                          — {lp.provision_heading}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-500">No matching judgment found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
