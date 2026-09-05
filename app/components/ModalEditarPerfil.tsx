"use client";
import { useEffect, useState } from "react";
import { X, Camera, GraduationCap, Hash, Heart } from "lucide-react";

type PerfilData = {
  fotoUrl?: string;
  licenciatura?: string;
  semestre?: string | number;
  intereses?: string;
};

type ModalEditarPerfilProps = {
  visible: boolean;
  perfilActual: PerfilData;
  nombreUsuario?: string;
  onGuardar: (datos: { licenciatura: string; semestre: string; intereses: string }, archivoFoto: File | null) => Promise<void> | void;
  onCancelar: () => void;
};

export default function ModalEditarPerfil({ visible, perfilActual, nombreUsuario, onGuardar, onCancelar }: ModalEditarPerfilProps) {
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);
  const [licenciatura, setLicenciatura] = useState("");
  const [semestre, setSemestre] = useState("");
  const [intereses, setIntereses] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (visible) {
      setFotoPreview(perfilActual.fotoUrl || null);
      setArchivoFoto(null);
      setLicenciatura(perfilActual.licenciatura || "");
      setSemestre(perfilActual.semestre ? String(perfilActual.semestre) : "");
      setIntereses(perfilActual.intereses || "");
      setGuardando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const handleFoto = (file: File | null) => {
    if (!file) return;
    setArchivoFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const guardar = async () => {
    setGuardando(true);
    await onGuardar({ licenciatura: licenciatura.trim(), semestre: semestre.trim(), intereses: intereses.trim() }, archivoFoto);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto animate-modal-pop">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100">Editar perfil</h3>
          <button onClick={onCancelar}>
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-5">
          <label className="relative cursor-pointer group">
            <div className="w-20 h-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-extrabold shadow-lg overflow-hidden">
              {fotoPreview ? (
                <img src={fotoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                nombreUsuario?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow group-hover:bg-blue-700 transition">
              <Camera size={13} className="text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFoto(e.target.files?.[0] || null)} />
          </label>
          <p className="text-xs text-slate-400 mt-2">Toca la foto para cambiarla</p>
        </div>

        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
          <GraduationCap size={13} /> Licenciatura / programa
        </label>
        <input
          type="text"
          placeholder="Ej. Licenciatura en Enseñanza y Aprendizaje de la Historia"
          value={licenciatura}
          onChange={(e) => setLicenciatura(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 mt-1.5 mb-3 focus:outline-none focus:border-blue-400"
        />

        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
          <Hash size={13} /> Semestre (opcional)
        </label>
        <input
          type="number"
          min={1}
          max={12}
          placeholder="Ej. 5"
          value={semestre}
          onChange={(e) => setSemestre(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 mt-1.5 mb-3 focus:outline-none focus:border-blue-400"
        />

        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
          <Heart size={13} /> Intereses / gustos
        </label>
        <textarea
          placeholder="Ej. Me gusta la lectura, el fútbol y la música"
          rows={3}
          value={intereses}
          onChange={(e) => setIntereses(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 resize-none mt-1.5 mb-4 focus:outline-none focus:border-blue-400"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onCancelar} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 px-4 py-2">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl disabled:opacity-50 font-semibold shadow transition active:scale-95"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
