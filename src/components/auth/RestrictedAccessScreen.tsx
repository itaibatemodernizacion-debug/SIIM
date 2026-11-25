import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldOff, LogOut, Lock } from 'lucide-react';

export const RestrictedAccessScreen: React.FC = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-7 shadow-2xl text-center space-y-5">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/logo.png"
            alt="Escudo Oficial de la Municipalidad de Itá Ibaté"
            className="w-16 h-16 object-contain opacity-90"
          />
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center">
            <ShieldOff className="w-7 h-7 text-rose-400" />
          </div>
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
            <Lock className="w-3 h-3" />
            Acceso Restringido
          </span>
          <h1 className="text-xl font-black text-white">
            Sin Permisos de Visualización
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            La cuenta <strong className="text-slate-200">{currentUser?.name}</strong> ({currentUser?.username || currentUser?.email}) no posee perfil de <strong className="text-white">Administrador General</strong>.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Por disposición de seguridad municipal, ninguna información del sistema puede visualizarse sin autorización del único Administrador General.
          </p>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión y Volver al Inicio</span>
        </button>
      </div>
    </div>
  );
};
