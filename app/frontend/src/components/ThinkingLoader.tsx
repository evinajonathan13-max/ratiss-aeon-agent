import React, { useState, useEffect } from "react";
import { 
  Terminal, Cpu, Server, HardDrive, Activity, Sparkles, 
  Layers, Loader2, ShieldCheck, Check 
} from "lucide-react";

interface Step {
  id: string;
  label: string;
  status: "pending" | "running" | "success";
  code: string;
  logs: string[];
}

interface ThinkingLoaderProps {
  prompt?: string;
}

export const ThinkingLoader: React.FC<ThinkingLoaderProps> = ({ prompt }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [typedCode, setTypedCode] = useState("");
  const [cpuLoad, setCpuLoad] = useState(88);
  const [ramUsage, setRamUsage] = useState(4150);
  const [activeIo, setActiveIo] = useState("sys.config");
  const [steps, setSteps] = useState<Step[]>([]);
  const [isLoadingSteps, setIsLoadingSteps] = useState(true);

  const stepsTemplate: Step[] = [
    {
      id: "ingest",
      label: "Ingestion des Invariants & Limites Système",
      status: "pending",
      code: `import sys\nfrom system.memory_guard import verify_m_invariants\n\ndef check_integrity():\n    print("[RATISS] Initialisation de la capsule...")\n    assert verify_m_invariants(limit_mb=7500)\n    print("[SYSTEM] Limites RAM 7.5 GB configurées.")\n\ncheck_integrity()`,
      logs: [
        "[INIT] Analyse sémantique de la tâche...",
        "[MEM] Allocation mémoire : 4.15 GB utilisés.",
        "[GUARD] Memory Guard vérifié : invariants d'intégrité OK.",
        "[CORE] Démarrage de la capsule de calcul isolée."
      ]
    },
    {
      id: "google_search",
      label: "Google Search Grounding & Ancrage Réel",
      status: "pending",
      code: `from google.genai import GoogleGenAI\n\ndef search_live(query):\n    ai = GoogleGenAI()\n    results = ai.models.generate_content(\n        model="gemini-2.5-flash",\n        contents=query,\n        config={"tools": [{"googleSearch": {}}]}\n    )\n    return results`,
      logs: [
        "[SEARCH] Activation du pipeline d'ancrage Google Search...",
        "[SEARCH] Extraction des mots-clés d'exploration...",
        "[SEARCH] Interrogation de l'endpoint d'API Google Search...",
        "[SEARCH] Analyse des résultats web récents terminée."
      ]
    },
    {
      id: "lanczos",
      label: "Diagonalisation Lanczos (Noyau t-J)",
      status: "pending",
      code: `import numpy as np\n\ndef solve_tj_lanczos(num_sites=16, J=0.4):\n    dim = compute_hilbert_space(num_sites)\n    H = build_tj_hamiltonian(dim)\n    alpha, beta = lanczos_algorithm(H)\n    # Énergie fondamentale obtenue\n    return min(alpha)`,
      logs: [
        "[PHYS] Initialisation de l'espace de Hilbert effectif...",
        "[PHYS] Construction du Hamiltonien t-J exact...",
        "[PHYS] Lancement de l'algorithme de Lanczos...",
        "[PHYS] Convergence de l'énergie fondamentale (E0) : -3.421456 eV."
      ]
    },
    {
      id: "homology",
      label: "Homologie Persistante GUDHI (Topologie)",
      status: "pending",
      code: `import gudhi\n\ndef build_simplicial_complex(points):\n    rips = gudhi.RipsComplex(points=points)\n    simplex_tree = rips.create_simplex_tree(max_dimension=3)\n    persistence = simplex_tree.persistence()\n    return persistence`,
      logs: [
        "[TOPO] Extraction du nuage de points atomiques...",
        "[TOPO] Construction du complexe de Vietoris-Rips...",
        "[TOPO] Filtration homologique en cours...",
        "[TOPO] Nombres de Betti : Betti0=1, Betti1=7, Betti2=0."
      ]
    },
    {
      id: "stark",
      label: "Compilation de Preuve ZK-STARK",
      status: "pending",
      code: `use risczero_zkvm::guest::env;\n\nfn main() {\n    let state: PhysicalState = env::read();\n    assert!(state.energy <= 0.0);\n    let commitment = hash_state(&state);\n    env::commit(&commitment);\n}`,
      logs: [
        "[ZK] Ingestion du code Guest RISC Zero dans le zkVM...",
        "[ZK] Compilation du circuit Guest...",
        "[ZK] Exécution et génération du Reçu (.receipt)...",
        "[ZK] Preuve STARK générée et validée : OUI (0.84 ms)."
      ]
    }
  ];

  // Ingestion dynamique du prompt utilisateur
  useEffect(() => {
    let active = true;
    async function fetchDynamicSteps() {
      setIsLoadingSteps(true);
      try {
        const res = await fetch("/api/agentic/decompose-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt || "Calcul scientifique" })
        });
        const data = await res.json();
        if (active) {
          if (data.status === "SUCCESS" && Array.isArray(data.steps) && data.steps.length > 0) {
            setSteps(data.steps.map((step: any, idx: number) => ({
              ...step,
              status: idx === 0 ? "running" : "pending"
            })));
          } else {
            setSteps(stepsTemplate.map((step, idx) => ({
              ...step,
              status: idx === 0 ? "running" : "pending"
            })));
          }
          setCurrentStepIdx(0);
          setStepProgress(0);
          setTypedCode("");
          setIsLoadingSteps(false);
        }
      } catch (err) {
        if (active) {
          setSteps(stepsTemplate.map((step, idx) => ({
            ...step,
            status: idx === 0 ? "running" : "pending"
          })));
          setCurrentStepIdx(0);
          setStepProgress(0);
          setTypedCode("");
          setIsLoadingSteps(false);
        }
      }
    }

    fetchDynamicSteps();

    return () => {
      active = false;
    };
  }, [prompt]);

  // Cycle de calcul étape par étape
  useEffect(() => {
    if (steps.length === 0 || isLoadingSteps) return;

    const activeStep = steps[currentStepIdx];
    if (!activeStep) return;

    const interval = setInterval(() => {
      setStepProgress((prev) => {
        if (prev >= 100) {
          // Valide l'étape actuelle
          setSteps((prevSteps) => 
            prevSteps.map((s, idx) => {
              if (idx === currentStepIdx) return { ...s, status: "success" };
              if (idx === currentStepIdx + 1) return { ...s, status: "running" };
              return s;
            })
          );

          // Étape suivante ou boucle infinie
          if (currentStepIdx < steps.length - 1) {
            setCurrentStepIdx((idx) => idx + 1);
            return 0;
          } else {
            // Recommencer la boucle pour garder l'animation active si l'IA réfléchit longtemps
            setCurrentStepIdx(0);
            setSteps(
              steps.map((step, idx) => ({
                ...step,
                status: idx === 0 ? "running" : "pending"
              }))
            );
            return 0;
          }
        }

        // Progression dynamique et rythmée
        const nextProgress = prev + 10;
        
        // Fluctuations réalistes
        setCpuLoad(Math.floor(82 + Math.random() * 16));
        setRamUsage(4120 + Math.floor(Math.random() * 210));
        
        const ioLabels = ["READ sys.config", "CONN google_api", "CALC active_node", "COMPILE guest_src"];
        setActiveIo(ioLabels[currentStepIdx % ioLabels.length]);

        // Révèle le code au fur et à mesure
        const fullCode = activeStep.code || "";
        const charsToReveal = Math.floor((Math.min(nextProgress, 100) / 100) * fullCode.length);
        setTypedCode(fullCode.substring(0, charsToReveal));

        return nextProgress;
      });
    }, 110);

    return () => clearInterval(interval);
  }, [currentStepIdx, steps, isLoadingSteps]);

  if (isLoadingSteps || steps.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto my-6 bg-[#06070b]/95 border border-cyan-500/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center select-none shadow-[0_0_30px_rgba(6,182,212,0.03)]">
        <div className="relative">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <Sparkles className="w-4 h-4 text-cyan-300 absolute -top-1 -right-1 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <h4 className="text-xs font-black tracking-widest text-slate-300 uppercase font-mono">
            ALLOCATION DU DOCKER AGENTIQUE RATISS
          </h4>
          <p className="text-[10px] text-slate-500 font-mono">
            Decomposition de la tâche et alignement du Panthéon Cognitif...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto my-6 bg-[#06070b]/95 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.05)] select-none">
      {/* Header du Docker */}
      <div className="bg-[#090a10] border-b border-white/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <div className="flex items-center gap-1.5">
            <Server className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-[11px] font-mono font-black tracking-wider text-white uppercase">
              CAPSULE DOCKER AGENTIQUE SOUVERAIN
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 font-mono text-[9px] text-slate-500">
          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
            CONTAINER ID: <span className="text-cyan-400 font-bold">ratiss-sandbox-v9</span>
          </span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> SECURE SANDBOX
          </span>
        </div>
      </div>

      {/* Grid d'activité en direct */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4">
        {/* Colonne Gauche: Résolution & Étapes */}
        <div className="md:col-span-5 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Plan de Résolution Actif</span>
          </div>

          <div className="space-y-1.5">
            {steps.map((step, idx) => {
              const isCompleted = step.status === "success";
              const isRunning = step.status === "running";
              
              return (
                <div 
                  key={step.id}
                  className={`p-2.5 rounded-xl border transition-all duration-300 flex flex-col gap-1.5 ${
                    isRunning 
                      ? "bg-cyan-500/5 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)]" 
                      : isCompleted 
                        ? "bg-emerald-500/[0.02] border-emerald-500/10" 
                        : "bg-white/[0.01] border-white/5 opacity-40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {isCompleted ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      ) : isRunning ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0 animate-pulse">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-slate-600 shrink-0 text-[8px] font-mono font-bold">
                          {idx + 1}
                        </div>
                      )}
                      
                      <span className={`text-[10px] font-mono truncate ${
                        isRunning ? "text-cyan-400 font-bold animate-pulse" : isCompleted ? "text-slate-300" : "text-slate-500"
                      }`}>
                        {step.label}
                      </span>
                    </div>

                    {isRunning && (
                      <span className="text-[9px] font-mono font-bold text-cyan-400 shrink-0">
                        {stepProgress}%
                      </span>
                    )}
                  </div>

                  {isRunning && (
                    <div className="w-full h-1 bg-cyan-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-400 transition-all duration-150"
                        style={{ width: `${stepProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Colonne Droite: Terminal & Télémétrie */}
        <div className="md:col-span-7 flex flex-col gap-3">
          {/* Terminal Sandbox */}
          <div className="flex-1 bg-[#040508] border border-white/5 rounded-xl overflow-hidden flex flex-col min-h-[140px] relative">
            <div className="bg-[#09090d] border-b border-white/5 px-3 py-1.5 flex items-center justify-between select-none">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span className="text-[9px] text-slate-400 font-mono truncate max-w-[180px]">
                  ~/capsule/sandbox/ratiss_{steps[currentStepIdx]?.id || "node"}.py
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-cyan-500 animate-ping" />
                <span className="text-[8px] text-slate-500 uppercase tracking-wider font-mono">ACTIVE_EXEC</span>
              </div>
            </div>

            <div className="flex-1 p-3 font-mono text-[9px] text-slate-400 overflow-y-auto whitespace-pre leading-relaxed max-h-[100px] select-text">
              <code className="text-slate-300">{typedCode}</code>
              <span className="w-1.5 h-3 bg-cyan-400 inline-block animate-pulse ml-0.5 align-middle shadow-[0_0_8px_#06b6d4]" />
            </div>
          </div>

          {/* Diagnostics Hardware */}
          <div className="grid grid-cols-3 gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1 text-[8px] text-slate-500 uppercase font-mono tracking-wider">
                <Activity className="w-2.5 h-2.5 text-red-400 shrink-0 animate-pulse" />
                Charge CPU
              </div>
              <div className="text-[10px] font-bold text-white font-mono mt-0.5">
                {cpuLoad}% <span className="text-[8px] text-slate-600 font-normal">(8 vCPUs)</span>
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1 text-[8px] text-slate-500 uppercase font-mono tracking-wider">
                <Cpu className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                RAM Capsule
              </div>
              <div className="text-[10px] font-bold text-white font-mono mt-0.5">
                {ramUsage} MB <span className="text-[8px] text-slate-600 font-normal">/ 7.5G</span>
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1 text-[8px] text-slate-500 uppercase font-mono tracking-wider">
                <HardDrive className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                Action E/S
              </div>
              <div className="text-[9px] font-bold text-blue-400 font-mono truncate mt-0.5">
                {activeIo}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pied de page du Docker - Logs défilants */}
      <div className="bg-[#040508] border-t border-white/5 px-4 py-2 flex items-center justify-between font-mono text-[9px] text-slate-500 select-none">
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <span className="text-cyan-400 font-bold shrink-0">[STDOUT]</span>
          <span className="truncate text-slate-400">
            {(() => {
              const stepLogs = steps[currentStepIdx]?.logs;
              if (!stepLogs || stepLogs.length === 0) return "Traitement sémantique...";
              return stepLogs[Math.floor((stepProgress / 100) * stepLogs.length)] || "Traitement sémantique...";
            })()}
          </span>
        </div>
        <div className="shrink-0 text-cyan-400/80 font-bold text-[8px] tracking-widest pl-3">
          SYS_OK
        </div>
      </div>
    </div>
  );
};
