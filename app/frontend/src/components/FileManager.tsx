/**
 * FileManager.tsx — Import de fichiers universel (tous types) pour RATISS.
 *
 * Drag & drop + sélection, prévisualisation, détection automatique du type
 * scientifique (PDB, CSV, HDF5, LaTeX, code…), et lancement de l'analyse
 * via le pipeline agentique RATISS.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadCloud, File as FileIcon, Trash2, Loader2, CheckCircle2, X, Atom,
  Table, Layers, FileText, Code, Image as ImageIcon, Archive, FlaskConical,
  Zap, AlertCircle, FileCode, Braces, Video, AudioLines, BookOpen
} from "lucide-react";
import { ImportedFile } from "../types";
import { uploadFiles, listFiles, deleteFile, analyzeFile, fileKindMeta } from "../lib/api";

interface FileManagerProps {
  isCompetitionBranch?: boolean;
  onAttachToChat?: (file: ImportedFile) => void;
}

function KindIcon({ kind, className = "w-4 h-4" }: { kind: string; className?: string }) {
  const meta = fileKindMeta(kind);
  const icon = meta.icon;
  const map: Record<string, any> = {
    atom: Atom, table: Table, layers: Layers, file: FileIcon, file_text: FileText,
    code: Code, image: ImageIcon, archive: Archive, braces: Braces,
    video: Video, audio: AudioLines, book: BookOpen, file_code: FileCode,
  };
  const Cmp = map[icon] || FileIcon;
  return <Cmp className={`${className} ${meta.color}`} />;
}

export function FileManager({ isCompetitionBranch = false, onAttachToChat }: FileManagerProps) {
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const refresh = useCallback(async () => {
    setFiles(await listFiles());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const showSuccess = (m: string) => { setSuccess(m); setTimeout(() => setSuccess(null), 3000); };

  const handleFiles = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (!arr.length) return;
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await uploadFiles(arr);
      await refresh();
      showSuccess(`${uploaded.length} fichier(s) importé(s) — ${uploaded.length === arr.length ? "succès total" : "partiel"}`);
    } catch (e: any) {
      setError(e.message || "Échec de l'import");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };
  const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragDepth.current++; setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragDepth.current--; if (dragDepth.current <= 0) setIsDragging(false); };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDelete = async (id: string) => {
    await deleteFile(id);
    await refresh();
  };

  const handleAnalyze = async (file: ImportedFile) => {
    setAnalyzingId(file.id);
    setError(null);
    try {
      await analyzeFile(file.id, `Analyse scientifique de ${file.name}`);
      showSuccess(`Analyse de ${file.name} lancée via le pipeline RATISS`);
    } catch (e: any) {
      setError(e.message || "Échec de l'analyse");
    } finally {
      setAnalyzingId(null);
    }
  };

  const accent = isCompetitionBranch ? "red" : "#2563eb";

  return (
    <div className="space-y-5">
      {/* En-tête scientifique */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
        <FlaskConical className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-black tracking-wider uppercase text-slate-300">Import universel — pipeline scientifique</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
            Importez n'importe quel type de fichier : structures (PDB/CIF/XYZ), données (CSV/TSV/HDF5),
            tableaux (NumPy), code (Python/R/Notebook), documents (PDF/LaTeX/BibTeX), images, archives…
            RATISS détecte automatiquement le format et l'injecte dans son pipeline d'analyse agentique.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="p-3 text-xs bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
        </div>
      )}

      {/* Zone drag & drop */}
      <div
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-3xl border-2 border-dashed transition-all p-10 text-center ${
          isDragging
            ? "border-emerald-400 bg-emerald-500/10 scale-[1.01]"
            : "border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.02]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept="*/*"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <motion.div animate={isDragging ? { scale: 1.1 } : { scale: 1 }} className="flex flex-col items-center gap-3">
          {isUploading ? (
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          ) : (
            <UploadCloud className={`w-10 h-10 ${isDragging ? "text-emerald-400" : "text-slate-500"}`} />
          )}
          <div>
            <p className="text-sm font-bold text-white">
              {isUploading ? "Import en cours…" : isDragging ? "Déposez vos fichiers ici" : "Glissez-déposez ou cliquez pour importer"}
            </p>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">
              Tous formats · PDB · CSV · HDF5 · PDF · LaTeX · Code · Images · Archives
            </p>
          </div>
        </motion.div>
      </div>

      {/* Liste des fichiers importés */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Fichiers importés ({files.length})
          </h4>
          {files.length > 0 && (
            <button onClick={refresh} className="text-[10px] font-mono text-slate-500 hover:text-emerald-400 uppercase tracking-wider">
              ↻ Actualiser
            </button>
          )}
        </div>

        <AnimatePresence>
          {files.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-8 rounded-2xl border border-white/5 bg-white/[0.01] text-center"
            >
              <FileIcon className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-[11px] text-slate-600 font-mono">Aucun fichier importé pour le moment</p>
            </motion.div>
          ) : (
            files.map((f) => {
              const meta = fileKindMeta(f.kind);
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                  className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <KindIcon kind={f.kind} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono font-medium truncate text-white">{f.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span className={meta.color}>{meta.label}</span>
                      <span>·</span>
                      <span>{f.size_kb < 1024 ? `${f.size_kb} KB` : `${(f.size_kb/1024).toFixed(1)} MB`}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onAttachToChat && (
                      <button
                        onClick={() => onAttachToChat(f)}
                        title="Attacher au chat"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleAnalyze(f)}
                      disabled={analyzingId === f.id}
                      title="Analyser via le pipeline RATISS"
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {analyzingId === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />}
                      Analyser
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      title="Supprimer"
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
