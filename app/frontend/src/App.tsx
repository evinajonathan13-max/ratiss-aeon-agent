/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  Paperclip, 
  PanelLeft, 
  Plus,
  Mic,
  Settings,
  ChevronDown,
  Camera,
  Image as ImageIcon,
  FileText,
  Link2,
  Zap,
  Brain,
  Cpu,
  Activity,
  Check,
  Trash2,
  Copy,
  Pencil,
  RotateCcw,
  Volume2,
  Compass,
  X,
  Download,
  Sliders,
  Sparkles,
  Terminal,
  Columns,
  Globe
} from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { MessageBubble } from "./components/MessageBubble";
import { ThinkingLoader } from "./components/ThinkingLoader";
import { VoiceManager } from "./components/VoiceManager";
import { SovereignLab } from "./components/SovereignLab";
import { InteractiveTerminal } from "./components/InteractiveTerminal";
import { ChromeniumBrowser } from "./components/ChromeniumBrowser";
import { MODELS, PROVIDER_ORDER } from "./models_list";
import { SettingsBranch } from "./components/SettingsBranch";
import { ChatInput, ChatInputHandle } from "./components/ChatInput";
import { RatissLive } from "./components/RatissLive";
import { PredictiveSuggestions } from "./components/PredictiveSuggestions";
import { Message, ChatSession, QueryLevel, InterfaceTheme, CalculationMode } from "./types";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLab, setShowLab] = useState(false);
  const [showSettingsBranch, setShowSettingsBranch] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [calcMode, setCalcMode] = useState<CalculationMode>('Standard (N1)');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isOpenRouterModelMenuOpen, setIsOpenRouterModelMenuOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configApiKey, setConfigApiKey] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [requestStats, setRequestStats] = useState({ count: 0, quota: 100 });
  const [llmProviders, setLlmProviders] = useState<Record<string, { configured: boolean; available: boolean; name: string }>>({});
  const [selectedKeyProvider, setSelectedKeyProvider] = useState<string>("anthropic");

  const fetchLlmStatus = async () => {
    try {
      const res = await fetch("/api/llm/status");
      if (res.ok) {
        const data = await res.json();
        setLlmProviders(data.providers || {});
      }
    } catch (err) {
      console.warn("[RATISS] LLM status error:", err);
    }
  };

  const fetchRequestStats = async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setRequestStats(data);
      }
    } catch (err) {
      console.warn("[RATISS] Stats error:", err);
    }
  };

  useEffect(() => {
    fetchRequestStats();
    fetchLlmStatus();
  }, []);
  const [globalModelId, setGlobalModelId] = useState(() => {
    return localStorage.getItem("ratiss_selected_model_id") || "anthropic/claude-3-5-sonnet";
  });

  useEffect(() => {
    const handleModelChanged = () => {
      const activeId = localStorage.getItem("ratiss_selected_model_id") || "anthropic/claude-3-5-sonnet";
      setGlobalModelId(activeId);
    };
    window.addEventListener("ratiss-model-changed", handleModelChanged);
    return () => {
      window.removeEventListener("ratiss-model-changed", handleModelChanged);
    };
  }, []);

  const updateGlobalModelId = (newId: string) => {
    localStorage.setItem("ratiss_selected_model_id", newId);
    setGlobalModelId(newId);
    window.dispatchEvent(new Event("ratiss-model-changed"));
    // Notifier le backend du modèle sélectionné
    fetch("/api/llm/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: newId }),
    }).catch(() => {});
  };

  const currentModel = MODELS.find(m => m.id === globalModelId) || MODELS[0];

  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [isCompetitionBranch, setIsCompetitionBranch] = useState(false);
  const [isReasoningModeActive, setIsReasoningModeActive] = useState(() => {
    return localStorage.getItem("ratiss_ultra_reasoning") === "true";
  });
  const [isForensicsLoading, setIsForensicsLoading] = useState(false);
  const [forensicsEngine, setForensicsEngine] = useState<'gemini' | 'nemotron'>('gemini');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);
  const [settingsInitialTab, setSettingsInitialTab] = useState<"archives" | "bridge_ia">("archives");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const openSettingsWithTab = (tab: "archives" | "bridge_ia") => {
    setSettingsInitialTab(tab);
    setShowSettingsBranch(true);
    setShowLab(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile(file);
    setIsMenuOpen(false);

    if (file.type.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"].some(ext => file.name.toLowerCase().endsWith(ext))) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setAttachedImagePreview(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachedImagePreview(null);
    }

    if (e.target) e.target.value = "";
  };
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    return localStorage.getItem("ratiss_selected_voice") || "fr_FR-siwis-low";
  });

  const handleSelectVoice = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    localStorage.setItem("ratiss_selected_voice", voiceId);
  };

  const handleSetCalcMode = (mode: CalculationMode) => {
    setCalcMode(mode);
    if (mode === 'Phenix ODV (Competition)') {
      setIsCompetitionBranch(true);
    }
    if (currentSessionId) {
      setSessions(prev => {
        const updated = prev.map(s => 
          s.id === currentSessionId ? { ...s, mode: mode } : s
        );
        localStorage.setItem('ratiss_sessions', JSON.stringify(updated));
        return updated;
      });
    }
  };
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatInputRef = useRef<ChatInputHandle>(null);

  // Local Storage Persistence
  useEffect(() => {
    const savedSessions = localStorage.getItem('ratiss_sessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions).map((s: any) => ({ ...s, timestamp: new Date(s.timestamp) }));
      setSessions(parsed);
      if (parsed.length > 0) {
        setCurrentSessionId(parsed[0].id);
        if (parsed[0].mode) {
          setCalcMode(parsed[0].mode);
        } else {
          setCalcMode('Standard (N1)');
        }
      } else {
        createNewChat();
      }
    } else {
      createNewChat();
    }
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      const sessionMessages = localStorage.getItem(`ratiss_messages_${currentSessionId}`);
      if (sessionMessages) {
        const parsed = JSON.parse(sessionMessages).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
        setMessages(parsed);
      } else {
        setMessages([]);
      }
    }
  }, [currentSessionId]);

  const handleExportIndividualJSON = () => {
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (!currentSession) return;
    
    const exportData = {
      session_info: {
        id: currentSession.id,
        title: currentSession.title,
        mode: currentSession.mode || "Standard (N1)",
        level: currentSession.level,
        timestamp: currentSession.timestamp
      },
      messages: messages
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const cleanTitle = currentSession.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadAnchor.setAttribute("download", `ratiss_export_${cleanTitle}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportIndividualMD = () => {
    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (!currentSession) return;

    let markdown = `# RATISS CYPHER ODV — RAPPORT D'EXPLORATION\n\n`;
    markdown += `* **Sujet :** ${currentSession.title}\n`;
    markdown += `* **Moteur d'analyse :** ${currentSession.mode || 'Standard (N1)'}\n`;
    markdown += `* **Niveau global :** ${currentSession.level}\n`;
    markdown += `* **Date d'indexation :** ${new Date(currentSession.timestamp).toLocaleString()}\n\n`;
    markdown += `---\n\n`;
    
    messages.forEach(msg => {
      const roleUpper = msg.role.toUpperCase();
      const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
      markdown += `### 🌐 [${roleUpper}] (${timeStr})\n\n${msg.content}\n\n---\n\n`;
    });
    
    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(markdown);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const cleanTitle = currentSession.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadAnchor.setAttribute("download", `ratiss_export_${cleanTitle}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const saveMessagesToStorage = (sessionId: string, msgs: Message[]) => {
    localStorage.setItem(`ratiss_messages_${sessionId}`, JSON.stringify(msgs));
    
    // Update last message in sessions list
    const lastMsg = msgs[msgs.length - 1];
    setSessions(prev => {
      const updated = prev.map(s => 
        s.id === sessionId 
          ? { ...s, lastMessage: lastMsg?.content?.substring(0, 50) || "", timestamp: new Date() } 
          : s
      );
      localStorage.setItem('ratiss_sessions', JSON.stringify(updated));
      return updated;
    });
  };

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Nouveau Chat',
      lastMessage: 'En attente...',
      timestamp: new Date(),
      level: 'N1',
      mode: calcMode || 'Standard (N1)'
    };
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    localStorage.setItem('ratiss_sessions', JSON.stringify(updatedSessions));
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setShowLab(false);
    setShowSettingsBranch(false);
    setShowTerminal(false);
  };

  const switchSession = (id: string) => {
    setCurrentSessionId(id);
    const session = sessions.find(s => s.id === id);
    if (session && session.mode) {
      setCalcMode(session.mode);
    } else {
      setCalcMode('Standard (N1)');
    }
    setShowLab(false);
    setShowSettingsBranch(false);
    setShowTerminal(false);
  };

  const deleteSession = (id: string) => {
    if (!id) return;
    const updatedSessions = sessions.filter(s => s.id !== id);
    setSessions(updatedSessions);
    localStorage.setItem('ratiss_sessions', JSON.stringify(updatedSessions));
    localStorage.removeItem(`ratiss_messages_${id}`);
    
    if (updatedSessions.length > 0) {
      setCurrentSessionId(updatedSessions[0].id);
    } else {
      createNewChat();
    }
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        // Scenario 1: Global Backup
        if (json.system === "RATISS Cypher ODV" && Array.isArray(json.sessions)) {
          const importedSessions: ChatSession[] = [];
          
          json.sessions.forEach((s: any) => {
            if (s.session_info && s.session_info.id) {
              const sessionObj: ChatSession = {
                id: s.session_info.id,
                title: s.session_info.title || "Chat Importé",
                lastMessage: s.session_info.lastMessage || "Conversation importée",
                timestamp: s.session_info.timestamp ? new Date(s.session_info.timestamp) : new Date(),
                level: s.session_info.level || "N1",
                mode: s.session_info.mode || "Standard (N1)"
              };
              
              importedSessions.push(sessionObj);
              // Save messages
              if (Array.isArray(s.messages)) {
                localStorage.setItem(`ratiss_messages_${sessionObj.id}`, JSON.stringify(s.messages));
              }
            }
          });

          if (importedSessions.length > 0) {
            setSessions(prev => {
              const filteredPrev = prev.filter(p => !importedSessions.some(i => i.id === p.id));
              const merged = [...importedSessions, ...filteredPrev];
              localStorage.setItem('ratiss_sessions', JSON.stringify(merged));
              return merged;
            });
            setCurrentSessionId(importedSessions[0].id);
            setShowLab(false);
            setShowSettingsBranch(false);
            alert(`${importedSessions.length} conversations ont été importées avec succès !`);
          } else {
            alert("Aucune conversation valide trouvée dans ce fichier de sauvegarde.");
          }
        }
        // Scenario 2: Individual Export
        else if (json.session_info && json.session_info.id) {
          const sessionObj: ChatSession = {
            id: json.session_info.id,
            title: json.session_info.title || "Chat Importé",
            lastMessage: json.session_info.lastMessage || "Conversation importée",
            timestamp: json.session_info.timestamp ? new Date(json.session_info.timestamp) : new Date(),
            level: json.session_info.level || "N1",
            mode: json.session_info.mode || "Standard (N1)"
          };

          setSessions(prev => {
            const filteredPrev = prev.filter(p => p.id !== sessionObj.id);
            const merged = [sessionObj, ...filteredPrev];
            localStorage.setItem('ratiss_sessions', JSON.stringify(merged));
            return merged;
          });

          if (Array.isArray(json.messages)) {
            localStorage.setItem(`ratiss_messages_${sessionObj.id}`, JSON.stringify(json.messages));
            setMessages(json.messages);
          }
          setCurrentSessionId(sessionObj.id);
          setShowLab(false);
          setShowSettingsBranch(false);
          alert(`La conversation "${sessionObj.title}" a été importée avec succès !`);
        } else {
          alert("Format de fichier d'importation RATISS non reconnu.");
        }
      } catch (err) {
        alert("Erreur de lecture du fichier d'importation. Assurez-vous qu'il s'agit d'un fichier JSON valide.");
      }
    };
    reader.readAsText(file);
  };

  const checkConfig = async () => {
    try {
      const res = await fetch("/api/config/status");
      const data = await res.json();
      setIsConfigured(data.configured);
      if (data.providers) {
        setLlmProviders(data.providers);
      }
    } catch (e) {
      setIsConfigured(false);
    }
  };

  useEffect(() => {
    checkConfig();
  }, []);

  const modelMetadata: Record<CalculationMode, { icon: any; desc: string }> = {
    'RATISS V9 Aeon Prime (Kernel Souverain)': { icon: Sparkles, desc: 'Pilote souverain (ZK-Stark & Topologie) orchestrant les LLM OpenRouter' },
    'RATISS Cypher ODV': { icon: Cpu, desc: 'Fusion Souveraine & Exploration Ontologique' },
    'V8-OMEGA (Topologique)': { icon: Activity, desc: 'Stabilité des invariants complexes' },
    'Panthéon Cognitif (30 Moteurs)': { icon: Cpu, desc: 'Puissance de calcul multi-cœurs' },
    'Phenix ODV (Competition)': { icon: Zap, desc: 'Cyber-combat & Résolution CTF (Phoenix Mode)' },
    'Ontologique (N2)': { icon: Brain, desc: 'Sémantique profonde et logique' },
    'Standard (N1)': { icon: Zap, desc: 'Analyse rapide et flux constant' }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = async (content: string) => {
    if ((!content || !content.trim()) && !attachedFile) return;
    if (isThinking || !currentSessionId) return;

    const fileToAnalyze = attachedFile;

    // Build the user message content
    let displayContent = content.trim();
    if (fileToAnalyze) {
      if (attachedImagePreview) {
        displayContent = displayContent 
          ? `${displayContent}\n\n![${fileToAnalyze.name}](${attachedImagePreview})\n*📷 Image attachée : ${fileToAnalyze.name} (${(fileToAnalyze.size / 1024).toFixed(1)} KB)*`
          : `![${fileToAnalyze.name}](${attachedImagePreview})\n*📷 Image attachée : ${fileToAnalyze.name} (${(fileToAnalyze.size / 1024).toFixed(1)} KB)*`;
      } else {
        const filePill = `*📎 Fichier attaché : ${fileToAnalyze.name} (${(fileToAnalyze.size / 1024).toFixed(1)} KB)*`;
        displayContent = displayContent 
          ? `${displayContent}\n\n${filePill}` 
          : filePill;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayContent,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    saveMessagesToStorage(currentSessionId, newMessages);
    
    // Update session title on first message
    if (messages.length === 0) {
      setSessions(prev => {
        const updated = prev.map(s => 
          s.id === currentSessionId ? { ...s, title: fileToAnalyze ? `Analyse: ${fileToAnalyze.name}` : content.trim().substring(0, 30) } : s
        );
        localStorage.setItem('ratiss_sessions', JSON.stringify(updated));
        return updated;
      });
    }

    setIsThinking(true);
    window.dispatchEvent(new CustomEvent("ratiss-agent-task-start", { 
      detail: { prompt: content || (fileToAnalyze ? `Analyse forensics de ${fileToAnalyze.name}` : "Analyse de données") } 
    }));
    if (fileToAnalyze) {
      setIsForensicsLoading(true);
      setAttachedFile(null); // Clear pending file immediately
      setAttachedImagePreview(null);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (fileToAnalyze) {
        // We have an attached file. Call the forensics analyzer
        const formData = new FormData();
        formData.append("file", fileToAnalyze);
        formData.append("filename", fileToAnalyze.name);
        formData.append("fileType", fileToAnalyze.type);
        formData.append("engine", forensicsEngine);
        formData.append("model_id", globalModelId);
        formData.append("consigne", content.trim());

        const response = await fetch("/api/competition/analyze", {
          method: "POST",
          body: formData,
          signal: controller.signal
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: "Erreur d'analyse" }));
          throw new Error(errData.error || "Erreur lors de l'analyse");
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonErr) {
          throw new Error("Le serveur forensics a renvoyé une réponse invalide (HTML). Le serveur est peut-être en train de redémarrer.");
        }
        
        if (data.report) {
          const forensicsMsg: Message = {
            id: `forensics-${Date.now()}`,
            content: `### 🔍 PHENIX-FORENSICS [Moteur: ${forensicsEngine === 'gemini' ? 'Gemini 3.5' : 'Nemotron 3'}] : ${fileToAnalyze.name}\n\n${data.report}\n\n*Analyse intégrée au pipeline de résolution.*`,
            role: 'assistant',
            timestamp: new Date(),
            level: isCompetitionBranch ? 'Phenix ODV' : 'Standard'
          };
          
          setMessages(prev => {
            const updated = [...prev, forensicsMsg];
            saveMessagesToStorage(currentSessionId, updated);
            return updated;
          });
        }
      } else {
        // Standard chat flow
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: newMessages.map(m => ({
              role: m.role,
              content: m.content
            })),
            mode: calcMode,
            model_id: globalModelId,
            reasoning_mode: isReasoningModeActive
          })
        });

        // Update stats after request
        fetchRequestStats();

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: "Erreur serveur" }));
          throw new Error(errData.error || "Erreur lors de la communication");
        }

        // Initialisation du message assistant vide
        const assistantMessageId = (Date.now() + 1).toString();
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: 'system',
          content: "",
          reasoning: "",
          timestamp: new Date(),
          level: calcMode === 'RATISS Cypher ODV' ? 'Cypher ODV' : (calcMode === 'Phenix ODV (Competition)' ? 'Phenix ODV' : 'Standard')
        };

        setMessages(prev => [...prev, assistantMessage]);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";
        let accumulatedReasoning = "";

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
                  if (data.reasoning) {
                    accumulatedReasoning += data.reasoning;
                    setMessages(prev => prev.map(m => 
                      m.id === assistantMessageId ? { ...m, reasoning: accumulatedReasoning } : m
                    ));
                  }
                  if (data.content) {
                    accumulatedContent += data.content;
                    setMessages(prev => prev.map(m => 
                      m.id === assistantMessageId ? { ...m, content: accumulatedContent } : m
                    ));
                  }
                  if (data.imageUrl) {
                    setMessages(prev => prev.map(m => 
                      m.id === assistantMessageId ? { ...m, imageUrl: data.imageUrl } : m
                    ));
                  }
                  if (data.error) {
                    throw new Error(data.error);
                  }
                } catch (e) {
                  // Ignore parsing errors for partial chunks
                }
              }
            }
          }
        }

        // Final save to storage
        setMessages(prev => {
          saveMessagesToStorage(currentSessionId, prev);
          
          // --- LOGIQUE AGENTIQUE PHENIX ODV : EXÉCUTION PYTHON AUTOMATIQUE ---
          const lastMsg = prev[prev.length - 1];
          if (calcMode === 'Phenix ODV (Competition)' && lastMsg && lastMsg.content.includes('[PYTHON_EXEC_START]')) {
            const match = lastMsg.content.match(/\[PYTHON_EXEC_START\]([\s\S]*?)\[PYTHON_EXEC_END\]/);
            if (match && match[1]) {
              const pythonCode = match[1].trim();
              executePythonAgentic(pythonCode, assistantMessageId);
            }
          }
          
          return prev;
        });
      }

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: "⚠️ [ERREUR RATISS] " + error.message,
        timestamp: new Date(),
      };
      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);
      saveMessagesToStorage(currentSessionId, finalMessages);
    } finally {
      setIsThinking(false);
      window.dispatchEvent(new CustomEvent("ratiss-agent-task-end", { detail: { status: "success" } }));
      setIsForensicsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelOngoingRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
  };

  const executePythonAgentic = async (code: string, messageId: string) => {
    try {
      const response = await fetch("/api/competition/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await response.json();
      
      let executionReport = "\n\n### ⚙️ RAPPORT D'EXÉCUTION PHENIX-ODV\n";
      if (data.stdout) executionReport += `**STDOUT** :\n\`\`\`\n${data.stdout}\n\`\`\`\n`;
      if (data.stderr) executionReport += `**STDERR** :\n\`\`\`\n${data.stderr}\n\`\`\`\n`;
      if (data.error) executionReport += `**ERREUR** : ${data.error}\n`;
      
      setMessages(prev => {
        const updated = prev.map(m => m.id === messageId ? { ...m, content: m.content + executionReport } : m);
        saveMessagesToStorage(currentSessionId!, updated);
        return updated;
      });
    } catch (err) {
      console.error("[PHENIX-EXEC-ERROR]", err);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleEdit = (id: string, content: string) => {
    cancelOngoingRequest();
    if (chatInputRef.current) {
        chatInputRef.current.setValue(content);
    }
    
    // Remove this message and all subsequent ones
    const index = messages.findIndex(m => m.id === id);
    if (index !== -1) {
      const updatedMessages = messages.slice(0, index);
      setMessages(updatedMessages);
      if (currentSessionId) {
        saveMessagesToStorage(currentSessionId, updatedMessages);
      }
    }
  };

  const handleRetry = (id: string) => {
    cancelOngoingRequest();
    
    const index = messages.findIndex(m => m.id === id);
    if (index !== -1) {
      const content = messages[index].content;
      const updatedMessages = messages.slice(0, index);
      setMessages(updatedMessages);
      
      handleSend(content);
    }
  };

  const setupApiKey = async () => {
    if (!configApiKey.trim()) return;
    setIsSavingKey(true);
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/config/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedKeyProvider, api_key: configApiKey })
      });
      const data = await response.json();
      if (data.configured || data.status === "success") {
        setSaveSuccess(true);
        setIsConfigured(true);
        if (data.providers) setLlmProviders(data.providers);
        fetchLlmStatus();
        setTimeout(() => {
          setIsConfigModalOpen(false);
          setConfigApiKey("");
          setSaveSuccess(false);
          setShowApiKey(false);
        }, 1500);
      } else {
        alert(data.error || "Erreur de configuration");
      }
    } catch (error: any) {
      alert("Erreur lors de la persistance: " + error.message);
    } finally {
      setIsSavingKey(false);
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-1000 ${isCompetitionBranch ? 'bg-black selection:bg-red-500/30' : 'bg-[#0b0b0b] selection:bg-blue-500/30'}`}>
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewChat}
        onSelectSession={switchSession}
        isCompetitionBranch={isCompetitionBranch}
        onToggleBranch={() => {
          const next = !isCompetitionBranch;
          setIsCompetitionBranch(next);
          if (next) setCalcMode('Phenix ODV (Competition)');
          else setCalcMode('Standard (N1)');
        }}
        onImportSession={handleImportBackup}
      />

      <main className={`flex-1 flex flex-col relative overflow-hidden transition-colors duration-1000 ${isCompetitionBranch ? 'bg-black pt-0' : 'bg-[#0b0b0b] pt-0'}`}>
        {/* Phenix Overlay */}
        {isCompetitionBranch && (
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600/40 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full h-[30%] bg-gradient-to-t from-red-950/10 to-transparent opacity-50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-900/5 blur-[120px] rounded-full" />
          </div>
        )}

        {/* Header Minimaliste Style Groq */}
        <header className={`h-16 border-b flex items-center justify-between px-6 z-20 transition-colors ${isCompetitionBranch ? 'bg-black/80 border-red-900/20' : 'bg-[#0b0b0b]/80 border-white/5'} backdrop-blur-xl`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 hover:bg-white/5 rounded-lg transition-colors ${sidebarOpen ? 'text-white' : 'text-slate-500'}`}
            >
              <PanelLeft className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col">
              <h1 className={`text-[11px] font-black tracking-[0.4em] uppercase transition-colors ${isCompetitionBranch ? 'text-red-500' : 'text-white'}`}>
                {isCompetitionBranch ? "PHENIX BRANCH [COMPETITION]" : "RATISS CYPHER ODV"}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1 h-1 rounded-full shadow-[0_0_5px] transition-colors ${isCompetitionBranch ? 'bg-red-500 shadow-red-500' : 'bg-blue-500 shadow-blue-500'}`} />
                <span className="text-[8px] font-mono text-slate-500 tracking-widest uppercase">
                  {isCompetitionBranch ? "Active Combat Mode" : "Système Cognitif Souverain"}
                </span>
              </div>
            </div>

            {/* RATISS Model Selector Pill moved to Header */}
            <div className="relative ml-2">
              <motion.button 
                layout
                onClick={() => setIsModelMenuOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all group active:scale-95 ${
                  isCompetitionBranch 
                  ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20' 
                  : 'bg-white/10 hover:bg-white/20 border-white/10'
                }`}
              >
                <motion.span 
                  layout
                  className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${
                    isCompetitionBranch ? 'text-red-400 group-hover:text-red-300' : 'text-slate-400 group-hover:text-white'
                  }`}
                >
                  {calcMode}
                </motion.span>
                <ChevronDown className={`w-2.5 h-2.5 transition-colors ${isCompetitionBranch ? 'text-red-500' : 'text-slate-500'}`} />
              </motion.button>
            </div>

            {/* MODEL Reference Badge (Piloted OpenRouter LLM) */}
            <button 
              onClick={() => setIsOpenRouterModelMenuOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all active:scale-95 cursor-pointer"
              title="Cliquer pour changer le modèle LLM OpenRouter piloté par RATISS"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-[9px] font-mono text-cyan-400 tracking-widest uppercase font-black flex items-center gap-1">
                ENGINE : <span className="text-white">{currentModel.name.toUpperCase()}</span>
                <ChevronDown className="w-2.5 h-2.5 text-cyan-400" />
              </span>
            </button>
          </div>

          <div className="flex items-center gap-4 relative z-50">
            {isCompetitionBranch && (
              <button 
                onClick={() => {
                  setIsCompetitionBranch(false);
                  setCalcMode('Standard (N1)');
                }}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all active:scale-95"
              >
                Exit Phenix
              </button>
            )}

            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${
              isConfigured 
              ? (isCompetitionBranch ? 'border-red-500/20 bg-red-500/5' : 'border-green-500/20 bg-green-500/5')
              : 'border-blue-500/20 bg-blue-500/5'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-lg ${
                isConfigured 
                ? (isCompetitionBranch ? 'bg-red-500 shadow-red-500/50' : 'bg-green-500 shadow-green-500/50')
                : 'bg-blue-500 shadow-blue-500/50'
              }`} />
              <span className={`text-[10px] font-mono tracking-widest uppercase ${
                isConfigured 
                ? (isCompetitionBranch ? 'text-red-500' : 'text-green-500')
                : 'text-blue-500'
              }`}>
                {isConfigured ? 'API: CONNECTÉ' : 'PORT API: PRÊT'}
              </span>
            </div>

            {/* QUOTA VISUALIZATION */}
            <div className={`hidden lg:flex flex-col gap-1 px-3 py-1.5 rounded-xl border transition-all duration-500 ${
              isCompetitionBranch ? 'border-red-500/10 bg-red-500/5' : 'border-white/5 bg-white/5'
            }`}>
              <div className="flex items-center justify-between gap-8 mb-0.5">
                <span className={`text-[8px] font-bold uppercase tracking-widest ${isCompetitionBranch ? 'text-red-400' : 'text-slate-400'}`}>
                  QUOTA QUOTIDIEN
                </span>
                <span className={`text-[8px] font-mono font-bold ${
                  requestStats.count >= requestStats.quota ? 'text-red-500' : (isCompetitionBranch ? 'text-red-400' : 'text-blue-400')
                }`}>
                  {requestStats.count} / {requestStats.quota}
                </span>
              </div>
              <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (requestStats.count / requestStats.quota) * 100)}%` }}
                  className={`h-full rounded-full ${
                    requestStats.count >= requestStats.quota 
                      ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' 
                      : (isCompetitionBranch ? 'bg-red-500' : 'bg-blue-500 shadow-[0_0_8px_#3b82f6]')
                  }`}
                />
              </div>
            </div>

             <button 
              onClick={() => setIsLiveOpen(true)}
              className="p-2.5 rounded-lg transition-all active:scale-95 cursor-pointer bg-red-600/10 hover:bg-red-600/20 text-red-500 hover:text-red-400 border border-red-500/20 flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.15)] font-bold animate-pulse"
              title="Lancer Ratiss Live (Vocal en direct)"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]" />
              <Mic className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-wider hidden sm:inline">Live</span>
            </button>

             <button 
              onClick={() => {
                setShowLab(!showLab);
                setShowSettingsBranch(false);
                setShowTerminal(false);
              }}
              className={`p-2.5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 border ${
                showLab 
                  ? 'bg-[#2563eb]/20 text-[#2563eb] border-[#2563eb]/30 shadow-[0_0_15px_rgba(37,99,235,0.2)] font-black' 
                  : 'hover:bg-white/10 text-slate-400 hover:text-white border-transparent'
              }`}
              title={showLab ? "Retourner au Chat" : "Ouvrir le Sovereign Quantum Lab V9"}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">{showLab ? "Chat" : "Lab V9"}</span>
            </button>
            <button 
              onClick={() => {
                setShowTerminal(!showTerminal);
                setShowLab(false);
                setShowSettingsBranch(false);
              }}
              className={`p-2.5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 border ${
                showTerminal 
                  ? 'bg-[#2563eb]/20 text-[#2563eb] border-[#2563eb]/30 shadow-[0_0_15px_rgba(37,99,235,0.2)] font-black' 
                  : 'hover:bg-white/10 text-slate-400 hover:text-white border-transparent'
              }`}
              title={showTerminal ? "Retourner au Chat" : "Ouvrir le Terminal VM de RATISS"}
            >
              <Terminal className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">{showTerminal ? "Chat" : "Terminal VM"}</span>
            </button>
            <button 
              onClick={() => {
                setSettingsInitialTab("archives");
                setShowSettingsBranch(!showSettingsBranch);
                setShowLab(false);
                setShowTerminal(false);
              }}
              className={`p-2.5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 border ${
                showSettingsBranch 
                  ? 'bg-[#2563eb]/20 text-[#2563eb] border-[#2563eb]/30 shadow-[0_0_15px_rgba(37,99,235,0.2)] font-black' 
                  : 'hover:bg-white/10 text-slate-400 hover:text-white border-transparent'
              }`}
              title={showSettingsBranch ? "Retourner au Chat" : "Ouvrir la Branche Paramètres"}
            >
              <Sliders className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">{showSettingsBranch ? "Chat" : "Paramètres"}</span>
            </button>
            {currentSessionId && (
              <div className="relative">
                <button 
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="p-2.5 rounded-lg transition-all active:scale-95 cursor-pointer hover:bg-white/10 text-slate-400 hover:text-blue-400 flex items-center justify-center"
                  title="Exporter cette conversation"
                >
                  <Download className="w-5 h-5" />
                </button>
                
                <AnimatePresence>
                  {isExportMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute top-12 right-0 w-48 border rounded-2xl p-2 shadow-2xl z-50 ${
                        isCompetitionBranch ? 'bg-black border-red-900/30' : 'bg-[#181818] border-white/10'
                      }`}
                    >
                      <span className="px-2.5 py-1.5 text-[9px] font-mono tracking-widest text-slate-500 uppercase font-black block border-b border-white/5 mb-1">
                        FORMAT D'EXPORT
                      </span>
                      <button
                        onClick={() => {
                          handleExportIndividualJSON();
                          setIsExportMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors hover:bg-white/5 text-slate-300 hover:text-white text-left"
                      >
                        <FileText className="w-4 h-4 text-amber-500" />
                        <span>Format JSON (.json)</span>
                      </button>
                      <button
                        onClick={() => {
                          handleExportIndividualMD();
                          setIsExportMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors hover:bg-white/5 text-slate-300 hover:text-white text-left"
                      >
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span>Format Markdown (.md)</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <button 
              onClick={() => currentSessionId && deleteSession(currentSessionId)}
              className="p-2.5 rounded-lg transition-all active:scale-95 cursor-pointer hover:bg-white/10 text-slate-400 hover:text-red-400"
              title="Supprimer la conversation"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsVoiceModalOpen(true)}
              className="p-2.5 rounded-lg transition-all active:scale-95 cursor-pointer hover:bg-white/10 text-slate-400 hover:text-blue-400"
              title="Gestion des Voix (Piper TTS)"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsConfigModalOpen(true)}
              className={`p-2.5 rounded-lg transition-all active:scale-95 cursor-pointer ${
                isConfigured ? 'bg-green-500/10 text-green-500' : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
              title="Configuration API"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Configuration Modal */}
        <AnimatePresence>
          {isConfigModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/80">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-[#0b0b0b] border border-white/10 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative"
              >
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-500/10 blur-[80px] pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex flex-col items-center text-center mb-8">
                    <motion.div 
                      animate={saveSuccess ? { scale: [1, 1.2, 1], rotate: [0, 360, 360] } : {}}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-500 ${
                        saveSuccess ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/10 text-blue-500'
                      }`}
                    >
                      {saveSuccess ? <Check className="w-7 h-7" /> : <Settings className="w-7 h-7" />}
                    </motion.div>
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      {saveSuccess ? "Injection Réussie" : (isConfigured ? "Système Connecté" : "Configuration RATISS")}
                    </h2>
                    <p className="text-sm text-slate-500 mt-2">
                      {saveSuccess ? "La clé API a été chiffrée et persistée côté serveur." : "Système de persistance direct (Backend Only)"}
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Sélecteur de fournisseur LLM */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-slate-600 uppercase tracking-widest ml-1">Fournisseur LLM</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "anthropic", label: "Anthropic (Claude)", color: "orange" },
                          { key: "google", label: "Google (Gemini)", color: "blue" },
                          { key: "openai", label: "OpenAI (GPT)", color: "emerald" },
                          { key: "openrouter", label: "OpenRouter (Nemotron)", color: "purple" },
                        ].map((prov) => {
                          const isActive = selectedKeyProvider === prov.key;
                          const isConn = llmProviders[prov.key]?.configured;
                          return (
                            <button
                              key={prov.key}
                              onClick={() => setSelectedKeyProvider(prov.key)}
                              className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-medium transition-all ${
                                isActive
                                  ? 'bg-blue-500/10 border-blue-500/40 text-white'
                                  : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05]'
                              }`}
                            >
                              {prov.label}
                              {isConn && (
                                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                          Clé API {selectedKeyProvider === 'anthropic' ? 'Anthropic' : selectedKeyProvider === 'google' ? 'Gemini' : selectedKeyProvider === 'openai' ? 'OpenAI' : 'OpenRouter'}
                        </label>
                        <button 
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-[10px] font-mono text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
                        >
                          {showApiKey ? "Masquer" : "Afficher"}
                        </button>
                      </div>
                      <div className="relative group">
                        <input 
                          type={showApiKey ? "text" : "password"}
                          value={configApiKey}
                          onChange={(e) => setConfigApiKey(e.target.value)}
                          placeholder={selectedKeyProvider === 'anthropic' ? 'sk-ant-...' : selectedKeyProvider === 'google' ? 'AIza...' : selectedKeyProvider === 'openai' ? 'sk-...' : 'sk-or-...'}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-slate-800 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
                        />
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${configApiKey ? 'bg-blue-500 shadow-[0_0_8px_#2563eb]' : 'bg-slate-800'}`} />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => {
                          setIsConfigModalOpen(false);
                          setSaveSuccess(false);
                        }}
                        className="flex-1 px-4 py-4 rounded-2xl bg-white/5 text-slate-400 text-sm font-medium hover:bg-white/10 transition-all active:scale-95"
                      >
                        Annuler
                      </button>
                      <button 
                        onClick={setupApiKey}
                        disabled={isSavingKey || !configApiKey.trim() || saveSuccess}
                        className={`flex-1 px-4 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                          saveSuccess 
                            ? 'bg-green-600 text-white' 
                            : 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-[0_0_20px_rgba(37,99,235,0.2)] disabled:opacity-50 disabled:shadow-none'
                        }`}
                      >
                        {isSavingKey ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Synchronisation...</span>
                          </>
                        ) : saveSuccess ? (
                          "Terminé"
                        ) : (
                          isConfigured ? "Mettre à jour" : "Sauvegarder"
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-6 text-[9px] font-mono text-slate-700 uppercase tracking-widest font-bold">
                    <span className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-green-500/50" />
                      AES-256
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                      SÉCURITÉ DIRECTE
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Model Selection Modal */}
        <AnimatePresence>
          {isModelMenuOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-lg bg-[#0b0b0b] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8 px-2">
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-white tracking-tight">Sélecteur de Traitement</h2>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mt-1">Moteurs Cognitifs RATISS</p>
                  </div>
                  <button 
                    onClick={() => setIsModelMenuOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                <div className="grid gap-3">
                  {(Object.keys(modelMetadata) as CalculationMode[]).map((mode, idx) => {
                    const meta = modelMetadata[mode];
                    const Icon = meta.icon;
                    const isActive = calcMode === mode;

                    return (
                      <motion.button 
                        key={mode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => {
                          handleSetCalcMode(mode);
                          setIsModelMenuOpen(false);
                        }}
                        className={`group relative flex items-center gap-4 p-4 rounded-3xl border transition-all duration-300 ${
                          isActive 
                            ? 'bg-[#2563eb]/10 border-[#2563eb]/30 shadow-[0_0_20px_rgba(37,99,235,0.1)]' 
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                          isActive ? 'bg-[#2563eb] text-white shadow-lg' : 'bg-white/5 text-slate-500 group-hover:text-slate-300'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 text-left">
                          <div className={`text-[13px] font-bold tracking-tight uppercase ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                            {mode}
                          </div>
                          <div className="text-[11px] text-slate-500 font-light mt-0.5">
                            {meta.desc}
                          </div>
                        </div>

                        {isActive && (
                          <div className="pr-2">
                            <Check className="w-4 h-4 text-[#2563eb]" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-6 text-[9px] font-mono text-slate-700 uppercase tracking-widest font-bold">
                  <span>OPTIMISÉ V8-Ω</span>
                  <span>SÉCURITÉ ONTOLOGIQUE</span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* OpenRouter Piloted LLM Engine Selection Modal */}
        <AnimatePresence>
          {isOpenRouterModelMenuOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-lg bg-[#0b0b0b] border border-cyan-500/20 rounded-[2.5rem] p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6 px-2">
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-white tracking-tight">Modèle LLM Multi-Fournisseurs</h2>
                    <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.2em] mt-1">Anthropic · Gemini · OpenAI · OpenRouter · Souverain</p>
                  </div>
                  <button 
                    onClick={() => setIsOpenRouterModelMenuOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                <div className="grid gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
                  {(() => {
                    const providerKeyMap: Record<string, string> = {
                      "Anthropic": "anthropic", "Google": "google", "OpenAI": "openai",
                      "OpenRouter": "openrouter", "Souverain": "local",
                    };
                    const groups: Record<string, typeof MODELS> = {};
                    MODELS.forEach(m => {
                      if (!groups[m.provider]) groups[m.provider] = [];
                      groups[m.provider].push(m);
                    });
                    let flatIdx = 0;
                    return PROVIDER_ORDER
                      .filter(p => groups[p])
                      .map(providerName => (
                        <div key={providerName}>
                          <div className="flex items-center gap-2 px-2 pt-3 pb-1">
                            <span className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.2em] font-bold">{providerName}</span>
                            {(() => {
                              const pk = providerKeyMap[providerName];
                              const isConn = pk && pk !== 'local' && llmProviders[pk]?.configured;
                              return isConn ? (
                                <span className="text-[9px] font-mono text-green-500 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" /> Connecté
                                </span>
                              ) : pk && pk !== 'local' ? (
                                <span className="text-[9px] font-mono text-slate-700">Non configuré</span>
                              ) : null;
                            })()}
                          </div>
                          {groups[providerName].map((m) => {
                            const idx = flatIdx++;
                            const isActive = globalModelId === m.id;
                            return (
                              <motion.button 
                                key={m.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                onClick={() => {
                                  updateGlobalModelId(m.id);
                                  setIsOpenRouterModelMenuOpen(false);
                                }}
                                className={`group relative flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all duration-300 ${
                                  isActive 
                                    ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors text-xs font-bold font-mono ${
                                  isActive ? 'bg-cyan-500 text-black font-black shadow-lg' : 'bg-white/5 text-slate-400 group-hover:text-slate-200'
                                }`}>
                                  {m.provider.substring(0, 3).toUpperCase()}
                                </div>
                                <div className="flex-1 text-left">
                                  <div className={`text-[12px] font-bold tracking-tight ${isActive ? 'text-cyan-300' : 'text-slate-300 group-hover:text-white'}`}>
                                    {m.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-light mt-0.5">
                                    {m.desc}
                                  </div>
                                </div>
                                {isActive && (
                                  <div className="pr-2">
                                    <Check className="w-4 h-4 text-cyan-400" />
                                  </div>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold px-2">
                  <span>ORCHESTRATION SOUVERAINE RATISS</span>
                  <button
                    onClick={() => { setIsOpenRouterModelMenuOpen(false); setIsConfigModalOpen(true); }}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    CONFIGURER CLÉS API →
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Flux de Discussion, Sovereign Lab, Terminal VM OU Branche Paramètres */}
        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 flex flex-col overflow-y-auto">
            {showSettingsBranch ? (
          <div className="flex-1 overflow-y-auto px-2 md:px-4 py-8">
            <div className="max-w-[98%] mx-auto">
              <SettingsBranch 
                sessions={sessions} 
                onClose={() => setShowSettingsBranch(false)}
                isCompetitionBranch={isCompetitionBranch}
                onImportSession={handleImportBackup}
                onAttachFile={(file) => {
                  setAttachedFile(file);
                  setShowSettingsBranch(false);
                }}
                initialTab={settingsInitialTab}
              />
            </div>
          </div>
        ) : showLab ? (
          <div className="flex-1 overflow-y-auto px-2 md:px-4 py-8">
            <div className="max-w-[98%] mx-auto">
              <SovereignLab />
            </div>
          </div>
        ) : showTerminal ? (
          <div className="flex-1 overflow-y-auto px-2 md:px-4 py-8">
            <div className="max-w-[98%] mx-auto">
              <InteractiveTerminal />
            </div>
          </div>
        ) : (
          <>
            {/* Flux de Discussion */}
            <div className="flex-1 overflow-y-auto px-2 md:px-4 py-10">
              <div className={`max-w-[98%] mx-auto space-y-4 ${isCompetitionBranch ? 'border-x border-red-900/10 px-6' : ''}`}>
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center py-20 px-4">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-[0_0_35px_rgba(6,182,212,0.3)] mb-6 animate-pulse"
                    >
                      <Cpu className="w-10 h-10 text-cyan-200" />
                    </motion.div>
                    
                    <motion.h2 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-2xl font-black tracking-tight text-white uppercase"
                    >
                      RATISS CYPHER ODV
                    </motion.h2>
                    
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-slate-500 text-xs font-mono tracking-widest uppercase mt-2 max-w-md"
                    >
                      Système d'Exploration Sémantique et d'Analyse Topologique Souveraine
                    </motion.p>

                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mt-8 px-6 py-5 rounded-[2rem] bg-cyan-500/5 border border-cyan-500/20 shadow-[0_0_25px_rgba(6,182,212,0.08)] max-w-md flex flex-col items-center"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                        <span className="text-[10px] font-black tracking-[0.2em] text-cyan-400 uppercase">PIPELINE ACTIF</span>
                      </div>
                      <p className="text-[15px] font-black text-white font-mono tracking-wide">
                        {currentModel.name.toUpperCase()}
                      </p>
                      <p className="text-[10px] text-slate-400 font-light mt-1.5 leading-relaxed">
                        Architecture de raisonnement quantique à ultra-haute fidélité sémantique. Prêt pour l'exploration.
                      </p>
                    </motion.div>
                  </div>
                )}

                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                      <MessageBubble 
                        message={msg} 
                        onCopy={handleCopy}
                        onEdit={handleEdit}
                        onRetry={handleRetry}
                        voiceId={selectedVoiceId}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isThinking && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <ThinkingLoader prompt={messages.slice().reverse().find(m => m.role === "user")?.content} />
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Predictive Suggestions Chips Bar */}
            <PredictiveSuggestions 
              lastMessage={messages[messages.length - 1]?.content || ""}
              onSelectSuggestion={(prompt) => handleSend(prompt)}
              isThinking={isThinking}
            />

            {/* Barre de Saisie Flottante Réinventée */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`px-2 md:px-4 pb-12 pt-1 transition-all ${isCompetitionBranch ? 'bg-black' : ''}`}
            >
              <div className="max-w-[98%] mx-auto relative">
                <div className={`relative border rounded-[2.5rem] p-3 pl-4 pr-3 shadow-2xl transition-all duration-300 ${
                  isCompetitionBranch 
                  ? 'bg-black border-red-900/30 focus-within:border-red-500/50 focus-within:shadow-[0_0_50px_rgba(239,68,68,0.05)]' 
                  : 'bg-[#121212] border-white/10 focus-within:border-white/20 focus-within:shadow-[0_0_50px_rgba(37,99,235,0.1)]'
                }`}>
                  {/* Compact Attached File Chip */}
                  {attachedFile && (
                    <div className="flex items-center gap-3 p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-2xl max-w-md mb-3 text-xs text-slate-200 select-none shadow-lg animate-fade-in backdrop-blur-md">
                      {attachedImagePreview ? (
                        <img src={attachedImagePreview} alt={attachedFile.name} className="w-12 h-12 object-cover rounded-xl border border-cyan-500/30 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-cyan-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-medium truncate text-cyan-200">{attachedFile.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {(attachedFile.size / 1024).toFixed(1)} KB • {attachedFile.type || "Fichier Prêt"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSend("")}
                        disabled={isThinking}
                        className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black font-mono font-bold text-[11px] rounded-xl transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)] flex items-center gap-1.5 shrink-0"
                      >
                        <Zap className="w-3.5 h-3.5 fill-black" />
                        <span>Analyser</span>
                      </button>

                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAttachedFile(null); setAttachedImagePreview(null); }} 
                        className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors shrink-0"
                        title="Retirer le fichier"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {/* Universal + Button */}
                    <div className="relative">
                      <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                          isMenuOpen 
                          ? 'bg-white/10 rotate-45' 
                          : (isCompetitionBranch ? 'bg-red-500/5 hover:bg-red-500/10' : 'bg-white/5 hover:bg-white/10')
                        }`}
                      >
                        <Plus className={`w-5 h-5 ${isCompetitionBranch ? 'text-red-500' : 'text-slate-400'}`} />
                      </button>
                      
                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className={`absolute bottom-14 left-0 w-48 border rounded-2xl p-2 shadow-2xl z-50 ${
                              isCompetitionBranch ? 'bg-black border-red-900/30' : 'bg-[#181818] border-white/10'
                            }`}
                          >
                            <input 
                              type="file" 
                              ref={cameraInputRef} 
                              accept="image/*"
                              capture="environment"
                              className="hidden" 
                              onChange={handleFileSelect}
                            />
                            <input 
                              type="file" 
                              ref={galleryInputRef} 
                              accept="image/*"
                              className="hidden" 
                              onChange={handleFileSelect}
                            />
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              accept="*/*"
                              className="hidden" 
                              onChange={handleFileSelect}
                            />
                            
                            {/* Engine Selection Toggle */}
                            <div className="px-2.5 py-2 border-b border-white/5 mb-1.5 text-left">
                              <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-black block mb-2">
                                MOTEUR FORENSICS
                              </span>
                              <div className="flex gap-1 p-0.5 bg-black/60 rounded-xl border border-white/5">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setForensicsEngine('gemini'); }}
                                  className={`flex-1 py-1 rounded-lg text-[9px] font-bold uppercase transition-all duration-200 ${
                                    forensicsEngine === 'gemini'
                                      ? (isCompetitionBranch ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.1)]' : 'bg-blue-600/15 text-blue-400 border border-blue-500/20')
                                      : 'text-slate-500 hover:text-slate-300 border border-transparent'
                                  }`}
                                >
                                  Gemini
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setForensicsEngine('nemotron'); }}
                                  className={`flex-1 py-1 rounded-lg text-[9px] font-bold uppercase transition-all duration-200 ${
                                    forensicsEngine === 'nemotron'
                                      ? (isCompetitionBranch ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.1)]' : 'bg-blue-600/15 text-blue-400 border border-blue-500/20')
                                      : 'text-slate-500 hover:text-slate-300 border border-transparent'
                                  }`}
                                >
                                  Nemotron
                                </button>
                              </div>
                            </div>

                            {[
                              { icon: Camera, label: "Caméra", action: () => { cameraInputRef.current?.click(); setIsMenuOpen(false); } },
                              { icon: ImageIcon, label: "Galerie", action: () => { galleryInputRef.current?.click(); setIsMenuOpen(false); } },
                              { icon: FileText, label: "Fichiers", action: () => { fileInputRef.current?.click(); setIsMenuOpen(false); } },
                              { icon: Sparkles, label: "Pont IA (Hex/B64)", action: () => { openSettingsWithTab("bridge_ia"); setIsMenuOpen(false); } },
                              { 
                                icon: Brain, 
                                label: isReasoningModeActive ? "Désactiver Raisonnement" : "Raisonnement Ultra [Boost]", 
                                action: () => { 
                                  const newVal = !isReasoningModeActive;
                                  setIsReasoningModeActive(newVal);
                                  localStorage.setItem("ratiss_ultra_reasoning", newVal ? "true" : "false");
                                  setIsMenuOpen(false);
                                } 
                              }
                            ].map((item) => (
                              <motion.button 
                                key={item.label}
                                onClick={item.action}
                                whileHover={{ x: 5, backgroundColor: isCompetitionBranch ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.05)" }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                                  isCompetitionBranch ? 'text-red-400' : 'text-slate-300'
                                }`}
                              >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex-1 flex items-center">
                      {isForensicsLoading && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-xl mr-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                          <span className="text-[10px] font-mono text-red-500 uppercase tracking-widest whitespace-nowrap">Forensics Analysis...</span>
                        </div>
                      )}
                      {isReasoningModeActive && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl mr-2">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest whitespace-nowrap font-bold">Raisonnement Ultra</span>
                        </div>
                      )}
                      <ChatInput 
                        ref={chatInputRef}
                        onSend={handleSend}
                        isThinking={isThinking}
                        hasAttachment={!!attachedFile}
                      />
                    </div>
                  </div>
                </div>

                {/* Invariant Indicators */}
                <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 text-[8px] font-mono uppercase tracking-[0.4em] whitespace-nowrap font-bold transition-colors ${
                  isCompetitionBranch ? 'text-red-900/60' : 'text-slate-700'
                }`}>
                  <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 3, repeat: Infinity }}>N2 ONTOLOGIQUE</motion.span>
                  <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }}>PANTHÉON ACTIF</motion.span>
                  <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 3, repeat: Infinity, delay: 2 }}>V8-Ω INVARIANT</motion.span>
                </div>
              </div>
            </motion.div>
          </>
        )}
          </div>
        </div>
      </main>

      <VoiceManager 
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        selectedVoiceId={selectedVoiceId}
        onSelectVoice={handleSelectVoice}
      />

      <RatissLive
        isOpen={isLiveOpen}
        onClose={() => setIsLiveOpen(false)}
        voiceId={selectedVoiceId}
        calcMode={calcMode}
      />
    </div>
  );
}
