// lib/api.ts — Helpers d'API pour fichiers & intégrations (import universel).
// Centralise les appels fetch vers le backend FastAPI.

import { ImportedFile, IntegrationsStatus, Integration } from "../types";

// ── Fichiers ──────────────────────────────────────────────────────────────────

export async function uploadFile(file: File): Promise<ImportedFile> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/files/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "upload_failed" }));
    throw new Error(err.error || "Échec de l'import du fichier");
  }
  const data = await res.json();
  return data.file as ImportedFile;
}

export async function uploadFiles(files: File[]): Promise<ImportedFile[]> {
  const out: ImportedFile[] = [];
  for (const f of files) {
    try {
      out.push(await uploadFile(f));
    } catch (e) {
      console.warn("[RATISS] upload échoué:", f.name, e);
    }
  }
  return out;
}

export async function listFiles(): Promise<ImportedFile[]> {
  const res = await fetch("/api/files");
  if (!res.ok) return [];
  const data = await res.json();
  return data.files as ImportedFile[];
}

export async function deleteFile(fileId: string): Promise<boolean> {
  const res = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
  return res.ok;
}

export async function analyzeFile(fileId: string, instruction: string): Promise<any> {
  const res = await fetch("/api/files/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId, instruction }),
  });
  if (!res.ok) throw new Error("analyze_failed");
  return res.json();
}

// ── Intégrations ──────────────────────────────────────────────────────────────

export async function getIntegrations(): Promise<IntegrationsStatus> {
  const res = await fetch("/api/integrations");
  if (!res.ok) return { integrations: [], total: 0, connected: 0, categories: [] };
  return res.json();
}

export async function connectIntegration(integrationId: string, token: string): Promise<Integration | null> {
  const res = await fetch("/api/integrations/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ integration_id: integrationId, token }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.status as Integration;
}

export async function disconnectIntegration(integrationId: string): Promise<void> {
  await fetch("/api/integrations/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ integration_id: integrationId }),
  });
}

export async function runIntegrationAction(
  integrationId: string,
  action: string,
  params: Record<string, any> = {}
): Promise<any> {
  const res = await fetch(`/api/integrations/${integrationId}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "action_failed" }));
    throw new Error(err.error || `Échec de l'action ${action}`);
  }
  return res.json();
}

// ── Icônes & libellés par catégorie de fichier ────────────────────────────────

export const FILE_KIND_META: Record<string, { label: string; color: string; icon: string }> = {
  structure_pdb: { label: "Structure PDB", color: "text-emerald-400", icon: "atom" },
  structure_cif: { label: "Structure CIF", color: "text-emerald-400", icon: "atom" },
  structure_xyz: { label: "Géométrie XYZ", color: "text-emerald-400", icon: "atom" },
  structure_mol: { label: "Molécule MOL", color: "text-emerald-400", icon: "atom" },
  structure_mol2: { label: "Molécule MOL2", color: "text-emerald-400", icon: "atom" },
  structure_sdf: { label: "Chimie SDF", color: "text-emerald-400", icon: "atom" },
  data_csv: { label: "Données CSV", color: "text-amber-400", icon: "table" },
  data_tsv: { label: "Données TSV", color: "text-amber-400", icon: "table" },
  data_dat: { label: "Données DAT", color: "text-amber-400", icon: "table" },
  array_npy: { label: "Tableau NumPy", color: "text-orange-400", icon: "layers" },
  array_npz: { label: "Tableaux NPZ", color: "text-orange-400", icon: "layers" },
  array_hdf5: { label: "HDF5", color: "text-orange-400", icon: "layers" },
  config_json: { label: "JSON", color: "text-slate-400", icon: "braces" },
  config_yaml: { label: "YAML", color: "text-slate-400", icon: "braces" },
  config_toml: { label: "TOML", color: "text-slate-400", icon: "braces" },
  document_pdf: { label: "PDF", color: "text-red-400", icon: "file" },
  document_docx: { label: "DOCX", color: "text-blue-400", icon: "file" },
  document_text: { label: "Texte", color: "text-slate-400", icon: "file" },
  latex: { label: "LaTeX", color: "text-purple-400", icon: "file_text" },
  bibliography: { label: "Bibliographie", color: "text-purple-400", icon: "book" },
  code_python: { label: "Python", color: "text-yellow-400", icon: "code" },
  code_notebook: { label: "Notebook", color: "text-orange-400", icon: "code" },
  code_r: { label: "R", color: "text-blue-400", icon: "code" },
  code_matlab: { label: "MATLAB", color: "text-orange-400", icon: "code" },
  code_js: { label: "JavaScript", color: "text-yellow-400", icon: "code" },
  code_ts: { label: "TypeScript", color: "text-blue-400", icon: "code" },
  code_cpp: { label: "C++", color: "text-blue-400", icon: "code" },
  code_c: { label: "C", color: "text-blue-400", icon: "code" },
  code_rust: { label: "Rust", color: "text-orange-400", icon: "code" },
  code_shell: { label: "Shell", color: "text-green-400", icon: "code" },
  image: { label: "Image", color: "text-pink-400", icon: "image" },
  image_svg: { label: "SVG", color: "text-pink-400", icon: "image" },
  video: { label: "Vidéo", color: "text-rose-400", icon: "video" },
  audio: { label: "Audio", color: "text-cyan-400", icon: "audio" },
  archive_zip: { label: "Archive ZIP", color: "text-slate-400", icon: "archive" },
  archive_tar: { label: "Archive TAR", color: "text-slate-400", icon: "archive" },
  archive_gz: { label: "Archive GZ", color: "text-slate-400", icon: "archive" },
  markdown: { label: "Markdown", color: "text-slate-300", icon: "file_text" },
  other: { label: "Fichier", color: "text-slate-400", icon: "file" },
};

export function fileKindMeta(kind: string) {
  return FILE_KIND_META[kind] || FILE_KIND_META.other;
}

export const INTEGRATION_CATEGORY_META: Record<string, { label: string; color: string }> = {
  code: { label: "Code & Reproductibilité", color: "text-emerald-400" },
  publications: { label: "Publications & Citations", color: "text-purple-400" },
  data: { label: "Données & Artéfacts", color: "text-amber-400" },
  structural_biology: { label: "Biologie Structurale", color: "text-cyan-400" },
  quantum: { label: "Calcul Quantique", color: "text-blue-400" },
  web: { label: "Recherche Web", color: "text-rose-400" },
};
