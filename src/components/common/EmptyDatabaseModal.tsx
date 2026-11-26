import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle2, Cloud, X, ShieldCheck } from 'lucide-react';
import { useMunicipalData } from '../../context/MunicipalDataContext';

interface EmptyDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCleared?: () => void;
  onGoToDrive?: () => void;
}

export const EmptyDatabaseModal: React.FC<EmptyDatabaseModalProps> = ({
  isOpen,
  onClose,
  onCleared,
  onGoToDrive
}) => {
  const { clearDemoData } = useMunicipalData();
  const [completed, setCompleted] = useState(false);

  if (!isOpen) return null;

  const handleConfirmWipe = () => {
    clearDemoData();
    setCompleted(true);
    if (onCleared) onCleared();
  };

  const handleClose = () => {
    setCompleted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              completed
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
            }`}>
              {completed ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {completed ? 'Base de Datos Vaciada con Éxito' : 'Vaciar Base de Datos para Producción'}
              </h3>
              <p className="text-xs text-slate-400">
                {completed
                  ? 'El sistema quedó en cero y listo para recibir sus datos desde Google Drive'
                  : 'Elimina todos los registros cargados para comenzar en limpio'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {completed ? (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-950/50 border border-emerald-500/30 rounded-xl space-y-2 text-emerald-100">
              <p className="font-semibold text-emerald-300">
                Todos los registros de prueba fueron eliminados correctamente.
              </p>
              <p className="text-slate-300 leading-relaxed">
                Sus <strong>Secretarios, Directores, Coordinadores</strong>, contraseña de administrador y carpeta enlazada de Drive se mantuvieron intactos. Ahora puede conectar Google Drive e importar sus planillas reales.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold cursor-pointer"
              >
                Cerrar
              </button>
              {onGoToDrive && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onGoToDrive();
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Ir a Conectar Google Drive</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-950/35 border border-rose-500/30 rounded-xl space-y-1.5 text-rose-100">
              <div className="font-bold text-rose-300 uppercase text-[11px]">
                Se eliminarán todos los registros operativos actuales:
              </div>
              <p className="text-slate-300 leading-relaxed">
                Ciudadanos, trámites, personal de RRHH, alumnos de Cultura y Escuela Empresa, deportistas y torneos, fondos y gastos, carnets, multas, habilitaciones, operativos viales, actas necrológicas e historial de sincronización.
              </p>
            </div>

            <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-emerald-300 text-[11px] uppercase">
                  Se conserva intacto:
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Todo el organigrama modificado (Secretarios, Directores y Coordinadores), su usuario y contraseña de Administrador, las categorías de gastos y el enlace de su carpeta de Google Drive (listo para sincronizar de cero).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmWipe}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-lg cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Vaciar Base de Datos Ahora</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
