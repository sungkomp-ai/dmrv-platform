'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Workflow,
  Upload,
  Shield,
  Leaf,
  FileCheck,
  CheckCircle,
  Activity,
  FileText,
  ShoppingCart,
  Truck,
  Scale,
  ClipboardList,
  Search,
  Footprints,
  FlaskConical,
  Menu,
  Bell,
  CircleDot,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import DashboardView from './DashboardView';
import OrchestratorView from './OrchestratorView';
import IngestionView from './IngestionView';
import AuthView from './AuthView';
import CarbonView from './CarbonView';
import CertificationView from './CertificationView';
import VerificationView from './VerificationView';
import MonitoringView from './MonitoringView';
import ReportingView from './ReportingView';
import MarketplaceView from './MarketplaceView';
import LogisticsView from './LogisticsView';
import GovernanceView from './GovernanceView';
import SubmissionView from './SubmissionView';
import AuditView from './AuditView';
import FootprintView from './FootprintView';
import SimulationView from './SimulationView';

type ModuleKey =
  | 'dashboard'
  | 'orchestrator'
  | 'ingestion'
  | 'auth'
  | 'carbon'
  | 'certification'
  | 'verification'
  | 'monitoring'
  | 'reporting'
  | 'marketplace'
  | 'logistics'
  | 'governance'
  | 'submission'
  | 'audit'
  | 'footprint'
  | 'simulation';

interface MenuItem {
  key: ModuleKey;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'orchestrator', label: 'Orchestrator', icon: Workflow },
  { key: 'ingestion', label: 'Ingestion', icon: Upload },
  { key: 'auth', label: 'Auth & RBAC', icon: Shield },
  { key: 'carbon', label: 'Carbon', icon: Leaf },
  { key: 'certification', label: 'Certification', icon: FileCheck },
  { key: 'verification', label: 'Verification', icon: CheckCircle },
  { key: 'monitoring', label: 'Monitoring', icon: Activity },
  { key: 'reporting', label: 'Reporting', icon: FileText },
  { key: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
  { key: 'logistics', label: 'Logistics', icon: Truck },
  { key: 'governance', label: 'Governance', icon: Scale },
  { key: 'submission', label: 'Submission', icon: ClipboardList },
  { key: 'audit', label: 'Audit', icon: Search },
  { key: 'footprint', label: 'Footprint', icon: Footprints },
  { key: 'simulation', label: 'Simulation', icon: FlaskConical },
];

const moduleComponents: Record<ModuleKey, React.ComponentType> = {
  dashboard: DashboardView,
  orchestrator: OrchestratorView,
  ingestion: IngestionView,
  auth: AuthView,
  carbon: CarbonView,
  certification: CertificationView,
  verification: VerificationView,
  monitoring: MonitoringView,
  reporting: ReportingView,
  marketplace: MarketplaceView,
  logistics: LogisticsView,
  governance: GovernanceView,
  submission: SubmissionView,
  audit: AuditView,
  footprint: FootprintView,
  simulation: SimulationView,
};

interface SidebarContentProps {
  collapsed?: boolean;
  activeModule: ModuleKey;
  onModuleChange: (key: ModuleKey) => void;
}

function SidebarContent({ collapsed = false, activeModule, onModuleChange }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Logo Area */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
          dM
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold tracking-tight">dMRV Platform</span>
            <span className="text-[11px] text-slate-400">Carbon Credit System</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-0.5">
          {menuItems.map((item) => {
            const isActive = activeModule === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => onModuleChange(item.key)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
                {!collapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <Badge className="ml-auto h-5 min-w-[20px] justify-center bg-emerald-600 text-[10px] text-white hover:bg-emerald-600">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
                {isActive && !collapsed && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-slate-700/50 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CircleDot className="h-3 w-3 text-emerald-500" />
            <span>System Online</span>
            <span className="ml-auto">v2.4.0</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DmrvApp() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const ActiveComponent = moduleComponents[activeModule];
  const activeItem = menuItems.find((item) => item.key === activeModule);

  const handleModuleChange = (key: ModuleKey) => {
    setActiveModule(key);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-white px-4 shadow-sm lg:px-6">
        {/* Mobile menu trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SidebarContent activeModule={activeModule} onModuleChange={handleModuleChange} />
          </SheetContent>
        </Sheet>

        {/* Breadcrumb / Title */}
        <div className="flex items-center gap-2">
          {activeItem && (
            <>
              <activeItem.icon className="h-5 w-5 text-emerald-600" />
              <h1 className="text-base font-semibold text-gray-900">{activeItem.label}</h1>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Status Indicators */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>3 Agents Active</span>
            </div>
          </div>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold">
              2
            </span>
          </Button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            AD
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-200 transition-all duration-200 ${
            sidebarCollapsed ? 'w-16' : 'w-60'
          }`}
        >
          <SidebarContent collapsed={sidebarCollapsed} activeModule={activeModule} onModuleChange={handleModuleChange} />
          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center justify-center py-2 text-slate-400 hover:text-white bg-slate-900 border-t border-slate-700/50 transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            <ActiveComponent />
          </div>
        </main>
      </div>
    </div>
  );
}
