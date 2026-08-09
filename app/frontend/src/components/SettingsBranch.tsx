import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Database, 
  Download, 
  FileText, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Sliders, 
  Activity, 
  ChevronRight,
  Archive,
  Info,
  Server,
  Volume2,
  Terminal,
  Link2,
  Cpu,
  Sparkles,
  FileCode
} from "lucide-react";
import { ChatSession } from "../types";

interface SettingsBranchProps {
  sessions: ChatSession[];
  onClose: () => void;
  isCompetitionBranch: boolean;
  onImportSession: (file: File) => void;
  onAttachFile?: (file: File) => void;
  initialTab?: "archives" | "bridge_ia";
}

export function SettingsBranch({ 
  sessions, 
  onClose, 
  isCompetitionBranch, 
  onImportSession, 
  onAttachFile,
  initialTab = "archives"
}: SettingsBranchProps) {
  const [activeTab, setActiveTab] = useState<"archives" | "bridge_ia">(initialTab);
  
  // Keep activeTab in sync with initialTab updates from App
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // States for the AI Import Bridge
  const [payloadText, setPayloadText] = useState("");
  const [payloadFormat, setPayloadFormat] = useState<"auto" | "hex" | "b64">("auto");
  const [payloadFilename, setPayloadFilename] = useState("payload_forensic.bin");
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [bridgeSuccess, setBridgeSuccess] = useState<string | null>(null);

  const [sessionsStats, setSessionsStats] = useState<Array<{ session: ChatSession; msgCount: number; sizeKb: number }>>([]);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let sizeSum = 0;
    const stats = sessions.map(s => {
      const messagesKey = `ratiss_messages_${s.id}`;
      const rawMessages = localStorage.getItem(messagesKey) || "[]";
      let msgCount = 0;
      try {
        msgCount = JSON.parse(rawMessages).length;
      } catch (e) {}
      
      const sessionSize = (rawMessages.length * 2) / 1024; // 2 bytes per char (UTF-16)
      sizeSum += sessionSize;

      return {
        session: s,
        msgCount,
        sizeKb: parseFloat(sessionSize.toFixed(2))
      };
    });
    setSessionsStats(stats);
    setTotalSize(parseFloat(sizeSum.toFixed(2)));
  }, [sessions]);

  const handleProcessPayload = (action: "attach" | "download") => {
    setBridgeError(null);
    setBridgeSuccess(null);
    
    // Nettoyage complet
    let cleaned = payloadText.trim().replace(/[`\s\n\r\t]/g, "");
    
    if (!cleaned) {
      setBridgeError("Veuillez saisir un dump Hexadécimal ou un bloc Base64.");
      return;
    }
    
    // Nettoyage des préfixes éventuels
    if (cleaned.toLowerCase().startsWith("hex:")) {
      cleaned = cleaned.substring(4);
    } else if (cleaned.toLowerCase().startsWith("0x")) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.toLowerCase().startsWith("base64:") || cleaned.toLowerCase().startsWith("b64:")) {
      cleaned = cleaned.substring(cleaned.indexOf(":") + 1);
    }
    
    let binaryBuffer: Uint8Array;
    let detectedFormat = "";
    
    const fallbackBase64 = (strToDecode: string, act: "attach" | "download") => {
      try {
        let base64Str = strToDecode;
        const missingPadding = base64Str.length % 4;
        if (missingPadding) {
          base64Str += '='.repeat(4 - missingPadding);
        }
        
        const binaryString = atob(base64Str);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        finalizeBinaryFile(bytes, "Base64", act);
      } catch (e) {
        setBridgeError("Échec de la conversion. Le format n'est ni du Hexadécimal ni du Base64 valide.");
      }
    };

    const finalizeBinaryFile = (bytes: Uint8Array, format: string, act: "attach" | "download") => {
      const ab = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(ab).set(bytes);
      const blob = new Blob([ab], { type: "application/octet-stream" });
      const filename = payloadFilename.trim() || "payload_forensic.bin";
      const file = new File([blob], filename, { type: "application/octet-stream" });
      
      if (act === "download") {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setBridgeSuccess(`Fichier binaire décodé avec succès (${format}, ${bytes.length} octets) et téléchargé !`);
      } else {
        if (onAttachFile) {
          onAttachFile(file);
        } else {
          setBridgeError("La connexion avec le chat n'est pas opérationnelle.");
        }
      }
    };

    if (payloadFormat === "hex" || (payloadFormat === "auto" && /^[0-9a-fA-F]+$/.test(cleaned))) {
      // Tenter le décodage Hexadécimal
      try {
        if (cleaned.length % 2 !== 0) {
          cleaned = "0" + cleaned; // Rembourrage si longueur impaire
        }
        const match = cleaned.match(/.{1,2}/g);
        if (!match) throw new Error("Format Hex invalide");
        binaryBuffer = new Uint8Array(match.map(byte => parseInt(byte, 16)));
        detectedFormat = "Hexadécimal";
        finalizeBinaryFile(binaryBuffer, detectedFormat, action);
      } catch (e) {
        if (payloadFormat === "hex") {
          setBridgeError("La chaîne fournie n'est pas au format hexadécimal valide.");
          return;
        }
        // Repli en Base64 si le mode était automatique
        fallbackBase64(cleaned, action);
      }
    } else {
      fallbackBase64(cleaned, action);
    }
  };

  const handleExportIndividual = (session: ChatSession) => {
    const messagesKey = `ratiss_messages_${session.id}`;
    const rawMessages = localStorage.getItem(messagesKey) || "[]";
    let messagesList = [];
    try {
      messagesList = JSON.parse(rawMessages);
    } catch (e) {}

    const exportData = {
      session_info: {
        id: session.id,
        title: session.title,
        mode: session.mode || "Standard (N1)",
        level: session.level,
        timestamp: session.timestamp
      },
      messages: messagesList
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const cleanTitle = session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadAnchor.setAttribute("download", `ratiss_export_${cleanTitle}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showSuccess(`Sujet "${session.title}" exporté individuellement.`);
  };

  const handleExportAll = () => {
    setIsExportingAll(true);
    
    setTimeout(() => {
      const fullBackup = {
        exportDate: new Date().toISOString(),
        system: "RATISS Cypher ODV",
        version: "V9.5",
        sessionsCount: sessions.length,
        sessions: sessions.map(s => {
          const messagesKey = `ratiss_messages_${s.id}`;
          const rawMessages = localStorage.getItem(messagesKey) || "[]";
          let messagesList = [];
          try {
            messagesList = JSON.parse(rawMessages);
          } catch (e) {}
          return {
            session_info: s,
            messages: messagesList
          };
        })
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `ratiss_backup_complet_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setIsExportingAll(false);
      showSuccess("Archive globale de toutes les conversations exportée avec succès !");
    }, 600);
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const themeAccentColor = isCompetitionBranch ? "text-red-500" : "text-[#2563eb]";
  const themeAccentBg = isCompetitionBranch ? "bg-red-500/10" : "bg-[#2563eb]/10";
  const themeBorder = isCompetitionBranch ? "border-red-900/20" : "border-white/5";
  const themeButton = isCompetitionBranch 
    ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]" 
    : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-[0_0_20px_rgba(37,99,235,0.2)]";

  return (
    <div className={`w-full bg-[#0b0b0b] text-white rounded-[2.5rem] border ${themeBorder} overflow-hidden p-6 relative`}>
      {/* Background radial glow */}
      <div className={`absolute top-0 right-0 w-[400px] h-[400px] blur-[120px] pointer-events-none ${isCompetitionBranch ? 'bg-red-600/5' : 'bg-blue-500/5'}`} />
      <div className={`absolute bottom-0 left-0 w-[300px] h-[300px] blur-[100px] pointer-events-none ${isCompetitionBranch ? 'bg-red-950/5' : 'bg-indigo-500/5'}`} />

      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between border-b ${themeBorder} pb-6 mb-6`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${isCompetitionBranch ? 'bg-red-500' : 'bg-[#2563eb]'}`} />
            <h2 className="text-xl font-black tracking-tight uppercase">
              Branche Paramètres <span className={`text-xs font-mono tracking-widest ml-1 ${themeAccentColor}`}>RATISS-V9</span>
            </h2>
          </div>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">
            Contrôle souverain de l'agent, diagnostics locaux et gestion d'archivage
          </p>
        </div>

        <button 
          onClick={onClose}
          className="mt-4 md:mt-0 px-4 py-2 rounded-full border border-white/10 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all active:scale-95"
        >
          Retour au Chat
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className={`flex items-center gap-2 mb-6 border-b ${themeBorder} pb-4`}>
        <button
          onClick={() => setActiveTab("archives")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${
            activeTab === "archives" 
              ? (isCompetitionBranch ? "bg-red-950/40 text-red-400 border-red-900/30" : "bg-white/10 text-white border-white/10")
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border-transparent"
          }`}
        >
          <Archive className="w-4 h-4 text-slate-400" />
          <span>Gouvernance & Archivage</span>
        </button>
        
        <button
          onClick={() => setActiveTab("bridge_ia")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border relative ${
            activeTab === "bridge_ia" 
              ? (isCompetitionBranch ? "bg-red-950/40 text-red-400 border-red-900/30" : "bg-white/10 text-white border-white/10")
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border-transparent"
          }`}
        >
          <Link2 className={`w-4 h-4 ${activeTab === "bridge_ia" ? "text-emerald-400" : "text-slate-400"}`} />
          <span>Pont de Transfert IA</span>
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[8px] bg-emerald-500 text-black font-black uppercase rounded-full tracking-wider animate-pulse">Nouveau</span>
        </button>
      </div>

      {/* Quick Success Toast */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center gap-3 text-sm text-green-400">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {activeTab === "archives" ? (
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Left column: Diagnostics & Main Actions */}
          <div className="md:col-span-1 space-y-6">
            <div className={`p-5 rounded-[2rem] border ${themeBorder} bg-white/[0.01]`}>
              <div className="flex items-center gap-2 mb-4">
                <Database className={`w-4 h-4 ${themeAccentColor}`} />
                <h3 className="text-xs font-black tracking-wider uppercase text-slate-400">Stockage de la Sandbox</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-xs text-slate-500">Conversations</span>
                  <span className="text-xs font-bold font-mono">{sessions.length}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-xs text-slate-500">Taille estimée</span>
                  <span className="text-xs font-bold font-mono">{totalSize} KB</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-xs text-slate-500">Système hôte</span>
                  <span className="text-xs font-bold font-mono text-emerald-400">Opérationnel</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">TTS Volume</span>
                  <span className="text-xs font-bold font-mono flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-emerald-500" /> 100% (Maximum)
                  </span>
                </div>
              </div>
            </div>

            <div className={`p-5 rounded-[2rem] border ${themeBorder} bg-white/[0.01]`}>
              <div className="flex items-center gap-2 mb-3">
                <Archive className={`w-4 h-4 ${themeAccentColor}`} />
                <h3 className="text-xs font-black tracking-wider uppercase text-slate-400">Sauvegarde Globale</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Téléchargez une archive .json chiffrable comprenant l'intégralité de vos sessions et historiques de chat. Ce fichier pourra être lu ou réimporté dans un moteur compatible RATISS.
              </p>

              <button
                onClick={handleExportAll}
                disabled={isExportingAll || sessions.length === 0}
                className={`w-full py-4.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${themeButton}`}
              >
                {isExportingAll ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Traitement en cours...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Export Complet (JSON)</span>
                  </>
                )}
              </button>

              <div className="border-t border-white/5 mt-4 pt-4">
                <label className="cursor-pointer block">
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onImportSession(file);
                      }
                      e.target.value = '';
                    }}
                    className="hidden" 
                  />
                  <div className="w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-300">
                    <Download className="w-4 h-4 transform rotate-180 text-blue-400" />
                    <span>Importer un Backup (JSON)</span>
                  </div>
                </label>
              </div>
            </div>

            <div className={`p-5 rounded-[2rem] border ${themeBorder} bg-white/[0.01] text-[11px] text-slate-500 space-y-3`}>
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Les conversations sont entièrement stockées dans le stockage local persistant (localStorage) de votre navigateur. L'exportation conserve les formats d'ingestion forensics de PHENIX ODV.
                </p>
              </div>
            </div>
          </div>

          {/* Right column: Individual exports list */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className={`w-4 h-4 ${themeAccentColor}`} />
                <h3 className="text-xs font-black tracking-wider uppercase text-slate-400">
                  Exports Individuels ({sessions.length})
                </h3>
              </div>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {sessionsStats.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed border-white/5 rounded-3xl">
                  Aucune conversation active pour le moment.
                </div>
              ) : (
                sessionsStats.map(({ session, msgCount, sizeKb }) => (
                  <div 
                    key={session.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border ${themeBorder} bg-white/[0.01] hover:bg-white/[0.02] transition-all group`}
                  >
                    <div className="space-y-1 truncate pr-4">
                      <div className="font-bold text-sm text-white truncate max-w-[280px] sm:max-w-md">
                        {session.title || "Nouveau Chat"}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1 uppercase">
                          <Activity className="w-3 h-3" />
                          {session.mode || "Standard (N1)"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(session.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3 sm:mt-0 justify-between sm:justify-start">
                      <div className="text-right text-[10px] font-mono text-slate-500 shrink-0">
                        <div>{msgCount} message{msgCount > 1 ? 's' : ''}</div>
                        <div>{sizeKb} KB</div>
                      </div>

                      <button
                        onClick={() => handleExportIndividual(session)}
                        className={`p-2.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-300 hover:text-white transition-all active:scale-95`}
                        title="Exporter cette conversation"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      ) : (
        <div className="space-y-6">
          {/* Informational Header */}
          <div className="p-5 rounded-3xl bg-white/[0.01] border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-300">Pipeline de Transfert frontal IA (Grok / Claude ↔ RATISS)</h3>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Dans les challenges de CTF, il est extrêmement intelligent de déléguer le pré-traitement de structures binaires lourdes à un LLM frontal (comme Grok ou Claude). 
              L'IA nettoie le bruit et vous recrache un dump sous format stable de texte. Ce pont reconstruit le fichier <span className="font-mono text-emerald-400">.bin</span> original à la volée.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-8">
            {/* Form Column */}
            <div className="md:col-span-8 space-y-4">
              {bridgeError && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                  {bridgeError}
                </div>
              )}
              {bridgeSuccess && (
                <div className="p-3 text-xs bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
                  {bridgeSuccess}
                </div>
              )}

              {/* Settings Configuration */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1.5">Nom du fichier cible (.bin)</label>
                  <input
                    type="text"
                    value={payloadFilename}
                    onChange={(e) => setPayloadFilename(e.target.value)}
                    placeholder="payload_forensic.bin"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 text-xs font-mono text-white outline-none focus:border-white/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1.5">Format de sérialisation d'origine</label>
                  <div className="flex gap-1.5 bg-white/[0.01] border border-white/10 rounded-2xl p-1">
                    {(["auto", "hex", "b64"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setPayloadFormat(fmt)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                          payloadFormat === fmt 
                            ? "bg-white/10 text-white shadow-sm" 
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {fmt === "auto" ? "Auto" : fmt === "hex" ? "Hexadecimal" : "Base64"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Paste Textarea */}
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1.5 flex justify-between">
                  <span>Coller le dump brut (Hex ou Base64)</span>
                  <span className="font-mono text-slate-600">{payloadText.length} caractères</span>
                </label>
                <textarea
                  value={payloadText}
                  onChange={(e) => {
                    setPayloadText(e.target.value);
                    setBridgeError(null);
                    setBridgeSuccess(null);
                  }}
                  rows={8}
                  placeholder={`Exemple Hex: 41424344 (ABCD)\nExemple Base64: QUJDRA== (ABCD)\n\nCollez directement le code fourni par l'autre IA...`}
                  className="w-full bg-[#070707] border border-white/5 rounded-3xl p-4 text-xs font-mono text-emerald-400 outline-none focus:border-white/10 transition-all resize-y leading-relaxed focus:ring-1 focus:ring-emerald-500/10 shadow-inner"
                />
              </div>

              {/* Trigger Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => handleProcessPayload("attach")}
                  className={`flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    isCompetitionBranch 
                      ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                  <span>⚡ Injecter & Analyser dans le Chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleProcessPayload("download")}
                  className="py-4 px-6 rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 text-slate-300"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger le .bin brut</span>
                </button>
              </div>
            </div>

            {/* Instruction Column */}
            <div className="md:col-span-4 space-y-6">
              {/* Instructions list */}
              <div className="p-5 rounded-[2rem] border border-white/5 bg-white/[0.01] space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pipeline de travail :</h4>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono text-emerald-400 shrink-0 mt-0.5">1</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Récupérez le binaire corrompu ou l'analyse brute du challenge CTF.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono text-emerald-400 shrink-0 mt-0.5">2</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Envoyez-le à Claude/Grok en lui demandant de nettoyer les structures et de l'encoder en <strong>Hex</strong> ou <strong>Base64</strong>.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono text-emerald-400 shrink-0 mt-0.5">3</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Collez le bloc reçu ici, puis injectez-le pour lancer l'analyse de RATISS.
                    </p>
                  </div>
                </div>
              </div>

              {/* Python Terminal integration info */}
              <div className="p-5 rounded-[2rem] border border-white/5 bg-[#050505] space-y-3">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Terminal className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Scripts de pont d'analyse</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  RATISS met également à votre disposition un pont en ligne de commande local. Exécutez :
                </p>
                <div className="bg-black/50 p-3 rounded-xl border border-white/5 text-[9px] font-mono text-slate-300 break-all select-all space-y-1">
                  <div># Auto-décodage Hex/B64</div>
                  <div className="text-emerald-400">./parse_bridge.py dump_ia.txt flag.bin</div>
                </div>
                <p className="text-[9px] text-slate-600 font-mono">
                  Le script se charge de supprimer les espaces et backticks markdown automatiquement.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
