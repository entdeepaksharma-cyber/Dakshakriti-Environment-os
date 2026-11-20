import React, { useEffect, useState } from 'react';
import { AlertTriangle, Send, Sparkles } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { AuthUser, ResearchSession } from '../types';
import { VerificationLabel } from './StatusText';

interface ResearchViewProps {
  user: AuthUser | null;
}

const SAMPLE_QUESTIONS = [
  'What remedies exist under Section 24 and Section 33A of the Water Act, 1974 for untreated industrial effluent discharge in Kota, Rajasthan, and how did the 2024 Amendment change penalties?',
  'Explain the distinction between Strict Liability and Absolute Liability under M.C. Mehta v. Union of India (Oleum Gas Leak) and Public Liability Insurance Act, 1991.',
  'How do citizens serve a 60-day statutory notice under Section 19(b) of the Environment (Protection) Act, 1986?',
  'Explain the Public Trust Doctrine and Polluter Pays Principle with reference to Kamal Nath and Bichhri (Udaipur) judgments.',
];

export function ResearchView({ user }: ResearchViewProps) {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [question, setQuestion] = useState('');
  const [jurisdiction, setJurisdiction] = useState('Rajasthan, India');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadSessions() {
    try {
      const list = await apiRequest<ResearchSession[]>('/research/sessions');
      setSessions(list);
      if (list.length > 0 && !activeSession) {
        setActiveSession(list[0]);
      }
    } catch {
      // ignore initial
    }
  }

  useEffect(() => {
    setActiveSession(null);
    loadSessions();
  }, [user?.id]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ session: ResearchSession }>('/research/ask', {
        method: 'POST',
        body: JSON.stringify({
          question,
          jurisdiction,
          session_id: activeSession?.id,
        }),
      });
      setActiveSession(res.session);
      setQuestion('');
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete research query.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              AI Legal Research Workspace
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Grounded synthesis over Dakshakriti’s verified statutory library and Supreme Court precedents. Explicitly separates enacted law, historical/amendment positions, and judicial interpretation.
            </p>
          </div>
          <select
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 shrink-0"
          >
            <option value="Rajasthan, India">Jurisdiction: Rajasthan, India</option>
            <option value="All India">Jurisdiction: All India</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Saved Sessions & Quick Prompts */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Research Sessions
              </span>
              <button
                type="button"
                onClick={() => setActiveSession(null)}
                className="text-xs font-medium text-[#14532D] hover:underline"
              >
                + New Session
              </button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500">
                No saved research queries yet. Ask a question or pick a legal prompt below.
              </p>
            ) : (
              <div className="space-y-1.5">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSession(s)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                      activeSession?.id === s.id
                        ? 'border-[#14532D] bg-[#14532D]/5 font-medium text-slate-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="truncate">{s.title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {s.jurisdiction} · {s.messages.length / 2} turn(s)
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Suggested Research Prompts
            </div>
            <div className="space-y-1.5">
              {SAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuestion(q)}
                  className="w-full rounded-md border border-slate-200 p-2.5 text-left text-xs leading-snug text-slate-700 hover:bg-slate-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Research Thread & Input */}
        <section className="lg:col-span-8 flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-6 space-y-6">
          <div className="space-y-5">
            {!activeSession ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-6 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-[#14532D]" />
                  <span>Ask an Indian Environmental Law Research Question</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  Every answer retrieves relevant sections and judgments from Dakshakriti’s library, separates enacted statutory rules from amendments and judicial rulings, and displays source verification status.
                </p>
              </div>
            ) : (
              activeSession.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.role === 'user'
                      ? 'rounded-md border border-slate-200 bg-slate-50 p-4'
                      : 'space-y-4 rounded-md border border-slate-200 bg-white p-5'
                  }
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {msg.role === 'user' ? 'Research Query' : 'Dakshakriti Legal Synthesis'}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-900 whitespace-pre-line">
                    {msg.content}
                  </p>

                  {msg.law_distinction && (
                    <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 md:grid-cols-3">
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs font-semibold text-slate-900">Enacted Law</div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {msg.law_distinction.enacted_law}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs font-semibold text-slate-900">
                          Amendments & Historical Law
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {msg.law_distinction.amendments_and_history}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs font-semibold text-slate-900">
                          Judicial Interpretation
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {msg.law_distinction.judicial_interpretation}
                        </p>
                      </div>
                    </div>
                  )}

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="border-t border-slate-200 pt-3 space-y-2">
                      <div className="text-xs font-semibold text-slate-700">
                        Cited Sources & Verification Status
                      </div>
                      <div className="space-y-1.5">
                        {msg.citations.map((cit, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 px-3 py-2 text-xs"
                          >
                            <div>
                              <span className="font-medium text-slate-900">{cit.title}</span>
                              <span className="mx-2 text-slate-300">·</span>
                              <span className="font-mono text-[11px] text-slate-600">
                                {cit.reference}
                              </span>
                            </div>
                            <VerificationLabel status={cit.verification_status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.requires_human_verification && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <span>
                        <strong>Human Legal Verification Required:</strong> AI-assisted research is not an authoritative statement of law. Verify statutory text, current amendment notifications, and original judgment paragraphs before relying in court or regulatory filings.
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {error && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleAsk} className="space-y-3 border-t border-slate-200 pt-4">
            <textarea
              rows={3}
              required
              minLength={5}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about Water Act Section 24, Air Act Section 21, EPA Section 19 citizen notice, NGT limitation, or Rajasthan pollution controls..."
              className="w-full rounded-md border border-slate-300 p-3 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                Grounded on Dakshakriti verified statutes & Supreme Court judgments
              </span>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md bg-[#14532D] px-4 py-2 text-xs font-medium text-white hover:bg-[#166534] disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{loading ? 'Researching...' : 'Run Legal Research'}</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
