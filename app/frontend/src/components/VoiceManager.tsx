/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Volume2, 
  Play, 
  Pause, 
  Download, 
  Check, 
  Loader2, 
  AlertCircle, 
  X, 
  User, 
  Users, 
  HelpCircle,
  RefreshCw,
  Server,
  Cloud
} from "lucide-react";
import { speakBrowserTts } from "../lib/browserTts";

export interface Voice {
  id: string;
  name: string;
  gender: string;
  quality: string;
  ready: boolean;
  isDownloading: boolean;
  progress: number;
  error: string | null;
}

interface VoiceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoiceId: string;
  onSelectVoice: (voiceId: string) => void;
}

export function VoiceManager({ isOpen, onClose, selectedVoiceId, onSelectVoice }: VoiceManagerProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);
  const [playedSource, setPlayedSource] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchVoices = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetch("/api/tts/voices");
      const data = await res.json();
      if (data.voices) {
        setVoices(data.voices);
      }
    } catch (err) {
      console.error("Error fetching voices:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Initial fetch and dynamic polling if downloading
  useEffect(() => {
    if (isOpen) {
      fetchVoices(true);
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [isOpen]);

  // Handle polling when a download is in progress
  useEffect(() => {
    const hasActiveDownload = voices.some(v => v.isDownloading);
    if (hasActiveDownload) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [voices]);

  const startPolling = () => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(() => {
      fetchVoices(false);
    }, 1500);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handleDownload = async (voiceId: string) => {
    try {
      // Optimistically show downloading status
      setVoices(prev => prev.map(v => v.id === voiceId ? { ...v, isDownloading: true, progress: 0 } : v));
      
      const res = await fetch("/api/tts/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId })
      });
      
      if (!res.ok) throw new Error("Trigger failed");
      
      // Start polling for progress immediately
      startPolling();
    } catch (err) {
      console.error("Failed to start voice download:", err);
      fetchVoices();
    }
  };

  const handleTestVoice = async (voice: Voice) => {
    if (testingVoiceId === voice.id) {
      // Stop testing
      if (voice.id.startsWith("browser")) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      setTestingVoiceId(null);
      return;
    }

    setTestingVoiceId(voice.id);
    setPlayedSource(null);
    setIsFallback(false);
    setFallbackReason(null);

    if (voice.id.startsWith("browser")) {
      const isFemme = voice.id === "browser-femme";
      const testText = `Système RATISS activé. Synthèse vocale du navigateur Audus opérationnelle avec la voix ${isFemme ? 'femme' : 'homme'}.`;
      setPlayedSource("browser");
      setIsFallback(false);
      speakBrowserTts(
        testText,
        isFemme ? "femme" : "homme",
        undefined,
        () => setTestingVoiceId(null),
        () => setTestingVoiceId(null)
      );
      return;
    }

    try {
      const testText = `Système RATISS activé. Synthèse vocale opérationnelle avec la voix de ${voice.name}.`;
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: testText,
          messageId: `test_voice_${voice.id}`,
          voiceId: voice.id
        })
      });

      if (!response.ok) throw new Error("TTS generation failed");

      const ttsSource = response.headers.get('X-TTS-Source') || (voice.id.startsWith("gemini") ? "gemini" : "piper");
      const ttsFallback = response.headers.get('X-TTS-Fallback') === "true";
      const ttsReason = response.headers.get('X-TTS-Fallback-Reason');

      setPlayedSource(ttsSource);
      setIsFallback(ttsFallback);
      setFallbackReason(ttsReason);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(url);
      audio.volume = 1.0; // Volume maximum à 100% par défaut
      audioRef.current = audio;
      
      audio.onended = () => {
        setTestingVoiceId(null);
      };
      
      audio.onerror = () => {
        setTestingVoiceId(null);
      };

      await audio.play();
    } catch (err) {
      console.error("Error testing voice:", err);
      setTestingVoiceId(null);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/80">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-2xl bg-[#0b0b0b] border border-white/10 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col max-h-[90vh]"
          >
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-blue-500/10 blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2563eb]/10 flex items-center justify-center text-[#2563eb]">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    Gestionnaire de Voix Piper TTS
                  </h2>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
                    Sélection et Téléchargement de Synthèse Vocale Locale
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchVoices(true)}
                  className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all active:scale-95"
                  title="Rafraîchir"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Fallback & Quota Notice Banner */}
            {testingVoiceId && isFallback && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 relative z-10"
              >
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px] text-amber-200 font-light leading-relaxed">
                  {fallbackReason === 'quota_exceeded' ? (
                    <>
                      <strong className="font-bold text-amber-400">Quota Gemini TTS dépassé (Gilles/Siwis en doublure) :</strong> La limite de requêtes gratuites en ligne de Gemini TTS (10 requêtes par jour par clé API) a été dépassée pour aujourd'hui. L'application a basculé automatiquement sur la voix locale hors-ligne équivalente pour assurer la synthèse continue.
                    </>
                  ) : (
                    <>
                      <strong className="font-bold text-amber-400">Doublure vocale active (Gilles/Siwis) :</strong> Le service Gemini TTS n'est pas disponible ou sa limite de requêtes a été atteinte. Le système a basculé automatiquement sur la voix locale hors-ligne équivalente pour assurer la synthèse.
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {testingVoiceId && !isFallback && playedSource === 'gemini' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 relative z-10 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
              >
                <Volume2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px] text-emerald-200 font-light leading-relaxed">
                  <strong className="font-bold">Neural Cloud Gemini :</strong> Connexion cloud active. Synthèse vocale de haute qualité générée en temps réel par l'intelligence artificielle de Google Gemini (Quota gratuit disponible : 10 requêtes par jour par clé).
                </div>
              </motion.div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 relative z-10">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                  <Loader2 className="w-8 h-8 text-[#2563eb] animate-spin" />
                  <span className="text-xs font-mono uppercase tracking-widest">Chargement des modules vocaux...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {voices.map((voice) => {
                    const isSelected = selectedVoiceId === voice.id;
                    return (
                      <div 
                        key={voice.id}
                        className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
                          isSelected 
                            ? 'bg-[#2563eb]/10 border-[#2563eb]/30 shadow-[0_0_20px_rgba(37,99,235,0.05)]' 
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                        }`}
                      >
                        {/* Download Progress Overlay */}
                        {voice.isDownloading && (
                          <div className="absolute bottom-0 left-0 h-1 bg-[#2563eb] transition-all duration-300" style={{ width: `${voice.progress}%` }} />
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          {/* Info Column */}
                          <div className="flex items-start gap-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 bg-white/5`}>
                              {voice.gender === "Femme" ? (
                                <User className="w-5 h-5 text-pink-400" />
                              ) : voice.gender === "Homme" ? (
                                <User className="w-5 h-5 text-blue-400" />
                              ) : (
                                <Users className="w-5 h-5 text-cyan-400" />
                              )}
                            </div>
                            
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white tracking-tight">{voice.name}</span>
                                <span className={`text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full font-semibold ${
                                  voice.gender === "Femme" ? "bg-pink-500/10 text-pink-400 border border-pink-500/10" :
                                  voice.gender === "Homme" ? "bg-blue-500/10 text-blue-400 border border-blue-500/10" :
                                  "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10"
                                }`}>
                                  {voice.gender}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 font-light mt-0.5">
                                Qualité : {voice.quality}
                              </span>
                            </div>
                          </div>

                          {/* Actions Column */}
                          <div className="flex items-center gap-3 self-end sm:self-center">
                            {/* Test Speaker Button */}
                            {voice.ready && (
                              <button
                                onClick={() => handleTestVoice(voice)}
                                className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
                                  testingVoiceId === voice.id 
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                    : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5'
                                }`}
                                title={testingVoiceId === voice.id ? "Arrêter le test" : "Tester cette voix"}
                              >
                                {testingVoiceId === voice.id ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {/* Main selection / download button */}
                            {voice.ready ? (
                              <button
                                onClick={() => onSelectVoice(voice.id)}
                                disabled={isSelected}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
                                  isSelected 
                                    ? 'bg-[#2563eb] text-white shadow-lg' 
                                    : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5'
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Actif</span>
                                  </>
                                ) : (
                                  <span>Sélectionner</span>
                                )}
                              </button>
                            ) : voice.isDownloading ? (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                                <span className="text-[10px] font-mono text-blue-500 uppercase tracking-widest font-semibold">
                                  {voice.progress}%
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleDownload(voice.id)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2563eb] hover:bg-blue-600 text-white transition-all active:scale-95 flex items-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Installer</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {voice.error && (
                          <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-red-400 bg-red-500/5 p-2 rounded-xl border border-red-500/10">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Erreur: {voice.error}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[9px] font-mono text-slate-500 uppercase tracking-widest relative z-10">
              <span className="flex items-center gap-1.5 font-bold">
                <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_4px_#2563eb]" />
                PIPELINE AUDIO : NATIVE LOCAL PIPER ONNX
              </span>
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Format de cache persistant à double canal</span>
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
