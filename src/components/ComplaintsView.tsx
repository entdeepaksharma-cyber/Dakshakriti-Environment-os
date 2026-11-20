import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, FileSignature, Lock, Send, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { AuthUser, Authority, ComplaintItem, EnvironmentalReport } from '../types';
import { VerificationLabel } from './StatusText';

interface ComplaintsViewProps {
  user: AuthUser | null;
  onOpenAuth: () => void;
  preselectedReportId?: string;
}

export function ComplaintsView({
  user,
  onOpenAuth,
  preselectedReportId,
}: ComplaintsViewProps) {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [editedText, setEditedText] = useState('');

  // Generator state
  const [reportId, setReportId] = useState(preselectedReportId ?? '');
  const [authorityId, setAuthorityId] = useState('auth-rspcb-kota');
  const [docType, setDocType] = useState('environmental_complaint');

  // Explicit dispatch authorization state
  const [confirmCheck, setConfirmCheck] = useState(false);
  const [ackRef, setAckRef] = useState('');
  const [channelNotes, setChannelNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (preselectedReportId) setReportId(preselectedReportId);
  }, [preselectedReportId]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    try {
      const [cmpList, repList, authList] = await Promise.all([
        apiRequest<ComplaintItem[]>('/complaints').catch(() => []),
        apiRequest<EnvironmentalReport[]>('/reports').catch(() => []),
        apiRequest<Authority[]>('/authorities'),
      ]);
      setComplaints(cmpList);
      const ownedReports = repList.filter((r) => r.is_owner);
      setReports(ownedReports);
      setAuthorities(authList);
      if (!reportId && ownedReports.length > 0) {
        setReportId(ownedReports[0].id);
      }
      if (cmpList.length > 0) {
        const target = cmpList.find((c) => c.id === selectedComplaintId) ?? cmpList[0];
        setSelectedComplaintId(target.id);
        setEditedText(target.draft_text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load complaints.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [user?.id]);

  const active = complaints.find((c) => c.id === selectedComplaintId) ?? complaints[0];

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!reportId) {
      setError('Select one of your incident reports first.');
      return;
    }
    setError('');
    setStatusMsg('');
    try {
      const created = await apiRequest<ComplaintItem>('/complaints/generate', {
        method: 'POST',
        body: JSON.stringify({
          report_id: reportId,
          authority_id: authorityId,
          document_type: docType,
        }),
      });
      setStatusMsg(`Generated draft ${created.complaint_number} (Version 1).`);
      setSelectedComplaintId(created.id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate complaint draft.');
    }
  }

  async function handleSaveVersion(submitForReview = false) {
    if (!active) return;
    setError('');
    setStatusMsg('');
    try {
      await apiRequest(`/complaints/${active.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          draft_text: editedText,
          submit_for_review: submitForReview,
        }),
      });
      setStatusMsg(
        submitForReview
          ? 'Draft saved and submitted to Lawyer / Reviewer queue.'
          : 'Saved new draft revision.'
      );
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft.');
    }
  }

  async function handleApprove() {
    if (!active) return;
    setError('');
    setStatusMsg('');
    try {
      await apiRequest(`/complaints/${active.id}/approve`, { method: 'POST' });
      setStatusMsg('Legal review approved. User may now authorize external dispatch.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval denied.');
    }
  }

  async function handleAuthorizeSubmission(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    setError('');
    setStatusMsg('');
    try {
      await apiRequest(`/complaints/${active.id}/authorize-submission`, {
        method: 'POST',
        body: JSON.stringify({
          explicit_user_confirmation: confirmCheck,
          acknowledgement_reference: ackRef,
          channel_notes: channelNotes,
        }),
      });
      setStatusMsg('Explicit user authorization & dispatch reference recorded.');
      setConfirmCheck(false);
      setAckRef('');
      setChannelNotes('');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authorization failed.');
    }
  }

  function handleDownloadTxt(c: ComplaintItem) {
    const blob = new Blob([c.draft_text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${c.complaint_number}-v${c.current_version}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center space-y-4">
        <Lock className="mx-auto h-8 w-8 text-slate-400" />
        <h2 className="font-display text-xl font-semibold text-slate-900">
          Complaint Preparation & Legal Review Studio
        </h2>
        <p className="mx-auto max-w-lg text-sm text-slate-600">
          Generate statutory complaints, RTI requests, or 60-day EPA Section 19 notices. No complaint is ever submitted automatically without legal review and explicit user confirmation.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="rounded-md bg-[#14532D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#166534]"
        >
          Sign In to Complaint Studio
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Complaint Preparation & Explicit Approval Studio
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Drafts pass through structured stages: Draft → Legal Review (Lawyer/Reviewer) → Explicit User Authorization. Dakshakriti prepares verified briefs and records external dispatch references without pretending to auto-submit to government servers.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          {error}
        </div>
      )}
      {statusMsg && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          {statusMsg}
        </div>
      )}

      {/* Draft Generator Bar */}
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-display text-sm font-semibold text-slate-900">
          Generate New Legal Representation Draft
        </h2>
        <form onSubmit={handleGenerate} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900"
          >
            <option value="">Select your incident report...</option>
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.report_number} · {r.location_text}
              </option>
            ))}
          </select>

          <select
            value={authorityId}
            onChange={(e) => setAuthorityId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900"
          >
            {authorities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.authority_name}
              </option>
            ))}
          </select>

          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900"
          >
            <option value="environmental_complaint">Environmental Inspection Complaint</option>
            <option value="rti_application">RTI Consent/Monitoring Request</option>
            <option value="legal_notice">60-Day Citizen Notice (EPA Sec. 19(b))</option>
            <option value="ngt_petition_outline">NGT Sec. 14 Petition Outline</option>
          </select>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#14532D] px-4 py-2 text-xs font-medium text-white hover:bg-[#166534] whitespace-nowrap shrink-0"
          >
            <FileSignature className="h-3.5 w-3.5" />
            <span>Generate Draft</span>
          </button>
        </form>
      </section>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading complaint drafts...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* List of Complaints */}
          <div className="lg:col-span-4 space-y-2.5">
            {complaints.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-5 text-xs text-slate-500">
                No complaint drafts visible for this account. Generate one above from an incident report.
              </div>
            ) : (
              complaints.map((c) => {
                const isSel = active?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedComplaintId(c.id);
                      setEditedText(c.draft_text);
                    }}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      isSel
                        ? 'border-[#14532D] bg-[#14532D]/5'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {c.complaint_number}
                      </span>
                      <VerificationLabel status={c.status} />
                    </div>
                    <div className="mt-1.5 text-xs font-medium text-slate-900 line-clamp-2">
                      {c.title}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      v{c.current_version} · {c.authority?.authority_name ?? 'Authority'}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Draft Editor & Approval Controls */}
          <div className="lg:col-span-8 space-y-5 rounded-lg border border-slate-200 bg-white p-6">
            {active ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono">{active.complaint_number}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">Version {active.current_version}</span>
                      <span aria-hidden="true">·</span>
                      <VerificationLabel status={active.status} />
                    </div>
                    <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
                      {active.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600">
                      <span className="font-semibold">Legal Basis:</span> {active.legal_basis}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadTxt(active)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export Brief (.txt)</span>
                  </button>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Editable Legal Draft Text
                  </label>
                  <textarea
                    rows={14}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-slate-50 p-3.5 font-mono text-xs leading-relaxed text-slate-900 focus:border-[#14532D] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSaveVersion(false)}
                    className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    Save Revision (v{active.current_version + 1})
                  </button>

                  {active.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => handleSaveVersion(true)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#14532D] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#166534] whitespace-nowrap shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Submit for Lawyer/Reviewer Approval</span>
                    </button>
                  )}

                  {(active.status === 'review_pending' || active.status === 'draft') && (
                    <button
                      type="button"
                      onClick={handleApprove}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#14532D] bg-[#14532D]/5 px-3.5 py-2 text-xs font-medium text-[#14532D] hover:bg-[#14532D]/10 whitespace-nowrap shrink-0"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Approve Draft (Lawyer / Reviewer Only)</span>
                    </button>
                  )}
                </div>

                {active.approved_by_name && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                    Legal review approved by <strong>{active.approved_by_name}</strong> on{' '}
                    {active.approved_at ? new Date(active.approved_at).toLocaleString() : ''}.
                  </div>
                )}

                {/* Explicit User Authorization Panel */}
                {active.status === 'approved' && active.created_by === user.id && (
                  <form
                    onSubmit={handleAuthorizeSubmission}
                    className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-3"
                  >
                    <div className="text-xs font-semibold text-slate-900">
                      Step 3: Explicit User Authorization & External Channel Tracking
                    </div>
                    <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmCheck}
                        onChange={(e) => setConfirmCheck(e.target.checked)}
                        className="mt-0.5 accent-[#14532D]"
                      />
                      <span>
                        I explicitly authorize this approved representation for dispatch via an official government portal, speed post, or physical filing, and confirm I have verified the cited facts.
                      </span>
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={ackRef}
                        onChange={(e) => setAckRef(e.target.value)}
                        placeholder="Portal / Speed Post Acknowledgement Ref (optional)"
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"
                      />
                      <input
                        type="text"
                        value={channelNotes}
                        onChange={(e) => setChannelNotes(e.target.value)}
                        placeholder="Channel note (e.g., RSPCB Kota Registry / Sampark Portal)"
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#14532D] px-4 py-2 text-xs font-medium text-white hover:bg-[#166534]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Confirm & Record External Submission</span>
                    </button>
                  </form>
                )}

                {active.status === 'submitted' && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
                    External dispatch recorded on{' '}
                    {active.submission_date
                      ? new Date(active.submission_date).toLocaleString()
                      : ''}{' '}
                    · Acknowledgement Ref:{' '}
                    <span className="font-mono font-semibold">
                      {active.acknowledgement_reference}
                    </span>
                  </div>
                )}

                {active.events && active.events.length > 0 && (
                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Complaint Workflow Audit Events
                    </h3>
                    <div className="mt-2 space-y-1.5">
                      {active.events.map((ev) => (
                        <div key={ev.id} className="text-xs text-slate-600">
                          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                            {new Date(ev.created_at).toLocaleString()}
                          </span>{' '}
                          · <span className="font-medium text-slate-800">{ev.actor_name}</span>:{' '}
                          {ev.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-500">
                Select or generate a complaint draft to view the editor and approval workflow.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
