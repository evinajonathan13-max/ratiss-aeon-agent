import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  KeyRound, Plus, Trash2, CheckCircle2, Loader2, ShieldCheck, Eye, EyeOff, Lock
} from "lucide-react";

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "";

interface VaultKey {
  label: string;
  metadata: Record<string, any>;
  configured: boolean;
}

const KEY_LABELS: Record<string, string> = {
  anthropic: "Anthropic (Claude)",
  google: "Google Gemini",
  openai: "OpenAI (GPT-4o)",
  openrouter: "OpenRouter (Nemotron, Llama...)",
  ibm_quantum: "IBM Quantum (QPU)",
  quandela: "Quandela (Photonique)",
  tavily: "Tavily (Recherche web)",
  ncbi_api_key: "NCBI / PubMed",
  alphafold_api_key: "AlphaFold DB",
  chembl_api_key: "ChEMBL",
  github_token: "GitHub (PAT)",
  zenodo_token: "Zenodo (DOI)",
  overleaf_token: "Overleaf (LaTeX)",
  custom: "Personnalisée",
};

const KEY_CATEGORIES: { cat: string; keys: string[]; icon: string }[] = [
  { cat: "LLM", keys: ["anthropic", "google", "openai", "openrouter"], icon: "🧠" },
  { cat: "Scientifique", keys: ["ibm_quantum", "quandela", "tavily"], icon: "⚛️" },
  { cat: "Bio", keys: ["ncbi_api_key", "alphafold_api_key", "chembl_api_key"], icon: "🧬" },
  { cat: "Intégrations", keys: ["github_token", "zenodo_token", "overleaf_token"], icon: "🔌" },
  { cat: "Autre", keys: ["custom"], icon: "⚙️" },
];

export const ApiVaultPanel: React.FC = () => {
  const [keys, setKeys] = useState<Record<string, VaultKey>>({});
  const [supported, setSupported] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/vault/keys`);
      const d = await r.json();
      setKeys(d.keys || {});
      setSupported(d.supported || []);
    } catch {
      setMsg({ type: "err", text: "Impossible de charger le vault" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const storeKey = async (keyId: string) => {
    if (!newKey.trim()) return;
    setMsg(null);
    try {
      const r = await fetch(`${API_BASE}/api/vault/key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_id: keyId, api_key: newKey, label: newLabel || KEY_LABELS[keyId] }),
      });
      const d = await r.json();
      if (d.stored) {
        setMsg({ type: "ok", text: `Clé ${keyId} stockée (chiffrée au repos)` });
        setNewKey(""); setNewLabel(""); setAdding(null);
        fetchKeys();
      } else {
        setMsg({ type: "err", text: d.error || "Erreur" });
      }
    } catch {
      setMsg({ type: "err", text: "Erreur réseau" });
    }
  };

  const deleteKey = async (keyId: string) => {
    try {
      await fetch(`${API_BASE}/api/vault/key`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key_id: keyId }),
      });
      setMsg({ type: "ok", text: `Clé ${keyId} supprimée` });
      fetchKeys();
    } catch {
      setMsg({ type: "err", text: "Erreur suppression" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <KeyRound className="w-6 h-6 text-emerald-400" />
        <div>
          <h3 className="text-lg font-black text-white">Coffre-fort de clés API</h3>
          <p className="text-xs text-slate-400">Environnement persistant souverain — chiffré au repos (Fernet), jamais loggé</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Souverain</span>
        </div>
      </div>

      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`px-3 py-2 rounded-lg text-xs font-medium ${msg.type === "ok" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-red-500/10 text-red-300 border border-red-500/20"}`}
        >
          {msg.text}
        </motion.div>
      )}

      {KEY_CATEGORIES.map((group) => (
        <div key={group.cat} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">{group.icon}</span>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{group.cat}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {group.keys.map((keyId) => {
              const stored = keys[keyId];
              const configured = stored?.configured;
              const isAdding = adding === keyId;
              return (
                <div key={keyId} className={`rounded-xl border p-3 ${configured ? "bg-emerald-500/5 border-emerald-500/20" : "bg-slate-900/40 border-white/5"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${configured ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-slate-600"}`} />
                      <span className="text-sm font-medium text-white">{KEY_LABELS[keyId]}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {configured && (
                        <button onClick={() => deleteKey(keyId)} className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => { setAdding(isAdding ? null : keyId); setNewKey(""); setNewLabel(""); }} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white" title={configured ? "Remplacer" : "Ajouter"}>
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {configured && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400/70 font-mono">{stored?.label || keyId}</span>
                    </div>
                  )}
                  <AnimatePresence>
                    {isAdding && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-2.5 space-y-2">
                          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-white/10 rounded-lg px-2.5 py-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <input
                              type={showKey ? "text" : "password"}
                              value={newKey}
                              onChange={(e) => setNewKey(e.target.value)}
                              placeholder="Collez votre clé API..."
                              className="flex-1 bg-transparent text-xs text-white font-mono outline-none placeholder:text-slate-600"
                            />
                            <button onClick={() => setShowKey(!showKey)} className="text-slate-500 hover:text-slate-300">
                              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <input
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="Label (optionnel)"
                            className="w-full bg-slate-950/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-600"
                          />
                          <button onClick={() => storeKey(keyId)} className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider">
                            Chiffrer & stocker
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
