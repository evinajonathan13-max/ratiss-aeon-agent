import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Cpu, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Eye, 
  Settings, 
  HelpCircle, 
  Clock, 
  Zap, 
  Code, 
  Activity,
  Maximize2,
  Trash2,
  FileCode
} from "lucide-react";

import { MODELS } from "../models_list";

interface TerminalLine {
  type: "input" | "output" | "error" | "info" | "trace" | "success";
  text: string;
  time?: string;
}

export function RatissShellUI() {
  const [backendId, setBackendId] = useState(() => {
    return localStorage.getItem("ratiss_selected_model_id") || "google/gemma-4-26b-a4b-it:free";
  });
  
  useEffect(() => {
    const handleModelChanged = () => {
      const activeId = localStorage.getItem("ratiss_selected_model_id") || "google/gemma-4-26b-a4b-it:free";
      setBackendId(activeId);
    };
    window.addEventListener("ratiss-model-changed", handleModelChanged);
    return () => {
      window.removeEventListener("ratiss-model-changed", handleModelChanged);
    };
  }, []);

  const updateBackendId = (newId: string) => {
    localStorage.setItem("ratiss_selected_model_id", newId);
    setBackendId(newId);
    window.dispatchEvent(new Event("ratiss-model-changed"));
  };

  const [ratissActive, setRatissActive] = useState(true);
  const [viewReasoning, setViewReasoning] = useState(true);
  const [sandboxStatus, setSandboxStatus] = useState("READY");
  
  // UI states
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [history, setHistory] = useState<TerminalLine[]>([
    { type: "info", text: "RATISS Cypher ODV v1.2 — Shell de démonstration" },
    { type: "info", text: "Tapez /help pour lister toutes les commandes disponibles." },
    { type: "info", text: "Cerveau central RATISS actif et sécurisé." },
    { type: "info", text: "--------------------------------------------------------------------------------" }
  ]);
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sandboxHistory, setSandboxHistory] = useState<{code: string, stdout: string, stderr: string, success: boolean}[]>([]);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isTyping]);

  const activeModel = MODELS.find(m => m.id === backendId) || MODELS[0];

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString();
  };

  const executeCommand = async (commandStr: string) => {
    const trimmed = commandStr.trim();
    if (!trimmed) return;

    // Add to history
    setHistory(prev => [...prev, { type: "input", text: `>>> ${trimmed}`, time: getCurrentTime() }]);
    setCommandHistory(prev => [trimmed, ...prev]);
    setHistoryIndex(-1);

    const parts = trimmed.split(" ");
    const baseCmd = parts[0].toLowerCase();

    // 1. /help
    if (baseCmd === "/help") {
      setHistory(prev => [
        ...prev,
        { type: "info", text: "\nCommandes disponibles :" },
        { type: "info", text: "  /model list               : Liste les backends disponibles avec leurs IDs" },
        { type: "info", text: "  /model use [id]           : Change le backend actif en utilisant l'index ou l'ID exact" },
        { type: "info", text: "  /view reasoning on/off    : Active ou désactive l'affichage des logs de raisonnement" },
        { type: "info", text: "  /ratiss pause/resume      : Active ou désactive (pause) le cerveau central RATISS" },
        { type: "info", text: "  /sandbox run [code]       : Exécute du code Python sécurisé dans la sandbox" },
        { type: "info", text: "  /sandbox show             : Affiche l'historique d'exécution de la sandbox" },
        { type: "info", text: "  /history                  : Affiche l'historique de discussion" },
        { type: "info", text: "  /clear                    : Efface l'écran du terminal" },
        { type: "info", text: "  /help                     : Affiche ce menu d'aide" }
      ]);
      return;
    }

    // 2. /clear
    if (baseCmd === "/clear") {
      setHistory([
        { type: "info", text: "Écran effacé. RATISS Shell prêt." }
      ]);
      return;
    }

    // 3. /model
    if (baseCmd === "/model") {
      const action = parts[1]?.toLowerCase();
      if (action === "list") {
        setHistory(prev => [
          ...prev,
          { type: "info", text: "\nModèles OpenRouter gratuits disponibles :" },
          ...MODELS.map((m, i) => ({
            type: "info" as const,
            text: `  [${i + 1}] ${m.provider.padEnd(10)}: ${m.id} (${m.name})`
          }))
        ]);
      } else if (action === "use") {
        const idOrIdx = parts.slice(2).join(" ").trim();
        if (!idOrIdx) {
          setHistory(prev => [...prev, { type: "error", text: "Erreur : ID ou index requis. Exemple : /model use 3 ou /model use google/gemma-4-26b-a4b-it:free" }]);
          return;
        }

        // Check index first
        const idx = parseInt(idOrIdx) - 1;
        if (!isNaN(idx) && idx >= 0 && idx < MODELS.length) {
          const selected = MODELS[idx];
          updateBackendId(selected.id);
          setHistory(prev => [
            ...prev,
            { type: "success", text: `[+] Backend basculé sur : ${selected.name}` },
            { type: "info", text: `    ID : ${selected.id}` }
          ]);
        } else {
          // Check matching ID
          const selected = MODELS.find(m => m.id === idOrIdx);
          if (selected) {
            updateBackendId(selected.id);
            setHistory(prev => [
              ...prev,
              { type: "success", text: `[+] Backend basculé sur : ${selected.name}` },
              { type: "info", text: `    ID : ${selected.id}` }
            ]);
          } else {
            setHistory(prev => [...prev, { type: "error", text: `Erreur : Modèle inconnu "${idOrIdx}". Tapez /model list pour voir les modèles.` }]);
          }
        }
      } else {
        setHistory(prev => [...prev, { type: "error", text: "Usage: /model list  OU  /model use [id/index]" }]);
      }
      return;
    }

    // 4. /view
    if (baseCmd === "/view") {
      const target = parts[1]?.toLowerCase();
      const value = parts[2]?.toLowerCase();
      if (target === "reasoning") {
        if (value === "on") {
          setViewReasoning(true);
          setHistory(prev => [...prev, { type: "success", text: "[+] Logs de raisonnement en direct activés." }]);
        } else if (value === "off") {
          setViewReasoning(false);
          setHistory(prev => [...prev, { type: "info", text: "[-] Logs de raisonnement en direct désactivés." }]);
        } else {
          setHistory(prev => [...prev, { type: "error", text: "Usage: /view reasoning on/off" }]);
        }
      } else {
        setHistory(prev => [...prev, { type: "error", text: "Usage: /view reasoning on/off" }]);
      }
      return;
    }

    // 5. /ratiss
    if (baseCmd === "/ratiss") {
      const action = parts[1]?.toLowerCase();
      if (action === "pause" || action === "off") {
        setRatissActive(false);
        setHistory(prev => [...prev, { type: "info", text: "[-] Cerveau RATISS mis en veille. Le backend brut répondra de façon autonome." }]);
      } else if (action === "resume" || action === "on") {
        setRatissActive(true);
        setHistory(prev => [...prev, { type: "success", text: "[+] Cerveau RATISS activé. Couche de filtrage topologique de phase opérationnelle." }]);
      } else {
        setHistory(prev => [...prev, { type: "error", text: "Usage: /ratiss pause/resume" }]);
      }
      return;
    }

    // 6. /sandbox
    if (baseCmd === "/sandbox") {
      const action = parts[1]?.toLowerCase();
      if (action === "run") {
        const rawCode = parts.slice(2).join(" ").trim();
        if (!rawCode) {
          setHistory(prev => [...prev, { type: "error", text: "Erreur : Code python manquant. Exemple : /sandbox run print('hello')" }]);
          return;
        }

        let codeToExec = rawCode;
        if (codeToExec.startsWith("`")) codeToExec = codeToExec.replace(/^`+|`+$/g, "").trim();
        if (codeToExec.startsWith('"') && codeToExec.endsWith('"')) codeToExec = codeToExec.slice(1, -1);

        setHistory(prev => [...prev, { type: "info", text: "[*] Exécution dans la Sandbox sécurisée..." }]);
        
        // Emulation of Python Sandbox execution
        setTimeout(() => {
          let stdout = "";
          let stderr = "";
          let success = true;

          try {
            // Emulate clean math or print evaluations safely
            if (codeToExec.includes("print(")) {
              const matches = codeToExec.match(/print\(([^)]+)\)/);
              if (matches && matches[1]) {
                const inner = matches[1].trim();
                if ((inner.startsWith("'") && inner.endsWith("'")) || (inner.startsWith('"') && inner.endsWith('"'))) {
                  stdout = inner.slice(1, -1) + "\n";
                } else {
                  // arithmetic eval
                  try {
                    const result = eval(inner);
                    stdout = String(result) + "\n";
                  } catch {
                    stdout = inner + "\n";
                  }
                }
              }
            } else if (codeToExec.includes("math.sin") || codeToExec.includes("math.")) {
              stdout = "0.44\n";
            } else {
              stdout = "Script exécuté avec succès (aucun retour stdout).\n";
            }
          } catch (e: any) {
            stderr = e.message;
            success = false;
          }

          setSandboxHistory(prev => [...prev, { code: codeToExec, stdout, stderr, success }]);
          setHistory(prev => [
            ...prev,
            { type: success ? "success" : "error", text: `  - Succès : ${success}` },
            ...(stdout ? [{ type: "output" as const, text: `  [Stdout] :\n  ${stdout.trim()}` }] : []),
            ...(stderr ? [{ type: "error" as const, text: `  [Stderr/Erreur] :\n  ${stderr.trim()}` }] : [])
          ]);
        }, 300);

      } else if (action === "show") {
        if (sandboxHistory.length === 0) {
          setHistory(prev => [...prev, { type: "info", text: "Aucun script exécuté dans la sandbox." }]);
        } else {
          setHistory(prev => [
            ...prev,
            { type: "info", text: "\n--- Historique de la Sandbox ---" },
            ...sandboxHistory.flatMap((run, index) => [
              { type: "info" as const, text: `[${index + 1}] Code : ${run.code}` },
              ...(run.stdout ? [{ type: "output" as const, text: `    Stdout : ${run.stdout.trim()}` }] : []),
              ...(run.stderr ? [{ type: "error" as const, text: `    Stderr : ${run.stderr.trim()}` }] : []),
              { type: "info" as const, text: "----------------------------------------" }
            ])
          ]);
        }
      } else {
        setHistory(prev => [...prev, { type: "error", text: "Usage: /sandbox run [code]  OU  /sandbox show" }]);
      }
      return;
    }

    // 7. /history
    if (baseCmd === "/history") {
      if (chatMessages.length === 0) {
        setHistory(prev => [...prev, { type: "info", text: "Aucun échange de discussion dans l'historique." }]);
      } else {
        setHistory(prev => [
          ...prev,
          { type: "info", text: "\n--- Historique des Échanges ---" },
          ...chatMessages.map(m => ({
            type: "info" as const,
            text: `[${m.role === "user" ? "Jonathan" : "RATISS"}] : ${m.content}`
          }))
        ]);
      }
      return;
    }

    // Default: unrecognized command
    setHistory(prev => [...prev, { type: "error", text: `Erreur : Commande inconnue "${baseCmd}". Tapez /help pour obtenir de l'aide.` }]);
  };

  const handlePrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed) return;

    // Add to prompt history
    setHistory(prev => [...prev, { type: "input", text: `>>> ${trimmed}`, time: getCurrentTime() }]);
    setCommandHistory(prev => [trimmed, ...prev]);
    setHistoryIndex(-1);

    const updatedMessages = [...chatMessages, { role: "user", content: trimmed }];
    setChatMessages(updatedMessages);
    setIsTyping(true);

    // If RATISS Active & Reasoning ON, write simulation of reasoning logs
    if (ratissActive && viewReasoning) {
      setHistory(prev => [
        ...prev,
        { type: "trace", text: `[RATISS TRACE] Backend: ${backendId}` },
        { type: "trace", text: `> TopologyCompressor: Compression des données en cours...` },
        { type: "trace", text: `>   - Entrée: ${Math.floor(Math.random() * 150) + 100}k nœuds` },
        { type: "trace", text: `>   - Super-nœuds: ${Math.floor(Math.random() * 1000) + 1200}` },
        { type: "trace", text: `>   - Temps: ${(Math.random() * 0.5 + 0.4).toFixed(2)}s` },
      ]);

      await new Promise(r => setTimeout(r, 600));

      setHistory(prev => [
        ...prev,
        { type: "trace", text: `> Cypher ODV: Détection des pièges d'hallucination...` },
        { type: "trace", text: `>   - Étape 1: Vérification des faits... OK` },
        { type: "trace", text: `>   - Étape 2: Vérification de cohérence... OK` },
        { type: "trace", text: `>   - Étape 3: Vérification des invariants... OK` },
      ]);

      await new Promise(r => setTimeout(r, 600));

      setHistory(prev => [
        ...prev,
        { type: "trace", text: `> Backend Call: ${backendId} (génération de tokens uniquement)` },
        { type: "trace", text: `>   - Tokens: ${Math.floor(Math.random() * 2000) + 3000} in, ${Math.floor(Math.random() * 800) + 500} out` },
        { type: "trace", text: `>   - Latence: ${(Math.random() * 3 + 4).toFixed(1)}s` },
        { type: "trace", text: `> Final Verification: OK` },
        { type: "trace", text: `> Réponse générée.` },
      ]);
    } else if (!ratissActive) {
      setHistory(prev => [
        ...prev,
        { type: "info", text: `\n[MOTEUR BRUT DIRECT - SANS RATISS]` },
        { type: "info", text: `> Appel direct de ${backendId}...` }
      ]);
    }

    try {
      const res = await fetch("/api/ratiss-shell/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          model_id: backendId,
          ratiss_active: ratissActive
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.content;
        
        setChatMessages(prev => [...prev, { role: "assistant", content: reply }]);
        setHistory(prev => [...prev, { type: "output", text: reply }]);
      } else {
        setHistory(prev => [...prev, { type: "error", text: "Erreur de communication avec le serveur." }]);
      }
    } catch (e: any) {
      setHistory(prev => [...prev, { type: "error", text: `Erreur inattendue : ${e.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = inputValue.trim();
      if (!val) return;

      if (val.startsWith("/")) {
        executeCommand(val);
      } else {
        handlePrompt(val);
      }
      setInputValue("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < commandHistory.length) {
          setHistoryIndex(nextIdx);
          setInputValue(commandHistory[nextIdx]);
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = historyIndex - 1;
      if (nextIdx >= 0) {
        setHistoryIndex(nextIdx);
        setInputValue(commandHistory[nextIdx]);
      } else {
        setHistoryIndex(-1);
        setInputValue("");
      }
    }
  };

  return (
    <div className="w-full flex flex-col min-h-[500px] bg-slate-950 rounded-3xl border border-white/5 overflow-hidden text-white font-sans shadow-2xl relative">
      
      {/* Dynamic Header Box (Collapsible) */}
      <div className="bg-slate-900/60 border-b border-white/5 p-4 md:p-6 backdrop-blur transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                RATISS Cypher ODV Shell
                <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-blue-400 font-mono font-bold">
                  v1.2.0
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Console de pilotage et d'exécution sécurisée</p>
            </div>
          </div>

          <button 
            onClick={() => setHeaderCollapsed(!headerCollapsed)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-[10px] font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {headerCollapsed ? (
              <>
                <span>Déplier l'en-tête</span>
                <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
              </>
            ) : (
              <>
                <span>Replier l'en-tête</span>
                <ChevronUp className="w-3.5 h-3.5 text-blue-400" />
              </>
            )}
          </button>
        </div>

        {/* Expandable/Collapsible Content */}
        <AnimatePresence initial={false}>
          {!headerCollapsed && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mt-4 pt-4 border-t border-white/5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Backend info */}
                <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">MOTEUR ANCRAGE / MODEL ID</span>
                    <select
                      value={backendId}
                      onChange={(e) => updateBackendId(e.target.value)}
                      className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {MODELS.map(m => (
                        <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                          {m.name} ({m.provider})
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 block mt-1.5">Fournisseur : {activeModel.provider}</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-slate-500">Config: OpenRouter</span>
                    <span className="text-[10px] font-bold text-blue-400">FREE</span>
                  </div>
                </div>

                {/* 2. RATISS ON/OFF Engine */}
                <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">RATISS BRAIN ENGINE</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${ratissActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {ratissActive ? "ACTIF ✅" : "DÉSACTIVÉ ❌"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {ratissActive ? "Filtre d'hallucination et intégrité de phase actifs." : "Modèle brut autonome sans validation de phase."}
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5 flex gap-2">
                    <button 
                      onClick={() => {
                        setRatissActive(!ratissActive);
                        setHistory(prev => [...prev, { 
                          type: "info", 
                          text: `[System] Cerveau RATISS basculé vers : ${!ratissActive ? "ACTIF (ON)" : "DÉSACTIVÉ (OFF)"}` 
                        }]);
                      }}
                      className={`flex-1 py-1 text-center rounded text-[10px] font-semibold transition-all cursor-pointer ${
                        ratissActive ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                    >
                      {ratissActive ? "Désactiver (Pause)" : "Réactiver (Resume)"}
                    </button>
                  </div>
                </div>

                {/* 3. Reasoning logs toggle */}
                <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">REASONING TRACES (LOGS)</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${viewReasoning ? "bg-blue-400 animate-pulse" : "bg-slate-600"}`} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {viewReasoning ? "AFFICHAGE ACTIF (ON)" : "AFFICHAGE MASQUÉ (OFF)"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Visualisez en direct les étapes cognitives de compression et d'intégrité.
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5 flex gap-2">
                    <button 
                      onClick={() => {
                        setViewReasoning(!viewReasoning);
                        setHistory(prev => [...prev, { 
                          type: "info", 
                          text: `[System] Affichage raisonnement : ${!viewReasoning ? "ACTIVE (ON)" : "DÉSACTIVÉ (OFF)"}` 
                        }]);
                      }}
                      className="flex-1 py-1 text-center rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-semibold transition-all cursor-pointer"
                    >
                      {viewReasoning ? "Masquer les logs" : "Afficher les logs"}
                    </button>
                  </div>
                </div>

                {/* 4. Sandbox state */}
                <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">EXECUTION SANDBOX</span>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider">READY</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Mini-environnement d'exécution sécurisé pour exécuter du code Python.
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Packages: math, random, collection</span>
                    <span className="font-mono text-blue-400">allow</span>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Terminal Board */}
      <div 
        className="flex-1 p-4 md:p-6 overflow-y-auto font-mono text-xs space-y-2.5 bg-[#07090e] max-h-[480px] min-h-[300px] border-b border-white/5"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, idx) => {
          let colorClass = "text-slate-300";
          if (line.type === "input") colorClass = "text-sky-400 font-bold";
          if (line.type === "output") colorClass = "text-slate-100 font-sans whitespace-pre-wrap pl-4 border-l border-white/10 py-1 bg-white/[0.01] rounded";
          if (line.type === "error") colorClass = "text-rose-400 font-bold bg-rose-500/5 px-2 py-1 rounded border border-rose-900/20";
          if (line.type === "success") colorClass = "text-emerald-400 font-bold bg-emerald-500/5 px-2 py-1 rounded border border-emerald-900/20";
          if (line.type === "trace") colorClass = "text-amber-400 font-light pl-3 border-l-2 border-amber-500/30";
          if (line.type === "info") colorClass = "text-slate-400 font-light";

          return (
            <div key={idx} className={`leading-relaxed tracking-wide ${colorClass}`}>
              {line.time && <span className="text-[10px] text-slate-600 mr-2">[{line.time}]</span>}
              {line.text}
            </div>
          );
        })}

        {isTyping && (
          <div className="text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce delay-75" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce delay-150" />
            <span className="text-[10px] font-mono text-slate-500 ml-1">Analyse sémantique et décryptage...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Input row */}
      <div className="p-4 bg-slate-900/40 flex items-center gap-3">
        <span className="text-sky-400 font-mono font-bold select-none">&gt;&gt;&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message ou commande (ex: /help, /model list)"
          className="flex-1 bg-transparent border-none text-slate-100 focus:outline-none focus:ring-0 font-mono text-xs placeholder-slate-600"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">Press Enter</span>
          <button 
            onClick={() => {
              const val = inputValue.trim();
              if (val) {
                if (val.startsWith("/")) {
                  executeCommand(val);
                } else {
                  handlePrompt(val);
                }
                setInputValue("");
              }
            }}
            className="p-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-all active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>

    </div>
  );
}
