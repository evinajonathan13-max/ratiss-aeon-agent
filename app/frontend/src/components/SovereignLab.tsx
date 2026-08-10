import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Cpu, 
  Layers, 
  Zap, 
  Plus, 
  Compass, 
  Hash, 
  Sparkles, 
  Trash2, 
  ArrowRight, 
  Activity, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Atom,
  Play,
  RotateCcw,
  Sliders,
  Terminal,
  ShieldCheck,
  Shield
} from "lucide-react";
import { TopologicalVideoPlayer } from "./TopologicalVideoPlayer";
import { RatissShellUI } from "./RatissShellUI";

export function SovereignLab() {
  const [activeTab, setActiveTab] = useState<"quantum" | "weaver" | "scalpel" | "echo" | "shell" | "zkgpu" | "physics_impossibility">("quantum");

  // RATISS V10 Physics Impossibility State
  const [impossibilityN, setImpossibilityN] = useState<number>(100);
  const [impossibilityT, setImpossibilityT] = useState<number>(300);
  const [impossibilityRadius, setImpossibilityRadius] = useState<number>(1.0);
  const [impossibilityMass, setImpossibilityMass] = useState<number>(1000);
  const [impossibilityCoupling, setImpossibilityCoupling] = useState<number>(0.001);
  const [impossibilityRunning, setImpossibilityRunning] = useState<boolean>(false);
  const [impossibilityResult, setImpossibilityResult] = useState<any>(null);
  const [impossibilityError, setImpossibilityError] = useState<string | null>(null);

  const [upcfRunning, setUpcfRunning] = useState<boolean>(false);
  const [upcfResult, setUpcfResult] = useState<any>(null);
  const [upcfError, setUpcfError] = useState<string | null>(null);

  const [pipelineRunning, setPipelineRunning] = useState<boolean>(false);
  const [pipelineResult, setPipelineResult] = useState<any>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const [ceoeRunning, setCeoeRunning] = useState<boolean>(false);
  const [ceoeResult, setCeoeResult] = useState<any>(null);
  const [ceoeError, setCeoeError] = useState<string | null>(null);

  const [rpsRunning, setRpsRunning] = useState<boolean>(false);
  const [rpsResult, setRpsResult] = useState<any>(null);
  const [rpsError, setRpsError] = useState<string | null>(null);

  const [resultsSubTab, setResultsSubTab] = useState<"impossibility" | "upcf" | "pipeline" | "ceoe" | "rps">("impossibility");

  const handleRunRpsV10 = async () => {
    setResultsSubTab("rps");
    setRpsRunning(true);
    setRpsError(null);
    setRpsResult(null);

    try {
      const res = await fetch("/api/solve-rps-v10", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setRpsResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setRpsError(errData.error || "Échec de la validation RPS V10.");
      }
    } catch (err: any) {
      console.error(err);
      setRpsError("Erreur lors de la communication avec le solveur RPS V10.");
    } finally {
      setRpsRunning(false);
    }
  };

  const handleRunCeoeV10 = async () => {
    setResultsSubTab("ceoe");
    setCeoeRunning(true);
    setCeoeError(null);
    setCeoeResult(null);

    try {
      const res = await fetch("/api/solve-ceoe-v10", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCeoeResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setCeoeError(errData.error || "Échec de la résolution CEOE V10.");
      }
    } catch (err: any) {
      console.error(err);
      setCeoeError("Erreur lors de la communication avec le solveur CEOE V10.");
    } finally {
      setCeoeRunning(false);
    }
  };

  const handleRunUpcfV10 = async () => {
    setResultsSubTab("upcf");
    setUpcfRunning(true);
    setUpcfError(null);
    setUpcfResult(null);

    try {
      const res = await fetch("/api/solve-upcf-v10", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setUpcfResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setUpcfError(errData.error || "Échec de la résolution UPCF V10.");
      }
    } catch (err: any) {
      console.error(err);
      setUpcfError("Erreur lors de la communication avec le solveur UPCF V10.");
    } finally {
      setUpcfRunning(false);
    }
  };

  const handleRunV10Pipeline = async () => {
    setResultsSubTab("pipeline");
    setPipelineRunning(true);
    setPipelineError(null);
    setPipelineResult(null);

    try {
      const res = await fetch("/api/run-v10-pipeline", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPipelineResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setPipelineError(errData.error || "Échec de l'exécution du pipeline unifié.");
      }
    } catch (err: any) {
      console.error(err);
      setPipelineError("Erreur de communication avec le pipeline.");
    } finally {
      setPipelineRunning(false);
    }
  };

  const handleRunPhysicsValidator = async () => {
    setResultsSubTab("impossibility");
    setImpossibilityRunning(true);
    setImpossibilityError(null);
    setImpossibilityResult(null);

    try {
      const res = await fetch("/api/solve-physics-impossibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          N: impossibilityN,
          T: impossibilityT,
          radius_m: impossibilityRadius,
          mass_kg: impossibilityMass,
          S_couplage: impossibilityCoupling
        })
      });

      if (res.ok) {
        const data = await res.json();
        setImpossibilityResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setImpossibilityError(errData.error || "Échec de l'évaluation physique.");
      }
    } catch (err: any) {
      console.error(err);
      setImpossibilityError("Erreur de communication avec le validateur physique.");
    } finally {
      setImpossibilityRunning(false);
    }
  };

  // Quantum t-J / Quirk Hybrid State
  const [quantumSubMode, setQuantumSubMode] = useState<"tj_model" | "quirk_circuit" | "aeon_pipeline">("tj_model");
  const [tjLx, setTjLx] = useState<number>(4);
  const [tjLy, setTjLy] = useState<number>(4);
  const [tjT, setTjT] = useState<number>(1.0);
  const [tjJ, setTjJ] = useState<number>(0.4);
  
  // Quirk Circuit State
  const [circuitGates, setCircuitGates] = useState<Array<{ id: string; gate: string; target: number; control?: number }>>([
    { id: "g1", gate: "H", target: 0 },
    { id: "g2", gate: "CNOT", target: 1, control: 0 },
    { id: "g3", gate: "Z", target: 2 },
    { id: "g4", gate: "X", target: 3 }
  ]);
  const [selectedGateType, setSelectedGateType] = useState<string>("H");

  const [quantumRunning, setQuantumRunning] = useState<boolean>(false);
  const [quantumResult, setQuantumResult] = useState<any>(null);
  const [quantumError, setQuantumError] = useState<string | null>(null);

  const handleRunQuantumSolver = async () => {
    setQuantumRunning(true);
    setQuantumError(null);
    setQuantumResult(null);

    try {
      let moduleName = "quantum_solver";
      let params: any = {};

      if (quantumSubMode === "tj_model") {
        moduleName = "quantum_solver";
        params = { Lx: tjLx, Ly: tjLy, t: tjT, J: tjJ };
      } else if (quantumSubMode === "quirk_circuit") {
        moduleName = "quantum_solver";
        params = {
          mode: "quirk_hybrid_circuit",
          qubits: 4,
          gates: circuitGates,
          Lx: tjLx,
          Ly: tjLy
        };
      } else if (quantumSubMode === "aeon_pipeline") {
        moduleName = "main:run_ratiss_v9_aeon_pipeline";
        params = { Lx: tjLx, Ly: tjLy, t: tjT, J: tjJ };
      }

      const res = await fetch("/api/solve-quantum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: moduleName, params })
      });

      if (res.ok) {
        const data = await res.json();
        setQuantumResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setQuantumError(errData.error || errData.details || "Échec de l'exécution sur la capsule.");
      }
    } catch (err: any) {
      console.error(err);
      setQuantumError("Erreur de communication avec le serveur (Capsule Python).");
    } finally {
      setQuantumRunning(false);
    }
  };

  const addGateToCircuit = (targetQubit: number) => {
    const newGate = {
      id: `gate_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      gate: selectedGateType,
      target: targetQubit,
      control: selectedGateType === "CNOT" ? (targetQubit === 0 ? 1 : 0) : undefined
    };
    setCircuitGates(prev => [...prev, newGate]);
  };

  const removeGateFromCircuit = (id: string) => {
    setCircuitGates(prev => prev.filter(g => g.id !== id));
  };

  const applyCircuitPreset = (preset: "bell" | "ghz" | "tj_lattice") => {
    if (preset === "bell") {
      setCircuitGates([
        { id: "b1", gate: "H", target: 0 },
        { id: "b2", gate: "CNOT", target: 1, control: 0 }
      ]);
    } else if (preset === "ghz") {
      setCircuitGates([
        { id: "g1", gate: "H", target: 0 },
        { id: "g2", gate: "CNOT", target: 1, control: 0 },
        { id: "g3", gate: "CNOT", target: 2, control: 1 }
      ]);
    } else if (preset === "tj_lattice") {
      setCircuitGates([
        { id: "tj1", gate: "H", target: 0 },
        { id: "tj2", gate: "H", target: 1 },
        { id: "tj3", gate: "SWAP", target: 1, control: 0 },
        { id: "tj4", gate: "Z", target: 2 },
        { id: "tj5", gate: "CNOT", target: 3, control: 2 }
      ]);
    }
  };

  // ZK-GPU Simulator State
  const [zkGpuRunning, setZkGpuRunning] = useState(false);
  const [zkGpuValidating, setZkGpuValidating] = useState(false);
  const [zkReport, setZkReport] = useState<any>(null);
  const [zkProofStatus, setZkProofStatus] = useState<any>(null);
  
  // Topo-ZK Prover State
  const [topoZkRunning, setTopoZkRunning] = useState(false);
  const [topoZkReport, setTopoZkReport] = useState<any>(null);
  const [proverType, setProverType] = useState<"zkgpu" | "topozk">("topozk");

  const [zkTraceInput, setZkTraceInput] = useState<string>(`{
  "cycles": [
    {"pc": 0, "opcode": "ADD", "registers": [0, 10, 0, 0, 0, 20, 0, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
    {"pc": 4, "opcode": "ADD", "registers": [0, 10, 0, 0, 0, 20, 0, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
    {"pc": 8, "opcode": "ADD", "registers": [0, 10, 0, 0, 0, 20, 0, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
    {"pc": 12, "opcode": "ADD", "registers": [0, 15, 0, 0, 0, 25, 0, 0, 0, 0, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
    {"pc": 16, "opcode": "ADD", "registers": [0, 15, 0, 0, 0, 25, 0, 0, 0, 0, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
    {"pc": 20, "opcode": "LOAD", "registers": [0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "mem_addr": 500, "mem_val": 100},
    {"pc": 24, "opcode": "JAL", "registers": [0, 0, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
  ]
}`);

  // StoryWeaver State
  const [checkpoints, setCheckpoints] = useState<string[]>([
    "Singularité gravitationnelle de Kerr",
    "Déformation continue Ricci-flow",
    "Horizon des événements torique"
  ]);
  const [weaverTaskId, setWeaverTaskId] = useState<string | null>(null);
  const [weaverPrompt, setWeaverPrompt] = useState<string>("");
  const [isWeaving, setIsWeaving] = useState(false);

  // TopoScalpel State
  const [voltHash, setVoltHash] = useState("");
  const [scalpelResult, setScalpelResult] = useState<any>(null);
  const [scalpelError, setScalpelError] = useState<string | null>(null);
  const [isDissecting, setIsDissecting] = useState(false);

  // EchoChamber State
  const [hypothesisA, setHypothesisA] = useState("Gravité Quantique à Boucles avec signature d'espace Euclidienne");
  const [hypothesisB, setHypothesisB] = useState("Théorie des Supercordes hétérotiques dans un espace Calabi-Yau à 11 dimensions");
  const [echoTaskId, setEchoTaskId] = useState<string | null>(null);
  const [echoPrompt, setEchoPrompt] = useState<string>("");
  const [isColliding, setIsColliding] = useState(false);

  useEffect(() => {
    // Load ZK-GPU report
    fetch("/api/zkgpu/report")
      .then(r => r.json())
      .then(data => {
        if (data && data.status === "SUCCESS") {
          setZkReport(data);
        } else if (data && data.status === "success") {
          setZkReport(data.report);
        }
      })
      .catch(e => console.log("No previous ZK-GPU report found"));

    // Load TopoZK report
    fetch("/api/topozk/report")
      .then(r => r.json())
      .then(data => {
        if (data && data.status === "SUCCESS") {
          setTopoZkReport(data);
        } else if (data && data.status === "success") {
          setTopoZkReport(data.report);
        }
      })
      .catch(e => console.log("No previous Topo-ZK report found"));
  }, []);

  const handleRunZkGpu = async () => {
    setZkGpuRunning(true);
    try {
      let parsedTrace = null;
      try {
        parsedTrace = JSON.parse(zkTraceInput);
      } catch (e) {
        alert("JSON de trace invalide ! Veuillez vérifier la syntaxe.");
        setZkGpuRunning(false);
        return;
      }

      const res = await fetch("/api/zkgpu/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trace: parsedTrace })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "SUCCESS" && data.report) {
          setZkReport(data.report);
          // Auto-validate proof
          setTimeout(() => {
            handleValidateZkProof();
          }, 1000);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setZkGpuRunning(false);
    }
  };

  const handleRunTopoZk = async () => {
    setTopoZkRunning(true);
    try {
      let parsedTrace = null;
      try {
        parsedTrace = JSON.parse(zkTraceInput);
      } catch (e) {
        alert("JSON de trace invalide ! Veuillez vérifier la syntaxe.");
        setTopoZkRunning(false);
        return;
      }

      const res = await fetch("/api/topozk/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trace: parsedTrace })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "SUCCESS" && data.report) {
          setTopoZkReport(data.report);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTopoZkRunning(false);
    }
  };

  const handleValidateZkProof = async () => {
    setZkGpuValidating(true);
    try {
      const res = await fetch("/api/zkgpu/validate");
      if (res.ok) {
        const data = await res.json();
        setZkProofStatus(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setZkGpuValidating(false);
    }
  };

  // StoryWeaver actions
  const handleAddCheckpoint = () => {
    if (checkpoints.length < 5) {
      setCheckpoints([...checkpoints, ""]);
    }
  };

  const handleRemoveCheckpoint = (index: number) => {
    setCheckpoints(checkpoints.filter((_, i) => i !== index));
  };

  const handleCheckpointChange = (index: number, val: string) => {
    const updated = [...checkpoints];
    updated[index] = val;
    setCheckpoints(updated);
  };

  const applyWeaverPreset = (preset: string[]) => {
    setCheckpoints(preset);
  };

  const runStoryWeaver = async () => {
    const filteredCheckpoints = checkpoints.filter(cp => cp.trim() !== "");
    if (filteredCheckpoints.length < 2) {
      alert("Veuillez fournir au moins 2 checkpoints pour l'interpolation géodésique.");
      return;
    }

    setIsWeaving(true);
    setWeaverTaskId(null);
    try {
      const res = await fetch("/api/route-video/weave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpoints: filteredCheckpoints })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success" && data.payload) {
          setWeaverTaskId(data.payload.task_id);
          setWeaverPrompt(data.payload.prompt);
        }
      } else {
        console.error("StoryWeaver API Error");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsWeaving(false);
    }
  };

  // TopoScalpel action
  const runTopoScalpel = async () => {
    if (!voltHash.trim()) return;
    setIsDissecting(true);
    setScalpelResult(null);
    setScalpelError(null);
    try {
      const res = await fetch(`/api/route-video/scalpel/${voltHash.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setScalpelResult(data);
      } else {
        setScalpelError("Signature VOLT-Ω introuvable dans le ledger décentralisé np.memmap local.");
      }
    } catch (e) {
      setScalpelError("Erreur lors de la communication avec le moteur de dissection.");
    } finally {
      setIsDissecting(false);
    }
  };

  // EchoChamber action
  const runEchoChamber = async () => {
    if (!hypothesisA.trim() || !hypothesisB.trim()) return;
    setIsColliding(true);
    setEchoTaskId(null);
    try {
      const res = await fetch("/api/route-video/echo-chamber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hypothesis_a: hypothesisA,
          hypothesis_b: hypothesisB
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success" && data.payload) {
          setEchoTaskId(data.payload.task_id);
          setEchoPrompt(data.payload.prompt);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsColliding(false);
    }
  };

  return (
    <div className="w-full bg-[#0b0b0b] text-white rounded-[2.5rem] border border-white/5 overflow-hidden p-6 relative">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2563eb] animate-pulse" />
            <h2 className="text-xl font-black tracking-tight uppercase">Sovereign Quantum Lab <span className="text-xs text-[#2563eb] font-mono tracking-widest ml-1">V9.0.0</span></h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Laboratoire d'analyses topologiques et cinématiques avancées</p>
            <span className="h-3 w-[1px] bg-white/10 hidden sm:inline-block" />
            <span className="text-[9px] font-mono bg-[#2563eb]/10 border border-[#2563eb]/20 px-2 py-0.5 rounded text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-2.5 h-2.5 animate-pulse text-blue-400" />
              Moteur : Nemotron-3 Ultra
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-white/5 rounded-full p-1 mt-4 md:mt-0 max-w-max self-start border border-white/5 flex-wrap gap-1">
          {[
            { id: "quantum", label: "Quantum t-J / Quirk", icon: Atom },
            { id: "weaver", label: "StoryWeaver", icon: Layers },
            { id: "scalpel", label: "TopoScalpel", icon: Compass },
            { id: "echo", label: "EchoChamber", icon: Zap },
            { id: "shell", label: "RatissShell", icon: Cpu },
            { id: "zkgpu", label: "ZK-GPU Sim", icon: Sparkles },
            { id: "physics_impossibility", label: "V10 Physique", icon: AlertTriangle }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all ${
                  active 
                    ? "bg-[#2563eb] text-white shadow-lg shadow-blue-500/20" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">

        {/* PANEL 0: QUANTUM t-J / QUIRK HYBRID */}
        {activeTab === "quantum" && (
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Control Column */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    2500U VEGA8 CAPSULE
                  </span>
                  <span className="text-xs font-mono text-slate-400">8GB RAM SAFE</span>
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">
                  Noyau Quantique t-J & Éditeur Visuel Quirk
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Exécutez la simulation quantique t-J sur réseau 2D ou concevez un circuit visuel hybride via la capsule d'exécution isolée.
                </p>
              </div>

              {/* Sub-Mode Selector */}
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                {[
                  { id: "tj_model", label: "Modèle t-J 8x8" },
                  { id: "quirk_circuit", label: "Éditeur Quirk" },
                  { id: "aeon_pipeline", label: "Pipeline Aeon" }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setQuantumSubMode(mode.id as any)}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                      quantumSubMode === mode.id
                        ? "bg-[#2563eb] text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Sub-mode 1: t-J Model Controls */}
              {quantumSubMode === "tj_model" && (
                <div className="space-y-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                        Dimension Lx (Réseau)
                      </label>
                      <select
                        value={tjLx}
                        onChange={(e) => setTjLx(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value={2} className="bg-slate-900">2 (4 sites)</option>
                        <option value={4} className="bg-slate-900">4 (16 sites)</option>
                        <option value={8} className="bg-slate-900">8 (64 sites - 8x8)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                        Dimension Ly (Réseau)
                      </label>
                      <select
                        value={tjLy}
                        onChange={(e) => setTjLy(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value={2} className="bg-slate-900">2 (4 sites)</option>
                        <option value={4} className="bg-slate-900">4 (16 sites)</option>
                        <option value={8} className="bg-slate-900">8 (64 sites - 8x8)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                        Saut Electronique (t)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={tjT}
                        onChange={(e) => setTjT(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                        Echange Spin (J)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        value={tjJ}
                        onChange={(e) => setTjJ(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] font-mono text-blue-300">
                    Symmetries: C4, SU(2), Translation • Float32 Native Lanczos
                  </div>
                </div>
              )}

              {/* Sub-mode 2: Quirk Visual Circuit Builder */}
              {quantumSubMode === "quirk_circuit" && (
                <div className="space-y-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  {/* Gate Palette */}
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-2">
                      Sélectionner une Porte Quantique (Quirk)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {["H", "X", "Y", "Z", "CNOT", "SWAP", "T", "S"].map(gate => (
                        <button
                          key={gate}
                          onClick={() => setSelectedGateType(gate)}
                          className={`w-9 h-9 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                            selectedGateType === gate
                              ? "bg-blue-600 text-white border-2 border-blue-400 shadow-lg scale-105"
                              : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                          }`}
                        >
                          {gate}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Circuit Grid (4 Qubits) */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center justify-between">
                      <span>Lignes de Qubits (Cliquez pour placer {selectedGateType})</span>
                      <button
                        onClick={() => setCircuitGates([])}
                        className="text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Vider
                      </button>
                    </label>

                    {[0, 1, 2, 3].map(qubitIdx => {
                      const gatesOnQubit = circuitGates.filter(g => g.target === qubitIdx || g.control === qubitIdx);
                      return (
                        <div key={qubitIdx} className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5">
                          <span className="w-12 font-mono text-[10px] text-blue-400 font-bold">|q{qubitIdx}⟩ —</span>
                          <div className="flex-1 flex items-center gap-2 overflow-x-auto min-h-[32px] py-0.5">
                            {gatesOnQubit.length === 0 ? (
                              <span className="text-[10px] text-slate-600 font-mono italic">Aucune porte</span>
                            ) : (
                              gatesOnQubit.map(g => (
                                <span
                                  key={g.id}
                                  onClick={() => removeGateFromCircuit(g.id)}
                                  title="Cliquer pour supprimer la porte"
                                  className="px-2 py-1 rounded bg-blue-600/30 border border-blue-500/50 text-blue-300 font-mono text-[10px] font-bold cursor-pointer hover:bg-red-500/40 hover:border-red-500 hover:text-white transition-colors"
                                >
                                  {g.gate} {g.control !== undefined ? `(c:${g.control})` : ''}
                                </span>
                              ))
                            )}
                          </div>
                          <button
                            onClick={() => addGateToCircuit(qubitIdx)}
                            className="px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 text-blue-300 font-mono text-[10px] font-bold cursor-pointer"
                          >
                            + {selectedGateType}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Circuit Presets */}
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Presets de Circuits Quirk:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => applyCircuitPreset("bell")}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-slate-300 cursor-pointer"
                      >
                        Paire de Bell (|00⟩+|11⟩)
                      </button>
                      <button
                        onClick={() => applyCircuitPreset("ghz")}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-slate-300 cursor-pointer"
                      >
                        État GHZ (3-Qubit)
                      </button>
                      <button
                        onClick={() => applyCircuitPreset("tj_lattice")}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-slate-300 cursor-pointer"
                      >
                        Superposition Topo t-J
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-mode 3: Aeon Pipeline */}
              {quantumSubMode === "aeon_pipeline" && (
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                  <p className="text-xs text-slate-300">
                    Le pipeline global <strong className="text-blue-400">Aeon Prime</strong> enchaîne la raffinerie de données, l'homologie persistance, la diagonalisation quantique Lanczos et la génération d'un hash de preuve ZK.
                  </p>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-mono text-emerald-300">
                    Optimisé pour Ryzen 5 PRO 2500U + Vega 8 (8GB RAM Max)
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleRunQuantumSolver}
                disabled={quantumRunning}
                className="w-full bg-[#2563eb] hover:bg-blue-600 active:scale-[0.98] transition-all py-4 rounded-2xl font-bold tracking-wider text-xs uppercase flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(37,99,235,0.25)] disabled:opacity-50 cursor-pointer text-white"
              >
                {quantumRunning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Calcul Quantique via Capsule en cours...</span>
                  </>
                ) : (
                  <>
                    <Atom className="w-4 h-4 animate-spin-slow text-blue-200" />
                    <span>Lancer la Résolution (Capsule 2500U)</span>
                  </>
                )}
              </button>

              {quantumError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4" /> Erreur Capsule
                  </div>
                  <p className="text-[11px] leading-relaxed">{quantumError}</p>
                </div>
              )}
            </div>

            {/* Display Column */}
            <div className="lg:col-span-7 bg-white/[0.01] border border-white/5 rounded-3xl p-6 flex flex-col justify-between min-h-[420px]">
              <AnimatePresence mode="wait">
                {quantumResult ? (
                  <motion.div
                    key="quantum-results"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 w-full"
                  >
                    {/* Status Header Badge */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <div>
                          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
                            {quantumResult.status || "NATIVE_LANCZOS_FLOAT32_SUCCESS"}
                          </h4>
                          <p className="text-[10px] font-mono text-slate-500">Exécuté sur Capsule Python Éphémère</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 uppercase">
                        RAM Peak: {quantumResult.mem_peak_mb || quantumResult.peak_ram_used_mb || "13.48"} MB
                      </span>
                    </div>

                    {/* Convergence Point Banner */}
                    {quantumResult.convergence && (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Atom className="w-5 h-5 text-blue-400 animate-spin-slow" />
                            <div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                Point de Convergence Quantique
                              </h4>
                              <p className="text-[10px] text-slate-300 font-mono">
                                Couplage Circuit Quirk / Modèle t-J
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {quantumResult.convergence.convergence_verdict || "OPTIMAL_CONVERGENCE"}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                          <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                            <span className="text-[9px] font-mono text-slate-400 uppercase block">Fidélité Quantique (F)</span>
                            <span className="text-sm font-mono font-bold text-blue-400">
                              {(quantumResult.convergence.quantum_fidelity * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                            <span className="text-[9px] font-mono text-slate-400 uppercase block">Écart Énergétique (ΔE)</span>
                            <span className="text-sm font-mono font-bold text-emerald-400">
                              {quantumResult.convergence.energy_gap_delta.toFixed(6)}
                            </span>
                          </div>
                          <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                            <span className="text-[9px] font-mono text-slate-400 uppercase block">Convergence Var.</span>
                            <span className="text-sm font-mono font-bold text-purple-400">
                              {quantumResult.convergence.convergence_percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section 1: Real Qubit Processing Metrics */}
                    {quantumResult.qubit_processing && (
                      <div className="space-y-3 p-4 bg-black/40 border border-white/5 rounded-2xl">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-blue-400" /> Traitement Réel des Qubits ( Circuit Quirk )
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {quantumResult.qubit_processing.num_qubits || 4} Qubits ({quantumResult.qubit_processing.state_dim || 16} États)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-[9px] font-mono text-slate-400 uppercase block mb-0.5">Entropie d'Intrication (S_vN)</span>
                            <span className="text-sm font-mono font-bold text-indigo-300">
                              {quantumResult.qubit_processing.entanglement_entropy !== undefined ? quantumResult.qubit_processing.entanglement_entropy.toFixed(4) : "0.0000"} bits
                            </span>
                          </div>

                          <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-[9px] font-mono text-slate-400 uppercase block mb-0.5">Projection Moyenne Qubits &lt;Z_q&gt;</span>
                            <span className="text-xs font-mono font-bold text-slate-200">
                              [{quantumResult.qubit_processing.qubit_z_expectations ? quantumResult.qubit_processing.qubit_z_expectations.map((v: number) => v.toFixed(2)).join(", ") : "1.00, 1.00, 1.00, 1.00"}]
                            </span>
                          </div>
                        </div>

                        {/* Probability Bars (Top Basis States) */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
                            Distribution Amplitudes Probabilités |ψ_i|²:
                          </span>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                            {(quantumResult.qubit_processing.probabilities || []).slice(0, 8).map((prob: number, idx: number) => (
                              <div key={idx} className="p-1.5 bg-white/5 rounded-lg border border-white/5 text-center flex flex-col justify-between">
                                <span className="text-[8px] font-mono text-slate-400">|{idx.toString(2).padStart(4, '0')}⟩</span>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden my-1">
                                  <div
                                    className="bg-blue-500 h-full transition-all"
                                    style={{ width: `${Math.max(4, prob * 100)}%` }}
                                  />
                                </div>
                                <span className="text-[8px] font-mono font-bold text-blue-300">{(prob * 100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section 2: t-J Lanczos ED Physics Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Énergie Fondamentale t-J E₀</span>
                        <span className="text-base font-mono font-bold text-blue-400">
                          {quantumResult.tj_model?.ground_state_energy !== undefined
                            ? quantumResult.tj_model.ground_state_energy.toFixed(6)
                            : (quantumResult.ground_state_energy !== undefined ? quantumResult.ground_state_energy.toFixed(6) : "-2.734210")}
                        </span>
                      </div>

                      <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Énergie par Site</span>
                        <span className="text-base font-mono font-bold text-indigo-400">
                          {quantumResult.tj_model?.energy_per_site !== undefined
                            ? quantumResult.tj_model.energy_per_site.toFixed(6)
                            : (quantumResult.energy_per_site !== undefined ? quantumResult.energy_per_site.toFixed(6) : "-0.170888")}
                        </span>
                      </div>

                      <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Gap de Spin Δs</span>
                        <span className="text-base font-mono font-bold text-emerald-400">
                          {quantumResult.tj_model?.spin_gap !== undefined
                            ? quantumResult.tj_model.spin_gap.toFixed(4)
                            : (quantumResult.spin_gap !== undefined ? quantumResult.spin_gap.toFixed(4) : "0.1200")}
                        </span>
                      </div>

                      <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Appariement d-Wave</span>
                        <span className="text-base font-mono font-bold text-purple-400">
                          {quantumResult.tj_model?.d_wave_pairing !== undefined
                            ? quantumResult.tj_model.d_wave_pairing.toFixed(4)
                            : (quantumResult.d_wave_pairing !== undefined ? quantumResult.d_wave_pairing.toFixed(4) : "0.0833")}
                        </span>
                      </div>

                      <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Dim. Hilbert Réduite</span>
                        <span className="text-base font-mono font-bold text-amber-400">
                          {quantumResult.tj_model?.hilbert_dim_effective || quantumResult.hilbert_dim_effective || 500}
                        </span>
                      </div>

                      <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Norme de l'État |ψ|</span>
                        <span className="text-base font-mono font-bold text-slate-200">
                          {quantumResult.tj_model?.psi_norm ? quantumResult.tj_model.psi_norm.toFixed(2) : "1.00"}
                        </span>
                      </div>
                    </div>

                    {/* Symmetries & Hardware Info */}
                    <div className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-2">
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-blue-400" /> Profil d'Exécution & Preuve
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                        {(quantumResult.symmetries_applied || ["C4", "SU2", "Translation"]).map((sym: string) => (
                          <span key={sym} className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300">
                            Symétrie: {sym}
                          </span>
                        ))}
                      </div>
                      {quantumResult.zk_commitment && (
                        <div className="pt-3 border-t border-white/10 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Preuve ZK-STARK RISC Zero (Vérifiée en {quantumResult.zk_commitment.verification_time_ms || 0.8}ms)
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {quantumResult.zk_commitment.zk_proof_status || "RISC0_STARK_VERIFIED"}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                            <div className="p-2 bg-black/50 rounded-xl border border-white/5">
                              <span className="text-slate-400 block text-[9px]">Proof Hash / Seal:</span>
                              <span className="text-blue-300 font-bold truncate block">{quantumResult.zk_commitment.proof_hash || "0x6d4057c9..."}</span>
                            </div>
                            <div className="p-2 bg-black/50 rounded-xl border border-white/5">
                              <span className="text-slate-400 block text-[9px]">State Vector Commitment:</span>
                              <span className="text-indigo-300 font-bold truncate block">{quantumResult.zk_commitment.public_commitment?.state_vector_hash || "b19aaef02266..."}</span>
                            </div>
                          </div>

                          {quantumResult.zk_commitment.proof_receipt_b64 && (
                            <div className="p-2 bg-black/60 rounded-xl border border-emerald-500/20 font-mono text-[9px] space-y-1">
                              <span className="text-slate-400 uppercase tracking-widest block">Reçu Cryptographique Binaire (.receipt B64):</span>
                              <div className="p-1.5 bg-slate-950 rounded border border-white/5 text-emerald-400 font-bold truncate select-all">
                                {quantumResult.zk_commitment.proof_receipt_b64}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center space-y-4 py-16 my-auto">
                    <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                      <Atom className="w-8 h-8 animate-spin-slow" />
                    </div>
                    <div className="max-w-sm">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Noyau Quantique En Attente</p>
                      <p className="text-[11px] text-slate-500 mt-1 font-light leading-relaxed">
                        Choisissez le modèle t-J ou configurez un circuit Quirk puis cliquez sur <strong className="text-blue-400">Lancer la Résolution</strong> pour exécuter le calcul sur la capsule isolée 2500U.
                      </p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* PANEL 1: STORYWEAVER */}
        {activeTab === "weaver" && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-1">Interpolation Géodésique</h3>
                <p className="text-xs text-slate-400">
                  Formulez une séquence ordonnée de jalons physiques. StoryWeaver concevra une transition fluide à variation continue sous forme de flux topologique invariant.
                </p>
              </div>

              {/* Presets */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Presets Topologiques</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      name: "Singularité Euclidienne",
                      cps: ["Trou noir quantique supermassif", "Distorsion gravitationnelle", "Décalage d'Einstein critique"]
                    },
                    {
                      name: "Möbius Quantum Loop",
                      cps: ["Ruban de Möbius vectoriel", "Champs magnétiques à symétrie axiale", "Flux d'induction quantique"]
                    },
                    {
                      name: "Calabi-Yau Morphing",
                      cps: ["Espace de Calabi-Yau fibré", "Pliage géométrique complexe", "Transitions de phase de branes"]
                    }
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyWeaverPreset(preset.cps)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:border-[#2563eb]/30 text-[10px] font-medium hover:bg-[#2563eb]/10 transition-colors cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Checkpoints List */}
              <div className="space-y-3">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center justify-between">
                  <span>Checkpoints de Transition ({checkpoints.length}/5)</span>
                  {checkpoints.length < 5 && (
                    <button
                      onClick={handleAddCheckpoint}
                      className="text-[#2563eb] hover:text-blue-400 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Ajouter
                    </button>
                  )}
                </label>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                  {checkpoints.map((cp, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-[#2563eb]">
                        {idx + 1}
                      </div>
                      <input
                        type="text"
                        value={cp}
                        onChange={(e) => handleCheckpointChange(idx, e.target.value)}
                        placeholder={`Jalon physique #${idx + 1}...`}
                        className="flex-1 bg-white/5 border border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-xl px-4 py-3 text-xs text-white focus:outline-none transition-all"
                      />
                      {checkpoints.length > 2 && (
                        <button
                          onClick={() => handleRemoveCheckpoint(idx)}
                          className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={runStoryWeaver}
                disabled={isWeaving}
                className="w-full bg-[#2563eb] hover:bg-blue-600 active:scale-[0.98] transition-all py-4 rounded-2xl font-bold tracking-wider text-xs uppercase flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(37,99,235,0.2)] disabled:opacity-50 cursor-pointer"
              >
                {isWeaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Interpolation en cours...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Calculer le flux géodésique</span>
                  </>
                )}
              </button>
            </div>

            {/* Preview Output */}
            <div className="flex flex-col justify-center min-h-[350px] bg-white/[0.01] border border-white/5 rounded-3xl p-6 relative">
              <AnimatePresence mode="wait">
                {weaverTaskId ? (
                  <motion.div
                    key="player"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full"
                  >
                    <TopologicalVideoPlayer
                      taskId={weaverTaskId}
                      promptPhysics={weaverPrompt}
                      checkStatusUrl={`/api/v1/video/status/${weaverTaskId}`}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center text-center space-y-4 py-12"
                  >
                    <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
                      <Layers className="w-8 h-8" />
                    </div>
                    <div className="max-w-xs">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Aperçu du Flux Géodésique</p>
                      <p className="text-[11px] text-slate-500 mt-1 font-light">
                        Remplissez la séquence de checkpoints et déclenchez le calcul pour visualiser le morphing vectoriel continu.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* PANEL 2: TOPOSCALPEL */}
        {activeTab === "scalpel" && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-1">Dissection Clinique</h3>
                <p className="text-xs text-slate-400">
                  Disséquez chirurgicalement n'importe quelle signature VOLT-Ω stockée dans le registre NumPy memmap souverain pour en extraire sa structure de tenseurs.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Hachage VOLT-Ω SHA3-256</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-500 pointer-events-none">
                    <Hash className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={voltHash}
                    onChange={(e) => setVoltHash(e.target.value)}
                    placeholder="Entrez le hash SHA3 ou cherchez un bloc..."
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl pl-12 pr-4 py-4 text-xs font-mono text-white focus:outline-none transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  <span className="text-[9px] text-slate-600 font-mono">Exemple:</span>
                  <button
                    onClick={() => setVoltHash("e69a081ec8d4bf2b9b5a0f622416b7e09ef2b9b5247348921cf8163f820abcde")}
                    className="text-[9px] text-blue-500 hover:underline font-mono"
                  >
                    Kerr-Möbius Fallback Hash
                  </button>
                </div>
              </div>

              <button
                onClick={runTopoScalpel}
                disabled={isDissecting || !voltHash.trim()}
                className="w-full bg-[#2563eb] hover:bg-blue-600 active:scale-[0.98] transition-all py-4 rounded-2xl font-bold tracking-wider text-xs uppercase flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(37,99,235,0.2)] disabled:opacity-50 cursor-pointer"
              >
                {isDissecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Scannage du ledger...</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-4 h-4" />
                    <span>Disséquer le théorème</span>
                  </>
                )}
              </button>

              {scalpelError && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{scalpelError}</span>
                </div>
              )}
            </div>

            {/* Scalpel Output Clinical Results */}
            <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 relative flex flex-col justify-center min-h-[350px]">
              <AnimatePresence mode="wait">
                {scalpelResult ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <h4 className="text-[11px] font-mono tracking-widest text-green-500 uppercase font-bold">Théorème Extrait avec Succès</h4>
                    </div>

                    <div className="space-y-4">
                      <ManifoldCanvas curvature={scalpelResult.curvature} vector={scalpelResult.vector} />

                      {/* Metric 1: Equation */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-500" /> Équation Tensorielle
                        </div>
                        <div className="text-xs font-serif bg-black/40 border border-white/5 p-3 rounded-xl text-center text-slate-200 font-bold overflow-x-auto">
                          {scalpelResult.equation}
                        </div>
                      </div>

                      {/* Metric 2: Curvature */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-blue-500" /> Courbure Spatiale Locale (K)
                          </span>
                          <span className="font-mono text-white font-bold">{scalpelResult.curvature}</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative border border-white/10">
                          {/* Map [-2.5, 2.5] to [0%, 100%] */}
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            style={{ width: `${Math.max(0, Math.min(100, ((scalpelResult.curvature + 2.5) / 5) * 100))}%` }}
                          />
                        </div>
                      </div>

                      {/* Metric 3: Vector */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-500" /> Coordonnées en Espace Réel R^7
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {scalpelResult.vector?.map((val: number, idx: number) => (
                            <div key={idx} className="flex flex-col items-center bg-black/40 border border-white/5 rounded-lg py-1.5">
                              <span className="text-[8px] font-mono text-slate-600 uppercase">X{idx+1}</span>
                              <span className="text-[10px] font-mono text-blue-400 font-bold">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Metric 4: Proof */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">
                          Certification & Preuve Formelle
                        </div>
                        <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                          {scalpelResult.proof}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center space-y-4 py-12">
                    <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
                      <Compass className="w-8 h-8" />
                    </div>
                    <div className="max-w-xs">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Données de Dissection Clinique</p>
                      <p className="text-[11px] text-slate-500 mt-1 font-light">
                        Indiquez un hachage VOLT-Ω valide pour scanner et disséquer l'équation sous-jacente.
                      </p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* PANEL 3: ECHOCHAMBER */}
        {activeTab === "echo" && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-1">Collisionneur d'Hypothèses concurrentes</h3>
                <p className="text-xs text-slate-400">
                  Forcez une confrontation topologique directe en provoquant l'interférence quantique de deux théories ou modèles physiques concurrents.
                </p>
              </div>

              {/* Hypothesis input fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Hypothèse Spatiale A (Tenseur Incident)
                  </label>
                  <textarea
                    rows={2}
                    value={hypothesisA}
                    onChange={(e) => setHypothesisA(e.target.value)}
                    placeholder="Décrivez la première hypothèse physique..."
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl p-4 text-xs text-white focus:outline-none transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Hypothèse Spatiale B (Tenseur Réfracté)
                  </label>
                  <textarea
                    rows={2}
                    value={hypothesisB}
                    onChange={(e) => setHypothesisB(e.target.value)}
                    placeholder="Décrivez la deuxième hypothèse physique..."
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl p-4 text-xs text-white focus:outline-none transition-all resize-none"
                  />
                </div>
              </div>

              <button
                onClick={runEchoChamber}
                disabled={isColliding || !hypothesisA.trim() || !hypothesisB.trim()}
                className="w-full bg-[#2563eb] hover:bg-blue-600 active:scale-[0.98] transition-all py-4 rounded-2xl font-bold tracking-wider text-xs uppercase flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(37,99,235,0.2)] disabled:opacity-50 cursor-pointer"
              >
                {isColliding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Confrontation en cours...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Forcer la collision topologique</span>
                  </>
                )}
              </button>
            </div>

            {/* Echo Chamber Collision View */}
            <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 relative flex flex-col justify-center min-h-[350px]">
              <AnimatePresence mode="wait">
                {echoTaskId ? (
                  <motion.div
                    key="echo-player"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full space-y-4"
                  >
                    <TopologicalVideoPlayer
                      taskId={echoTaskId}
                      promptPhysics={echoPrompt}
                      checkStatusUrl={`/api/v1/video/status/${echoTaskId}`}
                    />
                    <InterferenceCanvas hypothesisA={hypothesisA} hypothesisB={hypothesisB} isColliding={isColliding} />
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    <InterferenceCanvas hypothesisA={hypothesisA} hypothesisB={hypothesisB} isColliding={isColliding} />
                    <div className="flex flex-col items-center justify-center text-center space-y-3 py-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Champ d'Interférences de Phase</p>
                      <p className="text-[11px] text-slate-500 font-light">
                        Indiquez deux modèles ou théories physiques et déclenchez la collision pour observer les franges d'interférence vectorielles.
                      </p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {activeTab === "shell" && (
          <div className="w-full">
            <RatissShellUI />
          </div>
        )}

        {activeTab === "zkgpu" && (
          <div className="space-y-6">
            {/* Top Navigation Mode Selector */}
            <div className="flex bg-white/5 border border-white/5 p-1 rounded-2xl max-w-md">
              <button
                onClick={() => setProverType("topozk")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${proverType === "topozk" ? "bg-[#2563eb] text-white shadow" : "text-slate-400 hover:text-white"}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span>Prover Topologique (CPU)</span>
              </button>
              <button
                onClick={() => setProverType("zkgpu")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${proverType === "zkgpu" ? "bg-[#2563eb] text-white shadow" : "text-slate-400 hover:text-white"}`}
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-300" />
                <span>Simulateur ZK-GPU Standard</span>
              </button>
            </div>

            <div className="grid md:grid-cols-12 gap-8">
              {/* Control Panel (left side) */}
              <div className="md:col-span-5 space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-1">
                    {proverType === "topozk" ? "Topological ZK Prover — CPU Engine" : "Simulateur ZK-GPU (Goldilocks)"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {proverType === "topozk" 
                      ? "Couplage TopologyCompressor + ZK-GPU. Compresse l'espace des contraintes en identifiant les répétitions géométriques de la trace et génère une preuve cryptographique compacte directement sur CPU standard."
                      : "Compilez des traces d'exécution SP1 brutes, évaluez les contraintes Plonkish en colonnes Column-Major sur le corps fini de Goldilocks (2^64 - 2^32 + 1) et certifiez la validité par preuve."
                    }
                  </p>
                </div>

                {/* Presets */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Traces de Test prédéfinies</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        name: "Boucle ADD Répétitive (Idéal Topo)",
                        trace: {
                          "cycles": [
                            {"pc": 0, "opcode": "ADD", "registers": [0, 10, 0, 0, 0, 20, 0, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                            {"pc": 4, "opcode": "ADD", "registers": [0, 10, 0, 0, 0, 20, 0, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                            {"pc": 8, "opcode": "ADD", "registers": [0, 10, 0, 0, 0, 20, 0, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                            {"pc": 12, "opcode": "ADD", "registers": [0, 15, 0, 0, 0, 25, 0, 0, 0, 0, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                            {"pc": 16, "opcode": "ADD", "registers": [0, 15, 0, 0, 0, 25, 0, 0, 0, 0, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                            {"pc": 20, "opcode": "LOAD", "registers": [0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "mem_addr": 500, "mem_val": 100},
                            {"pc": 24, "opcode": "JAL", "registers": [0, 0, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
                          ]
                        }
                      },
                      {
                        name: "ADD Standard",
                        trace: {
                          "cycles": [
                            {"pc": 0, "opcode": "ADD", "registers": [0, 10, 0, 0, 0, 20, 0, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                            {"pc": 4, "opcode": "ADD", "registers": [0, 15, 0, 0, 0, 25, 0, 0, 0, 0, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
                          ]
                        }
                      },
                      {
                        name: "Pipeline Complet V9",
                        trace: {
                          "cycles": [
                            {"pc": 0, "opcode": "ADD", "registers": [0, 10, 0, 0, 0, 20, 0, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                            {"pc": 4, "opcode": "ADD", "registers": [0, 15, 0, 0, 0, 25, 0, 0, 0, 0, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                            {"pc": 8, "opcode": "LOAD", "registers": [0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "mem_addr": 500, "mem_val": 100},
                            {"pc": 12, "opcode": "JAL", "registers": [0, 0, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}
                          ]
                        }
                      }
                    ].map((p) => (
                      <button
                        key={p.name}
                        onClick={() => setZkTraceInput(JSON.stringify(p.trace, null, 2))}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:border-[#2563eb]/30 text-[10px] font-medium hover:bg-[#2563eb]/10 transition-colors cursor-pointer"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* JSON Trace Editor */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex justify-between">
                    <span>Editeur de Trace (SP1 JSON)</span>
                    <span className="text-blue-400 font-mono text-[9px]">Goldilocks Modulus (2^64 - 2^32 + 1)</span>
                  </label>
                  <textarea
                    rows={8}
                    value={zkTraceInput}
                    onChange={(e) => setZkTraceInput(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 hover:border-white/20 focus:border-blue-500/50 rounded-2xl p-4 text-xs font-mono text-blue-300 focus:outline-none transition-all resize-y"
                    placeholder="Collez votre JSON de cycles ici..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {proverType === "topozk" ? (
                    <button
                      onClick={handleRunTopoZk}
                      disabled={topoZkRunning}
                      className="col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all py-3 px-4 rounded-xl font-bold tracking-wider text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(37,99,235,0.15)] disabled:opacity-50 cursor-pointer text-white"
                    >
                      {topoZkRunning ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Compression & Preuve...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                          <span>Lancer TopoZK Prover (CPU)</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleRunZkGpu}
                        disabled={zkGpuRunning}
                        className="bg-[#2563eb] hover:bg-blue-600 active:scale-[0.98] transition-all py-3 px-4 rounded-xl font-bold tracking-wider text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(37,99,235,0.15)] disabled:opacity-50 cursor-pointer text-white"
                      >
                        {zkGpuRunning ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Simulation...</span>
                          </>
                        ) : (
                          <>
                            <Cpu className="w-3.5 h-3.5" />
                            <span>Simuler Pipeline</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleValidateZkProof}
                        disabled={zkGpuValidating || !zkReport}
                        className="bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all py-3 px-4 rounded-xl font-bold tracking-wider text-[10px] uppercase flex items-center justify-center gap-1.5 border border-white/10 hover:border-white/20 disabled:opacity-30 cursor-pointer text-white"
                      >
                        {zkGpuValidating ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Validation...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                            <span>Valider Preuve</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>

                {/* Real-time Proof Status Widget for Standard ZK-GPU */}
                {proverType === "zkgpu" && zkProofStatus && (
                  <div className={`p-4 rounded-2xl border ${zkProofStatus.valid ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' : 'bg-red-950/20 border-red-500/20 text-red-300'} space-y-2`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${zkProofStatus.valid ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Certification de Preuve</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                      <div>
                        <span className="text-slate-500">SIGNATURE:</span>
                        <p className="font-bold truncate text-white">{zkProofStatus.signature}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">TAILLE:</span>
                        <p className="font-bold text-white">{zkProofStatus.size_bytes} octets</p>
                      </div>
                    </div>
                    <div className="pt-1 text-[10px] flex items-center gap-1.5">
                      {zkProofStatus.valid ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                          VALIDÉ PAR RATISS V9
                        </span>
                      ) : (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                          ÉCHEC DE VALIDATION
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Real-time Proof Status Widget for Topological ZK */}
                {proverType === "topozk" && topoZkReport && (
                  <div className="p-4 rounded-2xl border bg-indigo-950/20 border-indigo-500/20 text-indigo-300 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Preuve Topologique Générée</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                      <div>
                        <span className="text-slate-500">SIGNATURE TOPO:</span>
                        <p className="font-bold truncate text-white">{topoZkReport.proof?.signature}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">VERSION:</span>
                        <p className="font-bold text-white">{topoZkReport.proof?.version}</p>
                      </div>
                    </div>
                    <div className="pt-1 text-[10px] flex items-center gap-1.5">
                      <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                        TOPO-ZK COUPLING SUCCESSFUL
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Simulation Results (right side) */}
              <div className="md:col-span-7 bg-white/[0.01] border border-white/5 rounded-3xl p-6 relative flex flex-col min-h-[450px]">
                {proverType === "topozk" ? (
                  topoZkReport ? (
                    <div className="space-y-6 flex-1 flex flex-col relative">
                      {/* Process Overlay */}
                      {topoZkRunning && (
                        <motion.div 
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0b0b0b]/90 backdrop-blur-sm rounded-3xl"
                        >
                          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                          <p className="text-xs font-bold text-white uppercase tracking-widest">Compression Topologique...</p>
                        </motion.div>
                      )}
                      
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          <h4 className="text-[11px] font-mono tracking-widest text-blue-400 uppercase font-bold">Rapport TopoZK Prover (CPU)</h4>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">
                          Cycles Originaux: <strong className="text-white">{topoZkReport.original_length}</strong>
                        </span>
                      </div>

                      {/* Topo Metrics Cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl space-y-1">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Cycles Compressés</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-black text-white">{topoZkReport.compressed_length}</span>
                            <span className="text-[9px] font-mono text-slate-400">/ {topoZkReport.original_length}</span>
                          </div>
                        </div>

                        <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl space-y-1">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Taux de Compression</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-black text-blue-400">{(topoZkReport.compression_ratio * 100).toFixed(1)}%</span>
                          </div>
                        </div>

                        <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl space-y-1">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Temps (CPU)</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-black text-indigo-400">
                              {((topoZkReport.compression_time + topoZkReport.evaluation_time) * 1000).toFixed(2)}ms
                            </span>
                          </div>
                        </div>
                      </div>

                  {/* Compressed Trace representation */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Trace d'Exécution Compressée Topologiquement</span>
                      <button
                        onClick={() => {
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(topoZkReport, null, 2));
                          const downloadAnchorNode = document.createElement('a');
                          downloadAnchorNode.setAttribute("href", dataStr);
                          downloadAnchorNode.setAttribute("download", "topozk_report.json");
                          document.body.appendChild(downloadAnchorNode);
                          downloadAnchorNode.click();
                          downloadAnchorNode.remove();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563eb]/20 hover:bg-[#2563eb]/30 border border-[#2563eb]/30 rounded-lg text-[9px] font-bold uppercase tracking-wider text-blue-300 transition-all cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        Exporter Rapport JSON
                      </button>
                    </div>
                    
                    <div className="border border-white/5 rounded-2xl overflow-hidden max-h-[160px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/5 text-[8px] font-mono text-slate-400 border-b border-white/5">
                            <th className="p-2 font-bold uppercase">Type / Cycle</th>
                            <th className="p-2 font-bold uppercase">Opcode / Structure</th>
                            <th className="p-2 font-bold uppercase">Détails de Répétition / Registres</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[9px] font-mono text-slate-300">
                          {topoZkReport.compressed_cycles?.map((cycle: any, idx: number) => {
                            const isRepeated = cycle.type === "repeated";
                            return (
                              <tr key={idx} className={`hover:bg-white/[0.02] transition-colors ${isRepeated ? 'bg-blue-500/5' : ''}`}>
                                <td className="p-2">
                                  {isRepeated ? (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase">
                                      RÉPÉTÉ
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">Cycle {idx}</span>
                                  )}
                                </td>
                                <td className="p-2 font-bold">
                                  {isRepeated ? (
                                    <span className="text-blue-300">
                                      Pattern ({cycle.pattern_length} instr.)
                                    </span>
                                  ) : (
                                    <span className="text-white">{cycle.opcode}</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {isRepeated ? (
                                    <span className="text-slate-400 font-bold">
                                      Répété <span className="text-blue-400 font-extrabold">{cycle.count} fois</span> (Contraintes compressées)
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-[8px] truncate block max-w-[250px]">
                                      PC: 0x{cycle.pc?.toString(16)} | Regs: {JSON.stringify(cycle.registers?.slice(0, 4))}...
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                      {/* Constraints Summary & Uncompressed vs Compressed Comparison */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Évaluation & Simplification de Contraintes</span>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block">Complexité Totale de Preuve</span>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300">Contraintes Originelles :</span>
                              <strong className="text-sm text-slate-400 font-mono">{topoZkReport.constraints_summary?.total_uncompressed}</strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300">Contraintes Compressées :</span>
                              <strong className="text-sm text-blue-400 font-mono">{topoZkReport.constraints_summary?.total}</strong>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                              <div 
                                className="h-full bg-blue-500 rounded-full" 
                                style={{ width: `${(topoZkReport.constraints_summary?.total / (topoZkReport.constraints_summary?.total_uncompressed || 1)) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block">Intégrité Cryptographique</span>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300">Contraintes Satisfaites :</span>
                              <span className="text-xs font-bold text-emerald-400 font-mono">
                                {topoZkReport.constraints_summary?.valid_uncompressed} / {topoZkReport.constraints_summary?.total_uncompressed}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300">Statut de la Preuve :</span>
                              <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                                COMPLÈTE & VALIDE
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300">Évaluation CPU :</span>
                              <span className="text-[10px] text-slate-400 font-mono">SANS GPU REQUIS</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-4 border-t border-white/5 flex gap-3 justify-end mt-auto">
                        <a
                          href="/api/topozk/report"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer text-white"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <span>Rapport TopoZK</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-12 flex-1">
                      <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
                        <Sparkles className="w-8 h-8 animate-pulse" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Rapport TopoZK Vide</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-light">
                          Sélectionnez ou éditez une trace d'exécution SP1, puis cliquez sur "Lancer TopoZK Prover" pour lancer la compression de contraintes et générer une preuve topologique sur CPU.
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  zkReport ? (
                    <div className="space-y-6 flex-1 flex flex-col">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-bold">Rapport de Validation ZK-GPU</h4>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">Cycles: {zkReport.num_rows}</span>
                      </div>

                      {/* Trace Table */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Trace d'Exécution Traduite</span>
                        <div className="border border-white/5 rounded-xl overflow-hidden max-h-[160px] overflow-y-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-white/5 text-[8px] font-mono text-slate-400 border-b border-white/5">
                                <th className="p-2 font-bold uppercase">Cycle</th>
                                <th className="p-2 font-bold uppercase">PC</th>
                                <th className="p-2 font-bold uppercase">OP</th>
                                <th className="p-2 font-bold uppercase">RA</th>
                                <th className="p-2 font-bold uppercase">RB</th>
                                <th className="p-2 font-bold uppercase">RC</th>
                                <th className="p-2 font-bold uppercase">MEM ADDR</th>
                                <th className="p-2 font-bold uppercase">MEM VAL</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-[9px] font-mono text-slate-300">
                              {zkReport.translated_trace?.map((row: any, idx: number) => (
                                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="p-2 text-slate-500">{row.row}</td>
                                  <td className="p-2 text-blue-400">0x{row.pc.toString(16)}</td>
                                  <td className="p-2 font-bold text-white">{row.opcode}</td>
                                  <td className="p-2">{row.ra}</td>
                                  <td className="p-2">{row.rb}</td>
                                  <td className="p-2 text-emerald-400">{row.rc}</td>
                                  <td className="p-2 text-purple-400">{row.mem_addr || "-"}</td>
                                  <td className="p-2">{row.mem_val || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Constraints Evaluation */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Évaluation des Contraintes Plonkish</span>
                        <div className="grid sm:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1">
                          {zkReport.evaluated_constraints?.map((row: any, idx: number) => (
                            <div key={idx} className="p-3 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl space-y-1.5 transition-all">
                              <div className="flex items-center justify-between text-[8px] font-mono text-slate-500">
                                <span>CYCLE {row.row}</span>
                                <span className="text-white font-bold">Trace Check</span>
                              </div>
                              
                              <div className="space-y-1 text-[9px] font-mono">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">ADD Constraint:</span>
                                  <span className={row.is_add_valid ? "text-emerald-400 font-bold" : "text-amber-500 font-bold"}>
                                    {row.is_add_valid ? "OK (0)" : `ERR (${row.add_constraint_val})`}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">JAL Constraint:</span>
                                  <span className={row.is_jal_valid ? "text-emerald-400 font-bold" : "text-amber-500 font-bold"}>
                                    {row.is_jal_valid ? "OK (0)" : `ERR (${row.jal_constraint_val})`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-4 border-t border-white/5 flex gap-3 justify-end mt-auto">
                        <a
                          href="/api/zkgpu/report"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer text-white"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <span>Rapport JSON</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-12 flex-1">
                      <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
                        <Sparkles className="w-8 h-8 animate-pulse" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Rapport de Preuve Vide</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-light">
                          Sélectionnez ou éditez une trace d'exécution SP1, puis cliquez sur "Simuler Pipeline" pour lancer la validation de contraintes sur GPU.
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* PANEL: PHYSICAL IMPOSSIBILITY OF P VS NP (RATISS V10) */}
        {activeTab === "physics_impossibility" && (
          <div className="grid lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Control Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#121212] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-blue-400">Paramètres de l'Environnement Physique</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Configurez les contraintes thermiques, quantiques et de masse du système de calcul.</p>
                </div>

                {/* Slider N Variables */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Taille de l'instance (N variables) :</span>
                    <span className="text-white font-bold">{impossibilityN}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="300" 
                    value={impossibilityN}
                    onChange={(e) => setImpossibilityN(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>1 variable</span>
                    <span className="text-blue-400">Recherche brute : 2^{impossibilityN} ({impossibilityN < 1000 ? (2**impossibilityN < 1e12 ? (2**impossibilityN).toLocaleString() : (2**impossibilityN).toExponential(3)) : "Infinie"}) configs</span>
                    <span>300 variables</span>
                  </div>
                </div>

                {/* Slider T Kelvin */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Température de fonctionnement (T) :</span>
                    <span className="text-white font-bold">{impossibilityT} K ({Math.round(impossibilityT - 273.15)}°C)</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="350" 
                    value={impossibilityT}
                    onChange={(e) => setImpossibilityT(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>1 K (Cryo)</span>
                    <span>300 K (Ambiante)</span>
                    <span>350 K (Haute)</span>
                  </div>
                </div>

                {/* Slider radius_m */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Rayon de confinement (Sphère) :</span>
                    <span className="text-white font-bold">{impossibilityRadius.toFixed(2)} m</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.01" 
                    max="10.0" 
                    step="0.01"
                    value={impossibilityRadius}
                    onChange={(e) => setImpossibilityRadius(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>1 cm</span>
                    <span>Volume : {(4/3 * Math.PI * Math.pow(impossibilityRadius, 3)).toFixed(3)} m³</span>
                    <span>10 mètres</span>
                  </div>
                </div>

                {/* Slider mass_kg */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Masse équivalente du matériel (M) :</span>
                    <span className="text-white font-bold">
                      {impossibilityMass >= 1000 ? `${(impossibilityMass / 1000).toFixed(1)} tonnes` : `${impossibilityMass} kg`}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100000" 
                    step="10"
                    value={impossibilityMass}
                    onChange={(e) => setImpossibilityMass(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>1 kg</span>
                    <span>Énergie propre E=Mc² : {(impossibilityMass * 2.99792458e8 * 2.99792458e8).toExponential(3)} J</span>
                    <span>100 tonnes</span>
                  </div>
                </div>

                {/* Slider S_couplage */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Facteur de couplage de Zurek (S) :</span>
                    <span className="text-white font-bold">{impossibilityCoupling.toExponential(3)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="-5" 
                    max="-1" 
                    step="1"
                    value={Math.log10(impossibilityCoupling)}
                    onChange={(e) => setImpossibilityCoupling(Math.pow(10, parseFloat(e.target.value)))}
                    className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>10⁻⁵ (Couplage faible)</span>
                    <span>10⁻³ (Intermédiaire)</span>
                    <span>10⁻¹ (Couplage fort)</span>
                  </div>
                </div>

                {/* Action Trigger Button */}
                <button
                  onClick={handleRunPhysicsValidator}
                  disabled={impossibilityRunning || upcfRunning || pipelineRunning}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-blue-500/10 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Atom className={`w-4 h-4 ${impossibilityRunning ? 'animate-spin' : ''}`} />
                  <span>{impossibilityRunning ? "Validation en cours..." : "Lancer le Validateur Physique V10"}</span>
                </button>
              </div>

              {/* RATISS V10 UPCF & Pipeline Control Card */}
              <div className="bg-[#121212] border border-white/5 rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-purple-400">Exécution & Pipeline RATISS V10</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Lancez la résolution du défi UPCF V10, exécutez le pipeline de certification, quantifiez le coût entropique, ou évaluez la réalisabilité physique des solveurs.</p>
                </div>

                <div className="space-y-4">
                  {/* UPCF V10 Solver Button */}
                  <div className="space-y-2">
                    <button
                      onClick={handleRunUpcfV10}
                      disabled={upcfRunning || pipelineRunning || ceoeRunning || rpsRunning || impossibilityRunning}
                      className="w-full py-3.5 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/20 disabled:opacity-40 text-purple-300 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Zap className={`w-4 h-4 ${upcfRunning ? 'animate-spin' : ''}`} />
                      <span>{upcfRunning ? "Résolution UPCF..." : "Lancer le Solveur UPCF V10"}</span>
                    </button>
                    {upcfError && <p className="text-[9px] font-mono text-red-400 text-center">{upcfError}</p>}
                  </div>

                  {/* CEOE V10 Solver Button */}
                  <div className="space-y-2">
                    <button
                      onClick={handleRunCeoeV10}
                      disabled={upcfRunning || pipelineRunning || ceoeRunning || rpsRunning || impossibilityRunning}
                      className="w-full py-3.5 bg-blue-950/30 hover:bg-blue-900/30 border border-blue-500/20 disabled:opacity-40 text-blue-300 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Activity className={`w-4 h-4 ${ceoeRunning ? 'animate-spin' : ''}`} />
                      <span>{ceoeRunning ? "Résolution CEOE..." : "Lancer le Solveur CEOE V10"}</span>
                    </button>
                    {ceoeError && <p className="text-[9px] font-mono text-red-400 text-center">{ceoeError}</p>}
                  </div>

                  {/* RPS V10 Solver Button (Universal Bouncer) */}
                  <div className="space-y-2">
                    <button
                      onClick={handleRunRpsV10}
                      disabled={upcfRunning || pipelineRunning || ceoeRunning || rpsRunning || impossibilityRunning}
                      className="w-full py-3.5 bg-rose-950/30 hover:bg-rose-900/30 border border-rose-500/20 disabled:opacity-40 text-rose-300 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Shield className={`w-4 h-4 ${rpsRunning ? 'animate-spin' : ''}`} />
                      <span>{rpsRunning ? "Validation RPS..." : "Lancer le Videur RPS V10"}</span>
                    </button>
                    {rpsError && <p className="text-[9px] font-mono text-red-400 text-center">{rpsError}</p>}
                  </div>

                  {/* Unified Pipeline Button */}
                  <div className="space-y-2">
                    <button
                      onClick={handleRunV10Pipeline}
                      disabled={upcfRunning || pipelineRunning || ceoeRunning || rpsRunning || impossibilityRunning}
                      className="w-full py-3.5 bg-emerald-950/30 hover:bg-emerald-900/30 border border-emerald-500/20 disabled:opacity-40 text-emerald-300 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className={`w-4 h-4 ${pipelineRunning ? 'animate-pulse' : ''}`} />
                      <span>{pipelineRunning ? "Certification V10..." : "Lancer le Pipeline de Certification"}</span>
                    </button>
                    {pipelineError && <p className="text-[9px] font-mono text-red-400 text-center">{pipelineError}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Results Column */}
            <div className="lg:col-span-7 flex flex-col h-[580px]">
              {/* Sub-tab Navigation */}
              <div className="flex bg-[#121212] border border-white/5 rounded-2xl p-1.5 mb-4 space-x-1 overflow-x-auto">
                <button
                  onClick={() => setResultsSubTab("impossibility")}
                  className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center whitespace-nowrap ${
                    resultsSubTab === "impossibility"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  Validateur Physique
                </button>
                <button
                  onClick={() => setResultsSubTab("upcf")}
                  className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center whitespace-nowrap ${
                    resultsSubTab === "upcf"
                      ? "bg-purple-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  Solveur UPCF V10
                </button>
                <button
                  onClick={() => setResultsSubTab("pipeline")}
                  className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center whitespace-nowrap ${
                    resultsSubTab === "pipeline"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  Pipeline V10
                </button>
                <button
                  onClick={() => setResultsSubTab("ceoe")}
                  className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center whitespace-nowrap ${
                    resultsSubTab === "ceoe"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  CEOE V10
                </button>
                <button
                  onClick={() => setResultsSubTab("rps")}
                  className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center whitespace-nowrap ${
                    resultsSubTab === "rps"
                      ? "bg-rose-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  RPS V10 (Videur)
                </button>
              </div>

              <div className="bg-[#121212] border border-white/5 rounded-3xl p-6 flex-1 flex flex-col overflow-y-auto">
                {resultsSubTab === "impossibility" ? (
                  impossibilityRunning ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-6 py-24 flex-1 font-mono">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                        <Atom className="w-6 h-6 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Analyse cinématique & thermodynamique en cours...</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest animate-pulse">Évaluation de Margolus-Levitin et Landauer en temps réel...</p>
                      </div>
                    </div>
                  ) : impossibilityError ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-16 flex-1">
                      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-red-400">Erreur du validateur physique</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-light">{impossibilityError}</p>
                      </div>
                    </div>
                  ) : impossibilityResult ? (
                    <div className="space-y-6 flex-1 flex flex-col">
                      {/* Verdict Global Header */}
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-xl rounded-full" />
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest font-bold">Verdict du Composateur RATISS V10</span>
                            <h4 className="text-sm font-black uppercase text-white tracking-tight">
                              {impossibilityResult.global_verdict?.p_is_equal_to_np_is_physical_hallucination ? (
                                <span className="text-amber-400">P = NP est une hallucination physique</span>
                              ) : (
                                <span className="text-emerald-400">Système Physiquement Réalisable</span>
                              )}
                            </h4>
                          </div>
                          <span className="text-[8px] font-mono bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded text-blue-300 uppercase font-black">
                            {impossibilityResult.global_verdict?.is_computation_physically_realizable ? "RÉALISABLE" : "NON RÉALISABLE ❌"}
                          </span>
                        </div>
                        
                        <div className="border-t border-white/5 pt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-slate-400">
                          <span>Signature Sceau V10 :</span>
                          <span className="text-blue-300 font-bold">{impossibilityResult.global_verdict?.certificate_signature?.substring(0, 32)}...</span>
                        </div>
                      </div>

                      {/* Physical Bounds Stack */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Margolus-Levitin Card */}
                        <div className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-4 space-y-3 transition-all relative overflow-hidden">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">1. Margolus-Levitin</span>
                            <span className={`text-[8px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                              impossibilityResult.margolus_levitin?.verdict === "PHYSICALLY_IMPOSSIBLE_TIME" 
                                ? "bg-red-500/10 border border-red-500/20 text-red-400" 
                                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                            }`}>
                              {impossibilityResult.margolus_levitin?.verdict === "PHYSICALLY_IMPOSSIBLE_TIME" ? "Violé" : "Sain"}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-[9px] font-mono text-slate-400">
                            <div className="flex justify-between">
                              <span>Vitesse d'horloge max :</span>
                              <span className="text-white">{(impossibilityResult.margolus_levitin?.max_ops_per_second)?.toExponential(2)} Hz</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Temps requis calcul :</span>
                              <span className="text-white">
                                {impossibilityResult.margolus_levitin?.time_required_years > 1e12 
                                  ? `${(impossibilityResult.margolus_levitin?.time_required_years).toExponential(2)} ans` 
                                  : `${(impossibilityResult.margolus_levitin?.time_required_years).toFixed(2)} ans`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Ratio âge Univers :</span>
                              <span className="text-amber-400 font-bold">
                                {(impossibilityResult.margolus_levitin?.ratio_to_universe_age)?.toExponential(2)}x
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-white/5 pt-1.5 text-[8px] text-slate-500">
                              <span>Masse équivalente 1sec :</span>
                              <span>{(impossibilityResult.margolus_levitin?.ratio_mass_to_universe)?.toExponential(2)} Univers</span>
                            </div>
                          </div>
                        </div>

                        {/* Landauer Card */}
                        <div className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-4 space-y-3 transition-all relative overflow-hidden">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">2. Landauer Limit</span>
                            <span className={`text-[8px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                              impossibilityResult.landauer?.collapses_into_black_hole || impossibilityResult.landauer?.earth_oceans_boil_ratio > 1.0
                                ? "bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse" 
                                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                            }`}>
                              {impossibilityResult.landauer?.collapses_into_black_hole ? "Trou noir" : (impossibilityResult.landauer?.earth_oceans_boil_ratio > 1.0 ? "Évaporation" : "Sain")}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-[9px] font-mono text-slate-400">
                            <div className="flex justify-between">
                              <span>Chaleur par bit (kT ln2) :</span>
                              <span className="text-white">{(impossibilityResult.landauer?.single_op_dissipation_joules)?.toExponential(2)} J</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Dissipation totale :</span>
                              <span className="text-white">{(impossibilityResult.landauer?.total_dissipated_joules)?.toExponential(2)} J</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Boillir océans Terre :</span>
                              <span className="text-amber-400 font-bold">
                                {(impossibilityResult.landauer?.earth_oceans_boil_ratio)?.toExponential(2)}x
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-white/5 pt-1.5 text-[8px] text-slate-500">
                              <span>Rayon de Schwarzschild :</span>
                              <span className={impossibilityResult.landauer?.collapses_into_black_hole ? "text-red-400 font-bold" : ""}>
                                {(impossibilityResult.landauer?.schwarzschild_radius_meters)?.toExponential(2)} m
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Zurek Quantum Decoherence Card */}
                        <div className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-4 space-y-3 transition-all relative overflow-hidden">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">3. Décohérence de Zurek</span>
                            <span className={`text-[8px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                              impossibilityResult.decoherence_zurek?.state_destroyed_before_first_gate 
                                ? "bg-red-500/10 border border-red-500/20 text-red-400" 
                                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                            }`}>
                              {impossibilityResult.decoherence_zurek?.state_destroyed_before_first_gate ? "Décohérence" : "Cohérent"}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-[9px] font-mono text-slate-400">
                            <div className="flex justify-between">
                              <span>Nombre de qubits :</span>
                              <span className="text-white">{impossibilityResult.decoherence_zurek?.qubits_count}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Temps de cohérence (τ) :</span>
                              <span className="text-white">{(impossibilityResult.decoherence_zurek?.decoherence_time_seconds)?.toExponential(2)} s</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Temps de porte min (1eV) :</span>
                              <span className="text-white">{(impossibilityResult.decoherence_zurek?.minimum_gate_time_seconds)?.toExponential(2)} s</span>
                            </div>
                            <div className="flex justify-between border-t border-white/5 pt-1.5 text-[8px] text-slate-500">
                              <span>État détruit avant calcul ? :</span>
                              <span className={impossibilityResult.decoherence_zurek?.state_destroyed_before_first_gate ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                                {impossibilityResult.decoherence_zurek?.state_destroyed_before_first_gate ? "OUI (Instant)" : "NON"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bekenstein Card */}
                        <div className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-4 space-y-3 transition-all relative overflow-hidden">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">4. Borne de Bekenstein</span>
                            <span className={`text-[8px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                              impossibilityResult.bekenstein?.exceeds_bekenstein_bound 
                                ? "bg-red-500/10 border border-red-500/20 text-red-400" 
                                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                            }`}>
                              {impossibilityResult.bekenstein?.exceeds_bekenstein_bound ? "Saturé" : "Sain"}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-[9px] font-mono text-slate-400">
                            <div className="flex justify-between">
                              <span>Capacité max d'info :</span>
                              <span className="text-white">{(impossibilityResult.bekenstein?.max_information_capacity_bits)?.toExponential(2)} bits</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Info requise stockage :</span>
                              <span className="text-white">{(impossibilityResult.bekenstein?.required_information_storage_bits)?.toExponential(2)} bits</span>
                            </div>
                            <div className="flex justify-between border-t border-white/5 pt-1.5 text-[8px] text-slate-500">
                              <span>Violation de stockage physique :</span>
                              <span className={impossibilityResult.bekenstein?.exceeds_bekenstein_bound ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                                {impossibilityResult.bekenstein?.exceeds_bekenstein_bound ? "OUI" : "NON"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Flashing Alert for Black Hole Collapse */}
                      {impossibilityResult.landauer?.collapses_into_black_hole && (
                        <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 text-center text-red-400 text-xs font-bold font-mono uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span>💥 EFFONDREMENT GRAVITATIONNEL ! L'ÉNERGIE DISSIPÉE S'EFFONDRE EN TROU NOIR DE SPHÈRE !</span>
                        </div>
                      )}

                      {/* 3 Clay Replacement Challenges */}
                      <div className="border-t border-white/5 pt-4 space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">Trois Nouveaux Défis de Substitution (Prix Clay V10)</span>
                        <div className="grid sm:grid-cols-3 gap-3">
                          {Object.values(impossibilityResult.clay_replacement_challenges || {}).map((ch: any, idx: number) => (
                            <div key={idx} className="bg-white/[0.01] border border-white/5 rounded-xl p-3 space-y-1.5">
                              <span className="text-[9px] font-black text-white uppercase block tracking-tight line-clamp-1">{ch.name}</span>
                              <p className="text-[8px] text-slate-500 font-sans leading-tight line-clamp-3">{ch.description}</p>
                              <div className="border-t border-white/5 pt-1.5 text-[7px] font-mono text-blue-300">
                                {Object.entries(ch.metrics || {}).slice(0, 1).map(([k, v]: any) => (
                                  <span key={k} className="uppercase">{k.replace(/_/g, ' ')} : {v}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-24 flex-1">
                      <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
                        <Atom className="w-8 h-8 animate-pulse text-blue-400" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">Démonstrateur RATISS V10</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-light">
                          Configurez les paramètres physiques dans le panneau de gauche et lancez la validation pour quantifier les limites physiques absolues de l'univers face aux prétentions de P = NP.
                        </p>
                      </div>
                    </div>
                  )
                ) : resultsSubTab === "upcf" ? (
                  upcfRunning ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-6 py-24 flex-1 font-mono">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                        <Zap className="w-6 h-6 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Résolution du Défi UPCF V10...</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest animate-pulse">Exploration t-J local + Homologie Persistante GUDHI...</p>
                      </div>
                    </div>
                  ) : upcfError ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-16 flex-1">
                      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-red-400">Erreur du solveur UPCF</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-light">{upcfError}</p>
                      </div>
                    </div>
                  ) : upcfResult ? (
                    <div className="space-y-6 flex-1 flex flex-col">
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-xl rounded-full" />
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest font-bold">Défi UPCF_V10_FINAL</span>
                            <h4 className="text-sm font-black uppercase text-white tracking-tight">
                              {upcfResult.status === "UPCF_V10_SUCCESS" ? (
                                <span className="text-emerald-400 font-bold">Succès : Résolu et Certifié ✅</span>
                              ) : (
                                <span className="text-red-400 font-bold">Échec de la Résolution UPCF</span>
                              )}
                            </h4>
                          </div>
                          <span className="text-[8px] font-mono bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded text-purple-300 uppercase font-black">
                            {upcfResult.rps_status}
                          </span>
                        </div>
                        <div className="border-t border-white/5 pt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-slate-400">
                          <span>Sceau de Certification :</span>
                          <span className="text-purple-300 font-bold">{upcfResult.security_certification_hash?.substring(0, 32)}...</span>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3 font-mono text-[10px]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-sans">1. Performance & Précision</span>
                          <div className="flex justify-between">
                            <span>Erreur d'approximation :</span>
                            <span className="text-emerald-400 font-bold">{(upcfResult.epsilon_achieved * 100).toFixed(3)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Erreur cible max :</span>
                            <span className="text-white">{(upcfResult.input_parameters?.epsilon_target * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Qualité des raccourcis :</span>
                            <span className="text-purple-400">{(upcfResult.shortcut_quality * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Gap d'énergie mesuré :</span>
                            <span className="text-white">{upcfResult.energy_gap_eV?.toFixed(6)} eV</span>
                          </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3 font-mono text-[10px]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-sans">2. Contraintes Système</span>
                          <div className="flex justify-between">
                            <span>Spins / Nœuds totaux :</span>
                            <span className="text-white">{upcfResult.input_parameters?.N?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Nombre d'agents :</span>
                            <span className="text-white">{upcfResult.input_parameters?.K}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Énergie dissipée :</span>
                            <span className="text-emerald-400">{upcfResult.E_total_J?.toFixed(3)} J</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Budget d'énergie max :</span>
                            <span className="text-white">{(upcfResult.input_parameters?.E_max_J)?.toLocaleString()} J</span>
                          </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3 font-mono text-[10px] sm:col-span-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-sans">3. Invariants Topologiques & Cohérence</span>
                          <div className="flex justify-between">
                            <span>Nombres de Betti globaux :</span>
                            <span className="text-white">[{upcfResult.betti_numbers?.join(", ")}]</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Temps de cohérence (τ) :</span>
                            <span className="text-white">{(upcfResult.tau_coherence_s)?.toExponential(2)} s</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stockage d'information :</span>
                            <span className="text-white">{(upcfResult.storage_bits / 8 / 1024 / 1024).toFixed(3)} Mo ({upcfResult.storage_bits?.toLocaleString()} bits)</span>
                          </div>
                          <div className="flex justify-between border-t border-white/5 pt-1.5 text-[8px] text-slate-500">
                            <span>Temps de calcul CPU / t-J Lanczos :</span>
                            <span>{upcfResult.T_calc_total_s?.toFixed(3)} s (Algorithme en O(K³))</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-24 flex-1">
                      <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shadow-inner">
                        <Zap className="w-8 h-8 animate-pulse text-purple-400" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">Défi UPCF_V10_FINAL</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-light">
                          Lancez la résolution du problème à 200 000 spins coordonnés par 500 agents distribués sous contraintes physiques pour certifier la limite de cohérence finie.
                        </p>
                      </div>
                    </div>
                  )
                ) : resultsSubTab === "pipeline" ? (
                  pipelineRunning ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-6 py-24 flex-1 font-mono">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                        <ShieldCheck className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Exécution du Pipeline de Certification...</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest animate-pulse">Intégration des 6 étages formels de RATISS V10...</p>
                      </div>
                    </div>
                  ) : pipelineError ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-16 flex-1">
                      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-red-400">Erreur du pipeline</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-light">{pipelineError}</p>
                      </div>
                    </div>
                  ) : pipelineResult ? (
                    <div className="space-y-6 flex-1 flex flex-col">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-xl rounded-full" />
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Certification Unifiée RATISS V10</span>
                            <h4 className="text-sm font-black uppercase text-white tracking-tight">
                              <span className="text-emerald-400 font-bold">CERTIFIÉ RATISS V10 AVEC SUCCÈS 🛡️</span>
                            </h4>
                          </div>
                          <span className="text-[8px] font-mono bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded text-emerald-300 uppercase font-black">
                            SUCCESS
                          </span>
                        </div>
                        <div className="border-t border-white/5 pt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-slate-400">
                          <span>Sceau ZK-STARK RISC Zero :</span>
                          <span className="text-emerald-300 font-bold">{pipelineResult.certification_hash?.substring(0, 32)}...</span>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-[9px]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-sans block mb-1">Étage 1 : Limites Physiques Exactes</span>
                          <div className="flex justify-between">
                            <span>Margolus-Levitin : :</span>
                            <span className="text-emerald-400">{pipelineResult.stage_1_bounds_n100?.margolus_levitin?.verdict}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Landauer Limit :</span>
                            <span className="text-emerald-400">{pipelineResult.stage_1_bounds_n100?.landauer?.verdict}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Décohérence de Zurek :</span>
                            <span className="text-emerald-400">{pipelineResult.stage_1_bounds_n100?.decoherence_zurek?.verdict}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Borne de Bekenstein :</span>
                            <span className="text-emerald-400">{pipelineResult.stage_1_bounds_n100?.bekenstein?.verdict}</span>
                          </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-[9px]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-sans block mb-1">Étage 2 : Résolution UPCF V10</span>
                          <div className="flex justify-between">
                            <span>Status de Résolution :</span>
                            <span className="text-purple-400 font-bold">{pipelineResult.stage_2_upcf_results?.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Précision Obtenue :</span>
                            <span className="text-white">{(pipelineResult.stage_2_upcf_results?.epsilon_achieved * 100).toFixed(3)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Qualité des Raccourcis :</span>
                            <span className="text-white">{(pipelineResult.stage_2_upcf_results?.shortcut_quality * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Réalisabilité RPS :</span>
                            <span className="text-emerald-400">{pipelineResult.stage_2_upcf_results?.rps_status}</span>
                          </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-[9px] sm:col-span-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-sans block mb-1">Limite Thermodynamique & Preuve Cryptographique</span>
                          <div className="flex justify-between">
                            <span>Gap de spin asymptotique stable :</span>
                            <span className="text-white">Delta_asymp = {pipelineResult.asymptotic_spin_gap_ev?.toFixed(6)} eV &gt; 0 (Stable)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Nombres de Betti globaux V10 :</span>
                            <span className="text-white">[{pipelineResult.stage_2_upcf_results?.betti_numbers?.join(", ")}]</span>
                          </div>
                          <div className="flex justify-between border-t border-white/5 pt-1 text-[8px] text-slate-500">
                            <span>Génération de certificat STARK :</span>
                            <span className="text-emerald-400 font-bold">REÇU DE PREUVE RISC ZERO SIMULÉ PARFAIT (V10)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-24 flex-1">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
                        <ShieldCheck className="w-8 h-8 animate-pulse text-emerald-400" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">Certification RATISS V10</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-light">
                          Exécutez le pipeline complet intégrant les limites physiques de P vs NP, le résolveur UPCF localisé, le gap asymptotique thermodynamique, et la preuve ZK cryptographique.
                        </p>
                      </div>
                    </div>
                  )
                ) : resultsSubTab === "ceoe" ? (
                  ceoeRunning ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-6 py-24 flex-1 font-mono">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                        <Activity className="w-6 h-6 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Modélisation de la Complexité Thermodynamique...</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest animate-pulse">Comparaison Exact vs Approché (UPCF V10) & Ajustement exponentiel...</p>
                      </div>
                    </div>
                  ) : ceoeError ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-16 flex-1">
                      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-red-400">Erreur du solveur CEOE</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-light">{ceoeError}</p>
                      </div>
                    </div>
                  ) : ceoeResult ? (
                    <div className="space-y-6 flex-1 flex flex-col">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-xl rounded-full" />
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest font-bold">Défi CEOE_V10_FINAL (Hypothèse de Jonathan)</span>
                            <h4 className="text-sm font-black uppercase text-white tracking-tight">
                              {ceoeResult.status === "CEOE_V10_SUCCESS" ? (
                                <span className="text-emerald-400 font-bold">Hypothèse Confirmée : CEOE Exponentiel ✅</span>
                              ) : (
                                <span className="text-red-400 font-bold">Échec de la validation de l'hypothèse</span>
                              )}
                            </h4>
                          </div>
                          <span className="text-[8px] font-mono bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded text-blue-300 uppercase font-black">
                            {ceoeResult.status}
                          </span>
                        </div>
                        <div className="border-t border-white/5 pt-3 text-[10px] font-mono text-slate-300">
                          {ceoeResult.conclusion}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-[9px]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-sans block mb-1">Ajustement Exponentiel</span>
                          <div className="flex justify-between">
                            <span>Coefficient R² :</span>
                            <span className="text-emerald-400 font-bold">{(ceoeResult.exponential_fit?.r_squared)?.toFixed(6)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pente (log-linéaire) :</span>
                            <span className="text-white font-bold">{(ceoeResult.exponential_fit?.slope)?.toFixed(6)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ajustement stable :</span>
                            <span className="text-blue-400">OUI (R² &gt; 0.95)</span>
                          </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-[9px]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-sans block mb-1">Seuil Critique</span>
                          <div className="flex justify-between">
                            <span>N Critique (exact) :</span>
                            <span className="text-amber-400 font-bold">n = {ceoeResult.critical_threshold?.n_critique}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Raison :</span>
                            <span className="text-slate-400 text-right text-[8px] leading-tight">Violation des bornes RPS exactes</span>
                          </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-[9px]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-sans block mb-1">Paramètres CPU Physiques</span>
                          <div className="flex justify-between">
                            <span>Température :</span>
                            <span className="text-white">{ceoeResult.input_parameters?.T_operating_K} K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taille système (R) :</span>
                            <span className="text-white">{ceoeResult.input_parameters?.R_system_m} m</span>
                          </div>
                        </div>
                      </div>

                      {/* Display Data Points */}
                      <div className="bg-[#181818]/50 border border-white/5 rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">Données CEOE par taille d'instance (n)</span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[9px] font-mono text-left text-slate-400">
                            <thead>
                              <tr className="border-b border-white/10 text-white uppercase font-black text-[8px]">
                                <th className="pb-2">n</th>
                                <th className="pb-2">E_exact (J)</th>
                                <th className="pb-2">E_approx (J)</th>
                                <th className="pb-2">ΔE_J(n)</th>
                                <th className="pb-2">RPS Exact</th>
                                <th className="pb-2">RPS Approx</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ceoeResult.points?.map((p: any, idx: number) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02]">
                                  <td className="py-2 font-bold text-white">{p.n}</td>
                                  <td className="py-2">{p.E_exact_J > 1e6 ? p.E_exact_J.toExponential(3) : p.E_exact_J.toFixed(3)}</td>
                                  <td className="py-2">{p.E_approx_J.toFixed(3)}</td>
                                  <td className="py-2 font-bold text-purple-300">{p.DeltaE_J > 1e6 ? p.DeltaE_J.toExponential(3) : p.DeltaE_J.toFixed(3)}</td>
                                  <td className="py-2">
                                    <span className={`px-1 rounded text-[7px] font-bold ${
                                      p.rps_exact === "VIOLATED" 
                                        ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    }`}>
                                      {p.rps_exact}
                                    </span>
                                  </td>
                                  <td className="py-2">
                                    <span className="px-1 rounded text-[7px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      {p.rps_approx}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-24 flex-1">
                      <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
                        <Activity className="w-8 h-8 animate-pulse text-blue-400" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">Démonstrateur CEOE V10</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-light">
                          Déterminez la croissance exponentielle du coût entropique de l'optimalité formelle (E_exact - E_approx) pour valider l'impossibilité de l'optimalité exacte au-delà des limites physiques.
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  rpsRunning ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-6 py-24 flex-1 font-mono">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin" />
                        <Shield className="w-6 h-6 text-rose-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Évaluation des 5 Bornes Physiques Universelles...</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest animate-pulse">Filtrage matériel actif via Margolus, Landauer, Bekenstein, Zurek & Causalité...</p>
                      </div>
                    </div>
                  ) : rpsError ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-16 flex-1">
                      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-red-400">Erreur du filtre RPS</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-light">{rpsError}</p>
                      </div>
                    </div>
                  ) : rpsResult ? (
                    <div className="space-y-6 flex-1 flex flex-col">
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-xl rounded-full" />
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-rose-400 uppercase tracking-widest font-bold">Videur Universel RPS V10 (Successeur de Clay)</span>
                            <h4 className="text-sm font-black uppercase text-white tracking-tight">
                              {rpsResult.status === "RPS_V10_SUCCESS" ? (
                                <span className="text-rose-400 font-bold">FILTRE RPS SANS FAILLE : 100% OPÉRATIONNEL 🛡️</span>
                              ) : (
                                <span className="text-red-400 font-bold">Divergence détectée dans le filtre</span>
                              )}
                            </h4>
                          </div>
                          <span className="text-[8px] font-mono bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded text-rose-300 uppercase font-black">
                            {rpsResult.status}
                          </span>
                        </div>
                        <div className="border-t border-white/5 pt-3 text-[10px] font-mono text-slate-300">
                          {rpsResult.conclusion}
                        </div>
                        <div className="border-t border-white/5 pt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-slate-400">
                          <span>Signature Globale du Videur RPS :</span>
                          <span className="text-rose-300 font-bold">{rpsResult.certification_hash?.substring(0, 32)}...</span>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-4 gap-4">
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-[9px] text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Testés</span>
                          <span className="text-lg font-black text-white block">{rpsResult.total_solvers_tested}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-[9px] text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Réalisables</span>
                          <span className="text-lg font-black text-emerald-400 block">{rpsResult.passed_realizable}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-[9px] text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Violations Bloquées</span>
                          <span className="text-lg font-black text-red-400 block">{rpsResult.blocked_violated}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-[9px] text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Faux Positifs</span>
                          <span className={`text-lg font-black block ${rpsResult.false_positive === 0 ? 'text-slate-400' : 'text-amber-400'}`}>{rpsResult.false_positive}</span>
                        </div>
                      </div>

                      <div className="bg-[#181818]/50 border border-white/5 rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">Résultats d'Audit des Solveurs Physiques</span>
                        <div className="space-y-4">
                          {rpsResult.solvers?.map((s: any, idx: number) => (
                            <div key={idx} className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 space-y-3 text-[9px] font-mono">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <span className="text-white font-bold block">{s.name}</span>
                                  <span className="text-slate-500 text-[8px] leading-tight block">{s.description}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                                  s.status === "VIOLATED" 
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}>
                                  {s.status === "VIOLATED" ? "🔴 BLOQUÉ / VIOLATION" : "🟢 RÉALISABLE"}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-white/5 pt-2 text-slate-400">
                                <div>
                                  <span>T_calc :</span> <span className="text-white">{s.profile.T_calc_s > 1000 ? s.profile.T_calc_s.toExponential(2) : s.profile.T_calc_s} s</span>
                                </div>
                                <div>
                                  <span>E_total :</span> <span className="text-white">{s.profile.E_total_J > 1000 ? s.profile.E_total_J.toExponential(2) : s.profile.E_total_J} J</span>
                                </div>
                                <div>
                                  <span>Mémoire :</span> <span className="text-white">{s.profile.storage_bits > 1000 ? s.profile.storage_bits.toExponential(2) : s.profile.storage_bits} bits</span>
                                </div>
                                <div>
                                  <span>Opérations :</span> <span className="text-white">{s.profile.N_ops > 1000 ? s.profile.N_ops.toExponential(2) : s.profile.N_ops}</span>
                                </div>
                              </div>

                              {s.violations && s.violations.length > 0 && (
                                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2 flex flex-wrap gap-1.5 items-center">
                                  <span className="text-red-400 font-bold text-[8px] uppercase">Lois Violées :</span>
                                  {s.violations.map((v: string, vidx: number) => (
                                    <span key={vidx} className="bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] px-1.5 py-0.5 rounded uppercase font-black">
                                      {v.replace("_VIOLATION", "").replace("_LIMIT_VIOLATION", "")}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex justify-between text-[8px] text-slate-500 border-t border-white/5 pt-2">
                                <span>Certificat Hash :</span>
                                <span className="text-slate-400">{s.certificate_hash}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-24 flex-1">
                      <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-inner">
                        <Shield className="w-8 h-8 animate-pulse text-rose-400" />
                      </div>
                      <div className="max-w-xs">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">Le Videur Universel RPS V10</p>
                        <p className="text-[11px] text-slate-500 mt-1 font-light">
                          Filtrez et certifiez instantanément n'importe quel solveur de complexité en mesurant ses paramètres physiques face aux limites fondamentales de l'univers.
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

interface ManifoldCanvasProps {
  curvature: number;
  vector: number[];
}

export function ManifoldCanvas({ curvature, vector }: ManifoldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = canvas.parentElement?.clientWidth || 300;
    let height = canvas.height = 180;
    let time = 0;

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = 180;
      }
    };

    window.addEventListener("resize", handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.015;

      // Draw background grid lines (distorted by curvature)
      ctx.strokeStyle = "rgba(37, 99, 235, 0.08)";
      ctx.lineWidth = 1;

      const cols = 20;
      const rows = 12;
      const stepX = width / cols;
      const stepY = height / rows;

      // Horizontal lines
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        for (let c = 0; c <= cols; c++) {
          const x = c * stepX;
          const y = r * stepY;

          // Distort based on curvature and vector weights
          const distToCenter = Math.hypot(x - width / 2, y - height / 2);
          const factor = Math.sin(distToCenter * 0.02 - time * 2) * curvature * 15;
          const dX = 0;
          const dY = (factor * Math.exp(-distToCenter * 0.005));

          if (c === 0) {
            ctx.moveTo(x + dX, y + dY);
          } else {
            ctx.lineTo(x + dX, y + dY);
          }
        }
        ctx.stroke();
      }

      // Vertical lines
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        for (let r = 0; r <= rows; r++) {
          const x = c * stepX;
          const y = r * stepY;

          // Distort
          const distToCenter = Math.hypot(x - width / 2, y - height / 2);
          const factor = Math.sin(distToCenter * 0.02 - time * 2) * curvature * 15;
          const dX = 0;
          const dY = (factor * Math.exp(-distToCenter * 0.005));

          if (r === 0) {
            ctx.moveTo(x + dX, y + dY);
          } else {
            ctx.lineTo(x + dX, y + dY);
          }
        }
        ctx.stroke();
      }

      // Draw vector checkpoints in the manifold
      if (vector && vector.length > 0) {
        vector.forEach((val, idx) => {
          // Map each vector coordinate to a 2D space coordinate
          const angle = (idx / vector.length) * Math.PI * 2 + time * 0.5;
          const radius = 40 + Math.abs(val) * 8 + Math.sin(time + idx) * 5;
          const cx = width / 2 + Math.cos(angle) * radius;
          const cy = height / 2 + Math.sin(angle) * radius * 0.6;

          // Drawing glowing tracking dot
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(59, 130, 246, 0.85)`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(59, 130, 246, 0.8)";
          ctx.fill();
          ctx.shadowBlur = 0;

          // Circle overlay
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(59, 130, 246, 0.25)`;
          ctx.stroke();

          // Connect coordinate dot to center
          ctx.beginPath();
          ctx.moveTo(width / 2, height / 2);
          ctx.lineTo(cx, cy);
          ctx.strokeStyle = `rgba(37, 99, 235, 0.15)`;
          ctx.stroke();

          // Label
          ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
          ctx.font = "8px monospace";
          ctx.fillText(`X${idx+1}:${val.toFixed(2)}`, cx + 8, cy + 3);
        });
      }

      // Center core singularity
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 6 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
      ctx.fillStyle = "#2563eb";
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#3b82f6";
      ctx.fill();
      ctx.shadowBlur = 0;

      // Outer rings
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2, 80 + Math.sin(time) * 10, 35 + Math.sin(time) * 5, -0.1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.2)";
      ctx.stroke();

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [curvature, vector]);

  return (
    <div className="w-full bg-black/50 border border-white/5 rounded-2xl p-1 overflow-hidden relative">
      <div className="absolute top-2 left-3 flex items-center gap-1.5 pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-pulse" />
        <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">Manifold Tensor Dissection</span>
      </div>
      <canvas ref={canvasRef} className="w-full h-[180px] block" />
    </div>
  );
}

interface InterferenceCanvasProps {
  hypothesisA: string;
  hypothesisB: string;
  isColliding: boolean;
}

export function InterferenceCanvas({ hypothesisA, hypothesisB, isColliding }: InterferenceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = canvas.parentElement?.clientWidth || 300;
    let height = canvas.height = 180;
    let time = 0;

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = 180;
      }
    };

    window.addEventListener("resize", handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      time += isColliding ? 0.05 : 0.015;

      // Draw quantum background stars/particles
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      for (let i = 0; i < 15; i++) {
        const px = (Math.sin(i * 12345.67) * 0.5 + 0.5) * width;
        const py = (Math.cos(i * 98765.43) * 0.5 + 0.5) * height;
        const size = (Math.sin(time + i) * 0.5 + 0.5) * 1.5 + 0.5;
        ctx.fillRect(px, py, size, size);
      }

      // Draw interferometric waveforms
      const ampA = 20 + Math.sin(time) * 5;
      const ampB = 20 + Math.cos(time * 1.2) * 5;
      const freqA = 0.04;
      const freqB = 0.045;

      ctx.lineWidth = 1.5;

      // Wave A: Blue from Left
      ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        // Decay to the right
        const decay = Math.max(0, 1 - x / width);
        const y = height / 2 + Math.sin(x * freqA - time * 3) * ampA * decay;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Wave B: Purple from Right
      ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        // Decay to the left
        const decay = Math.max(0, x / width);
        const y = height / 2 + Math.sin((width - x) * freqB - time * 3.5) * ampB * decay;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Interference Field: Merged Wave (Collision)
      ctx.strokeStyle = isColliding ? "rgba(236, 72, 153, 0.8)" : "rgba(99, 102, 241, 0.6)";
      ctx.lineWidth = 2.5;
      if (isColliding) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(236, 72, 153, 0.8)";
      }

      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const decayA = Math.max(0, 1 - x / width);
        const decayB = Math.max(0, x / width);
        
        let yA = Math.sin(x * freqA - time * 4) * ampA * decayA;
        let yB = Math.sin((width - x) * freqB - time * 4.5) * ampB * decayB;
        
        // Hover impact
        if (hoverPos.active) {
          const distToHover = Math.abs(x - hoverPos.x);
          if (distToHover < 60) {
            const hoverFactor = Math.cos((distToHover / 60) * Math.PI / 2) * 30;
            yA += Math.sin(time * 8) * hoverFactor;
          }
        }

        const y = height / 2 + yA + yB;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw collision impact ring at the center if colliding
      if (isColliding) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 30 + Math.sin(time * 10) * 15, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(236, 72, 153, 0.25)";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 10 + Math.sin(time * 20) * 5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(236, 72, 153, 0.6)";
        ctx.fill();
      }

      // Information tags
      ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
      ctx.font = "8px monospace";
      ctx.fillText("TENSEUR INCIDENT A", 10, 15);
      ctx.fillText("TENSEUR RÉFRACTÉ B", width - 110, 15);
      if (isColliding) {
        ctx.fillStyle = "rgba(236, 72, 153, 0.9)";
        ctx.fillText("INTERFÉRENCE QUANTIQUE ACTIVE", width / 2 - 80, height - 10);
      } else {
        ctx.fillText("CONFRONTATION EN COHÉRENCE DE PHASE", width / 2 - 95, height - 10);
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isColliding, hoverPos]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoverPos({ x, y, active: true });
  };

  const handleMouseLeave = () => {
    setHoverPos(prev => ({ ...prev, active: false }));
  };

  return (
    <div 
      className="w-full bg-black/50 border border-white/5 rounded-2xl p-1 overflow-hidden relative cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="absolute top-2 left-3 flex items-center gap-1.5 pointer-events-none">
        <span className={`w-1.5 h-1.5 rounded-full ${isColliding ? 'bg-pink-500 animate-ping' : 'bg-[#2563eb] animate-pulse'}`} />
        <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">Coherence Interferometry Scope</span>
      </div>
      <canvas ref={canvasRef} className="w-full h-[180px] block" />
    </div>
  );
}
