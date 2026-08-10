import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GitBranch, Loader2, CheckCircle2, Plus, Sparkles, FileCode2, Tag, AlertCircle, Check
} from "lucide-react";

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "";

interface ProposedSkill {
  skill_id: string;
  label: string;
  category: string;
  invoke: string;
  entry_file: string;
  validated: boolean;
}

interface RepoAnalysis {
  status: string;
  repo_path?: string;
  repo_name?: string;
  languages?: string[];
  category?: string;
  readme_summary?: string;
  entry_points?: any[];
  proposed_skills?: ProposedSkill[];
  validation_required?: boolean;
  error?: string;
}

export const RepoSkillPanel: React.FC = () => {
  const [repoPath, setRepoPath] = useState("");
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [registering, setRegistering] = useState(false);
  const [result, setResult] = useState<{ registered: string[]; skipped: string[] } | null>(null);

  const analyze = async () => {
    if (!repoPath.trim()) return;
    setLoading(true); setAnalysis(null); setResult(null); setSelected(new Set());
    try {
      const r = await fetch(`${API_BASE}/api/repo/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_path: repoPath }),
      });
      const d = await r.json();
      setAnalysis(d);
      if (d.proposed_skills) {
        setSelected(new Set(d.proposed_skills.map((s: ProposedSkill) => s.skill_id)));
      }
    } catch {
      setAnalysis({ status: "ERROR", error: "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    if (!analysis || selected.size === 0) return;
    setRegistering(true);
    try {
      const r = await fetch(`${API_BASE}/api/repo/register-skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, skill_ids: Array.from(selected) }),
      });
      const d = await r.json();
      setResult({ registered: d.registered || [], skipped: d.skipped || [] });
    } catch {
      setResult({ registered: [], skipped: ["Erreur réseau"] });
    } finally {
      setRegistering(false);
    }
  };

  const toggle = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <GitBranch className="w-6 h-6 text-emerald-400" />
        <div>
          <h3 className="text-lg font-black text-white">Création auto de compétences</h3>
          <p className="text-xs text-slate-400">Analyse un dépôt cloné → propose des skills sous validation</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Auto-apprentissage</span>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={repoPath}
          onChange={(e) => setRepoPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyze()}
          placeholder="Chemin du dépôt cloné (ex: /workspace/mon-repo)"
          className="flex-1 bg-slate-950/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500/40 placeholder:text-slate-600"
        />
        <button onClick={analyze} disabled={loading || !repoPath.trim()} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
          Analyser
        </button>
      </div>

      <AnimatePresence>
        {analysis && analysis.status === "SUCCESS" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-slate-900/40 border border-white/5 rounded-lg p-2.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Dépôt</div>
                <div className="text-sm font-mono text-white truncate">{analysis.repo_name}</div>
              </div>
              <div className="bg-slate-900/40 border border-white/5 rounded-lg p-2.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Langages</div>
                <div className="text-sm font-mono text-white">{analysis.languages?.join(", ")}</div>
              </div>
              <div className="bg-slate-900/40 border border-white/5 rounded-lg p-2.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Catégorie</div>
                <div className="text-sm font-mono text-emerald-400">{analysis.category}</div>
              </div>
              <div className="bg-slate-900/40 border border-white/5 rounded-lg p-2.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider">Points d'entrée</div>
                <div className="text-sm font-mono text-white">{analysis.entry_points?.length || 0}</div>
              </div>
            </div>

            {analysis.readme_summary && (
              <div className="bg-slate-900/40 border border-white/5 rounded-lg p-3">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Résumé README</div>
                <p className="text-xs text-slate-300 leading-relaxed">{analysis.readme_summary}</p>
              </div>
            )}

            {analysis.proposed_skills && analysis.proposed_skills.length > 0 ? (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Skills proposées ({analysis.proposed_skills.length})</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Validation requise</span>
                  </div>
                  {analysis.proposed_skills.map((skill) => (
                    <button
                      key={skill.skill_id}
                      onClick={() => toggle(skill.skill_id)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${selected.has(skill.skill_id) ? "bg-emerald-500/10 border-emerald-500/30" : "bg-slate-900/40 border-white/5 hover:border-white/10"}`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${selected.has(skill.skill_id) ? "bg-emerald-500" : "border border-slate-600"}`}>
                        {selected.has(skill.skill_id) && <Check className="w-3 h-3 text-black" />}
                      </div>
                      <FileCode2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-white truncate">{skill.label}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{skill.invoke}</div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-800 text-slate-400">{skill.category}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={register}
                  disabled={registering || selected.size === 0}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Valider & enregistrer {selected.size} skill(s) dans le harnais
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/40 border border-white/5 text-xs text-slate-400">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Aucun point d'entrée détecté. Le dépôt n'a pas de main.py, cli.py, package.json bin, etc.
              </div>
            )}

            {result && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
                {result.registered.length > 0 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-300">{result.registered.length} skill(s) enregistrée(s) dans le harnais</span>
                  </div>
                )}
                {result.skipped.length > 0 && (
                  <div className="text-[10px] text-slate-500 font-mono">Ignorées: {result.skipped.join(", ")}</div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
        {analysis && analysis.status === "ERROR" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-300">{analysis.error || "Erreur d'analyse"}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
