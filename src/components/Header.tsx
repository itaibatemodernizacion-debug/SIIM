import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMunicipalData } from '../context/MunicipalDataContext';
import { 
  Building2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  Clock, 
  LogOut, 
  UserCheck, 
  FileSpreadsheet, 
  ChevronDown,
  RefreshCw,
  Sparkles,
  KeyRound,
  Database,
  X
} from 'lucide-react';

export const Header: React.FC<{ 
  onNavigateToTickets?: () => void; 
  onNavigateToDrive?: () => void;
  onNavigateToFunds?: () => void;
}> = ({
  onNavigateToTickets,
  onNavigateToDrive,
  onNavigateToFunds
}) => {
  const { 
    currentUser, 
    users, 
    loginAsUser, 
    logout, 
    loginWithGoogle, 
    googleToken, 
    maskSensitiveData, 
    toggleMaskSensitiveData,
    changeSystemPassword 
  } = useAuth();
  
  const { kpis, departmentKPIs, financialKPIs, resetAllData } = useMunicipalData();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);

  const inactiveDepts = departmentKPIs.filter(d => d.isInactiveWarning);

  const formattedDate = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const hasFinancialAlerts = (financialKPIs?.totalSettlementObserved > 0) || (financialKPIs?.departmentsWithLowBalance > 0);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      {/* Top emergency / alert banner if delayed tickets, inactive areas, or financial alerts exist */}
      {(kpis.criticalDelayedTicketsCount > 0 || inactiveDepts.length > 0 || hasFinancialAlerts) && (
        <div className="bg-amber-950/90 border-b border-amber-600/50 px-4 py-1.5 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
              Alerta de Gestión:
            </span>
            {kpis.criticalDelayedTicketsCount > 0 && (
              <button 
                onClick={onNavigateToTickets}
                className="hover:underline text-amber-300 font-medium cursor-pointer"
              >
                ⚠️ {kpis.criticalDelayedTicketsCount} trámite(s) con más de 15 días sin resolución.
              </button>
            )}
            {financialKPIs?.totalSettlementObserved > 0 && (
              <button
                onClick={onNavigateToFunds}
                className="hover:underline text-rose-300 font-medium cursor-pointer"
              >
                🔴 {financialKPIs.totalSettlementObserved} rendición(es) de fondos observada(s) con necesidad de corrección.
              </button>
            )}
            {financialKPIs?.departmentsWithLowBalance > 0 && (
              <button
                onClick={onNavigateToFunds}
                className="hover:underline text-amber-300 font-medium cursor-pointer"
              >
                ⚠️ {financialKPIs.departmentsWithLowBalance} área(s) con saldo financiero bajo (&lt; 15%).
              </button>
            )}
            {inactiveDepts.length > 0 && (
              <span className="text-amber-200/90">
                • {inactiveDepts.length} área(s) sin registrar actividad reciente ({inactiveDepts.map(d => d.departmentName.split(' ')[0]).join(', ')}).
              </span>
            )}
          </div>
          <div className="text-[11px] text-amber-400/80">
            Monitoreo en tiempo real • Itá Ibaté
          </div>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Branding & Municipal Crest */}
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Escudo Oficial Municipalidad de Itá Ibaté" 
              className="w-11 h-11 object-contain drop-shadow hover:scale-105 transition-transform"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base lg:text-lg tracking-tight text-white flex items-center gap-1.5">
                MUNICIPALIDAD DE ITÁ IBATÉ
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-sky-500/20 text-sky-300 rounded border border-sky-400/30">
                  CORRIENTES
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-300 font-medium tracking-wide">
              SIMM <span className="text-slate-500">•</span> Sistema Integral de Monitoreo y Gestión Municipal
            </p>
          </div>
        </div>

        {/* Center: Live Date & Drive sync badge */}
        <div className="hidden xl:flex items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="capitalize">{formattedDate}</span>
          </div>

          <button
            onClick={onNavigateToDrive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              googleToken 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40' 
                : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700/60'
            }`}
            title="Conexión de sincronización de datos con Google Drive y Planillas Excel"
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${googleToken ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Drive & Sheets:</span>
            <span className={`font-semibold ${googleToken ? 'text-emerald-300' : 'text-sky-300'}`}>
              {googleToken ? 'Conectado' : 'Listo p/ Sincronizar'}
            </span>
          </button>
        </div>

        {/* Right: Privacy Toggle & User Selector */}
        <div className="flex items-center gap-2.5">
          {/* Privacy protection toggle (Ley 25.326) */}
          <button
            onClick={toggleMaskSensitiveData}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              maskSensitiveData
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Protección de Datos Personales (Ley 25.326). Oculta DNI y teléfonos en pantallas públicas."
          >
            {maskSensitiveData ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Datos Protegidos</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden md:inline">Ley 25.326</span>
              </>
            )}
          </button>

          {/* Quick Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-900/50 to-blue-900/40 hover:from-sky-800/60 hover:to-blue-800/50 border border-sky-500/30 px-3 py-1.5 rounded-lg text-xs text-sky-200 font-medium transition cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Simular Área / Rol</span>
              <ChevronDown className="w-3 h-3 text-sky-300" />
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                  <span>CAMBIAR USUARIO MUNICIPAL</span>
                  <span className="text-[10px] text-sky-400">Modo Demo</span>
                </div>
                <div className="py-1 max-h-64 overflow-y-auto space-y-1">
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        loginAsUser(u.id);
                        setShowRoleSwitcher(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                        currentUser?.id === u.id
                          ? 'bg-sky-600 text-white font-medium'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-medium truncate">{u.name}</div>
                        <div className="text-[10px] opacity-75">{u.position}</div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/30 uppercase">
                        {u.role === 'ADMIN_GENERAL' ? 'ADMIN' : 'ÁREA'}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-800 flex gap-1">
                  <button
                    onClick={() => {
                      loginWithGoogle();
                      setShowRoleSwitcher(false);
                    }}
                    className="flex-1 text-center py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded font-medium text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-sky-400" />
                    Acceso con Google
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Current User Badge & Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 pl-2 pr-1 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-sky-500/20">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-slate-100 max-w-[130px] truncate leading-tight">
                  {currentUser?.name || 'Mesa Municipal'}
                </div>
                <div className="text-[10px] text-sky-400 truncate leading-tight">
                  {currentUser?.position || 'Personal Municipal'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs">
                <div className="p-2 border-b border-slate-800">
                  <p className="font-semibold text-white">{currentUser?.name}</p>
                  <p className="text-slate-400 text-[11px]">{currentUser?.email}</p>
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    {currentUser?.role === 'ADMIN_GENERAL' ? 'Administrador General' : 'Responsable de Sector'}
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setCurrentPassInput('');
                      setNewPassInput('');
                      setConfirmPassInput('');
                      setPassError(null);
                      setPassSuccess(false);
                      setShowPasswordModal(true);
                    }}
                    className="w-full text-left px-2 py-1.5 text-sky-300 hover:bg-sky-950/40 rounded flex items-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                    Cambiar Contraseña de Acceso
                  </button>
                  <button
                    onClick={() => {
                      resetAllData();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-amber-300 hover:bg-amber-950/40 rounded flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Restablecer Datos Iniciales
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-rose-300 hover:bg-rose-950/40 rounded flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Cambiar Contraseña de Acceso */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Cambiar Contraseña de Acceso</h3>
                  <p className="text-[11px] text-slate-400">Modificar la clave de ingreso institucional</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passSuccess ? (
              <div className="p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-center space-y-2">
                <p className="text-xs font-bold text-emerald-300">¡Contraseña modificada exitosamente!</p>
                <p className="text-[11px] text-emerald-400/80">La nueva contraseña está activa y sincronizada en el sistema.</p>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="mt-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPassError(null);
                  if (newPassInput !== confirmPassInput) {
                    setPassError('La nueva contraseña y su confirmación no coinciden.');
                    return;
                  }
                  const res = changeSystemPassword(currentPassInput, newPassInput);
                  if (!res.success) {
                    setPassError(res.error || 'Error al cambiar la contraseña.');
                  } else {
                    setPassSuccess(true);
                  }
                }}
                className="space-y-3 text-xs"
              >
                {passError && (
                  <div className="p-2.5 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-300 text-[11px]">
                    {passError}
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Contraseña Actual:
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassInput}
                    onChange={(e) => setCurrentPassInput(e.target.value)}
                    placeholder="Clave actual (inicial: Gestion2629)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Nueva Contraseña:
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassInput}
                    onChange={(e) => setNewPassInput(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Confirmar Nueva Contraseña:
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassInput}
                    onChange={(e) => setConfirmPassInput(e.target.value)}
                    placeholder="Repita la nueva contraseña"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Guardar Nueva Contraseña</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
