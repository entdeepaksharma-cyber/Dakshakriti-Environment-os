import React, { useState } from 'react';
import { X, ShieldCheck, KeyRound, UserPlus } from 'lucide-react';
import { apiRequest, setToken } from '../lib/api';
import { AuthUser, RoleCode } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: AuthUser) => void;
  currentUser: AuthUser | null;
}

const DEMO_ROLES: { code: RoleCode; label: string; desc: string }[] = [
  { code: 'student', label: 'Student', desc: 'Study 5 LL.B. units, bilingual notes & MCQs (cannot file reports or verify law)' },
  { code: 'citizen', label: 'Citizen', desc: 'Create private incident drafts, upload private evidence & draft complaints' },
  { code: 'researcher', label: 'Researcher', desc: 'Research statutes, cases, AI workspace & manage own observations' },
  { code: 'lawyer', label: 'Lawyer', desc: 'Review & approve complaint drafts + verify statutory legal sources' },
  { code: 'reviewer', label: 'Reviewer', desc: 'Verify legal sources, moderate submitted reports & approve complaints' },
  { code: 'admin', label: 'Administrator', desc: 'Deepak Sharma (Founder) — platform oversight & append-only audit logs' },
];

export function AuthModal({ isOpen, onClose, onAuthenticated, currentUser }: AuthModalProps) {
  const [tab, setTab] = useState<'demo' | 'login' | 'register'>('demo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [requestedRole, setRequestedRole] = useState<'citizen' | 'student' | 'researcher'>('citizen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleDemoLogin(roleCode: RoleCode) {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ access_token: string; user: AuthUser }>('/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({ role_code: roleCode }),
      });
      setToken(res.access_token);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to switch workspace profile.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ access_token: string; user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(res.access_token);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ access_token: string; user: AuthUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          requested_role: requestedRole,
        }),
      });
      setToken(res.access_token);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="auth-modal-title" className="font-display text-lg font-semibold text-slate-900">
              Dakshakriti Identity & Role Access
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Server-enforced JWT authentication and Row-Level data isolation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close authentication modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-200 bg-slate-50 px-6 py-2">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setTab('demo');
                setError('');
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                tab === 'demo'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Workspace Profiles (6 Roles)
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                tab === 'login'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                tab === 'register'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
              {error}
            </div>
          )}

          {tab === 'demo' && (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-slate-600">
                Select an illustrative role profile to verify real server-side RBAC enforcement and private report isolation. Each user only sees their own private drafts and evidence.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {DEMO_ROLES.map((role) => {
                  const isActive = currentUser?.role_code === role.code;
                  return (
                    <button
                      key={role.code}
                      type="button"
                      disabled={loading}
                      onClick={() => handleDemoLogin(role.code)}
                      className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                        isActive
                          ? 'border-[#14532D] bg-[#14532D]/5'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">{role.label}</span>
                        {isActive && (
                          <span className="text-[11px] font-medium text-[#14532D]">Active</span>
                        )}
                      </div>
                      <span className="mt-1 text-xs leading-snug text-slate-500">{role.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.in"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#14532D] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#166534] disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Ananya Sharma"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ananya@example.in"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Account Role</label>
                <select
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value as 'citizen' | 'student' | 'researcher')}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
                >
                  <option value="citizen">Citizen (Environmental Reporting & Drafts)</option>
                  <option value="student">Student (LL.B. Environmental Law Academy)</option>
                  <option value="researcher">Researcher (Statutes, Cases & Reporting)</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Reviewer, Lawyer, and Administrator roles require explicit administrative assignment.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Password (minimum 12 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#14532D] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#14532D] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#166534] disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                <span>{loading ? 'Creating Account...' : 'Create Dakshakriti Account'}</span>
              </button>
            </form>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#14532D]" />
          <span>Password hashing via bcrypt · JWT session isolation · Append-only audit logging</span>
        </div>
      </div>
    </div>
  );
}
