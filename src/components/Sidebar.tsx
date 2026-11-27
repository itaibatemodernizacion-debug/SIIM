import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Trophy,
  Building2,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Shield,
  DollarSign,
  IdCard,
  GraduationCap,
  ChefHat,
  LayoutGrid,
  X
} from 'lucide-react';
import { useMunicipalData } from '../context/MunicipalDataContext';

export type ActiveTab =
  | 'DASHBOARD'
  | 'CITIZENS'
  | 'TICKETS'
  | 'CONTROL_URBANO'
  | 'RRHH'
  | 'CULTURE'
  | 'ESCUELA_EMPRESA'
  | 'FUNDS'
  | 'SPORTS'
  | 'AREAS'
  | 'DRIVE_SYNC'
  | 'REPORTS'
  | 'ADMIN';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const {
    kpis,
    departments,
    financialKPIs,
    urbanControlKPIs,
    employeeKPIs,
    culturalKPIs,
    escuelaEmpresaKPIs
  } = useMunicipalData();

  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navItems: {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    accent: string;
    count?: string | number;
  }[] = [
    {
      id: 'DASHBOARD',
      label: 'Inicio',
      shortLabel: 'Inicio',
      icon: LayoutDashboard,
      accent: 'text-sky-400',
      count: `${kpis.resolutionRate}%`
    },
    {
      id: 'TICKETS',
      label: 'Trámites',
      shortLabel: 'Trámites',
      icon: FileText,
      accent: 'text-amber-400',
      count: kpis.totalTickets
    },
    {
      id: 'CITIZENS',
      label: 'Vecinos',
      shortLabel: 'Vecinos',
      icon: Users,
      accent: 'text-cyan-400',
      count: kpis.totalCitizens
    },
    {
      id: 'AREAS',
      label: 'Áreas',
      shortLabel: 'Áreas',
      icon: Building2,
      accent: 'text-indigo-400',
      count: departments.filter(d => d.active).length
    },
    {
      id: 'CONTROL_URBANO',
      label: 'Control Vial',
      shortLabel: 'Vial',
      icon: Shield,
      accent: 'text-sky-400',
      count: urbanControlKPIs.totalLicenses
    },
    {
      id: 'SPORTS',
      label: 'Deportes',
      shortLabel: 'Deportes',
      icon: Trophy,
      accent: 'text-orange-400',
      count: kpis.totalSportParticipants
    },
    {
      id: 'CULTURE',
      label: 'Cultura',
      shortLabel: 'Cultura',
      icon: GraduationCap,
      accent: 'text-pink-400',
      count: culturalKPIs.totalStudents
    },
    {
      id: 'ESCUELA_EMPRESA',
      label: 'Esc. Empresa',
      shortLabel: 'Esc. Emp.',
      icon: ChefHat,
      accent: 'text-amber-400',
      count: escuelaEmpresaKPIs.totalStudents
    },
    {
      id: 'RRHH',
      label: 'RRHH',
      shortLabel: 'RRHH',
      icon: IdCard,
      accent: 'text-blue-400',
      count: employeeKPIs.totalEmployees
    },
    {
      id: 'FUNDS',
      label: 'Fondos',
      shortLabel: 'Fondos',
      icon: DollarSign,
      accent: 'text-emerald-400',
      count: financialKPIs.departmentsWithPendingSettlements > 0 ? financialKPIs.departmentsWithPendingSettlements : undefined
    },
    {
      id: 'DRIVE_SYNC',
      label: 'Google Drive',
      shortLabel: 'Drive',
      icon: FileSpreadsheet,
      accent: 'text-emerald-400'
    },
    {
      id: 'REPORTS',
      label: 'Informes',
      shortLabel: 'Informes',
      icon: BarChart3,
      accent: 'text-violet-400'
    },
    {
      id: 'ADMIN',
      label: 'Admin',
      shortLabel: 'Admin',
      icon: Settings,
      accent: 'text-slate-300'
    }
  ];

  const primaryBottomTabs: ActiveTab[] = ['DASHBOARD', 'TICKETS', 'AREAS', 'DRIVE_SYNC'];
  const isOverflowActive = !primaryBottomTabs.includes(activeTab);

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setShowMobileMenu(false);
  };

  return (
    <>
      {/* Desktop Slim Icon-Forward Sidebar */}
      <aside className="hidden md:flex md:w-56 lg:w-60 bg-slate-900 border-r border-slate-800 flex-col justify-between shrink-0">
        <nav className="p-2.5 space-y-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.accent}`} />
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={`text-[11px] font-mono tabular-nums shrink-0 ${
                      isActive ? 'text-sky-100' : 'text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Resolución</span>
          <span className="font-mono tabular-nums font-bold text-emerald-400">
            {kpis.resolutionRate}%
          </span>
        </div>
      </aside>

      {/* Mobile Fixed Bottom Tab Bar (Thumb-Zone Navigation) */}
      <nav
        aria-label="Navegación principal móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 items-center px-1"
      >
        {primaryBottomTabs.map(tabId => {
          const item = navItems.find(n => n.id === tabId)!;
          const Icon = item.icon;
          const isActive = activeTab === item.id && !showMobileMenu;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition cursor-pointer ${
                isActive ? 'text-sky-400' : 'text-slate-400 active:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
                {item.shortLabel}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowMobileMenu(prev => !prev)}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition cursor-pointer ${
            showMobileMenu || isOverflowActive ? 'text-sky-400' : 'text-slate-400 active:text-white'
          }`}
        >
          {showMobileMenu ? <X className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
          <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap">
            {showMobileMenu ? 'Cerrar' : 'Módulos'}
          </span>
        </button>
      </nav>

      {/* Mobile Bottom Sheet Icon App Launcher */}
      {showMobileMenu && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-end pb-16"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="w-full bg-slate-900 border-t border-slate-700 rounded-t-3xl p-4 pb-5 shadow-2xl space-y-3 max-h-[75vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto" />
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-white">Módulos del Sistema</span>
              <button
                type="button"
                onClick={() => setShowMobileMenu(false)}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`min-h-[78px] p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                      isActive
                        ? 'bg-sky-600/20 border-sky-500 text-white'
                        : 'bg-slate-950/90 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${isActive ? 'text-sky-400' : item.accent}`} />
                    <span className="text-[11px] font-semibold text-center leading-tight">
                      {item.label}
                    </span>
                    {item.count !== undefined && (
                      <span className="text-[10px] font-mono tabular-nums text-slate-400">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
