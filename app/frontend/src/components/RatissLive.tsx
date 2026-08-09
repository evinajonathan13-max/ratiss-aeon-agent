/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Download,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Square,
  HelpCircle,
  FileJson,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Message, CalculationMode } from "../types";
import { MODELS } from "../models_list";
import { speakBrowserTts } from "../lib/browserTts";

interface RatissLiveProps {
  isOpen: boolean;
  onClose: () => void;
  voiceId: string;
  calcMode: CalculationMode;
}

interface LiveMessage {
  id: string;
  role: "user" | "ratiss";
  content: string;
  timestamp: Date;
}

function isSelfVoiceFeedback(transcript: string, spokenText: string): boolean {
  if (!transcript || !spokenText) return false;
  
  // Clean punctuation and convert to lowercase
  const clean = (t: string) => t.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\n]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  
  const transWords = clean(transcript);
  const spokenWords = new Set(clean(spokenText));
  
  if (transWords.length === 0) return true;
  
  // Count how many words in the transcript are in the spoken text
  let matchCount = 0;
  for (const word of transWords) {
    if (spokenWords.has(word) || 
        Array.from(spokenWords).some(sw => sw.includes(word) || word.includes(sw))) {
      matchCount++;
    }
  }
  
  const matchRatio = matchCount / transWords.length;
  // If more than 45% of the words match, it's highly likely to be echo/feedback from Ratiss's own voice
  return matchRatio > 0.45;
}

