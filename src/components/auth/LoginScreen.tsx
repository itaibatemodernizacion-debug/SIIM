import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  UserCheck, 
  Lock, 
  Mail, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { users, loginAsUser, loginWithGoogle, loginWithCredentials } = useAuth();

  const [email, setEmail] = useState('intendencia@itaibate.gob.ar');
  const [password, setPassword] = useState('******');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Find matching user or fallback
    const matched = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      loginAsUser(matched.id);
    } else {
      loginWithCredentials(email, 'RESPONSABLE_AREA');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Municipal Emblem & Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-700 mx-auto flex items-center justify-center shadow-xl shadow-sky-900/30 border border-sky-400/30">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            MUNICIPALIDAD DE ITÁ IBATÉ
          </h1>
          <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest">
            CORRIENTES • ARGENTINA
          </p>
          <p className="text-xs text-slate-400">
            SIMM — Sistema Integral de Monitoreo y Gestión Municipal
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="pb-3 border-b border-slate-800 text-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Acceso Institucional
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ingrese con sus credenciales de empleado o funcionario
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Correo Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@itaibate.gob.ar"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-sky-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-sky-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-lg shadow-sky-900/30 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Ingresar al Sistema</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Google Sign In option */}
          <div className="pt-2">
            <div className="relative flex items-center justify-center mb-3">
              <div className="border-t border-slate-800 w-full"></div>
              <span className="bg-slate-900 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                O continuar con
              </span>
            </div>

            <button
              onClick={loginWithGoogle}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Iniciar Sesión con Google</span>
            </button>
          </div>

          {/* Quick Access Roles Selector (Demo) */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 block text-center">
              Acceso Rápido para Demostración y Evaluación
            </span>

            <div className="grid grid-cols-2 gap-1.5">
              {users.slice(0, 4).map(u => (
                <button
                  key={u.id}
                  onClick={() => loginAsUser(u.id)}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition cursor-pointer"
                >
                  <div className="font-bold text-slate-200 text-[11px] truncate">{u.name}</div>
                  <div className="text-[9px] text-sky-400 truncate">{u.position}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>Cumplimiento de la Ley 25.326 de Protección de Datos Personales.</p>
          <p>Municipalidad de Itá Ibaté • Gestión Pública y Modernización</p>
        </div>
      </div>
    </div>
  );
};
