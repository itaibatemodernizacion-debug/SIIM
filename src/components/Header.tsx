import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMunicipalData } from '../context/MunicipalDataContext';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  LogOut,
  FileSpreadsheet,
  ChevronDown,
  KeyRound,
  X,
  RefreshCw,
  FolderOpen
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
    adminUsername,
    isUsingDefaultPassword,
    logout,
    googleToken,
    maskSensitiveData,
    toggleMaskSensitiveData,
    changeSystemPassword
  } = useAuth();

  const {
    kpis,
    departmentKPIs,
    financialKPIs,
    isDriveSyncing,
    driveSyncProgress,
    driveSyncError,
    lastDriveSyncInfo,
    syncFromOfficialDrive,
    clearDriveSyncError
  } = useMunicipalData();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [dismissedDefaultPassBanner, setDismissedDefaultPassBanner] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState(adminUsername);
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);

  const inactiveDepts = departmentKPIs.filter((d) => d.isInactiveWarning);

  const formattedDate = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const hasFinancialAlerts =
    financialKPIs?.totalSettlementObserved > 0 || financialKPIs?.departmentsWithLowBalance > 0;

  const openPasswordModal = () => {
    setShowUserMenu(false);
    setUsernameInput(adminUsername);
    setCurrentPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
    setPassError(null);
    setPassSuccess(false);
    setShowPasswordModal(true);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      {/* Live Google Drive sync progress or error strip */}
      {isDriveSyncing && (
        <div className="bg-emerald-950/95 border-b border-emerald-500/40 px-4 py-1.5 text-xs text-emerald-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
            <span className="truncate font-medium">
              {driveSyncProgress || 'Actualizando datos desde las planillas de Google Drive...'}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 shrink-0">
            Sincronizando Drive
          </span>
        </div>
      )}

      {!isDriveSyncing && driveSyncError && (
        <div className="bg-rose-950/95 border-b border-rose-500/40 px-4 py-1.5 text-xs text-rose-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">Error al actualizar desde Google Drive: {driveSyncError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => syncFromOfficialDrive({ replaceExisting: true })}
              className="px-2 py-0.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-[11px] font-semibold cursor-pointer"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={clearDriveSyncError}
              className="text-rose-300 hover:text-white cursor-pointer"
              title="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Prompt to change initial default password whenever the Admin wishes */}
      {isUsingDefaultPassword && !dismissedDefaultPassBanner && (
        <div className="bg-sky-950/90 border-b border-sky-500/40 px-4 py-1.5 text-xs text-sky-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              Está ingresando con la <strong>contraseña inicial</strong>. Puede cambiar su usuario y contraseña cuando lo desee.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPasswordModal}
              className="px-2.5 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md font-semibold text-[11px] transition cursor-pointer"
            >
              Cambiar Contraseña Ahora
            </button>
            <button
              type="button"
              onClick={() => setDismissedDefaultPassBanner(true)}
              className="text-sky-300/80 hover:text-white cursor-pointer"
              title="Ocultar aviso en esta sesión"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
                {kpis.criticalDelayedTicketsCount} trámite(s) con más de 15 días sin resolución.
              </button>
            )}
            {financialKPIs?.totalSettlementObserved > 0 && (
              <button
                onClick={onNavigateToFunds}
                className="hover:underline text-rose-300 font-medium cursor-pointer"
              >
                {financialKPIs.totalSettlementObserved} rendición(es) de fondos observada(s) con necesidad de corrección.
              </button>
            )}
            {financialKPIs?.departmentsWithLowBalance > 0 && (
              <button
                onClick={onNavigateToFunds}
                className="hover:underline text-amber-300 font-medium cursor-pointer"
              >
                {financialKPIs.departmentsWithLowBalance} área(s) con saldo financiero bajo (&lt; 15%).
              </button>
            )}
            {inactiveDepts.length > 0 && (
              <span className="text-amber-200/90">
                • {inactiveDepts.length} área(s) sin registrar actividad reciente ({inactiveDepts.map((d) => d.departmentName.split(' ')[0]).join(', ')}).
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

        {/* Center: Live Date & Always-Accessible 1-Click Drive Refresh */}
        <div className="flex items-center gap-2 lg:gap-3 text-xs text-slate-300">
          <div className="hidden 2xl:flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="capitalize">{formattedDate}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => syncFromOfficialDrive({ replaceExisting: true })}
              disabled={isDriveSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
              title={
                lastDriveSyncInfo
                  ? `Última actualización desde Drive (${lastDriveSyncInfo.folderName}): ${lastDriveSyncInfo.filesImported} planillas · ${lastDriveSyncInfo.totalRecords} registros`
                  : 'Descargar y actualizar todos los datos del sistema desde las planillas Excel en Google Drive'
              }
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDriveSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isDriveSyncing ? 'Actualizando...' : 'Actualizar desde Drive'}
              </span>
              <span className="sm:hidden">{isDriveSyncing ? '...' : 'Drive'}</span>
              {!isDriveSyncing && lastDriveSyncInfo && (
                <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-200 text-[10px] font-semibold">
                  {lastDriveSyncInfo.totalRecords} reg.
                </span>
              )}
            </button>

            {onNavigateToDrive && (
              <button
                type="button"
                onClick={onNavigateToDrive}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  googleToken || lastDriveSyncInfo
                    ? 'bg-slate-800/90 border-emerald-500/35 text-emerald-300 hover:bg-slate-700'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
                title="Abrir carpeta de Google Drive y explorar las planillas por área"
              >
                {lastDriveSyncInfo ? (
                  <FolderOpen className="w-3.5 h-3.5" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Right: Privacy Toggle & Single Admin Account Menu */}
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

          {/* Current Admin Badge & Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 pl-2 pr-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-sky-500/20">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-slate-100 max-w-[140px] truncate leading-tight">
                  {currentUser?.name || 'Administrador General'}
                </div>
                <div className="text-[10px] text-sky-400 truncate leading-tight font-mono">
                  @{adminUsername} • Admin Único
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs">
                <div className="p-2 border-b border-slate-800">
                  <p className="font-semibold text-white">{currentUser?.name}</p>
                  <p className="text-slate-400 text-[11px] font-mono">Usuario: {adminUsername}</p>
                  <p className="text-slate-500 text-[11px] truncate">{currentUser?.email}</p>
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    Administrador General Único
                  </div>
                </div>

                <div className="py-1 space-y-0.5">
                  <button
                    onClick={openPasswordModal}
                    className="w-full text-left px-2 py-1.5 text-sky-300 hover:bg-sky-950/40 rounded flex items-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                    Cambiar Usuario / Contraseña
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

      {/* Modal: Cambiar Usuario y Contraseña de Acceso */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Cambiar Credenciales de Acceso</h3>
                  <p className="text-[11px] text-slate-400">Modificar usuario y contraseña del Administrador Único</p>
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
                <p className="text-xs font-bold text-emerald-300">Credenciales actualizadas exitosamente</p>
                <p className="text-[11px] text-emerald-400/80">
                  Su nueva contraseña y usuario quedaron guardados de forma segura en el sistema.
                </p>
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
                autoComplete="on"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPassError(null);
                  if (newPassInput !== confirmPassInput) {
                    setPassError('La nueva contraseña y su confirmación no coinciden.');
                    return;
                  }
                  setIsSavingPass(true);
                  try {
                    const res = await changeSystemPassword(currentPassInput, newPassInput, usernameInput);
                    if (!res.success) {
                      setPassError(res.error || 'Error al cambiar la contraseña.');
                    } else {
                      setPassSuccess(true);
                    }
                  } finally {
                    setIsSavingPass(false);
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
                    Usuario Administrador:
                  </label>
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    required
                    minLength={3}
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Ej. admin"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Contraseña Actual:
                  </label>
                  <input
                    type="password"
                    name="current-password"
                    autoComplete="current-password"
                    required
                    value={currentPassInput}
                    onChange={(e) => setCurrentPassInput(e.target.value)}
                    placeholder="Ingrese su contraseña actual"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Nueva Contraseña:
                  </label>
                  <input
                    type="password"
                    name="new-password"
                    autoComplete="new-password"
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
                    name="confirm-new-password"
                    autoComplete="new-password"
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
                    disabled={isSavingPass}
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow-md cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isSavingPass ? 'Guardando...' : 'Guardar Nueva Contraseña'}</span>
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
