import { useEffect, useState } from 'react';
import {
  Activity,
  BookOpen,
  Building2,
  FileCheck2,
  FileSignature,
  FileWarning,
  Gavel,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { apiRequest, clearToken, getToken } from './lib/api';
import { AuthUser, ImpactMetrics } from './types';
import { AuthModal } from './components/AuthModal';
import { OverviewView, WorkspaceTab } from './components/OverviewView';
import { AcademyView } from './components/AcademyView';
import { LegislationView } from './components/LegislationView';
import { CasesView } from './components/CasesView';
import { IncidentsView } from './components/IncidentsView';
import { EvidenceView } from './components/EvidenceView';
import { ComplaintsView } from './components/ComplaintsView';
import { AuthoritiesView } from './components/AuthoritiesView';
import { ResearchView } from './components/ResearchView';
import { ImpactAuditView } from './components/ImpactAuditView';

const NAV_GROUPS: {
  heading: string;
  items: { id: WorkspaceTab; label: string; icon: typeof LayoutDashboard }[];
}[] = [
  {
    heading: 'Workspace',
    items: [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }],
  },
  {
    heading: 'Education & Research',
    items: [
      { id: 'academy', label: 'LL.B. Academy (5 Units)', icon: BookOpen },
      { id: 'laws', label: 'Legislation Library', icon: Scale },
      { id: 'cases', label: 'Case-Law Centre', icon: Gavel },
      { id: 'research', label: 'AI Legal Research', icon: Sparkles },
    ],
  },
  {
    heading: 'Civic & Legal Workflow',
    items: [
      { id: 'incidents', label: 'Incident Reporting', icon: FileWarning },
      { id: 'evidence', label: 'Private Evidence Vault', icon: FileCheck2 },
      { id: 'complaints', label: 'Complaint Studio', icon: FileSignature },
      { id: 'authorities', label: 'Rajasthan Authorities', icon: Building2 },
    ],
  },
  {
    heading: 'Governance',
    items: [{ id: 'impact', label: 'Impact & Security Audit', icon: Activity }],
  },
];

const TAB_TITLES: Record<WorkspaceTab, string> = {
  overview: 'Environmental Law Dashboard',
  academy: 'LL.B. Environmental Law Academy',
  laws: 'Indian Environmental Legislation Library',
  cases: 'Case-Law Research Centre',
  incidents: 'Environmental Incident Reporting',
  evidence: 'Private Evidence Vault',
  complaints: 'Complaint Preparation & Approval',
  authorities: 'Rajasthan & Central Authority Directory',
  research: 'AI Legal Research Workspace',
  impact: 'Impact, RBAC & Audit Trail',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [linkedReportId, setLinkedReportId] = useState<string | undefined>(undefined);

  async function refreshMetrics() {
    try {
      const m = await apiRequest<ImpactMetrics>('/impact/metrics');
      setMetrics(m);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const token = getToken();
    if (token) {
      apiRequest<AuthUser>('/auth/me')
        .then(setUser)
        .catch(() => {
          clearToken();
          setUser(null);
        });
    }
    refreshMetrics();
  }, []);

  useEffect(() => {
    refreshMetrics();
  }, [activeTab, user?.id]);

  function handleLogout() {
    clearToken();
    setUser(null);
  }

  function navigateTo(tab: WorkspaceTab, reportId?: string) {
    if (reportId) setLinkedReportId(reportId);
    setActiveTab(tab);
    setMobileMenuOpen(false);
  }

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white">
      <div>
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
          <button
            type="button"
            onClick={() => navigateTo('overview')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Dakshakriti
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-5 p-4" aria-label="Primary Workspace Navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.heading} className="space-y-1">
              <div className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.heading}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#14532D] text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Account / Role Box */}
      <div className="border-t border-slate-200 p-4">
        {user ? (
          <div className="space-y-2.5">
            <div>
              <div className="truncate text-xs font-semibold text-slate-900">
                {user.full_name}
              </div>
              <div className="truncate text-[11px] text-slate-500">
                Role: <span className="capitalize font-medium text-slate-700">{user.role_code}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                Switch Role
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#14532D] px-3 py-2 text-xs font-medium text-white hover:bg-[#166534] whitespace-nowrap shrink-0"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Sign In / Select Role</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex">
      {/* Desktop Sidebar (260px) */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 border-r border-slate-200 bg-white sticky top-0 h-screen overflow-y-auto">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] border-r border-slate-200 bg-white h-full overflow-y-auto">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Viewport */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Contextual Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm truncate">
              <span className="font-medium text-slate-500">Dakshakriti</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-900 truncate">
                {TAB_TITLES[activeTab]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              {user ? `${user.full_name.split(' ')[0]} · ${user.role_code}` : 'Sign In'}
            </button>
          </div>
        </header>

        {/* Active View Content */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {activeTab === 'overview' && (
            <OverviewView
              user={user}
              metrics={metrics}
              onNavigate={(t) => navigateTo(t)}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          )}
          {activeTab === 'academy' && (
            <AcademyView user={user} onOpenAuth={() => setAuthModalOpen(true)} />
          )}
          {activeTab === 'laws' && (
            <LegislationView user={user} onOpenAuth={() => setAuthModalOpen(true)} />
          )}
          {activeTab === 'cases' && <CasesView />}
          {activeTab === 'incidents' && (
            <IncidentsView
              user={user}
              onOpenAuth={() => setAuthModalOpen(true)}
              onNavigateToEvidence={(repId) => navigateTo('evidence', repId)}
              onNavigateToComplaints={(repId) => navigateTo('complaints', repId)}
            />
          )}
          {activeTab === 'evidence' && (
            <EvidenceView
              user={user}
              onOpenAuth={() => setAuthModalOpen(true)}
              preselectedReportId={linkedReportId}
            />
          )}
          {activeTab === 'complaints' && (
            <ComplaintsView
              user={user}
              onOpenAuth={() => setAuthModalOpen(true)}
              preselectedReportId={linkedReportId}
            />
          )}
          {activeTab === 'authorities' && <AuthoritiesView />}
          {activeTab === 'research' && <ResearchView user={user} />}
          {activeTab === 'impact' && (
            <ImpactAuditView user={user} onOpenAuth={() => setAuthModalOpen(true)} />
          )}
        </main>

        {/* Quiet Legal Attribution Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 py-4 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong>Dakshakriti Environmental Law OS</strong> · Founded by Deepak Sharma
            </div>
            <div>
              Illustrative civic records clearly identified · No automated external government filing
            </div>
          </div>
        </footer>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(u) => setUser(u)}
        currentUser={user}
      />
    </div>
  );
}
