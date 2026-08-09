import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Cloud, Server, Wifi } from 'lucide-react';
import { MODELS } from '../models_list';

export function SystemStatus() {
  const [status, setStatus] = useState<{ 
    ready: boolean; 
    isDownloading: boolean; 
    progress: number; 
    provider: 'piper' | 'gemini';
    version: string;
  }>({ 
    ready: false, 
    isDownloading: false, 
    progress: 0, 
    provider: 'gemini',
    version: '4.2.0-PIPER'
  });
  const [isAnyAudioPlaying, setIsAnyAudioPlaying] = useState(false);
  const [activeVoiceName, setActiveVoiceName] = useState("Siwis (Low)");

  const [modelId, setModelId] = useState(() => {
    return localStorage.getItem("ratiss_selected_model_id") || "google/gemma-4-26b-a4b-it:free";
  });

  useEffect(() => {
    const handleModelChanged = () => {
      const activeId = localStorage.getItem("ratiss_selected_model_id") || "google/gemma-4-26b-a4b-it:free";
      setModelId(activeId);
    };
    window.addEventListener("ratiss-model-changed", handleModelChanged);
    return () => {
      window.removeEventListener("ratiss-model-changed", handleModelChanged);
    };
  }, []);

  const activeModel = MODELS.find(m => m.id === modelId) || MODELS[0];

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/tts/status');
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data);

      const savedVoiceId = localStorage.getItem("ratiss_selected_voice") || "fr_FR-siwis-low";
      const voiceNames: Record<string, string> = {
        "fr_FR-siwis-low": "Siwis (Femme)",
        "fr_FR-siwis-medium": "Siwis (Femme - Douce)",
        "fr_FR-gilles-low": "Gilles (Homme)",
        "fr_FR-tom-medium": "Tom (Homme - Clair)",
        "fr_FR-upmc-medium:0": "Jessica (Femme - UPMC)",
        "fr_FR-upmc-medium:1": "Pierre (Homme - UPMC)",
        "fr_FR-mls-medium:2": "MLS Homme (Clair)",
        "fr_FR-mls-medium:5": "MLS Femme (Douce)",
        "fr_FR-mls_1840-low:2": "MLS 1840 Homme",
        "fr_FR-mls_1840-low:5": "MLS 1840 Femme",
        "gemini-aoede": "Gemini Aoede (Femme)",
        "gemini-kore": "Gemini Kore (Femme)",
        "browser-femme": "Navigateur (Femme)",
        "browser-homme": "Navigateur (Homme)"
      };
      setActiveVoiceName(voiceNames[savedVoiceId] || "Siwis (Low)");
    } catch (e) {
      console.error("Status check failed");
    }
  };

  useEffect(() => {
    checkStatus();
    
    // Check frequently during downloading, less frequently when idle
    const interval = setInterval(checkStatus, (status.isDownloading || !status.ready) ? 1500 : 10000);

    const audioCheck = setInterval(() => {
      const audios = document.getElementsByTagName('audio');
      let playing = false;
      for (let i = 0; i < audios.length; i++) {
        if (!audios[i].paused && !audios[i].ended && audios[i].currentTime > 0) playing = true;
      }
      setIsAnyAudioPlaying(playing);
    }, 100);

    return () => {
      clearInterval(interval);
      clearInterval(audioCheck);
    };
  }, [status.ready, status.isDownloading]);

  const triggerSync = async () => {
    try {
      await fetch('/api/tts/download', { method: 'POST' });
      checkStatus();
    } catch (e) {
      console.error("Sync trigger failed");
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-9 bg-[#0b0b0b]/95 border-b border-cyan-500/20 backdrop-blur-md px-4 flex items-center justify-between z-[100] shadow-[0_1px_15px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2 min-w-[120px]">
          <motion.div 
            animate={{ 
              scale: status.ready ? [1, 1.2, 1] : [1, 1.1, 1],
              opacity: status.ready ? [0.7, 1, 0.7] : [0.5, 1, 0.5]
            }}
            transition={{ repeat: Infinity, duration: status.ready ? 2 : 1 }}
            className={`w-1.5 h-1.5 rounded-full ${status.ready ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'}`} 
          />
          <span className="text-[10px] font-mono text-slate-200 uppercase tracking-widest font-bold">
            {status.ready ? 'RATISS PIPER CORE ACTIVE' : status.isDownloading ? 'SYNCING PIPER ENGINE' : 'PIPER OFFLINE'}
          </span>
        </div>
        
        <div className="h-4 w-[1px] bg-white/10" />
        
        <div className="flex items-center gap-3 flex-1 max-w-md">
          {status.ready ? (
            <div className="flex items-center gap-2">
              <Server className="w-3 h-3 text-cyan-400" />
              <span className="text-[9px] font-mono text-slate-400 uppercase">
                LOCAL PIPER TTS READY ({activeVoiceName.toUpperCase()})
              </span>
            </div>
          ) : status.isDownloading ? (
            <div className="flex items-center gap-3 flex-1">
              <Wifi className="w-3 h-3 text-amber-400 animate-bounce" />
              <div className="flex flex-col flex-1 gap-1">
                <span className="text-[9px] font-mono text-slate-400 uppercase">
                  CHARGEMENT PIPER & VOIX (FR): {status.progress}%
                </span>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-cyan-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${status.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={triggerSync}
              className="text-[8px] px-2 py-0.5 rounded border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors uppercase font-bold flex items-center gap-1 cursor-pointer"
            >
              <Wifi className="w-2.5 h-2.5" />
              TÉLÉCHARGER PIPER LOCAL (FR)
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 ml-4">
        <AnimatePresence>
          {isAnyAudioPlaying && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-3"
            >
              <span className="text-[8px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Neural Output Stream</span>
              <div className="flex items-end gap-0.5 h-4">
                {[...Array(16)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                    animate={{ 
                      height: ['15%', '100%', '25%', '85%', '15%'],
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 0.2 + Math.random() * 0.4,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
          <span className="text-[9px] font-mono text-cyan-400 tracking-wider uppercase font-black">{activeModel.name.toUpperCase()} CORE</span>
        </div>
        
        <div className="flex items-center gap-1.5 opacity-30 border-l border-white/10 pl-4">
          <Activity className="w-3 h-3 text-slate-400" />
          <span className="text-[9px] font-mono text-slate-400 tracking-tighter uppercase font-bold">ODV-CORE-v4</span>
        </div>
      </div>
    </div>
  );
}
