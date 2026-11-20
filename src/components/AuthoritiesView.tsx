import { useEffect, useState } from 'react';
import { Globe, Mail, MapPin, Search } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Authority } from '../types';
import { VerificationLabel } from './StatusText';

export function AuthoritiesView() {
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | 'Rajasthan' | 'Central'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<Authority[]>('/authorities')
      .then(setAuthorities)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = authorities.filter((a) => {
    if (stateFilter === 'Rajasthan' && a.state !== 'Rajasthan') return false;
    if (stateFilter === 'Central' && a.state === 'Rajasthan') return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.authority_name.toLowerCase().includes(q) ||
      a.district.toLowerCase().includes(q) ||
      a.jurisdiction.toLowerCase().includes(q) ||
      a.mandate.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Rajasthan & Central Environmental Authority Directory
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Jurisdictions, statutory mandates, and official addresses for Rajasthan State Pollution Control Board (RSPCB) offices, SEIAA, RSBB, CPCB, and NGT. Verify current officer contacts before formal legal dispatch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-1">
              {(['all', 'Rajasthan', 'Central'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStateFilter(f)}
                  className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    stateFilter === f
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f === 'all' ? 'All Desks' : f}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Kota, Jaipur, NGT..."
                className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-[#14532D] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading authority directory...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((a) => (
            <article
              key={a.id}
              className="rounded-lg border border-slate-200 bg-white p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">
                    {a.authority_type} · {a.district}, {a.state}
                  </div>
                  <h2 className="mt-1 font-display text-base font-semibold text-slate-900">
                    {a.authority_name}
                  </h2>
                </div>
                <VerificationLabel status={a.verification_status} />
              </div>

              <p className="text-xs leading-relaxed text-slate-600">{a.mandate}</p>

              <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{a.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="font-mono text-[11px]">{a.official_contact}</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <a
                    href={a.official_website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-[#14532D] hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>{a.official_website}</span>
                  </a>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    Checked {a.last_verified_at.slice(0, 10)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
