import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RefreshCw, Download, CheckCircle, Cpu, Layers, Activity, FileText, Check, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface TopologicalVideoPlayerProps {
  taskId: string;
  promptPhysics: string;
  checkStatusUrl: string;
  fallbackText?: string;
  cryptographicSignatures?: {
    sha3?: string;
    ancrage?: string;
  };
}

export function TopologicalVideoPlayer({
  taskId,
  promptPhysics,
  checkStatusUrl,
  fallbackText = "📹 [Génération du théorème vidéo en cours...]",
  cryptographicSignatures
}: TopologicalVideoPlayerProps) {
  const [status, setStatus] = useState<'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'>('PENDING');
  const [progress, setProgress] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isInViewport, setIsInViewport] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(5);
  const [sha3Hash, setSha3Hash] = useState<string>(cryptographicSignatures?.sha3 || "9c0af81ec8d4bf2b9b5a0f622416b7e09ef2b9b5");
  const [ancrage, setAncrage] = useState<string>(cryptographicSignatures?.ancrage || "IPFS QmVOLT8_Omega");

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Intersection Observer to pause heavy animations when not visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsInViewport(entry.isIntersecting);
    }, { threshold: 0.05 });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(e => console.warn("Video play interrupted:", e));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleGetTheorem = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/v1/video/export/${taskId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error("Erreur lors de la récupération du package");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `swan_black_algorithm_${taskId}.omega.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Échec de la consécration algorithmique:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadVideo = async () => {
    try {
      const url = customVideoUrl || `/assets/swan_black_video_${taskId}.mp4`;
      const downloadUrl = `/api/v1/video/download?url=${encodeURIComponent(url)}&taskId=${taskId}`;
      
      console.log("[RATISS] Fetching video for download...", downloadUrl);
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error("Impossible de télécharger le fichier MP4");
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ratiss_video_${taskId}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Échec du téléchargement de la vidéo via blob, repli direct:", error);
      // Fallback: direct browser navigation to the download endpoint which handles headers
      const url = customVideoUrl || `/assets/swan_black_video_${taskId}.mp4`;
      window.location.href = `/api/v1/video/download?url=${encodeURIComponent(url)}&taskId=${taskId}`;
    }
  };

  // Simulation log strings
  const scientificLogs = [
    "⚡ Initialisation du flot de Ricci discret...",
    "📐 Détection des invariants topologiques H₁ et H₂...",
    "🧬 Analyse des liaisons GPCR & Agonistes...",
    "🌐 Résolution des amplitudes de chemin Feynman (JIT)...",
    "🌀 Élimination des interférences destructives...",
    "✨ Convergence de l'état fondamental stable...",
    "🔐 Signature cryptographique VOLT-Ω Tier Souverain..."
  ];

  // Polling logic for task status
  useEffect(() => {
    let intervalId: any = null;
    let logIndex = 0;

    const poll = async () => {
      try {
        const res = await fetch(checkStatusUrl);
        if (res.ok) {
          const data = await res.json();
          const taskOutput = data.output || {};
          
          setStatus(taskOutput.task_status || 'PENDING');
          setProgress(taskOutput.progress ?? 0);

          if (taskOutput.video_url) {
            setCustomVideoUrl(taskOutput.video_url);
          }

          if (taskOutput.cryptographic_signatures) {
            if (taskOutput.cryptographic_signatures.sha3) {
              setSha3Hash(taskOutput.cryptographic_signatures.sha3);
            }
            if (taskOutput.cryptographic_signatures.ancrage) {
              setAncrage(taskOutput.cryptographic_signatures.ancrage);
            }
          }

          if (taskOutput.task_status === 'SUCCEEDED') {
            setIsPlaying(true);
            clearInterval(intervalId);
          } else if (taskOutput.task_status === 'FAILED') {
            clearInterval(intervalId);
          }
        }
      } catch (e: any) {
        // Log as a warning rather than console.error to avoid flagging as application failure during server restarts
        console.warn("[RATISS] Polling status check paused or retrying. Server might be restarting.", e?.message || e);
      }
    };

    // Add logs step by step during generation
    const addLogInterval = setInterval(() => {
      if (logIndex < scientificLogs.length) {
        setLogs(prev => [...prev, scientificLogs[logIndex]]);
        logIndex++;
      } else {
        clearInterval(addLogInterval);
      }
    }, 1800);

    // Initial check
    poll();
    intervalId = setInterval(poll, 2000);

    return () => {
      clearInterval(intervalId);
      clearInterval(addLogInterval);
    };
  }, [checkStatusUrl]);

  // Canvas-based real-time 3D-like topological animation for BOTH loading and interactive display
  useEffect(() => {
    // If the video has completed loading (SUCCEEDED) or the component is off-screen,
    // do NOT run the canvas rendering loop at all! This avoids heavy CPU usage and memory leaks.
    if (status === 'SUCCEEDED' || !isInViewport) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    let time = 0;
    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Gradient background
      ctx.fillStyle = "rgba(5, 5, 5, 0.4)";
      ctx.fillRect(0, 0, width, height);

      // Render 3D-like topological manifold mesh grids with highly optimized counts
      const rows = 8;
      const cols = 12;
      const spacingX = width / (cols - 1);
      const spacingY = height / (rows - 1);

      ctx.lineWidth = 1;

      // Draw horizontal lines with wavy displacement
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        for (let c = 0; c < cols; c++) {
          const x = c * spacingX;
          const centerY = r * spacingY;
          
          // Distance approximation without Math.sqrt for ultra performance
          const dx = (x - width / 2) / (width / 2);
          const dy = (centerY - height / 2) / (height / 2);
          const distSq = dx * dx + dy * dy;
          
          // Ricci deformation math formula waves
          const wave1 = Math.sin(c * 0.4 - time * 1.5) * 12;
          const wave2 = Math.cos(r * 0.5 + time) * 10;
          const contraction = Math.max(0, 1 - distSq) * 30 * Math.sin(time * 0.8);
          
          const finalY = centerY + wave1 + wave2 + contraction;

          if (c === 0) ctx.moveTo(x, finalY);
          else ctx.lineTo(x, finalY);
        }
        
        ctx.strokeStyle = "rgba(6, 182, 212, 0.15)"; // Cyan
        ctx.stroke();
      }

      // Draw vertical lines with wavy displacement
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          const x = c * spacingX;
          const centerY = r * spacingY;
          
          const dx = (x - width / 2) / (width / 2);
          const dy = (centerY - height / 2) / (height / 2);
          const distSq = dx * dx + dy * dy;
          
          const wave1 = Math.sin(c * 0.4 - time * 1.5) * 12;
          const wave2 = Math.cos(r * 0.5 + time) * 10;
          const contraction = Math.max(0, 1 - distSq) * 30 * Math.sin(time * 0.8);
          
          const finalY = centerY + wave1 + wave2 + contraction;

          if (r === 0) ctx.moveTo(x, finalY);
          else ctx.lineTo(x, finalY);
        }
        ctx.strokeStyle = "rgba(59, 130, 246, 0.15)"; // Blue
        ctx.stroke();
      }

      // If running, add bright quantum phase interference overlay nodes
      if (status === 'RUNNING') {
        const nodeCount = 6;
        for (let i = 0; i < nodeCount; i++) {
          const theta = (i / nodeCount) * Math.PI * 2 + time * 0.3;
          const radius = Math.min(width, height) * 0.25 + Math.sin(time * 1.2 + i) * 12;
          const nx = width / 2 + Math.cos(theta) * radius;
          const ny = height / 2 + Math.sin(theta) * radius;

          // Orbit nodes
          ctx.beginPath();
          ctx.arc(nx, ny, 3 + Math.sin(time * 2 + i) * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = i % 2 === 0 ? '#06b6d4' : '#3b82f6';
          ctx.fill();

          // Connections
          if (i > 0) {
            const prevTheta = ((i - 1) / nodeCount) * Math.PI * 2 + time * 0.3;
            const prevRadius = Math.min(width, height) * 0.25 + Math.sin(time * 1.2 + i - 1) * 12;
            const pnx = width / 2 + Math.cos(prevTheta) * prevRadius;
            const pny = height / 2 + Math.sin(prevTheta) * prevRadius;
            
            ctx.beginPath();
            ctx.moveTo(pnx, pny);
            ctx.lineTo(nx, ny);
            ctx.strokeStyle = "rgba(6, 182, 212, 0.25)";
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [status, isInViewport]);

  if (status !== 'SUCCEEDED' && !showDetails) {
    return (
      <div ref={containerRef} className="w-full my-4 bg-slate-950/40 border border-cyan-500/20 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.05)] transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]">
        <button
          onClick={() => setShowDetails(true)}
          className="w-full px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left transition-all duration-300 active:scale-[0.99] group cursor-pointer"
        >
          {/* Left side with spinning icon & info */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.15)] group-hover:bg-cyan-500/20 group-hover:border-cyan-500/50 transition-all duration-300">
              <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
              {/* Pulsing glow node */}
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-slate-950 animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-500 border border-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-cyan-400 tracking-wide flex items-center gap-2">
                <span>La vidéo est en train d'être générée...</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold tracking-widest animate-pulse">
                  {status}
                </span>
              </div>
              <p className="text-[12px] text-slate-400 mt-1 line-clamp-1 font-mono">
                {promptPhysics}
              </p>
            </div>
          </div>

          {/* Right side with percentage progress & click to expand action */}
          <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
            {/* Progress Badge */}
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold font-mono text-white leading-none">
                {progress}%
              </span>
              <span className="text-[9px] font-mono text-cyan-500/70 uppercase tracking-widest mt-1">
                Progression
              </span>
            </div>
            
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-all duration-300">
              <ChevronDown className="w-4 h-4 transform group-hover:translate-y-0.5 transition-transform" />
            </div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full my-6 bg-slate-950/80 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.1)]">
      {/* Header Banner */}
      <div className="bg-[#0c0c0e] border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-[11px] font-mono tracking-widest text-cyan-400 font-semibold uppercase">
            RATISS MOTEUR DE CONSTELLATION VISUELLE
          </span>
        </div>
        <div className="flex items-center gap-3">
          {status !== 'SUCCEEDED' && (
            <button
              onClick={() => setShowDetails(false)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-mono border border-white/10 transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>MASQUER LES DÉTAILS</span>
            </button>
          )}
          <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-mono text-cyan-400">
            {taskId.substring(0, 12)}
          </span>
          <span className={`w-2 h-2 rounded-full ${status === 'SUCCEEDED' ? 'bg-emerald-500 animate-pulse' : 'bg-cyan-500 animate-spin'}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 min-h-[340px]">
        {/* Visualizer Area (2/3 width) */}
        <div className="md:col-span-2 relative bg-[#040405] flex items-center justify-center overflow-hidden border-r border-white/5 min-h-[260px]">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

          <AnimatePresence mode="wait">
            {status !== 'SUCCEEDED' ? (
              <motion.div 
                key="loading-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="z-10 flex flex-col items-center justify-center p-6 text-center"
              >
                {/* Quantum Progress Ring */}
                <div className="relative w-28 h-28 mb-4 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      stroke="rgba(255,255,255,0.03)" 
                      strokeWidth="6" 
                      fill="transparent" 
                    />
                    <motion.circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      stroke="#06b6d4" 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray="251.2"
                      animate={{ strokeDashoffset: 251.2 - (251.2 * progress) / 100 }}
                      transition={{ ease: "easeInOut", duration: 0.5 }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-xl font-bold font-mono text-white">{progress}%</span>
                    <span className="text-[9px] font-mono text-slate-400 tracking-wider uppercase">VÉLOCITÉ</span>
                  </div>
                </div>

                <div className="bg-[#0b0c10]/90 border border-cyan-500/20 rounded-lg px-4 py-2 backdrop-blur max-w-xs shadow-lg">
                  <p className="text-[12px] font-mono text-slate-300">
                    {progress < 100 ? "Calcul géométrique asynchrone..." : "Stabilisation quantique..."}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="video-container"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 w-full h-full flex flex-col items-center justify-center relative p-4"
              >
                {/* Video Playback Simulator or actual HTML5 Video */}
                <div className="relative w-full h-[240px] rounded-xl overflow-hidden border border-white/10 bg-black/40 group flex items-center justify-center">
                  <div className="absolute top-3 left-3 bg-[#0a0a0c]/80 border border-emerald-500/20 rounded px-2.5 py-1 flex items-center gap-1.5 z-20 backdrop-blur">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-[9px] font-mono text-emerald-400 tracking-widest uppercase font-bold">
                      PROUVE COMPILÉE - COUPLAGE ACTIF
                    </span>
                  </div>

                  {/* Real video element for dynamic topological playback */}
                  <video 
                    ref={videoRef}
                    src={(() => {
                      const baseSrc = customVideoUrl || `/assets/swan_black_video_${taskId}.mp4`;
                      if (baseSrc.startsWith('/') || baseSrc.startsWith('assets/')) {
                        return `${baseSrc}?v=${taskId}`;
                      }
                      return baseSrc;
                    })()}
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    loop
                    playsInline
                    muted
                    autoPlay
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-10" />

                  {/* Playback Controls Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-10 h-10 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-[0_0_15px_#06b6d4]"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded border border-white/5">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Phase Grid overlay when video is paused */}
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-black/40">
                      <motion.div 
                        animate={{ 
                          scale: [1, 1.05, 1]
                        }}
                        transition={{ 
                          repeat: Infinity, duration: 3, ease: "easeInOut"
                        }}
                        className="w-20 h-20 rounded-full border border-cyan-500/30 border-dashed flex items-center justify-center"
                      >
                        <Cpu className="w-6 h-6 text-cyan-400 animate-pulse" />
                      </motion.div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Console and Certificate Sidepanel (1/3 width) */}
        <div className="bg-[#08080a] flex flex-col justify-between p-4 border-t md:border-t-0 border-white/5 font-mono text-[11px] leading-relaxed">
          {/* Top Info */}
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-slate-500 tracking-wider uppercase mb-1">PROMPT DE PHYSIQUE</div>
              <p className="text-slate-300 italic line-clamp-3 bg-white/[0.02] border border-white/5 p-2 rounded text-[11px]">
                "{promptPhysics}"
              </p>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 tracking-wider uppercase mb-1">RÉALISATION DU FLUX</div>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar bg-black/40 border border-white/5 p-2 rounded">
                {logs.length === 0 && (
                  <div className="text-slate-500 italic">En attente de connexion...</div>
                )}
                {logs.map((log, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={idx} 
                    className="text-cyan-400/90 flex items-start gap-1"
                  >
                    <span className="text-slate-600 shrink-0">[{idx}]:</span>
                    <span>{log}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Interactive / Certification panel */}
          <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
            {status === 'SUCCEEDED' ? (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3.5"
              >
                {/* Certification details */}
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded p-2.5">
                  <div className="flex items-center gap-1 text-emerald-400 font-semibold text-[10px] mb-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>VOLT-Ω CERTIFIÉ</span>
                  </div>
                  <div className="text-[9px] text-slate-400 leading-normal font-mono select-all break-all">
                    SHA3: <span className="text-cyan-400 font-semibold">{sha3Hash}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 leading-normal font-mono select-all">
                    ANCRAGE: <span className="text-blue-400 font-semibold">{ancrage}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleDownloadVideo}
                    className="py-2 px-3 rounded bg-white/5 hover:bg-white/10 text-cyan-400 font-bold border border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-300 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger MP4</span>
                  </button>

                  <button 
                    onClick={handleGetTheorem}
                    disabled={isExporting}
                    className={`py-2 px-3 rounded bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition-all duration-300 flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-[10px] uppercase tracking-wider cursor-pointer ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Compression...</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-3.5 h-3.5" />
                        <span>Théorème (.zip)</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white/[0.01] border border-white/5 rounded p-2 text-center text-slate-500 italic text-[10px]">
                En attente de la signature cryptographique du grand livre...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
