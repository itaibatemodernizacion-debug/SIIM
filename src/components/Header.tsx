import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMunicipalData } from '../context/MunicipalDataContext';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  LogOut,
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
    maskSensitiveData,
    toggleMaskSensitiveData,
    changeSystemPassword
  } = useAuth();

  const {
    kpis,
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
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white sticky top-0 z-40">
      {/* Live Google Drive sync progress */}
      {isDriveSyncing && (
        <div className="bg-emerald-950/95 border-b border-emerald-500/40 px-3 sm:px-4 py-1.5 text-xs text-emerald-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
            <span className="truncate font-medium">
              {driveSyncProgress || 'Actualizando desde Drive...'}
            </span>
          </div>
        </div>
      )}

      {/* Drive error strip */}
      {!isDriveSyncing && driveSyncError && (
        <div className="bg-rose-950/95 border-b border-rose-500/40 px-3 sm:px-4 py-1.5 text-xs text-rose-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{driveSyncError}</span>
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
              className="text-rose-300 hover:text-white cursor-pointer p-1"
              title="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Default password quick reminder (desktop only to keep mobile header slim) */}
      {isUsingDefaultPassword && !dismissedDefaultPassBanner && (
        <div className="hidden md:flex bg-sky-950/80 border-b border-sky-500/30 px-4 py-1 text-xs text-sky-100 items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Contraseña inicial activa.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPasswordModal}
              className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-semibold text-[11px] transition cursor-pointer"
            >
              Cambiar clave
            </button>
            <button
              type="button"
              onClick={() => setDismissedDefaultPassBanner(true)}
              className="text-sky-300/80 hover:text-white cursor-pointer"
              title="Ocultar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Compact alerts bar (desktop only so mobile keeps <=15% sticky height) */}
      {(kpis.criticalDelayedTicketsCount > 0 || hasFinancialAlerts) && (
        <div className="hidden lg:flex bg-amber-950/70 border-b border-amber-600/30 px-4 py-1 text-[11px] text-amber-200 items-center gap-4">
          <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Alertas:
          </span>
          {kpis.criticalDelayedTicketsCount > 0 && (
            <button
              onClick={onNavigateToTickets}
              className="hover:underline text-amber-300 cursor-pointer"
            >
              {kpis.criticalDelayedTicketsCount} demorados (+15d)
            </button>
          )}
          {financialKPIs?.totalSettlementObserved > 0 && (
            <button
              onClick={onNavigateToFunds}
              className="hover:underline text-rose-300 cursor-pointer"
            >
              {financialKPIs.totalSettlementObserved} rendiciones observadas
            </button>
          )}
        </div>
      )}

      {/* Main Compact Header Bar */}
      <div className="h-14 md:h-15 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2">
        {/* Left: Crest + Clean Wordmark */}
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/logo.png"
            alt="Escudo Itá Ibaté"
            referrerPolicy="no-referrer"
            className="w-8 h-8 md:w-9 md:h-9 object-contain shrink-0"
          />
          <div className="min-w-0 flex items-baseline gap-2">
            <h1 className="font-bold text-sm md:text-base tracking-tight text-white whitespace-nowrap truncate">
              Itá Ibaté
            </h1>
            <span className="hidden md:inline text-xs text-slate-400 whitespace-nowrap">
              · Gestión Municipal
            </span>
          </div>
        </div>

        {/* Right: Primary Drive Sync + Privacy Icon + Admin Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 1-Click Drive Refresh */}
          <button
            type="button"
            onClick={() => syncFromOfficialDrive({ replaceExisting: true })}
            disabled={isDriveSyncing}
            className="min-h-[40px] px-3 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap"
            title={
              lastDriveSyncInfo
                ? `Drive (${lastDriveSyncInfo.folderName}): ${lastDriveSyncInfo.filesImported} planillas · ${lastDriveSyncInfo.totalRecords} registros`
                : 'Actualizar datos desde Google Drive'
            }
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${isDriveSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isDriveSyncing ? 'Actualizando...' : 'Actualizar Drive'}
            </span>
            {!isDriveSyncing && lastDriveSyncInfo && (
              <span className="hidden md:inline text-[11px] font-mono tabular-nums text-emerald-100/90">
                · {lastDriveSyncInfo.totalRecords}
              </span>
            )}
          </button>

          {/* Open Drive Folder Shortcut (desktop/tablet) */}
          {onNavigateToDrive && (
            <button
              type="button"
              onClick={onNavigateToDrive}
              className="hidden sm:flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition cursor-pointer"
              title="Carpeta Google Drive y Planillas"
            >
              <FolderOpen className="w-4 h-4 text-emerald-400" />
            </button>
          )}

          {/* Privacy protection icon toggle (Ley 25.326) */}
          <button
            type="button"
            onClick={toggleMaskSensitiveData}
            className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border transition cursor-pointer ${
              maskSensitiveData
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700/80 hover:bg-slate-700'
            }`}
            title={maskSensitiveData ? 'Datos sensibles ocultos (Ley 25.326)' : 'Ocultar DNI y teléfonos (Ley 25.326)'}
          >
            {maskSensitiveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Admin Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="min-h-[40px] flex items-center gap-1.5 pl-1.5 pr-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition cursor-pointer"
              title="Cuenta Administrador"
            >
              <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center text-white text-xs font-bold">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="hidden lg:inline text-xs font-semibold text-slate-100 max-w-[100px] truncate">
                @{adminUsername}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-xs">
                <div className="p-2.5 border-b border-slate-800">
                  <p className="font-semibold text-white">{currentUser?.name}</p>
                  <p className="text-slate-400 text-[11px] font-mono">@{adminUsername} · Admin</p>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-sky-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Acceso total</span>
                  </div>
                </div>

                <div className="py-1 space-y-0.5">
                  <button
                    onClick={openPasswordModal}
                    className="w-full text-left px-2.5 py-2 text-sky-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-sky-400" />
                    Cambiar clave
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-2 text-rose-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Salir
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
                  <h3 className="font-bold text-white text-sm">Cambiar Credenciales</h3>
                  <p className="text-[11px] text-slate-400">Usuario y contraseña del Administrador</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passSuccess ? (
              <div className="p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-center space-y-2">
                <p className="text-xs font-bold text-emerald-300">Credenciales actualizadas</p>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Listo
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
                  <label className="block text-slate-300 font-medium mb-1">Usuario</label>
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    required
                    minLength={3}
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Contraseña Actual</label>
                  <input
                    type="password"
                    name="current-password"
                    autoComplete="current-password"
                    required
                    value={currentPassInput}
                    onChange={(e) => setCurrentPassInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nueva Contraseña</label>
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
                  <label className="block text-slate-300 font-medium mb-1">Confirmar Contraseña</label>
                  <input
                    type="password"
                    name="confirm-new-password"
                    autoComplete="new-password"
                    required
                    value={confirmPassInput}
                    onChange={(e) => setConfirmPassInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPass}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isSavingPass ? 'Guardando...' : 'Guardar'}</span>
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
