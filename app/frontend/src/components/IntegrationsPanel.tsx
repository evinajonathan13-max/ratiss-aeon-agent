/**
 * IntegrationsPanel.tsx — Gestion des intégrations externes de RATISS.
 *
 * Conçu pour un agent scientifique : GitHub (reproductibilité du code) en premier,
 * puis arXiv, Zenodo, OpenAlex, Crossref, RCSB PDB, Overleaf, IBM Quantum, Tavily.
 * Chaque intégration sert la chaîne de recherche ouverte.
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plug, Loader2, CheckCircle2, XCircle, ExternalLink, Search, Trash2,
  Github, FlaskConical, Database, Globe, BookOpen, Atom, Cpu, FileText,
  ChevronDown, ChevronUp, AlertCircle, Zap, Link2, Copy
} from "lucide-react";
import { Integration, IntegrationsStatus } from "../types";
import {
  getIntegrations, connectIntegration, disconnectIntegration,
  runIntegrationAction, INTEGRATION_CATEGORY_META
} from "../lib/api";

interface IntegrationsPanelProps {
  isCompetitionBranch?: boolean;
}

const CATEGORY_ICON: Record<string, any> = {
  code: Github, publications: BookOpen, data: Database,
  structural_biology: Atom, quantum: Cpu, web: Globe,
};

const INTEGRATION_ICON: Record<string, any> = {
  github: Github, arxiv: FileText, zenodo: Database, openalex: Globe,
  crossref: BookOpen, rcsb_pdb: Atom, overleaf: FileText, ibm_quantum: Cpu, tavily: Search,
};

function IntegrationIcon({ id, className = "w-5 h-5" }: { id: string; className?: string }) {
  const Cmp = INTEGRATION_ICON[id] || Plug;
  return <Cmp className={className} />;
}

export function IntegrationsPanel({ isCompetitionBranch = false }: IntegrationsPanelProps) {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, any>>({});
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const s = await getIntegrations();
    setStatus(s);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleConnect = async (id: string) => {
    if (!tokenInput.trim()) { setError("Veuillez saisir un jeton."); return; }
    setConnectingId(id);
    setError(null);
    try {
      await connectIntegration(id, tokenInput.trim());
      setTokenInput("");
      await refresh();
    } catch (e: any) {
      setError(e.message || "Échec de la connexion");
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    await disconnectIntegration(id);
    await refresh();
  };

  const runAction = async (integration: Integration, action: string) => {
    const key = `${integration.id}/${action}`;
    setRunningAction(key);
    setError(null);
    try {
      // Paramètres par défaut selon l'action (démo rapide)
      const params: Record<string, any> = {};
      if (action.includes("search")) params.query = params.query || "quantum topology";
      if (action === "list_repos") params.per_page = 5;
      if (action === "search_repos" || action === "search_code") { params.query = "homology persistence"; params.per_page = 5; }
      if (action === "search_works") params.query = "Betti numbers protein";
      if (action === "lookup_doi") params.doi = "10.1038/nature12373";
      const res = await runIntegrationAction(integration.id, action, params);
      setActionResults(prev => ({ ...prev, [key]: res }));
    } catch (e: any) {
      setError(e.message || `Échec de l'action ${action}`);
      setActionResults(prev => ({ ...prev, [key]: { error: e.message } }));
    } finally {
      setRunningAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const integrations = status?.integrations || [];
  const grouped: Record<string, Integration[]> = {};
  for (const i of integrations) {
    (grouped[i.category] = grouped[i.category] || []).push(i);
  }

  return (
    <div className="space-y-5">
      {/* En-tête scientifique */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
        <Link2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black tracking-wider uppercase text-slate-300">Intégrations — chaîne de recherche ouverte</h3>
            <span className="px-2 py-0.5 text-[9px] font-mono bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
              {status?.connected}/{status?.total} connectées
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
            RATISS s'intègre aux outils de la science ouverte : code reproductible (GitHub),
            prépublications (arXiv), données (Zenodo), graphe scientifique (OpenAlex),
            métadonnées DOI (Crossref), structures 3D (RCSB PDB), calcul quantique (IBM) et veille (Tavily).
            Les jetons sont stockés localement — souveraineté totale, jamais exposés.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* GitHub en premier (mise en avant) */}
      {grouped.code?.map((integration) => (
        <IntegrationCard
          key={integration.id}
          integration={integration}
          expanded={expandedId === integration.id}
          onToggle={() => setExpandedId(expandedId === integration.id ? null : integration.id)}
          tokenInput={tokenInput}
          setTokenInput={setTokenInput}
          onConnect={() => handleConnect(integration.id)}
          onDisconnect={() => handleDisconnect(integration.id)}
          connecting={connectingId === integration.id}
          onRunAction={(action) => runAction(integration, action)}
          runningAction={runningAction}
          actionResults={actionResults}
          featured
        />
      ))}

      {/* Autres catégories */}
      {Object.entries(grouped).filter(([cat]) => cat !== "code").map(([cat, items]) => {
        const catMeta = INTEGRATION_CATEGORY_META[cat] || { label: cat, color: "text-slate-400" };
        const CatIcon = CATEGORY_ICON[cat] || Plug;
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2 mt-4">
              <CatIcon className={`w-3.5 h-3.5 ${catMeta.color}`} />
              <h4 className={`text-[10px] font-black uppercase tracking-widest ${catMeta.color}`}>{catMeta.label}</h4>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <div className="space-y-2">
              {items.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  expanded={expandedId === integration.id}
                  onToggle={() => setExpandedId(expandedId === integration.id ? null : integration.id)}
                  tokenInput={tokenInput}
                  setTokenInput={setTokenInput}
                  onConnect={() => handleConnect(integration.id)}
                  onDisconnect={() => handleDisconnect(integration.id)}
                  connecting={connectingId === integration.id}
                  onRunAction={(action) => runAction(integration, action)}
                  runningAction={runningAction}
                  actionResults={actionResults}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface IntegrationCardProps {
  integration: Integration;
  expanded: boolean;
  onToggle: () => void;
  tokenInput: string;
  setTokenInput: (v: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
  onRunAction: (action: string) => void;
  runningAction: string | null;
  actionResults: Record<string, any>;
  featured?: boolean;
}

function IntegrationCard({
  integration, expanded, onToggle, tokenInput, setTokenInput,
  onConnect, onDisconnect, connecting, onRunAction, runningAction, actionResults, featured
}: IntegrationCardProps) {
  const actionLabel: Record<string, string> = {
    list_repos: "Lister mes dépôts", search_code: "Rechercher du code", search_repos: "Rechercher dépôts",
    read_file: "Lire un fichier", get_repo: "Infos dépôt", list_prs: "Lister les PR", create_issue: "Créer une issue",
    search: "Rechercher", fetch_abstract: "Récupérer abstract", create_deposit: "Créer un dépôt",
    list_deposits: "Lister dépôts", search_works: "Rechercher travaux", get_work: "Détails travail",
    search_authors: "Rechercher auteurs", lookup_doi: "Résoudre DOI",
    fetch_structure: "Récupérer structure", list_backends: "Lister QPU", run_circuit: "Exécuter circuit",
    list_projects: "Lister projets", push_latex: "Pousser LaTeX",
  };

  return (
    <motion.div
      layout
      className={`rounded-2xl border transition-colors ${
        featured ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-white/5 bg-white/[0.02]"
      } ${integration.connected ? "hover:bg-white/[0.04]" : ""}`}
    >
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3.5 text-left">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          integration.connected ? "bg-emerald-500/15" : "bg-white/5"
        }`}>
          <IntegrationIcon id={integration.id} className={`w-4.5 h-4.5 ${integration.connected ? "text-emerald-400" : "text-slate-400"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">{integration.name}</span>
            {featured && <span className="px-1.5 py-0.5 text-[8px] bg-emerald-500/20 text-emerald-400 rounded-full font-black uppercase">Priorité</span>}
            {integration.connected ? (
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                <CheckCircle2 className="w-3 h-3" /> Connecté
              </span>
            ) : integration.requires_token ? (
              <span className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                <XCircle className="w-3 h-3" /> Jeton requis
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] text-blue-400 font-mono">
                <CheckCircle2 className="w-3 h-3" /> Sans clé
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5 truncate">{integration.scientific_role}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 space-y-3 border-t border-white/5 pt-3">
              <a href={integration.docs_url} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-emerald-400 font-mono">
                <ExternalLink className="w-3 h-3" /> Documentation
              </a>

              {/* Connexion par jeton */}
              {integration.requires_token && (
                <div className="space-y-2">
                  {integration.connected ? (
                    <button
                      onClick={onDisconnect}
                      className="w-full py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3 h-3" /> Déconnecter (jeton local)
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="Jeton / Token (stocké localement)"
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-mono text-white outline-none focus:border-emerald-500/30"
                      />
                      <button
                        onClick={onConnect}
                        disabled={connecting}
                        className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />}
                        Connecter
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Actions disponibles */}
              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-600 block mb-1.5">
                  Actions ({integration.actions.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {integration.actions.map((action) => {
                    const key = `${integration.id}/${action}`;
                    const isRunning = runningAction === key;
                    return (
                      <button
                        key={action}
                        onClick={() => onRunAction(action)}
                        disabled={isRunning || (integration.requires_token && !integration.connected)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors flex items-center gap-1.5 disabled:opacity-40"
                        title={integration.requires_token && !integration.connected ? "Connectez d'abord l'intégration" : actionLabel[action] || action}
                      >
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                        {actionLabel[action] || action}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Résultats des actions */}
              {integration.actions.map((action) => {
                const key = `${integration.id}/${action}`;
                const res = actionResults[key];
                if (!res) return null;
                return (
                  <div key={key} className="rounded-xl bg-black/40 border border-white/5 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Résultat — {action}</span>
                      <button
                        onClick={() => navigator.clipboard?.writeText(JSON.stringify(res, null, 2))}
                        className="text-slate-500 hover:text-emerald-400"
                        title="Copier"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-emerald-300/80 max-h-48 overflow-auto whitespace-pre-wrap break-all">
{JSON.stringify(res, null, 2).slice(0, 2000)}
                    </pre>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
