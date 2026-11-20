import { useEffect, useState } from 'react';
import { History, Search, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { AuthUser, LegislationDoc } from '../types';
import { VerificationLabel } from './StatusText';

interface LegislationViewProps {
  user: AuthUser | null;
  onOpenAuth: () => void;
}

export function LegislationView({ user, onOpenAuth }: LegislationViewProps) {
  const [docs, setDocs] = useState<LegislationDoc[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function loadLaws() {
    const list = await apiRequest<LegislationDoc[]>('/legal-documents');
    setDocs(list);
    if (list.length > 0 && !selectedId) {
      setSelectedId(list[0].id);
      const currentVer = list[0].versions[list[0].versions.length - 1];
      setSelectedVersionId(currentVer?.id ?? '');
    }
  }

  useEffect(() => {
    setLoading(true);
    loadLaws()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredDocs = docs.filter((d) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      d.short_title.toLowerCase().includes(q) ||
      d.full_title.toLowerCase().includes(q) ||
      d.provisions.some(
        (p) =>
          p.provision_number.toLowerCase().includes(q) ||
          p.provision_heading.toLowerCase().includes(q) ||
          p.provision_text.toLowerCase().includes(q)
      )
    );
  });

  const activeDoc = docs.find((d) => d.id === selectedId) ?? filteredDocs[0];
  const activeVersion =
    activeDoc?.versions.find((v) => v.id === selectedVersionId) ??
    activeDoc?.versions[activeDoc.versions.length - 1];

  async function handleVerifyStatus(status: 'verified' | 'under_review') {
    if (!activeDoc) return;
    if (!user) {
      onOpenAuth();
      return;
    }
    setFeedback(null);
    try {
      await apiRequest(`/legal-documents/${activeDoc.id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_status: status }),
      });
      await loadLaws();
      setFeedback({
        type: 'ok',
        text: `Updated verification status of ${activeDoc.short_title} to '${status}' (logged to audit trail).`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Verification update failed.',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Indian Environmental Legislation & Amendments Library
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Version-controlled statutes with effective dates, 2023–2024 amendments, and role-gated legal source verification.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter acts or sections..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-[#14532D] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading statutory library...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Acts List */}
          <div className="lg:col-span-4 space-y-2">
            {filteredDocs.map((doc) => {
              const isSelected = activeDoc?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(doc.id);
                    const latest = doc.versions[doc.versions.length - 1];
                    setSelectedVersionId(latest?.id ?? '');
                    setFeedback(null);
                  }}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-[#14532D] bg-[#14532D]/5'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      {doc.enactment_year} · {doc.act_number}
                    </span>
                    <VerificationLabel status={doc.current_status} />
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-slate-900">
                    {doc.short_title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {doc.versions.length} version(s) · {doc.provisions.length} key provisions
                  </div>
                </button>
              );
            })}
          </div>

          {/* Statute Detail & Historical Versions */}
          <div className="lg:col-span-8 space-y-6 rounded-lg border border-slate-200 bg-white p-6">
            {activeDoc ? (
              <>
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{activeDoc.act_number}</span>
                      <span aria-hidden="true">·</span>
                      <span>Jurisdiction: {activeDoc.jurisdiction}</span>
                      <span aria-hidden="true">·</span>
                      <VerificationLabel status={activeDoc.current_status} />
                    </div>
                    <h2 className="mt-1.5 font-display text-xl font-bold text-slate-900">
                      {activeDoc.full_title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {activeDoc.summary}
                    </p>
                  </div>

                  {/* Role-gated verification test control */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleVerifyStatus('verified')}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#14532D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#166534] whitespace-nowrap shrink-0"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Verify Source</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerifyStatus('under_review')}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      Flag for Review
                    </button>
                  </div>
                </div>

                {feedback && (
                  <div
                    role="alert"
                    className={`rounded-md border px-3.5 py-2.5 text-xs ${
                      feedback.type === 'ok'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-red-200 bg-red-50 text-red-800'
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}

                {/* Historical & Amendment Versions Selector */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <History className="h-3.5 w-3.5" />
                    <span>Historical & Consolidated Versions</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {activeDoc.versions.map((ver) => {
                      const isVer = activeVersion?.id === ver.id;
                      return (
                        <button
                          key={ver.id}
                          type="button"
                          onClick={() => setSelectedVersionId(ver.id)}
                          className={`rounded-md border p-3 text-left transition-colors ${
                            isVer
                              ? 'border-[#14532D] bg-[#14532D]/5'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900">
                              {ver.version_label}
                            </span>
                            <VerificationLabel status={ver.verification_status} />
                          </div>
                          <div className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                            Effective: {ver.valid_from} → {ver.valid_until ?? 'Present'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {activeVersion && (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 space-y-1">
                      <div>
                        <span className="font-semibold">Version Reference:</span>{' '}
                        {activeVersion.official_reference}
                      </div>
                      <div>
                        <span className="font-semibold">Amendment Notes:</span>{' '}
                        {activeVersion.amendment_notes}
                      </div>
                      {activeVersion.verified_by_name && (
                        <div className="text-slate-500">
                          Reviewed by {activeVersion.verified_by_name}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Key Statutory Provisions */}
                <div className="space-y-3 border-t border-slate-200 pt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Key Statutory Provisions
                  </h3>
                  {activeDoc.provisions.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Core provisions indexed at act level; detailed sections pending curation.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {activeDoc.provisions.map((prov) => (
                        <div
                          key={prov.id}
                          className="rounded-md border border-slate-200 p-4 space-y-1.5"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="font-mono text-xs font-semibold text-[#14532D]">
                              {prov.provision_number}
                            </span>
                            <span className="text-xs font-semibold text-slate-900">
                              {prov.provision_heading}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-slate-700">
                            {prov.provision_text}
                          </p>
                          <p className="text-xs text-slate-500">
                            <span className="font-medium text-slate-700">Practical Relevance:</span>{' '}
                            {prov.practical_relevance}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {activeDoc.source && (
                  <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
                    Authoritative Repository: {activeDoc.source.source_title} ({activeDoc.source.issuing_authority})
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-500">No matching legislation found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
