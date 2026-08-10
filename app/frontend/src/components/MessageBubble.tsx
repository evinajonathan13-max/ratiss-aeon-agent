/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { Message } from "../types";
import { Terminal, User, Copy, Pencil, RotateCcw, Check, Volume2, AudioLines, Cloud, Server, Play, Pause, Download, Sparkles, Image, ChevronDown, ChevronUp } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";
import { LongStringEncapsulator } from "./LongStringEncapsulator";
import { TopologicalVideoPlayer } from "./TopologicalVideoPlayer";
import { AgenticActionCard } from "./AgenticActionCard";
import { RatissAgentViewer } from "./RatissAgentViewer";
import { speakBrowserTts } from "../lib/browserTts";

interface DetailedImageProps {
  src: string;
  alt?: string;
}

function BonhommeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="4.5" r="2.2" />
      <path d="M 5.5 10.5 L 12 9 L 18.5 10.5" />
      <line x1="12" y1="6.7" x2="12" y2="14" />
      <path d="M 7.5 21 L 12 14 L 16.5 21" />
    </svg>
  );
}

function DetailedImage({ src, alt }: DetailedImageProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloading(true);
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const filename = `ratiss_generation_${Date.now()}.png`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn("Failed to download image directly, falling back", err);
      const a = document.createElement("a");
      a.href = src;
      a.target = "_blank";
      a.download = `ratiss_generation_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative group/image overflow-hidden rounded-xl border border-white/10 shadow-2xl bg-black/40 my-4 max-w-full w-[98%]">
      <img 
        src={src} 
        alt={alt || "Illustration RATISS"} 
        className="w-full h-auto object-contain transition-transform duration-500 group-hover/image:scale-[1.01]"
        referrerPolicy="no-referrer"
      />
      
      {/* Overlay controls */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex items-center justify-between opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-md">
          <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span className="text-[9px] font-mono font-black text-cyan-400 uppercase tracking-widest">
            ULTRA-DÉTAILLÉ
          </span>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-[10px] font-mono font-bold uppercase rounded-lg transition-all duration-200 shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] active:scale-95"
        >
          {downloading ? (
            <div className="w-3 h-3 border-t-2 border-white rounded-full animate-spin" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          <span>Télécharger</span>
        </button>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  onCopy?: (content: string) => void;
  onEdit?: (id: string, content: string) => void;
  onRetry?: (id: string) => void;
  voiceId?: string;
}

const renderContent = (content: string) => {
  // Split by whitespace first to preserve formatting, then process each word
  const lines = content.split('\n');
  return lines.map((line, lineIdx) => (
    <React.Fragment key={lineIdx}>
      {line.split(' ').map((word, wordIdx) => {
        if (word.length > 64) {
          return <LongStringEncapsulator key={wordIdx} value={word} />;
        }
        return word + (wordIdx < line.split(' ').length - 1 ? ' ' : '');
      })}
      {lineIdx < lines.length - 1 && <br />}
    </React.Fragment>
  ));
};

const cleanTextForSynthesis = (text: string): string => {
  if (!text) return "";
  return text
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
};

export function MessageBubble({ message, onCopy, onEdit, onRetry, voiceId }: MessageBubbleProps) {
  const isSystem = message.role === 'system' || message.role === 'assistant';
  
  // Attempt to parse JSON for video manifest from any part of the message content
  let videoManifest: any = null;
  let textBeforeManifest: string | null = null;
  if (isSystem) {
    const trimmed = message.content.trim();
    // Resilient regex matching for type: "video_manifest" supporting any quotes and spacing
    if (/["']type["']\s*:\s*["']video_manifest["']/.test(trimmed)) {
      const startIdx = trimmed.indexOf('{');
      const endIdx = trimmed.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        try {
          const potentialJson = trimmed.substring(startIdx, endIdx + 1);
          const parsed = JSON.parse(potentialJson);
          if (parsed.type === "video_manifest") {
            videoManifest = parsed;
            const beforeText = trimmed.substring(0, startIdx).trim();
            // Clean up backticks like ```json or ``` if present at the end of beforeText
            textBeforeManifest = beforeText
              .replace(/```json\s*$/, "")
              .replace(/```\s*$/, "")
              .trim();
          }
        } catch (e) {
          // Parsing failed, fallback to normal rendering
        }
      }
    }
  }

  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);
  const [playedSource, setPlayedSource] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTTS = async () => {
    // If audio is playing or paused, clicking again stops/resets it
    if (isPlaying || isPaused) {
      if (voiceId?.startsWith("browser")) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } else {
        audioRef.current?.pause();
      }
      setIsPlaying(false);
      setIsPaused(false);
      setHasAudio(false);
      return;
    }

    try {
      setIsLoadingTTS(true);
      setPlayedSource(null);
      setIsFallback(false);
      setFallbackReason(null);
      setHasAudio(false);
      setIsPaused(false);

      if (voiceId?.startsWith("browser")) {
        const isFemme = voiceId === "browser-femme";
        const cleanedText = cleanTextForSynthesis(message.content);
        setPlayedSource("browser");
        setIsFallback(false);
        setFallbackReason(null);

        speakBrowserTts(
          cleanedText,
          isFemme ? "femme" : "homme",
          () => {
            setIsLoadingTTS(false);
            setIsPlaying(true);
            setIsPaused(false);
            setHasAudio(true);
          },
          () => {
            setIsPlaying(false);
            setIsPaused(false);
            setHasAudio(false);
          },
          (e) => {
            console.error("Browser TTS error:", e);
            setIsLoadingTTS(false);
            setIsPlaying(false);
            setIsPaused(false);
            setHasAudio(false);
          }
        );
        return;
      }

      const cleanedText = cleanTextForSynthesis(message.content);
      const prepareResponse = await fetch(`/api/tts/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: cleanedText,
          messageId: message.id,
          voiceId: voiceId
        })
      });

      if (!prepareResponse.ok) throw new Error("Erreur TTS");

      const streamUrl = `/api/tts/stream/${message.id}?voiceId=${voiceId || ""}`;

      setPlayedSource(voiceId?.startsWith("gemini") ? "gemini" : "piper");
      setIsFallback(false);
      setFallbackReason(null);

      setIsLoadingTTS(false);
      setIsPlaying(true);
      setIsPaused(false);
      setHasAudio(true);
      
      if (audioRef.current) {
        audioRef.current.src = streamUrl;
        audioRef.current.volume = 1.0; // Volume maximum à 100% par défaut
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setIsPaused(false);
        };
        audioRef.current.onerror = (e) => {
          console.error("Audio error:", e);
          setIsPlaying(false);
          setIsPaused(false);
          setHasAudio(false);
        };
        audioRef.current.play().catch(e => {
          console.error("Audio play failed:", e);
          setIsPlaying(false);
          setIsPaused(false);
        });
      } else {
        const audio = new Audio(streamUrl);
        audio.volume = 1.0; // Volume maximum à 100% par défaut
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlaying(false);
          setIsPaused(false);
        };
        audio.onerror = (e) => {
          console.error("Audio error:", e);
          setIsPlaying(false);
          setIsPaused(false);
          setHasAudio(false);
        };
        audio.play().catch(e => {
          console.error("Audio play failed:", e);
          setIsPlaying(false);
          setIsPaused(false);
        });
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setIsLoadingTTS(false);
      setIsPlaying(false);
      setIsPaused(false);
      setHasAudio(false);
    }
  };

  const handleTogglePlayPause = () => {
    if (voiceId?.startsWith("browser")) {
      if (!('speechSynthesis' in window)) return;
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
        setIsPaused(true);
      } else if (isPaused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
        setIsPaused(false);
      }
      return;
    }

    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
    } else {
      if (audioRef.current.ended) {
        audioRef.current.currentTime = 0;
      }
      audioRef.current.play().catch(e => {
        console.error("Audio play failed:", e);
      });
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (voiceId?.startsWith("browser") && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [voiceId]);

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full mb-8 px-2 ${isSystem ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`flex w-full max-w-[98%] ${isSystem ? 'flex-row' : 'flex-row-reverse'} items-start gap-3 group`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-110 ${
          isSystem 
            ? 'bg-gradient-to-br from-cyan-500 to-blue-600 border-white/20 text-white shadow-cyber-glow' 
            : 'bg-white/5 border-white/10 text-cyan-400'
        }`}>
          {isSystem ? <Terminal className="w-3.5 h-3.5" /> : <BonhommeIcon className="w-4 h-4 text-cyan-300" />}
        </div>

        <div className={`flex flex-col ${isSystem ? 'items-start' : 'items-end'} space-y-1 flex-1 min-w-0`}>
          <div className={`w-full px-4 md:px-6 py-4 rounded-[1.5rem] transition-all duration-300 border shadow-sm relative group/bubble ${
            isSystem 
              ? 'bg-white/[0.03] border-white/10 text-white rounded-tl-none' 
              : 'bg-blue-600/10 border-blue-500/20 text-blue-100 rounded-tr-none shadow-[0_0_20px_rgba(37,99,235,0.05)]'
          }`}>
            {isSystem && (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#2563eb] animate-pulse" />
                <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-blue-500/80">
                  RATISS-ODV Core
                </span>
              </div>
            )}

            {/* Collapsible Reasoning Block (Views Reasoning) */}
            {message.reasoning && (
              <div className="mb-4 border border-cyan-500/10 bg-cyan-950/5 rounded-xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] select-none">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsReasoningExpanded(!isReasoningExpanded); }}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-black/15 hover:bg-black/35 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-400">
                      Cheminement de Réflexion ({message.reasoning.length} car.)
                    </span>
                  </div>
                  <div className="text-slate-500 hover:text-slate-300 transition-colors">
                    {isReasoningExpanded ? (
                      <ChevronUp className="w-4 h-4 text-cyan-400/80" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-cyan-400/80" />
                    )}
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {isReasoningExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <div className="p-4 bg-black/40 border-t border-white/5 max-h-60 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap select-text">
                        {message.reasoning}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className={`markdown-content text-[15px] leading-relaxed tracking-wide break-words overflow-hidden ${isSystem ? 'font-normal' : 'font-light'}`}>
              {videoManifest ? (
                <div className="flex flex-col gap-3">
                  {textBeforeManifest && (
                    <div className="text-[15px] font-medium text-slate-200">
                      {textBeforeManifest}
                    </div>
                  )}
                  <TopologicalVideoPlayer
                    taskId={videoManifest.payload.task_id}
                    promptPhysics={videoManifest.meta.prompt_physics}
                    checkStatusUrl={videoManifest.payload.check_status_url}
                    fallbackText={videoManifest.payload.fallback_text}
                    cryptographicSignatures={videoManifest.payload.cryptographic_signatures}
                  />
                </div>
              ) : (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table({ children }) {
                      return (
                        <div className="table-container custom-scrollbar">
                          <table>{children}</table>
                        </div>
                      );
                    },
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline ? (
                        <CodeBlock
                          language={match ? match[1] : ''}
                          value={String(children).replace(/\n$/, '')}
                        />
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    img({ src, alt }) {
                      return (
                        <div className="flex justify-center w-full my-2">
                          <DetailedImage src={src || ''} alt={alt || ''} />
                        </div>
                      );
                    },
                    p({ children }) {
                      const processChildren = (child: any): any => {
                        if (typeof child === 'string') {
                          return renderContent(child);
                        }
                        if (Array.isArray(child)) {
                          return child.map(processChildren);
                        }
                        if (React.isValidElement(child) && (child.props as any).children) {
                          return React.cloneElement(child as React.ReactElement, {
                            children: processChildren((child.props as any).children)
                          } as any);
                        }
                        return child;
                      };

                      return <div className="markdown-p leading-relaxed font-normal">{processChildren(children)}</div>;
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}

              {/* Affichage des images RATISS générées via stream */}
              {message.imageUrl && (
                <div className="flex justify-center w-full">
                  <DetailedImage src={message.imageUrl} alt="illustration" />
                </div>
              )}

              {/* In-Line Agentic Action Cards */}
              {isSystem && (message.content.includes("[ACTION_GMAIL]") || message.content.toLowerCase().includes("gmail") || message.content.toLowerCase().includes("envoyer un e-mail") || message.content.toLowerCase().includes("envoyer par mail") || message.content.toLowerCase().includes("rédige un e-mail")) && (
                <AgenticActionCard type="gmail_send" data={{ summaryText: message.content.replace("[ACTION_GMAIL]", "").trim() }} />
              )}

              {isSystem && (message.content.includes("[ACTION_PDF]") || message.content.toLowerCase().includes("exporter en pdf") || message.content.toLowerCase().includes("télécharger le pdf") || message.content.toLowerCase().includes("rapport pdf") || message.content.toLowerCase().includes("document pdf")) && (
                <AgenticActionCard type="pdf_generate" data={{ summaryText: message.content.replace("[ACTION_PDF]", "").trim() }} />
              )}

              {/* Visualiseur agentique en direct */}
              {isSystem && (message.content.includes("[AGENT_SEARCH]") || message.content.toLowerCase().includes("recherche google") || message.content.toLowerCase().includes("search grounding") || message.content.toLowerCase().includes("vérification en direct") || message.content.toLowerCase().includes("recherche en ligne")) && (
                <RatissAgentViewer taskQuery={message.content.replace("[AGENT_SEARCH]", "").substring(0, 80).trim() || "Recherche et Vérification Google Grounding"} />
              )}
            </div>
          </div>

          {/* Actions */}
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 mt-1 ${isSystem ? 'justify-start ml-4' : 'justify-end mr-4'}`}
          >
            {isSystem && (
              <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 rounded-lg p-0.5 pr-1.5">
                {/* Lecture Audio (Modèle Sélectionné) */}
                <button 
                  onClick={handleTTS}
                  disabled={isLoadingTTS}
                  className={`p-1.5 rounded transition-all duration-300 relative group flex items-center justify-center ${
                    isPlaying
                      ? 'bg-[#2563eb]/20 text-[#2563eb] shadow-[0_0_12px_rgba(37,99,235,0.4)]' 
                      : isLoadingTTS
                        ? 'bg-white/5 text-[#2563eb]/50 cursor-not-allowed animate-pulse'
                        : 'hover:bg-white/5 text-slate-500 hover:text-white'
                  }`}
                  title="Générer la synthèse vocale"
                >
                  {isLoadingTTS ? (
                    <div className="w-3.5 h-3.5 border-t-2 border-[#2563eb] rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <div className="flex items-end gap-0.5 h-3.5 px-0.5">
                      <div className="w-0.5 bg-[#2563eb] animate-[bounce_0.8s_infinite]" style={{ height: '60%' }} />
                      <div className="w-0.5 bg-[#2563eb] animate-[bounce_1.2s_infinite]" style={{ height: '100%' }} />
                      <div className="w-0.5 bg-[#2563eb] animate-[bounce_1.0s_infinite]" style={{ height: '80%' }} />
                    </div>
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Bouton de Pause / Play pour l'audio déjà chargé */}
                {hasAudio && !isLoadingTTS && (
                  <button 
                    onClick={handleTogglePlayPause}
                    className={`p-1.5 rounded transition-all duration-300 flex items-center justify-center ${
                      isPlaying 
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                        : 'hover:bg-white/5 text-slate-400 hover:text-white'
                    }`}
                    title={isPlaying ? "Mettre en pause" : "Reprendre la lecture"}
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {/* Engine Source Badge */}
                {(isPlaying || isPaused) && playedSource && (
                  <div className={`flex items-center gap-1 px-2 text-[8px] font-mono uppercase tracking-wider font-bold h-6 rounded border transition-colors ${
                    isFallback 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                      : playedSource === 'gemini' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  }`}>
                    {isFallback ? (
                      <>
                        <Server className="w-2.5 h-2.5 animate-pulse text-amber-400" />
                        <span>
                          {fallbackReason === 'quota_exceeded' 
                            ? 'Doublure Gilles - Quota Dépassé' 
                            : 'Doublure Gilles (Locale)'}
                        </span>
                      </>
                    ) : playedSource === 'gemini' ? (
                      <>
                        <Cloud className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Gemini (Cloud)</span>
                      </>
                    ) : (
                      <>
                        <Server className="w-2.5 h-2.5 text-cyan-400" />
                        <span>Local Piper</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <button 
              onClick={handleCopy}
              className="p-1 hover:bg-white/5 rounded transition-colors text-slate-600 hover:text-slate-400"
              title="Copier"
            >
              {copied ? <Check className="w-2.5 h-2.5 text-green-600" /> : <Copy className="w-2.5 h-2.5" />}
            </button>
            
            {!isSystem && (
              <>
                <button 
                  onClick={() => onEdit?.(message.id, message.content)}
                  className="p-1 hover:bg-white/5 rounded transition-colors text-slate-600 hover:text-slate-400"
                  title="Modifier"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
                <button 
                  onClick={() => onRetry?.(message.id)}
                  className="p-1 hover:bg-white/5 rounded transition-colors text-slate-600 hover:text-slate-400"
                  title="Ressayer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              </>
            )}
          </motion.div>

          <span className="text-[9px] font-mono text-slate-600 px-3 mt-0.5">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
