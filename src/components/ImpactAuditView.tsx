import { useEffect, useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { AuditLog, AuthUser, ImpactMetrics, RoleDefinition } from '../types';

interface ImpactAuditViewProps {
  user: AuthUser | null;
  onOpenAuth: () => void;
}

export function ImpactAuditView({ user, onOpenAuth }: ImpactAuditViewProps) {
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [auditScope, setAuditScope] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    Promise.all([
      apiRequest<ImpactMetrics>('/impact/metrics'),
      apiRequest<RoleDefinition[]>('/roles'),
    ])
      .then(([m, r]) => {
        setMetrics(m);
        setRoles(r);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setLogs([]);
      return;
    }
    apiRequest<{ scope: string; logs: AuditLog[] }>('/audit/logs')
      .then((res) => {
        setAuditScope(res.scope);
        setLogs(res.logs);
      })
      .catch(() => {});
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Impact Measurement, RBAC & Security Audit Trail
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Live operational counts from Dakshakriti’s database, the 6-role access control matrix, and the append-only security audit log.
        </p>
      </div>

      {/* Live Impact Metrics */}
      {metrics && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Academic Learning Outcomes
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div>
                <div className="text-slate-500">Syllabus Units</div>
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {metrics.academic.units_count}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Curated Topics</div>
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {metrics.academic.topics_count}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Topics Completed</div>
                <div className="font-mono text-lg font-bold text-[#14532D] tabular-nums">
                  {metrics.academic.topics_completed_count}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Quiz Attempts</div>
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {metrics.academic.quiz_attempts_count}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Legal Source Verification
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div>
                <div className="text-slate-500">Statutes Indexed</div>
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {metrics.legal_library.statutes_count}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Verified Statutes</div>
                <div className="font-mono text-lg font-bold text-[#15803D] tabular-nums">
                  {metrics.legal_library.verified_statutes_count}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Judgments Indexed</div>
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {metrics.legal_library.judgments_count}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Authorities</div>
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {metrics.legal_library.authorities_count}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Civic & Evidence Governance
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div>
                <div className="text-slate-500">Incident Drafts</div>
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {metrics.civic_workflow.reports_count}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Private Evidence</div>
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {metrics.civic_workflow.evidence_count}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Approved Drafts</div>
                <div className="font-mono text-lg font-bold text-[#15803D] tabular-nums">
                  {metrics.civic_workflow.approved_complaints_count}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Audit Events</div>
                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {metrics.civic_workflow.audit_events_count}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6-Role RBAC Matrix */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#14532D]" />
          <h2 className="font-display text-base font-semibold text-slate-900">
            Role-Based Access Control (RBAC) Matrix
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2.5 font-semibold">Role</th>
                <th className="px-3 py-2.5 font-semibold">Responsibility</th>
                <th className="px-3 py-2.5 font-semibold">Server Permission Codes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((r) => (
                <tr key={r.code} className="hover:bg-slate-50/70">
                  <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                    {r.name}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{r.description}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                    {r.permissions.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Append-Only Security Audit Log */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Append-Only Security Audit Trail
            </h2>
            <p className="text-xs text-slate-500">
              {user
                ? auditScope === 'platform_all'
                  ? 'Administrator view: showing all platform security events (read-only).'
                  : 'Personal scope: showing only your account security & workflow events.'
                : 'Sign in to inspect your personal activity or Administrator platform audit logs.'}
            </p>
          </div>
          {!user && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#14532D] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#166534]"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Sign In to View Audit Logs</span>
            </button>
          )}
        </div>

        {user && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-3 py-2.5 font-semibold">Timestamp</th>
                  <th className="px-3 py-2.5 font-semibold">Actor</th>
                  <th className="px-3 py-2.5 font-semibold">Action</th>
                  <th className="px-3 py-2.5 font-semibold">Outcome</th>
                  <th className="px-3 py-2.5 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                      {log.actor_email ?? 'system'} ({log.actor_role ?? 'n/a'})
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-900 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className={`font-medium ${
                          log.outcome === 'success'
                            ? 'text-[#15803D]'
                            : log.outcome === 'denied'
                            ? 'text-[#B45309]'
                            : 'text-[#DC2626]'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
