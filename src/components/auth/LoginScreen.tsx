import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  User,
  ArrowRight,
  ShieldAlert,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { loginWithUsernameAndPassword, rememberedUsername, authReady } = useAuth();

  const [username, setUsername] = useState<string>(rememberedUsername || '');
  const [password, setPassword] = useState<string>('');
  const [rememberCredentials, setRememberCredentials] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (rememberedUsername && !username) {
      setUsername(rememberedUsername);
    }
  }, [rememberedUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await loginWithUsernameAndPassword(username, password, rememberCredentials);
      if (!result.success) {
        setErrorMsg(result.error || 'Usuario o contraseña incorrectos.');
      }
    } catch {
      setErrorMsg('Error al verificar las credenciales. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Municipal Official Crest & Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="relative inline-block">
            <img
              src="/logo.png"
              alt="Escudo Oficial de la Municipalidad de Itá Ibaté"
              className="w-28 h-28 mx-auto object-contain drop-shadow-2xl transition-transform hover:scale-105 duration-300"
            />
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            MUNICIPALIDAD DE ITÁ IBATÉ
          </h1>
          <p className="text-xs font-semibold text-sky-400 uppercase tracking-widest">
            PROVINCIA DE CORRIENTES • ARGENTINA
          </p>
          <div className="inline-block bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-full text-[11px] text-slate-300 font-medium">
            SIMM — Sistema Integral de Monitoreo y Gestión Municipal
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 backdrop-blur-sm">
          <div className="pb-3 border-b border-slate-800 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 mb-1">
              <KeyRound className="w-3 h-3" />
              ACCESO PRIVADO · ADMINISTRADOR ÚNICO
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Inicio de Sesión Institucional
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ingrese su usuario y contraseña para acceder al sistema
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Standard form with autocomplete="on" so browser password managers offer to save username & password */}
          <form method="post" autoComplete="on" onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Username input */}
            <div>
              <label htmlFor="simm-username" className="block text-slate-300 font-medium mb-1">
                Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  id="simm-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. admin"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-sky-500 font-medium text-sm"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <label htmlFor="simm-password" className="block text-slate-300 font-medium mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  id="simm-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contraseña"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-white focus:outline-none focus:border-sky-500 font-medium tracking-wide text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember user & enable browser password saving */}
            <label className="flex items-start gap-2.5 text-slate-300 cursor-pointer select-none bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
              <input
                type="checkbox"
                checked={rememberCredentials}
                onChange={(e) => setRememberCredentials(e.target.checked)}
                className="mt-0.5 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500 cursor-pointer"
              />
              <span className="text-[11px] leading-relaxed">
                <strong className="text-slate-200 block">Recordar usuario y guardar credenciales</strong>
                Permite que su navegador guarde el usuario y la contraseña para completar el ingreso más rápido.
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting || !authReady}
              className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-xl shadow-sky-900/40 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
            >
              <span>{isSubmitting ? 'Verificando acceso...' : 'Ingresar al Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Single Admin notice */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Solo la cuenta única de <strong className="text-slate-200">Administrador General</strong> (<span className="font-mono text-sky-300">admin</span>) tiene acceso a la información municipal. La contraseña puede cambiarse en cualquier momento al ingresar.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>Cumplimiento de la Ley 25.326 de Protección de Datos Personales.</p>
          <p>Municipalidad de Itá Ibaté • Corrientes, República Argentina</p>
        </div>
      </div>
    </div>
  );
};
