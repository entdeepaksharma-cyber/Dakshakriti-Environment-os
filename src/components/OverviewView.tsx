import {
  ArrowRight,
  BookOpen,
  Building2,
  FileCheck2,
  FileWarning,
  Gavel,
  Scale,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { AuthUser, ImpactMetrics } from '../types';

export type WorkspaceTab =
  | 'overview'
  | 'academy'
  | 'laws'
  | 'cases'
  | 'incidents'
  | 'evidence'
  | 'complaints'
  | 'authorities'
  | 'research'
  | 'impact';

interface OverviewViewProps {
  user: AuthUser | null;
  metrics: ImpactMetrics | null;
  onNavigate: (tab: WorkspaceTab) => void;
  onOpenAuth: () => void;
}

export function OverviewView({ user, metrics, onNavigate, onOpenAuth }: OverviewViewProps) {
  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="text-xs font-medium text-slate-500">
              Dakshakriti Environmental Law OS · Founded by Deepak Sharma · Kota, Rajasthan
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
              Unified Environmental Law Academy, Statutory Research & Civic Reporting Platform
            </h1>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              Built on one modular legal infrastructure: master the five-unit LL.B. Environmental Law syllabus in English and Hindi, inspect versioned Indian legislation and Supreme Court precedents, log private environmental observations with SHA-256 evidence integrity, and prepare lawyer-reviewed complaint drafts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('academy')}
              className="inline-flex items-center gap-2 rounded-md bg-[#14532D] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#166534] whitespace-nowrap shrink-0"
            >
              <BookOpen className="h-4 w-4" />
              <span>Open LL.B. Academy</span>
            </button>
            <button
              type="button"
              onClick={() => (user ? onNavigate('incidents') : onOpenAuth())}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <FileWarning className="h-4 w-4" />
              <span>{user ? 'Report Observation' : 'Sign In / Switch Role'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">LL.B. Academy Coverage</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {metrics ? `${metrics.academic.units_count} Units · ${metrics.academic.topics_count} Topics` : '5 Units'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Bilingual EN/HI · {metrics?.academic.questions_count ?? 14} MCQ bank items
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Statutory & Case Index</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {metrics
              ? `${metrics.legal_library.statutes_count} Acts · ${metrics.legal_library.judgments_count} Cases`
              : '9 Acts · 8 Cases'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {metrics?.legal_library.versions_count ?? 11} historical & amended versions
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Rajasthan & Central Desks</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {metrics ? `${metrics.legal_library.authorities_count} Authorities` : '9 Authorities'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            RSPCB HQ & Regional Offices, SEIAA, NGT
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-medium text-slate-500">Audit & Governance</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {metrics ? `${metrics.civic_workflow.audit_events_count} Events` : 'Active'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            6 RBAC roles · Private SHA-256 vault
          </div>
        </div>
      </section>

      {/* Primary Workspace Modules */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Core Operating Modules
          </h2>
          <span className="text-xs text-slate-500">
            Select a module to inspect or operate live workflows
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              tab: 'academy' as WorkspaceTab,
              icon: BookOpen,
              title: '01. Environmental Law Academy',
              meta: 'LBL514 · Career Point University, Kota · EN / हिन्दी',
              desc: 'Five structured units covering Ecology, Constitutional Articles (14–51A(g)), Water Act 1974, Air Act 1981, and EPA 1986 with MCQs and progress tracking.',
            },
            {
              tab: 'laws' as WorkspaceTab,
              icon: Scale,
              title: '02. Indian Legislation Library',
              meta: 'Versioned Bare Acts · 2023–2024 Amendments',
              desc: 'Explore current and historical statutory versions, section texts, and role-gated source verification (Lawyer / Reviewer only).',
            },
            {
              tab: 'cases' as WorkspaceTab,
              icon: Gavel,
              title: '03. Case-Law Research Centre',
              meta: 'Supreme Court & NGT Jurisprudence',
              desc: 'Study landmark rulings including Subhash Kumar, Oleum Gas Leak, Vellore Citizens, Kamal Nath, and Bichhri (Udaipur) with linked provisions.',
            },
            {
              tab: 'incidents' as WorkspaceTab,
              icon: FileWarning,
              title: '04. Private Incident Reporting',
              meta: 'Row-Level Isolation · Unverified Drafts',
              desc: 'Record water, air, noise, waste, or mining observations privately. Allegations are never auto-classified as verified legal findings.',
            },
            {
              tab: 'evidence' as WorkspaceTab,
              icon: FileCheck2,
              title: '05. Private Evidence Vault',
              meta: 'Private Disk Storage · SHA-256 Digest',
              desc: 'Upload photographs, lab PDFs, or notes into private storage with automated cryptographic hashing and live integrity verification.',
            },
            {
              tab: 'complaints' as WorkspaceTab,
              icon: ShieldAlert,
              title: '06. Complaint Drafting Studio',
              meta: 'Legal Review · Explicit Authorization',
              desc: 'Draft statutory representations, RTI requests, or Sec. 19 notices. Requires Lawyer/Reviewer approval and explicit user confirmation.',
            },
            {
              tab: 'authorities' as WorkspaceTab,
              icon: Building2,
              title: '07. Rajasthan Authority Directory',
              meta: 'RSPCB · SEIAA · RSBB · NGT Central Zone',
              desc: 'Jurisdiction, office addresses, and official contacts for Kota, Jaipur, Udaipur, Jodhpur, and Bhiwadi regulatory desks.',
            },
            {
              tab: 'research' as WorkspaceTab,
              icon: Sparkles,
              title: '08. AI Legal Research Workspace',
              meta: 'Grounded Synthesis · Human Review Notice',
              desc: 'Query Indian environmental law with clear separation of enacted statutes, amendments, and judicial interpretation.',
            },
            {
              tab: 'impact' as WorkspaceTab,
              icon: ShieldAlert,
              title: '09. Impact, RBAC & Audit Trail',
              meta: '6 Roles · Append-Only Security Log',
              desc: 'Inspect platform activity metrics, the 6-role permission matrix, and immutable security audit events.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => onNavigate(item.tab)}
                className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 text-left transition-colors hover:border-[#14532D]/50 hover:bg-slate-50/60"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-[#14532D]" />
                    <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#14532D]" />
                  </div>
                  <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <div className="mt-1 text-xs text-slate-500">{item.meta}</div>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Mandatory Safeguards & Governance Statement */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl space-y-2">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Mandatory Platform Safeguards & Legal Separation
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              Dakshakriti enforces strict separation between verified legal knowledge and user-submitted observations. Sample and illustrative records are clearly identified; the platform does not pretend to auto-submit complaints to external government portals without explicit user authorization and legal review.
            </p>
          </div>
          <div className="text-xs text-slate-500 shrink-0">
            <div>Founder: Deepak Sharma</div>
            <div>Architecture: Dakshakriti Legal OS v1.0</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
          <div>1. No report becomes a verified violation by user submission alone.</div>
          <div>2. Alleged responsible parties are explicitly marked as allegations.</div>
          <div>3. Uploaded evidence files remain private and SHA-256 hashed.</div>
          <div>4. AI outputs display verification status and require human review.</div>
        </div>
      </section>
    </div>
  );
}
