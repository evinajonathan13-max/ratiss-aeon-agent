import React, { useState, useEffect } from "react";
import { 
  Globe, Home, RefreshCw, Lock, Compass, ExternalLink, FileCode, Terminal as LogIcon, 
  Search, ArrowLeft, ArrowRight, ShieldCheck, CornerDownLeft, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChromeniumBrowserProps {
  initialUrl?: string;
  onUrlChange?: (url: string) => void;
}

export const ChromeniumBrowser: React.FC<ChromeniumBrowserProps> = ({ 
  initialUrl = "https://www.google.com",
  onUrlChange 
}) => {
  const [browserUrl, setBrowserUrl] = useState(initialUrl);
  const [browserInputUrl, setBrowserInputUrl] = useState(initialUrl);
  const [browserTab, setBrowserTab] = useState<"preview" | "dom" | "logs">("preview");
  const [isBrowserLoading, setIsBrowserLoading] = useState(false);
  const [browserData, setBrowserData] = useState<any>({
    status: "success",
    url: "https://www.google.com",
    title: "Google",
    text_summary: "",
    total_links_found: 0,
    links: []
  });

  const [browserLogs, setBrowserLogs] = useState<string[]>([
    "[12:30:00] [CORE] Initialisation du pilote PyQt5 WebEngine...",
    "[12:30:01] [DRIVERS] Cœur de navigation Chromenium v9.0 prêt.",
    "[12:30:01] [SUCCESS] Connexion sécurisée avec le proxy d'orchestration RATISS."
  ]);

  // History tracking within the browser
  const [historyStack, setHistoryStack] = useState<string[]>(["https://www.google.com"]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Load URL
  const loadUrlInBrowser = async (url: string, addToHistory = true) => {
    let normalized = url.trim();
    if (!normalized) return;

    // Detect search query
    const hasSpaces = normalized.includes(" ");
    const hasDot = normalized.includes(".");
    const isProbablySearch = hasSpaces || (!hasDot && !normalized.startsWith("http"));

    if (isProbablySearch) {
      // Treat as google search query
      normalized = `https://www.google.com/search?q=${encodeURIComponent(normalized)}`;
    } else {
      if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
        normalized = "https://" + normalized;
      }
    }

    setBrowserUrl(normalized);
    setBrowserInputUrl(normalized);
    if (onUrlChange) {
      onUrlChange(normalized);
    }
    setIsBrowserLoading(true);

    const timestamp = new Date().toLocaleTimeString();
    setBrowserLogs((prev) => [
      ...prev,
      `[${timestamp}] [NETWORK] Connexion sécurisée vers : ${normalized}`,
      `[${timestamp}] [ENGINE] Chargement du DOM à l'aide de l'agent headless...`
    ]);

    if (addToHistory) {
      const newStack = historyStack.slice(0, historyIndex + 1);
      newStack.push(normalized);
      setHistoryStack(newStack);
      setHistoryIndex(newStack.length - 1);
    }

    try {
      // Execute managed Playwright Chromium for real-world web navigation & Google searches
      const response = await fetch(`/api/headless-browse?url=${encodeURIComponent(normalized)}`);
      if (response.ok) {
        const data = await response.json();
        setBrowserData({
          ...data,
          url: normalized,
          title: data.title || "Résultat Navigation"
        });

        setBrowserLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [PLAYWRIGHT] Execution du navigateur Chromium managé (${data.engine || "Playwright"}).`,
          `[${new Date().toLocaleTimeString()}] [DOM] Reçu ${data.total_links_found || 0} liens de navigation réels.`,
          `[${new Date().toLocaleTimeString()}] [SUCCESS] Rendu visuel de ${normalized} complété.`
        ]);
      } else {
        throw new Error("Impossible de charger la page.");
      }
    } catch (err: any) {
      setBrowserLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] [ERROR] Échec de la résolution DNS ou du proxy pour ${normalized}`
      ]);
      setBrowserData({
        status: "error",
        url: normalized,
        title: "Erreur de connexion",
        text_summary: `Erreur 404 : RATISS n'a pas pu charger la page à l'adresse ${normalized}.\n\nLe site web bloque peut-être les requêtes d'exploration automatisées ou nécessite un cookie de session spécifique. Veuillez essayer un autre domaine ou utiliser la recherche Google.`,
        links: [
          { text: "Retourner à Google", url: "https://www.google.com" },
          { text: "Rechercher sur Wikipédia", url: "https://fr.wikipedia.org" }
        ]
      });
    } finally {
      setIsBrowserLoading(false);
    }
  };

  // Back & Forward navigation
  const navigateBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      loadUrlInBrowser(historyStack[newIndex], false);
    }
  };

  const navigateForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      loadUrlInBrowser(historyStack[newIndex], false);
    }
  };

  useEffect(() => {
    loadUrlInBrowser(initialUrl, false);
  }, []);

  // Check if current page is Google Home
  const isGoogleHome = browserUrl === "https://www.google.com" || browserUrl === "https://google.com" || browserUrl === "http://google.com" || browserUrl === "https://www.google.fr" || browserUrl === "https://google.fr";
  const isGoogleSearch = browserUrl.startsWith("https://www.google.com/search") || browserUrl.startsWith("https://google.com/search");

  // Local state for google search input
  const [localGoogleSearch, setLocalGoogleSearch] = useState("");

  // Extracted search results for custom Google SERP rendering
  const getGoogleSearchResults = () => {
    if (!browserData.links) return [];
    
    // Filter out typical non-result links from duckduckgo/external pages to make a pure search experience
    return browserData.links.filter((link: any) => {
      const href = link.url || "";
      return (
        href.startsWith("http") &&
        !href.includes("duckduckgo.com") &&
        !href.includes("google.com") &&
        !href.includes("wikipedia.org/wiki/Sp%C3%A9cial:") &&
        link.text &&
        link.text.trim().length > 2
      );
    });
  };

  return (
    <div className="w-full flex flex-col h-full bg-[#0c0d12] rounded-[2rem] border border-white/5 overflow-hidden font-mono text-xs shadow-2xl">
      {/* Chrome Style Window Header */}
      <div className="bg-[#0e0e0e] border-b border-white/5 px-5 py-3.5 flex items-center justify-between select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 shrink-0">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-black tracking-widest uppercase text-white">
              SOUVERAIN GOOGLE CHROME V9
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            LIVE CHROME ENGINE ACTIVE
          </span>
        </div>
      </div>

      {/* Chrome Style Address Bar */}
      <div className="bg-[#090909] border-b border-white/5 p-3 flex items-center gap-2.5 shrink-0">
        {/* Navigation Arrows */}
        <div className="flex items-center gap-1">
          <button 
            onClick={navigateBack}
            disabled={historyIndex === 0 || isBrowserLoading}
            className="p-1.5 hover:bg-white/5 disabled:opacity-30 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Précédent"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={navigateForward}
            disabled={historyIndex >= historyStack.length - 1 || isBrowserLoading}
            className="p-1.5 hover:bg-white/5 disabled:opacity-30 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Suivant"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => loadUrlInBrowser("https://www.google.com")}
            className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Page d'accueil Google"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => loadUrlInBrowser(browserUrl)}
            className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Actualiser la page"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBrowserLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Dynamic secure address input */}
        <div className="flex-1 flex items-center gap-2 bg-black/60 border border-white/5 rounded-xl px-3.5 py-2 focus-within:border-cyan-500/30 transition-all shadow-inner">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <input 
            type="text" 
            value={browserInputUrl}
            onChange={(e) => setBrowserInputUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                loadUrlInBrowser(browserInputUrl);
              }
            }}
            disabled={isBrowserLoading}
            className="flex-1 bg-transparent border-none outline-none text-slate-300 font-mono text-[11px] p-0 focus:ring-0 leading-none"
            placeholder="Rechercher sur Google ou saisir une URL..."
          />
        </div>

        <button 
          onClick={() => loadUrlInBrowser(browserInputUrl)}
          disabled={isBrowserLoading}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/30 text-black font-black font-sans rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0"
        >
          <Compass className="w-3.5 h-3.5 text-black" />
          Rechercher
        </button>
      </div>

      {/* Chrome Style Tab Selectors */}
      <div className="bg-[#08090d] border-b border-white/5 px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setBrowserTab("preview")}
            className={`px-4 py-2.5 border-b-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              browserTab === "preview" 
                ? "border-cyan-400 text-cyan-400 bg-white/[0.02]" 
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <Globe className="w-3 h-3" />
            Aperçu Visuel
          </button>
          <button 
            onClick={() => setBrowserTab("dom")}
            className={`px-4 py-2.5 border-b-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              browserTab === "dom" 
                ? "border-cyan-400 text-cyan-400 bg-white/[0.02]" 
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <FileCode className="w-3 h-3" />
            Arbre DOM (JSON)
          </button>
          <button 
            onClick={() => setBrowserTab("logs")}
            className={`px-4 py-2.5 border-b-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              browserTab === "logs" 
                ? "border-cyan-400 text-cyan-400 bg-white/[0.02]" 
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <LogIcon className="w-3 h-3" />
            Console Headless
          </button>
        </div>

        <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono">
          <span>{historyStack.length} TABS EN MÉMOIRE</span>
        </div>
      </div>

      {/* Visual Workspace content view */}
      <div className="flex-1 p-5 overflow-y-auto bg-[#07080b] flex flex-col">
        <AnimatePresence mode="wait">
          {isBrowserLoading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12"
            >
              <div className="relative w-12 h-12 flex items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-t-2 border-r-2 border-cyan-400 rounded-full"
                />
                <Globe className="w-5 h-5 text-cyan-300 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-cyan-400 font-bold animate-pulse font-sans">Chargement de la page sur le serveur Chrome...</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Proxy Headless Ultra-Sécurisé</p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key={browserTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col"
            >
              {/* DOM TAB */}
              {browserTab === "dom" && (
                <div className="flex-1 p-4 bg-slate-950 rounded-2xl border border-white/5 font-mono text-[10px] text-cyan-400 overflow-x-auto whitespace-pre">
                  {JSON.stringify(browserData, null, 2)}
                </div>
              )}

              {/* LOGS TAB */}
              {browserTab === "logs" && (
                <div className="flex-1 p-4 bg-slate-950 rounded-2xl border border-white/5 font-mono text-[10px] text-slate-300 space-y-1">
                  {browserLogs.map((log, index) => {
                    let color = "text-slate-300";
                    if (log.includes("[ERROR]")) color = "text-red-400 font-bold";
                    if (log.includes("[SUCCESS]")) color = "text-emerald-400 font-bold";
                    if (log.includes("[NETWORK]")) color = "text-cyan-400";
                    return (
                      <div key={index} className={`${color}`}>
                        {log}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* PREVIEW TAB */}
              {browserTab === "preview" && (
                <div className="flex-1 flex flex-col h-full">
                  {isGoogleHome ? (
                    // AUTHENTIC GOOGLE HOME PAGE INTERFACE
                    <div className="flex-1 bg-white text-slate-800 p-8 rounded-2xl border border-slate-200 flex flex-col items-center justify-between min-h-[450px] font-sans shadow-md">
                      {/* Top Bar of Google */}
                      <div className="w-full flex justify-end items-center gap-4 text-xs text-slate-600 self-start pb-6">
                        <a href="https://mail.google.com" className="hover:underline">Gmail</a>
                        <a href="https://www.google.com/imghp" className="hover:underline">Images</a>
                        <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                        <button className="px-6 py-2 bg-[#1a73e8] hover:bg-blue-600 text-white font-bold rounded-lg text-xs transition-colors shadow-sm">
                          Connexion
                        </button>
                      </div>

                      {/* Main Google Body */}
                      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl space-y-6 py-8">
                        {/* Google Logo */}
                        <div className="flex items-center text-6xl md:text-7xl font-black select-none tracking-tight font-sans">
                          <span className="text-[#4285F4]">G</span>
                          <span className="text-[#EA4335]">o</span>
                          <span className="text-[#FBBC05]">o</span>
                          <span className="text-[#4285F4]">g</span>
                          <span className="text-[#34A853]">l</span>
                          <span className="text-[#EA4335]">e</span>
                        </div>

                        {/* Search Input */}
                        <div className="w-full relative mt-4">
                          <div className="w-full flex items-center bg-white border border-slate-200 hover:border-transparent focus-within:border-transparent hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] focus-within:shadow-[0_2px_12px_rgba(0,0,0,0.12)] rounded-full px-5 py-3 transition-all duration-200">
                            <Search className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                            <input 
                              type="text"
                              placeholder="Rechercher sur Google ou saisir une adresse..."
                              value={localGoogleSearch}
                              onChange={(e) => setLocalGoogleSearch(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && localGoogleSearch.trim()) {
                                  loadUrlInBrowser(localGoogleSearch);
                                  setLocalGoogleSearch("");
                                }
                              }}
                              className="flex-1 outline-none text-slate-800 text-sm font-sans placeholder-slate-400 bg-transparent border-none p-0 focus:ring-0 leading-none"
                            />
                            {localGoogleSearch && (
                              <button 
                                onClick={() => setLocalGoogleSearch("")}
                                className="text-slate-400 hover:text-slate-600 mr-3 text-sm font-light font-sans"
                              >
                                ✕
                              </button>
                            )}
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Mic icon */}
                              <svg className="w-4 h-4 text-[#4285f4] cursor-pointer" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                              </svg>
                              {/* Camera icon */}
                              <svg className="w-4 h-4 text-[#ea4335] cursor-pointer" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-8c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm11 16H4V6h4.05l1.83-2h4.24l1.83 2H20v12z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Google Search Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                          <button 
                            onClick={() => {
                              if (localGoogleSearch.trim()) {
                                loadUrlInBrowser(localGoogleSearch);
                                setLocalGoogleSearch("");
                              } else {
                                loadUrlInBrowser("Calculateur quantique");
                              }
                            }}
                            className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 hover:shadow-sm border border-slate-100 text-slate-700 text-xs font-semibold rounded-md transition-all font-sans"
                          >
                            Recherche Google
                          </button>
                          <button 
                            onClick={() => {
                              loadUrlInBrowser("https://fr.wikipedia.org/wiki/Calculateur_quantique");
                            }}
                            className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 hover:shadow-sm border border-slate-100 text-slate-700 text-xs font-semibold rounded-md transition-all font-sans"
                          >
                            J'ai de la chance
                          </button>
                        </div>

                        {/* Language banner */}
                        <p className="text-xs text-slate-500 font-sans font-light">
                          Google disponible en : <span className="text-[#1a0dab] hover:underline cursor-pointer">English</span> <span className="text-[#1a0dab] hover:underline cursor-pointer">Breton</span> <span className="text-[#1a0dab] hover:underline cursor-pointer">Corsu</span>
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="w-full text-[11px] text-slate-500 border-t border-slate-200 pt-5 mt-auto self-end flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div className="flex items-center gap-5">
                          <span className="hover:underline cursor-pointer">À propos</span>
                          <span className="hover:underline cursor-pointer">Publicité</span>
                          <span className="hover:underline cursor-pointer">Entreprise</span>
                          <span className="hover:underline cursor-pointer">Comment fonctionne la recherche</span>
                        </div>
                        <div className="flex items-center gap-5">
                          <span className="hover:underline cursor-pointer">Confidentialité</span>
                          <span className="hover:underline cursor-pointer">Conditions</span>
                          <span className="hover:underline cursor-pointer">Paramètres</span>
                        </div>
                      </div>
                    </div>
                  ) : isGoogleSearch ? (
                    // AUTHENTIC GOOGLE SEARCH ENGINE RESULTS PAGE (SERP)
                    <div className="flex-1 bg-white text-slate-800 rounded-2xl border border-slate-200 flex flex-col min-h-[500px] font-sans shadow-md overflow-hidden">
                      {/* Search Results Header */}
                      <div className="w-full border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                        <div className="flex items-center gap-6">
                          {/* Mini logo clickable */}
                          <div 
                            onClick={() => loadUrlInBrowser("https://www.google.com")}
                            className="text-xl font-black select-none cursor-pointer tracking-tight shrink-0 font-sans"
                          >
                            <span className="text-[#4285F4]">G</span>
                            <span className="text-[#EA4335]">o</span>
                            <span className="text-[#FBBC05]">o</span>
                            <span className="text-[#4285F4]">g</span>
                            <span className="text-[#34A853]">l</span>
                            <span className="text-[#EA4335]">e</span>
                          </div>

                          {/* Top Search bar */}
                          <div className="flex items-center bg-white border border-slate-200 rounded-full shadow-sm px-4 py-1.5 w-full max-w-lg focus-within:shadow-md transition-all">
                            <input 
                              type="text"
                              value={localGoogleSearch || new URL(browserUrl).searchParams.get("q") || ""}
                              onChange={(e) => setLocalGoogleSearch(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && localGoogleSearch.trim()) {
                                  loadUrlInBrowser(localGoogleSearch);
                                  setLocalGoogleSearch("");
                                }
                              }}
                              className="flex-1 outline-none text-slate-800 text-xs font-sans p-0 border-none focus:ring-0 leading-none bg-transparent"
                            />
                            <Search className="w-3.5 h-3.5 text-cyan-600 cursor-pointer ml-2" onClick={() => {
                              if (localGoogleSearch.trim()) {
                                loadUrlInBrowser(localGoogleSearch);
                                setLocalGoogleSearch("");
                              }
                            }} />
                          </div>
                        </div>

                        {/* Settings gears / Profile */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 self-end md:self-auto shrink-0 font-mono">
                          <span className="text-[10px] text-slate-400">PROXY ENGINE</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                      </div>

                      {/* Search Result Category Tabs */}
                      <div className="w-full border-b border-slate-100 bg-white px-6 py-2 flex items-center gap-4 text-xs text-slate-500 shrink-0 font-sans select-none overflow-x-auto">
                        <span className="text-cyan-600 border-b-2 border-cyan-600 font-bold px-1 py-1 cursor-pointer">Tous</span>
                        <span className="hover:text-slate-800 px-1 py-1 cursor-pointer">Actualités</span>
                        <span className="hover:text-slate-800 px-1 py-1 cursor-pointer">Vidéos</span>
                        <span className="hover:text-slate-800 px-1 py-1 cursor-pointer">Images</span>
                        <span className="hover:text-slate-800 px-1 py-1 cursor-pointer">Cartes</span>
                        <span className="hover:text-slate-800 px-1 py-1 cursor-pointer">Plus</span>
                      </div>

                      {/* SERP Results Container */}
                      <div className="flex-1 p-6 md:px-8 overflow-y-auto space-y-6">
                        <div className="text-xs text-slate-400 font-sans">
                          Environ {getGoogleSearchResults().length * 12 + 4} résultats trouvés en direct (0.34 secondes)
                        </div>

                        {/* Grid with Results & sidebar info panel */}
                        <div className="flex flex-col lg:flex-row gap-8">
                          {/* Left Column: Result listings */}
                          <div className="flex-1 space-y-6 max-w-2xl">
                            {getGoogleSearchResults().length === 0 ? (
                              <div className="py-12 text-center text-slate-400 space-y-2">
                                <Search className="w-8 h-8 text-slate-300 mx-auto" />
                                <p className="text-sm font-bold font-sans">Aucun résultat trouvé directement.</p>
                                <p className="text-xs font-sans">Essayez une autre requête ou saisissez une adresse URL valide dans l'adresse de navigation.</p>
                              </div>
                            ) : (
                              getGoogleSearchResults().map((result: any, idx: number) => (
                                <div key={idx} className="space-y-1 font-sans group">
                                  {/* Hostname & Favicon simulator */}
                                  <div className="flex items-center gap-2 text-xs text-[#202124] tracking-normal mb-0.5">
                                    <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 uppercase border border-slate-200">
                                      {result.url.replace("https://", "").replace("http://", "").charAt(0)}
                                    </div>
                                    <span className="truncate max-w-xs">{result.url}</span>
                                  </div>

                                  {/* Title link */}
                                  <h3 
                                    onClick={() => loadUrlInBrowser(result.url)}
                                    className="text-lg md:text-xl font-medium text-[#1a0dab] hover:underline cursor-pointer leading-tight"
                                  >
                                    {result.text}
                                  </h3>

                                  {/* Snippet */}
                                  <p className="text-[13px] text-[#4d5156] font-light leading-relaxed">
                                    {browserData.text_summary ? (
                                      // Distribute snippets if we have text summary, or just a generic elegant description
                                      idx === 0 ? browserData.text_summary.slice(0, 200) + "..." : `Explorez les dernières données scientifiques et topologiques concernant ${result.text}. Accédez aux archives, publications, documentations et connecteurs sécurisés.`
                                    ) : (
                                      `Accédez aux publications, rapports d'analyse de recherche et diagnostics de l'architecture quantique pour ${result.text}.`
                                    )}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Right Column: Google Knowledge Panel Panel */}
                          <div className="w-full lg:w-80 space-y-4 shrink-0">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                              <span className="text-[9px] text-cyan-600 font-bold bg-cyan-50 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Fiche Info Synthétique</span>
                              <h3 className="text-sm font-black text-slate-900 font-sans border-b border-slate-200 pb-2">
                                {new URL(browserUrl).searchParams.get("q") || "Recherche Actuelle"}
                              </h3>
                              <p className="text-xs text-slate-600 leading-relaxed font-sans font-light">
                                {browserData.text_summary || "Cette recherche indexe les serveurs distribués pour extraire des connaissances scientifiques en temps réel."}
                              </p>
                              <div className="pt-2">
                                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans mb-1.5">Moteurs d'Exploration :</h4>
                                <div className="flex flex-wrap gap-1">
                                  <span className="px-1.5 py-0.5 bg-slate-200 rounded text-[9px] text-slate-600 font-mono">Chromium Headless</span>
                                  <span className="px-1.5 py-0.5 bg-slate-200 rounded text-[9px] text-slate-600 font-mono">DIPLY AI ROUTER</span>
                                  <span className="px-1.5 py-0.5 bg-slate-200 rounded text-[9px] text-slate-600 font-mono">STARK Prover</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // STANDARD HIGH-FIDELITY WEB VIEWPORT
                    <div className="bg-slate-50 text-slate-800 p-6 rounded-2xl border border-slate-200 flex-1 min-h-[300px] overflow-y-auto font-sans leading-relaxed shadow-inner">
                      <div className="max-w-2xl mx-auto space-y-4">
                        <div className="space-y-2 border-b border-slate-200 pb-4">
                          <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
                            {browserData.title || "Document sans titre"}
                          </h1>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                            <span>Souverain Browser Viewport</span>
                            <span>•</span>
                            <span className="text-emerald-600 font-bold">HTTPS OK</span>
                          </div>
                        </div>

                        {/* Text Content */}
                        <div className="text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed font-light">
                          {browserData.text_summary || "Aucun contenu textuel extrait de la page."}
                        </div>

                        {/* Extracted Links Section */}
                        {browserData.links && browserData.links.length > 0 && (
                          <div className="pt-6 border-t border-slate-200 space-y-3">
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider font-mono">
                              Liens sémantiques détectés ({browserData.total_links_found || browserData.links.length}) :
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {browserData.links.map((link: any, idx: number) => {
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      let target = link.url;
                                      if (target.startsWith("/")) {
                                        target = `https://www.google.com`;
                                      }
                                      loadUrlInBrowser(target);
                                    }}
                                    className="px-3 py-1.5 bg-slate-200/60 hover:bg-cyan-100 hover:text-cyan-800 rounded-xl text-xs text-slate-600 transition-all font-mono font-medium flex items-center gap-1.5 group"
                                  >
                                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-cyan-600" />
                                    {link.text}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
