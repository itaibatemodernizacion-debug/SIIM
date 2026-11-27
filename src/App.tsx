import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MunicipalDataProvider } from './context/MunicipalDataContext';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { GeneralDashboard } from './components/dashboard/GeneralDashboard';
import { CitizensRegistry } from './components/citizens/CitizensRegistry';
import { TicketManagement } from './components/tickets/TicketManagement';
import { SportsModule } from './components/sports/SportsModule';
import { AreaWorkspaces } from './components/areas/AreaWorkspaces';
import { DriveAndExcelSync } from './components/drive-sync/DriveAndExcelSync';
import { ReportsCenter } from './components/reports/ReportsCenter';
import { AdminManagement } from './components/admin/AdminManagement';
import { FundsModule } from './components/funds/FundsModule';
import { UrbanControlModule } from './components/urban-control/UrbanControlModule';
import { HumanResourcesModule } from './components/rrhh/HumanResourcesModule';
import { CultureEducationModule } from './components/culture/CultureEducationModule';
import { EscuelaEmpresaModule } from './components/escuela-empresa/EscuelaEmpresaModule';
import { LoginScreen } from './components/auth/LoginScreen';
import { RestrictedAccessScreen } from './components/auth/RestrictedAccessScreen';
import { Citizen } from './types';
import { Building2 } from 'lucide-react';

const AuthenticatedAdminApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('DASHBOARD');
  
  // Cross-component state navigation
  const [citizenForTicket, setCitizenForTicket] = useState<Citizen | null>(null);
  const [targetAreaForWorkspace, setTargetAreaForWorkspace] = useState<string | undefined>(undefined);

  const handleOpenTicketForCitizen = (citizen: Citizen) => {
    setCitizenForTicket(citizen);
    setActiveTab('TICKETS');
  };

  const handleNavigateToAreas = (deptId?: string) => {
    setTargetAreaForWorkspace(deptId);
    setActiveTab('AREAS');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Official Header */}
      <Header 
        onNavigateToTickets={() => setActiveTab('TICKETS')}
        onNavigateToDrive={() => setActiveTab('DRIVE_SYNC')}
        onNavigateToFunds={() => setActiveTab('FUNDS')}
      />

      {/* Main Container with Sidebar + View Area */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Viewport Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-24 md:pb-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-5">
            {activeTab === 'DASHBOARD' && (
              <GeneralDashboard
                onNavigateToTickets={() => setActiveTab('TICKETS')}
                onNavigateToSports={() => setActiveTab('SPORTS')}
                onNavigateToAreas={handleNavigateToAreas}
                onNavigateToDrive={() => setActiveTab('DRIVE_SYNC')}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'CITIZENS' && (
              <CitizensRegistry 
                onOpenNewTicketForCitizen={handleOpenTicketForCitizen}
              />
            )}

            {activeTab === 'TICKETS' && (
              <TicketManagement 
                initialCitizenForTicket={citizenForTicket}
                onClearInitialCitizen={() => setCitizenForTicket(null)}
              />
            )}

            {activeTab === 'CONTROL_URBANO' && (
              <UrbanControlModule />
            )}

            {activeTab === 'RRHH' && (
              <HumanResourcesModule />
            )}

            {activeTab === 'CULTURE' && (
              <CultureEducationModule />
            )}

            {activeTab === 'ESCUELA_EMPRESA' && (
              <EscuelaEmpresaModule />
            )}

            {activeTab === 'FUNDS' && (
              <FundsModule />
            )}

            {activeTab === 'SPORTS' && (
              <SportsModule />
            )}

            {activeTab === 'AREAS' && (
              <AreaWorkspaces initialDeptId={targetAreaForWorkspace} />
            )}

            {activeTab === 'DRIVE_SYNC' && (
              <DriveAndExcelSync />
            )}

            {activeTab === 'REPORTS' && (
              <ReportsCenter />
            )}

            {activeTab === 'ADMIN' && (
              <AdminManagement />
            )}
          </div>
        </main>
      </div>

      {/* Quiet Institutional Footer */}
      <footer className="hidden md:block bg-slate-900 border-t border-slate-800 text-xs text-slate-400 py-3 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-slate-200">Municipalidad de Itá Ibaté</span>
            <span>· Corrientes</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Dirección de Modernización y Estadísticas · Ley 25.326
          </div>
        </div>
      </footer>
    </div>
  );
};

const MainAppGate: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();

  if (!currentUser) {
    return <LoginScreen />;
  }

  // Strictly block any non-admin user from loading or viewing ANY municipal information
  if (!isAdmin) {
    return <RestrictedAccessScreen />;
  }

  return (
    <MunicipalDataProvider>
      <AuthenticatedAdminApp />
    </MunicipalDataProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppGate />
    </AuthProvider>
  );
}
