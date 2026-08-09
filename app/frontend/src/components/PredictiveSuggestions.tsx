import React, { useState, useEffect } from "react";
import { Sparkles, Mail, FileText, Atom, ShieldCheck, ArrowRight, X, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface SuggestionChip {
  id: string;
  label: string;
  icon?: any;
  actionPrompt: string;
  category: "gmail" | "pdf" | "tryperposition" | "zk" | "general";
}

interface PredictiveSuggestionsProps {
  lastMessage?: string;
  onSelectSuggestion: (actionPrompt: string) => void;
  isThinking?: boolean;
}

export const PredictiveSuggestions: React.FC<PredictiveSuggestionsProps> = ({
  lastMessage = "",
  onSelectSuggestion,
  isThinking = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionChip[]>([]);

  useEffect(() => {
    if (isThinking || !lastMessage.trim()) {
      setIsVisible(false);
      return;
    }

    let isMounted = true;

    // Call dynamic agentic prediction engine
    const fetchPredictions = async () => {
      try {
        const res = await fetch("/api/agentic/predict-next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastMessage })
        });
        const data = await res.json();
        
        if (isMounted && data.status === "SUCCESS" && data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
          setIsVisible(true);
        }
      } catch (err) {
        // Fallback context builder if backend fetch fails
        if (isMounted) {
          const lower = lastMessage.toLowerCase();
          const fallbackList: SuggestionChip[] = [
            {
              id: "fallback_1",
              label: "📧 Envoyer un récapitulatif par Gmail",
              actionPrompt: "Prépare et envoie par Gmail un rapport complet de notre échange à bridejackson137@gmail.com.",
              category: "gmail"
            },
            {
              id: "fallback_2",
              label: "📄 Exporter la synthèse en PDF",
              actionPrompt: "Génère un document PDF de cette synthèse.",
              category: "pdf"
            }
          ];
          setSuggestions(fallbackList);
          setIsVisible(true);
        }
      }
    };

    fetchPredictions();

    // Auto-disappear after exactly 10 seconds if unused to keep the screen clean
    const timer = setTimeout(() => {
      if (isMounted) {
        setIsVisible(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [lastMessage, isThinking]);

  if (!isVisible || suggestions.length === 0 || isThinking) return null;

  const getIcon = (cat: string) => {
    switch (cat) {
      case "gmail": return Mail;
      case "pdf": return FileText;
      case "zk": return ShieldCheck;
      case "tryperposition": return Atom;
      default: return Globe;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        className="w-full px-4 my-1 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1 text-slate-200"
      >
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0 text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3 h-3 animate-pulse text-cyan-400" />
            <span>Suggestion Prédictive (10s)</span>
          </div>

          {suggestions.map((item) => {
            const IconComponent = getIcon(item.category);
            return (
              <button
                key={item.id}
                onClick={() => {
                  setIsVisible(false);
                  onSelectSuggestion(item.actionPrompt);
                }}
                className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 text-xs text-white transition-all shadow-lg shadow-cyan-500/10 active:scale-95 group font-medium"
              >
                <IconComponent className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="truncate max-w-[280px]">{item.label}</span>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => setIsVisible(false)}
          className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
          title="Masquer les suggestions"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
