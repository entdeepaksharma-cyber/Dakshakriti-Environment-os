import React, { useEffect, useState } from 'react';
import { FilePlus2, FileCheck2, Lock, Send, ShieldAlert } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { AuthUser, EnvironmentalReport } from '../types';
import { VerificationLabel } from './StatusText';

interface IncidentsViewProps {
  user: AuthUser | null;
  onOpenAuth: () => void;
  onNavigateToEvidence: (reportId: string) => void;
  onNavigateToComplaints: (reportId: string) => void;
}

const CATEGORIES = [
  { value: 'water_pollution', label: 'Water pollution' },
  { value: 'air_pollution', label: 'Air pollution' },
  { value: 'noise_pollution', label: 'Noise pollution' },
  { value: 'waste_management', label: 'Waste management' },
  { value: 'industrial_pollution', label: 'Industrial pollution' },
  { value: 'deforestation', label: 'Deforestation' },
  { value: 'mining', label: 'Mining-related issue' },
  { value: 'other', label: 'Other' },
];

const RAJASTHAN_DISTRICTS = [
  'Kota',
  'Jaipur',
  'Udaipur',
  'Jodhpur',
  'Alwar',
  'Bhiwadi / Khairthal-Tijara',
  'Bhilwara',
  'Pali',
  'Ajmer',
  'Bikaner',
  'Bundi',
];

export function IncidentsView({
  user,
  onOpenAuth,
  onNavigateToEvidence,
  onNavigateToComplaints,
}: IncidentsViewProps) {
  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [category, setCategory] = useState('water_pollution');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [district, setDistrict] = useState('Kota');
  const [stateName, setStateName] = useState('Rajasthan');
  const [incidentDate, setIncidentDate] = useState('2026-11-20');
  const [allegedParty, setAllegedParty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadReports() {
    if (!user) {
      setReports([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<EnvironmentalReport[]>('/reports');
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [user?.id]);

  async function handleCreateReport(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiRequest<{ report: EnvironmentalReport }>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          category,
          description,
          incident_date: incidentDate || null,
          location_text: locationText,
          district: district || null,
          state: stateName || null,
          alleged_responsible_party: allegedParty || null,
        }),
      });
      setSuccess(
        `Private observation ${res.report.report_number} saved. Recorded as an unverified citizen draft.`
      );
      setDescription('');
      setLocationText('');
      setAllegedParty('');
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save incident report.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusUpdate(reportId: string, nextStatus: string) {
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/reports/${reportId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setSuccess(`Report status updated to '${nextStatus.replace(/_/g, ' ')}'.`);
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed.');
    }
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center space-y-4">
        <Lock className="mx-auto h-8 w-8 text-slate-400" />
        <h2 className="font-display text-xl font-semibold text-slate-900">
          Private Environmental Incident Reporting
        </h2>
        <p className="mx-auto max-w-lg text-sm text-slate-600">
          Incident reports are strictly private and row-isolated by user identity. Sign in as a Citizen, Researcher, Lawyer, or Reviewer to create and inspect private observations.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="rounded-md bg-[#14532D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#166534]"
        >
          Sign In or Select Workspace Role
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Environmental Incident Reporting
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Enter observations strictly as seen. No user report becomes a verified environmental violation automatically, and any named party is recorded strictly as an allegation.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-500 shrink-0">
            Active Role: {user.role_code}
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Create Private Observation Form */}
        <section className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-6 h-fit">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <FilePlus2 className="h-4 w-4 text-[#14532D]" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Record New Private Observation
            </h2>
          </div>

          <form onSubmit={handleCreateReport} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Issue Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Observed Description (minimum 10 characters)
              </label>
              <textarea
                required
                minLength={10}
                maxLength={10000}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what was directly observed (time, colour/odour of discharge, dust plume, etc.) without stating legal conclusions."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Incident Location
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="e.g., Canal Bridge near Road No. 6, Kota"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">District</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
                >
                  {RAJASTHAN_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">State</label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Date Observed
              </label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Alleged Responsible Party (Optional — recorded as unverified allegation)
              </label>
              <input
                type="text"
                value={allegedParty}
                onChange={(e) => setAllegedParty(e.target.value)}
                placeholder="Leave blank if unknown"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-[#14532D] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#166534] disabled:opacity-60"
            >
              {submitting ? 'Saving Private Draft...' : 'Save Private Incident Draft'}
            </button>
          </form>
        </section>

        {/* Report History (Row-Isolated) */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Authorized Incident Records ({reports.length})
            </h2>
            <span className="text-xs text-slate-500">
              Filtered server-side by ownership & review scope
            </span>
          </div>

          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Loading authorized records...
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No environmental reports visible for this account yet. Create a private observation on the left to begin.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-lg border border-slate-200 bg-white p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {report.report_number}
                      </span>
                      <span className="mx-2 text-slate-300">·</span>
                      <span className="text-xs capitalize text-slate-600">
                        {report.category.replace(/_/g, ' ')}
                      </span>
                      <span className="mx-2 text-slate-300">·</span>
                      <span className="text-xs text-slate-500">
                        {report.district ? `${report.district}, ` : ''}
                        {report.state}
                      </span>
                    </div>
                    <VerificationLabel status={report.status} />
                  </div>

                  <p className="text-sm leading-relaxed text-slate-800">{report.description}</p>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div>
                      <span className="font-medium text-slate-800">Location:</span>{' '}
                      {report.location_text}
                    </div>
                    {report.alleged_responsible_party && (
                      <div>
                        <span className="font-medium text-amber-800">
                          Alleged Responsible Party (Unverified Allegation):
                        </span>{' '}
                        {report.alleged_responsible_party}
                      </div>
                    )}
                    <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                      Observed: {report.incident_date ?? 'N/A'} · Created:{' '}
                      {new Date(report.created_at).toLocaleString()} · Evidence attached:{' '}
                      {report.evidence_count ?? 0}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    {report.is_owner && (
                      <>
                        <button
                          type="button"
                          onClick={() => onNavigateToEvidence(report.id)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                        >
                          <FileCheck2 className="h-3.5 w-3.5" />
                          <span>Attach Evidence</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateToComplaints(report.id)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>Prepare Complaint Draft</span>
                        </button>
                      </>
                    )}
                    {report.is_owner && report.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(report.id, 'submitted_for_review')}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#14532D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#166534] whitespace-nowrap shrink-0"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Submit for Legal Review</span>
                      </button>
                    )}
                    {!report.is_owner &&
                      (user.role_code === 'reviewer' || user.role_code === 'lawyer') &&
                      report.status === 'submitted_for_review' && (
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(report.id, 'under_review')}
                          className="rounded-md bg-[#14532D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#166534] whitespace-nowrap shrink-0"
                        >
                          Accept into Review Queue
                        </button>
                      )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
