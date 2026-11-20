import { AlertCircle, CheckCircle2, Clock, FileText } from 'lucide-react';

export function VerificationLabel({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === 'verified' || normalized === 'published' || normalized === 'integrity_checked') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{normalized === 'integrity_checked' ? 'SHA-256 Integrity Verified' : 'Verified Source'}</span>
      </span>
    );
  }
  if (normalized === 'under_review' || normalized === 'review_pending' || normalized === 'submitted_for_review') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309]">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Under Review</span>
      </span>
    );
  }
  if (normalized === 'superseded' || normalized === 'withdrawn' || normalized === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="capitalize">{normalized.replace(/_/g, ' ')}</span>
      </span>
    );
  }
  if (normalized === 'approved' || normalized === 'submitted' || normalized === 'resolved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="capitalize">{normalized.replace(/_/g, ' ')}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309]">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="capitalize">{normalized.replace(/_/g, ' ')}</span>
    </span>
  );
}
