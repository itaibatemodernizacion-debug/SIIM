import React from 'react';
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
  Layers,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMunicipalData } from '../context/MunicipalDataContext';

export type ActiveTab = 
  | 'DASHBOARD' 
  | 'CITIZENS' 
  | 'TICKETS' 
  | 'CONTROL_URBANO'
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
  const { currentUser, isAdmin } = useAuth();
  const { kpis, departments, financialKPIs, urbanControlKPIs } = useMunicipalData();

  const userDept = departments.find(d => d.id === currentUser?.departmentId);

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType; badge?: string | number; badgeColor?: string }[] = [
    {
      id: 'DASHBOARD',
      label: 'Dashboard General',
      icon: LayoutDashboard,
      badge: `${kpis.resolutionRate}%`,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    },
    {
      id: 'CITIZENS',
      label: 'Registro Ciudadano',
      icon: Users,
      badge: kpis.totalCitizens,
      badgeColor: 'bg-slate-700 text-slate-300'
    },
    {
      id: 'TICKETS',
      label: 'Trámites y Solicitudes',
      icon: FileText,
      badge: kpis.pendingTickets > 0 ? kpis.pendingTickets : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
    },
    {
      id: 'CONTROL_URBANO',
      label: 'Control Urbano & Vial',
      icon: Shield,
      badge: `${urbanControlKPIs.totalLicenses} carnets`,
      badgeColor: 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
    },
    {
      id: 'FUNDS',
      label: 'Control de Fondos',
      icon: DollarSign,
      badge: financialKPIs.departmentsWithPendingSettlements > 0 ? `${financialKPIs.departmentsWithPendingSettlements} pend.` : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    },
    {
      id: 'SPORTS',
      label: 'Módulo de Deportes',
      icon: Trophy,
      badge: kpis.totalSportParticipants,
      badgeColor: 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
    },
    {
      id: 'AREAS',
      label: 'Áreas y Dependencias',
      icon: Building2,
      badge: departments.filter(d => d.active).length,
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    },
    {
      id: 'DRIVE_SYNC',
      label: 'Drive & Planillas Excel',
      icon: FileSpreadsheet,
      badge: 'Auto',
      badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
    },
    {
      id: 'REPORTS',
      label: 'Informes y Exportación',
      icon: BarChart3
    },
    {
      id: 'ADMIN',
      label: 'Administración General',
      icon: Settings
    }
  ];

  return (
    <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
      {/* Navigation Menu */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Navegación del Sistema
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-600 text-white font-semibold shadow-lg shadow-sky-900/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                  isActive ? 'bg-white/20 text-white' : (item.badgeColor || 'bg-slate-800 text-slate-300')
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Area Status Card at bottom */}
      <div className="p-3 border-t border-slate-800">
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-[11px] text-slate-300 uppercase">Sector Activo</span>
          </div>
          
          <div className="font-bold text-white truncate">
            {isAdmin ? 'Monitoreo Global (Todas las Áreas)' : (userDept?.name || 'Área Asignada')}
          </div>
          
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Shield className="w-3 h-3 text-sky-400" />
            <span>Rol:</span>
            <span className="font-medium text-sky-300">
              {currentUser?.role === 'ADMIN_GENERAL' ? 'Administrador' : 'Responsable'}
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Resolución Global:</span>
            <span className="font-bold text-emerald-400">{kpis.resolutionRate}%</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