export function RatissLive({ isOpen, onClose, voiceId, calcMode }: RatissLiveProps) {
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

  const [isLive, setIsLive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [liveState, setLiveState] = useState<"idle" | "listening" | "thinking" | "speaking" | "paused">("listening");
  const [userTranscript, setUserTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [conversation, setConversation] = useState<LiveMessage[]>([]);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastStateBeforePauseRef = useRef<"listening" | "idle">("listening");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Keep references to states to avoid stale closures in event handlers
  const liveStateRef = useRef(liveState);
  const micActiveRef = useRef(micActive);
  const isLiveRef = useRef(isLive);
  const speakingTextRef = useRef("");

  useEffect(() => {
    liveStateRef.current = liveState;
  }, [liveState]);

  useEffect(() => {
    micActiveRef.current = micActive;
  }, [micActive]);

  useEffect(() => {
    isLiveRef.current = isLive;
  }, [isLive]);

  // Initialize Web Speech API for Speech-to-Text
  useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError("La reconnaissance vocale n'est pas supportée par votre navigateur (Recommandé: Chrome, Safari ou Edge).");
      setMicActive(false);
      setLiveState("idle");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "fr-FR";

    rec.onstart = () => {
      setMicError(null);
    };

    rec.onresult = (event: any) => {
      if (liveStateRef.current === "paused" || !micActiveRef.current) return;

      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim) {
        if (liveStateRef.current === "speaking") {
          if (!isSelfVoiceFeedback(interim, speakingTextRef.current)) {
            setInterimTranscript(interim);
          }
        } else {
          setInterimTranscript(interim);
        }
      }

      if (final) {
        if (liveStateRef.current === "speaking") {
          if (isSelfVoiceFeedback(final, speakingTextRef.current)) {
            console.log("[RATISS-LIVE] Feedback de voix filtré :", final);
            setInterimTranscript("");
            return;
          } else {
            console.log("[RATISS-LIVE] Interruption vocale détectée :", final);
            handleInterrupt();
            setUserTranscript(final);
            setInterimTranscript("");
            processUserSpeech(final);
          }
        } else if (liveStateRef.current === "listening") {
          setUserTranscript(final);
          setInterimTranscript("");
          processUserSpeech(final);
        }
      }
    };

    rec.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setMicError("L'accès au microphone a été refusé. Veuillez autoriser le microphone.");
        setMicActive(false);
        setLiveState("idle");
      }
    };

    rec.onend = () => {
      // Automatically restart listening if mic is active and we are in listening or speaking state
      if (micActiveRef.current && isLiveRef.current && 
         (liveStateRef.current === "listening" || liveStateRef.current === "speaking") && 
         isOpen) {
        try {
          rec.start();
        } catch (e) {
          // ignore already started errors
        }
      }
    };

    recognitionRef.current = rec;

    // Start recognition
    if (micActive && (liveState === "listening" || liveState === "speaking")) {
      try {
        rec.start();
      } catch (e) {
        console.error("Failed to start speech recognition on mount:", e);
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen]);

  // Restart recognition when micActive state changes or we go back to listening/speaking state
  useEffect(() => {
    if (!isOpen || !recognitionRef.current) return;

    if (micActive && isLive && (liveState === "listening" || liveState === "speaking")) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // ignore
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }, [micActive, liveState, isLive]);

  // Canvas visualizer animation
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = 320;
    let height = canvas.height = 320;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      phase += 0.05;

      const centerX = width / 2;
      const centerY = height / 2;
      let baseRadius = 80;
      let color = "rgba(59, 130, 246, 0.4)"; // Default listening (blue)
      let shadowColor = "rgba(59, 130, 246, 0.2)";
      let waveCount = 3;
      let waveIntensity = 10;

      if (liveState === "listening") {
        baseRadius = 85 + Math.sin(phase * 2) * 5;
        color = "rgba(59, 130, 246, 0.6)"; // vibrant blue
        shadowColor = "rgba(59, 130, 246, 0.3)";
        waveCount = 4;
        waveIntensity = 12;
      } else if (liveState === "thinking") {
        baseRadius = 80;
        color = "rgba(168, 85, 247, 0.6)"; // purple thinking
        shadowColor = "rgba(168, 85, 247, 0.3)";
        waveCount = 5;
        waveIntensity = 8;
        phase += 0.08; // speed up rotation
      } else if (liveState === "speaking") {
        baseRadius = 90 + Math.sin(phase * 4) * 15; // highly responsive
        color = "rgba(234, 179, 8, 0.6)"; // gold speaking
        shadowColor = "rgba(234, 179, 8, 0.3)";
        waveCount = 6;
        waveIntensity = 25;
      } else if (liveState === "paused" || !micActive) {
        baseRadius = 75;
        color = "rgba(100, 116, 139, 0.3)"; // gray idle/paused
        shadowColor = "rgba(100, 116, 139, 0.1)";
        waveCount = 1;
        waveIntensity = 2;
      }

      // Draw shadow blur glow
      ctx.shadowBlur = 40;
      ctx.shadowColor = shadowColor;

      // Draw multiple fluid waves
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const offsetPhase = phase + w * (Math.PI / waveCount);
        
        for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
          // Dynamic radius formula combining several frequencies for organic water ball effect
          const waveOffset = Math.sin(angle * (3 + w) + offsetPhase) * 
                             Math.cos(angle * 2 - offsetPhase * 0.5) * 
                             waveIntensity;
          
          const r = baseRadius + waveOffset;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (angle === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 + w * 0.5;
        ctx.stroke();
      }

      // Draw central orb
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius - 15, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, baseRadius - 15);
      
      if (liveState === "listening") {
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.8)");
        gradient.addColorStop(1, "rgba(29, 78, 216, 0.2)");
      } else if (liveState === "thinking") {
        gradient.addColorStop(0, "rgba(168, 85, 247, 0.8)");
        gradient.addColorStop(1, "rgba(126, 34, 206, 0.2)");
      } else if (liveState === "speaking") {
        gradient.addColorStop(0, "rgba(234, 179, 8, 0.8)");
        gradient.addColorStop(1, "rgba(161, 98, 7, 0.2)");
      } else {
        gradient.addColorStop(0, "rgba(148, 163, 184, 0.3)");
        gradient.addColorStop(1, "rgba(71, 85, 105, 0.1)");
      }
      
      ctx.fillStyle = gradient;
      ctx.fill();

      // Reset shadows
      ctx.shadowBlur = 0;

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, liveState, micActive]);

  const processUserSpeech = async (speech: string) => {
    if (!speech || speech.trim().length === 0) return;

    // Add to local Live conversation history
    const newUserMsg: LiveMessage = {
      id: Date.now().toString(),
      role: "user",
      content: speech.trim(),
      timestamp: new Date()
    };
    setConversation(prev => [...prev, newUserMsg]);

    // Transition to thinking state
    setLiveState("thinking");

    // Stop speech recognition while generating response (it will be restarted automatically via effect/onend)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...conversation.slice(-4).map(m => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.content
            })),
            { role: "user", content: speech.trim() }
          ],
          mode: "live"
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Erreur serveur" }));
        throw new Error(errData.error || "Erreur communication");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let ratissResponse = "";
      const ratissMsgId = (Date.now() + 1).toString();

      // Add empty message for streaming
      setConversation(prev => [...prev, {
        id: ratissMsgId,
        role: "ratiss",
        content: "",
        timestamp: new Date()
      }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.substring(6);
              if (dataStr === "[DONE]") break;
              try {
                const data = JSON.parse(dataStr);
                if (data.content) {
                  ratissResponse += data.content;
                  setConversation(prev => prev.map(m => 
                    m.id === ratissMsgId ? { ...m, content: ratissResponse } : m
                  ));
                }
              } catch (e) {}
            }
          }
        }
      }

      // Speak response once fully collected
      await speakResponse(ratissResponse);

    } catch (e: any) {
      console.error("Live chat processing error:", e);
      const errorMsg = "Désolé, j'ai rencontré une erreur lors de la génération de ma réponse.";
      setConversation(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ratiss",
        content: "⚠️ [Erreur] " + e.message,
        timestamp: new Date()
      }]);
      await speakResponse(errorMsg);
    }
  };

  const speakResponse = async (text: string) => {
    setLiveState("speaking");

    // Format text slightly for optimal reading aloud (e.g., stripping Markdown symbols)
    const cleanedText = text
      // Remove markdown headers
      .replace(/^#+\s+/gm, "")
      // Remove code blocks (```code```)
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code blocks
      .replace(/`[^`]+`/g, "")
      // Remove asterisks, underscores, and tildes (markdown styling)
      .replace(/[\*\_\~\=\+\#\-]/g, " ")
      // Remove markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove bracketed citations like [1], [2], etc.
      .replace(/\[\d+\]/g, "")
      // Replace non-word chars like bullet points, math operators, backslashes, etc. with space
      .replace(/[•●■\<\>|\\\/○♦]/g, " ")
      // Replace multiple spaces with a single space
      .replace(/\s+/g, " ")
      .trim();

    speakingTextRef.current = cleanedText;

    if (voiceId.startsWith("browser")) {
      const isFemme = voiceId === "browser-femme";
      speakBrowserTts(
        cleanedText,
        isFemme ? "femme" : "homme",
        undefined,
        () => {
          setLiveState("listening");
          setUserTranscript("");
        },
        (e) => {
          console.error("Browser live speech error:", e);
          setLiveState("listening");
        }
      );
    } else {
      // Piper or Gemini Server Voice
      try {
        const messageId = Date.now().toString();
        const prepareResponse = await fetch(`/api/tts/prepare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: cleanedText,
            messageId: messageId,
            voiceId: voiceId
          })
        });

        if (!prepareResponse.ok) throw new Error("Erreur de préparation TTS");

        const streamUrl = `/api/tts/stream/${messageId}?voiceId=${voiceId || ""}`;
        
        if (audioRef.current) {
          audioRef.current.pause();
        }

        const audio = new Audio(streamUrl);
        audio.volume = 1.0; // Volume maximum à 100% par défaut
        audioRef.current = audio;

        audio.onended = () => {
          setLiveState("listening");
          setUserTranscript("");
        };

        audio.onerror = (e) => {
          console.error("Live streaming audio play error:", e);
          setLiveState("listening");
        };

        await audio.play();

      } catch (err) {
        console.error("Server TTS prepare fail in live mode:", err);
        // Fallback to local browser voice if server fails
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(cleanedText);
          utterance.lang = "fr-FR";
          utterance.volume = 1.0; // Volume maximum à 100% par défaut
          utterance.onend = () => {
            setLiveState("listening");
            setUserTranscript("");
          };
          window.speechSynthesis.speak(utterance);
        } else {
          setLiveState("listening");
        }
      }
    }
  };

  const handleInterrupt = () => {
    // Stops speaking instantly
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    speakingTextRef.current = "";
    setLiveState("listening");
    setUserTranscript("");
    setInterimTranscript("");
  };

  const handleTogglePause = () => {
    if (liveState === "paused") {
      setIsLive(true);
      setLiveState(lastStateBeforePauseRef.current);
    } else {
      // pause active state
      lastStateBeforePauseRef.current = liveState === "listening" ? "listening" : "idle";
      setIsLive(false);
      handleInterrupt();
      setLiveState("paused");
    }
  };

  const handleExportJSON = () => {
    try {
      const exportData = {
        app: "RATISS CYPHER ODV",
        sessionType: "Ratiss Live",
        date: new Date().toISOString(),
        configuration: {
          voiceId: voiceId,
          calculationMode: calcMode,
        },
        transcript: conversation.map(msg => ({
          id: msg.id,
          role: msg.role === "user" ? "Utilisateur" : "RATISS",
          content: msg.content,
          timestamp: msg.timestamp.toISOString()
        }))
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(exportData, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `ratiss_live_transcript_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (e) {
      console.error("Failed to export JSON:", e);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col md:flex-row bg-[#050505] text-white overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1e1b4b_0%,#020202_70%)] opacity-80 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />

        {/* Left pane: Audio Sphere/Aura & Interactions */}
        <div className="flex-1 flex flex-col items-center justify-between p-6 md:p-10 relative z-10">
          
          {/* Top panel with details and Close */}
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-[0.4em] text-red-500 uppercase">RATISS LIVE</span>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">Mode Vocal Interactif</span>
                <span className="text-[8px] font-mono text-cyan-400 uppercase tracking-[0.1em] mt-1 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  MOTEUR : {activeModel.name.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
                Budget Mots : Élastique
              </span>
              <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-3 py-1 rounded-full text-slate-400">
                Mode: {calcMode}
              </span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all active:scale-95"
                title="Fermer Ratiss Live"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Central Section with Orb Canvas */}
          <div className="flex-1 flex flex-col items-center justify-center relative w-full max-w-md">
            
            {/* Morphing Dynamic Canvas */}
            <div className="relative flex items-center justify-center w-80 h-80">
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
              
              {/* Inner control state text overlay */}
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-white/40">
                  {liveState === "listening" && "Écoute..."}
                  {liveState === "thinking" && "Réflexion..."}
                  {liveState === "speaking" && "Parle..."}
                  {liveState === "paused" && "En Pause"}
                  {liveState === "idle" && "Inactif"}
                </span>
                
                {liveState === "speaking" && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleInterrupt(); }}
                    className="mt-3 pointer-events-auto bg-black/40 hover:bg-black/60 border border-yellow-500/30 hover:border-yellow-500 text-yellow-500 hover:text-yellow-400 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1 transition-all active:scale-95"
                  >
                    <Square className="w-2.5 h-2.5 fill-current" />
                    Interrompre
                  </button>
                )}
              </div>
            </div>

            {/* Real-time speech subtitle transcription */}
            <div className="w-full text-center min-h-[50px] mt-6 px-4">
              <p className="text-sm md:text-base font-light text-slate-300 italic transition-all duration-300">
                {interimTranscript && <span className="text-slate-500">{interimTranscript}</span>}
                {!interimTranscript && userTranscript && <span className="text-blue-400 font-medium">{userTranscript}</span>}
                {!interimTranscript && !userTranscript && liveState === "listening" && (
                  <span className="text-slate-600 font-mono text-xs tracking-wider animate-pulse">Parlez maintenant, Ratiss vous écoute...</span>
                )}
                {liveState === "paused" && (
                  <span className="text-slate-600 font-mono text-xs tracking-wider">Session en pause. Cliquez sur Reprendre pour continuer.</span>
                )}
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="w-full max-w-lg bg-black/40 border border-white/5 backdrop-blur-md rounded-3xl p-4 flex items-center justify-between gap-4">
            
            {/* Microphone Mute/Unmute */}
            <button
              onClick={() => setMicActive(!micActive)}
              disabled={liveState === "paused"}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 cursor-pointer ${
                micActive 
                  ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20' 
                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
              }`}
              title={micActive ? "Couper le microphone" : "Activer le microphone"}
            >
              {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            {/* Main Play/Pause Session State */}
            <button
              onClick={handleTogglePause}
              className={`flex-1 max-w-[200px] py-3 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer border ${
                liveState === "paused"
                  ? 'bg-green-600 hover:bg-green-500 border-green-500/30 text-white shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {liveState === "paused" ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Reprendre Live
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  Mettre en Pause
                </>
              )}
            </button>

            {/* Export JSON Button */}
            <button
              onClick={handleExportJSON}
              disabled={conversation.length === 0}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer ${
                exportSuccess 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'
              }`}
              title="Télécharger l'historique de la conversation au format JSON"
            >
              {exportSuccess ? <CheckCircle className="w-5 h-5" /> : <FileJson className="w-5 h-5" />}
            </button>
          </div>

          {/* Micro Error Toast / Warning */}
          {micError && (
            <div className="absolute bottom-24 left-6 right-6 bg-red-950/80 border border-red-500/30 text-red-200 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs md:text-sm shadow-xl z-50">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <p>{micError}</p>
            </div>
          )}

        </div>

        {/* Right pane: Transcription panel with list */}
        <div className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-white/5 bg-[#080808]/80 backdrop-blur-xl flex flex-col justify-between relative z-10">
          
          {/* Pane Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">Transcription en direct</span>
            </div>
            
            <span className="text-[10px] font-mono text-slate-500">
              {conversation.length} message{conversation.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* List of Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence initial={false}>
              {conversation.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <Mic className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Aucune discussion vocale</p>
                  <p className="text-[11px] text-slate-700 mt-1 max-w-[200px]">Votre transcription vocale en temps réel apparaîtra ici au fur et à mesure.</p>
                </div>
              ) : (
                conversation.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10, y: 10 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    className={`flex flex-col max-w-[90%] ${msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                        {msg.role === "user" ? "Vous" : "RATISS"}
                      </span>
                      <span className="text-[8px] font-mono text-slate-700">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>

                    <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600/15 text-blue-200 rounded-tr-none border border-blue-500/10"
                        : "bg-white/[0.03] text-slate-300 rounded-tl-none border border-white/5"
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Export Indicator / Helper footer */}
          <div className="p-4 border-t border-white/5 bg-black/40 text-center">
            <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">
              Enregistré localement • Bouton JSON disponible à gauche
            </p>
          </div>

        </div>

      </div>
    </AnimatePresence>
  );
}
