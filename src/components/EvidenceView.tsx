import React, { useEffect, useState } from 'react';
import { Download, FileCheck2, Lock, ShieldCheck, Upload } from 'lucide-react';
import { apiRequest, downloadProtectedFile, getToken } from '../lib/api';
import { AuthUser, EnvironmentalReport, EvidenceRecord } from '../types';
import { VerificationLabel } from './StatusText';

interface EvidenceViewProps {
  user: AuthUser | null;
  onOpenAuth: () => void;
  preselectedReportId?: string;
}

export function EvidenceView({ user, onOpenAuth, preselectedReportId }: EvidenceViewProps) {
  const [records, setRecords] = useState<EvidenceRecord[]>([]);
  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Upload form
  const [file, setFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState('photograph');
  const [description, setDescription] = useState('');
  const [collectedAt, setCollectedAt] = useState('2026-11-20');
  const [reportId, setReportId] = useState(preselectedReportId ?? '');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (preselectedReportId) setReportId(preselectedReportId);
  }, [preselectedReportId]);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [evList, repList] = await Promise.all([
        apiRequest<EvidenceRecord[]>('/evidence').catch(() => []),
        apiRequest<EnvironmentalReport[]>('/reports').catch(() => []),
      ]);
      setRecords(evList);
      setReports(repList.filter((r) => r.is_owner));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load evidence vault.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user?.id]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!file) {
      setError('Please choose a file (JPEG, PNG, WEBP, PDF, or TXT, max 10 MB).');
      return;
    }
    setUploading(true);
    setError('');
    setStatusMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('evidence_type', evidenceType);
      formData.append('description', description);
      if (collectedAt) formData.append('collected_at', collectedAt);
      if (reportId) formData.append('report_id', reportId);

      const token = getToken();
      const response = await fetch('/api/v1/evidence/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed.');
      }

      setStatusMsg(data.message);
      setFile(null);
      setDescription('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleVerifyHash(id: string) {
    setError('');
    setStatusMsg('');
    try {
      const res = await apiRequest<{
        match: boolean;
        computed_sha256: string;
        stored_sha256: string;
      }>(`/evidence/${id}/verify-hash`, { method: 'POST' });
      setStatusMsg(
        res.match
          ? `SHA-256 integrity verified: digest matches private vault (${res.computed_sha256.slice(0, 16)}...).`
          : 'WARNING: Stored file digest mismatch!'
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Integrity check failed.');
    }
  }

  async function handleDownload(rec: EvidenceRecord) {
    setError('');
    try {
      await downloadProtectedFile(`/evidence/${rec.id}/download`, rec.original_filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download denied.');
    }
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center space-y-4">
        <Lock className="mx-auto h-8 w-8 text-slate-400" />
        <h2 className="font-display text-xl font-semibold text-slate-900">
          Private Evidence Management Vault
        </h2>
        <p className="mx-auto max-w-lg text-sm text-slate-600">
          Evidence uploads are stored privately outside public web directories with SHA-256 digests and strict uploader-only download controls. Sign in to access your private vault.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="rounded-md bg-[#14532D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#166534]"
        >
          Sign In to Evidence Vault
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Private Evidence Vault
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Uploaded files are held privately on the server with cryptographic SHA-256 digests. Accepting an upload confirms storage only—it does not verify legal authenticity.
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Upload Form */}
        <section className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-6 h-fit">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Upload className="h-4 w-4 text-[#14532D]" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Upload Private Evidence File
            </h2>
          </div>

          <form onSubmit={handleUpload} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Select File (JPEG, PNG, WEBP, PDF, TXT · Max 10 MB)
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,.txt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Evidence Type
              </label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
              >
                <option value="photograph">Photograph</option>
                <option value="lab_report">Water / Air Lab Report (PDF)</option>
                <option value="field_note">Field Observation Note</option>
                <option value="official_notice">Official Notice / RTI Reply</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Link to Incident Report (Optional)
              </label>
              <select
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
              >
                <option value="">— Standalone private evidence —</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.report_number} · {r.location_text}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Description
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this file depicts, camera/source origin, and date captured."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Collected Date
              </label>
              <input
                type="date"
                value={collectedAt}
                onChange={(e) => setCollectedAt(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full rounded-md bg-[#14532D] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#166534] disabled:opacity-60"
            >
              {uploading ? 'Computing SHA-256 & Storing...' : 'Store in Private Vault'}
            </button>
          </form>
        </section>

        {/* Evidence Records List */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900">
              My Private Evidence Records ({records.length})
            </h2>
            <span className="text-xs text-slate-500">Uploader-only access policy</span>
          </div>

          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Loading private evidence records...
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No private evidence files uploaded under this account yet.
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((rec) => (
                <article
                  key={rec.id}
                  className="rounded-lg border border-slate-200 bg-white p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {rec.evidence_number}
                      </span>
                      <span className="mx-2 text-slate-300">·</span>
                      <span className="text-xs capitalize text-slate-600">
                        {rec.evidence_type.replace(/_/g, ' ')}
                      </span>
                      <span className="mx-2 text-slate-300">·</span>
                      <span className="text-xs text-slate-500">{rec.original_filename}</span>
                    </div>
                    <VerificationLabel status={rec.verification_status} />
                  </div>

                  <p className="text-sm text-slate-700">{rec.description}</p>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] text-slate-600 space-y-1">
                    <div className="break-all">
                      <span className="font-semibold text-slate-800">SHA-256 Digest:</span>{' '}
                      {rec.sha256_hash}
                    </div>
                    <div className="tabular-nums">
                      MIME: {rec.mime_type} · Size: {(rec.file_size_bytes / 1024).toFixed(1)} KB ·
                      Uploaded: {new Date(rec.uploaded_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleVerifyHash(rec.id)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-[#14532D]" />
                      <span>Verify Integrity Hash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(rec)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Private Download</span>
                    </button>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 ml-auto">
                      <FileCheck2 className="h-3.5 w-3.5" />
                      <span>Confidential · Not Publicly Accessible</span>
                    </span>
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
