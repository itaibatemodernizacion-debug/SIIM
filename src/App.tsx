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
import { LoginScreen } from './components/auth/LoginScreen';
import { Citizen } from './types';
import { Building2, Shield, Heart } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('DASHBOARD');
  
  // Cross-component state navigation
  const [citizenForTicket, setCitizenForTicket] = useState<Citizen | null>(null);
  const [targetAreaForWorkspace, setTargetAreaForWorkspace] = useState<string | undefined>(undefined);

  if (!currentUser) {
    return <LoginScreen />;
  }

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
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'DASHBOARD' && (
              <GeneralDashboard 
                onNavigateToTickets={() => setActiveTab('TICKETS')}
                onNavigateToSports={() => setActiveTab('SPORTS')}
                onNavigateToAreas={handleNavigateToAreas}
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

      {/* Municipal Institutional Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-xs text-slate-400 py-3.5 px-4 lg:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-slate-200">
              Municipalidad de Itá Ibaté
            </span>
            <span>• Corrientes, República Argentina</span>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-4">
            <span>Ley 25.326 Protección de Datos</span>
            <span>•</span>
            <span>SIMM v2.4 Estable</span>
            <span>•</span>
            <span>Dirección de Modernización y Estadísticas</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MunicipalDataProvider>
        <MainAppContent />
      </MunicipalDataProvider>
    </AuthProvider>
  );
}
