/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { 
  History, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Cpu, 
  Zap, 
  Globe 
} from "lucide-react";
import { ChatSession, QueryLevel } from "../types";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  isCompetitionBranch?: boolean;
  onToggleBranch?: () => void;
  onImportSession: (file: File) => void;
}

const LevelIcon = ({ level }: { level: QueryLevel }) => {
  switch (level) {
    case 'N0': return <Zap className="w-4 h-4 text-cyber-surgical" />;
    case 'N1': return <Cpu className="w-4 h-4 text-cyber-neon" />;
    case 'N2': return <Globe className="w-4 h-4 text-cyber-cyan" />;
    case 'Phenix ODV': return <Zap className="w-4 h-4 text-red-500 animate-pulse" />;
    default: return <Cpu className="w-4 h-4 text-slate-500" />;
  }
};

export const Sidebar = ({ 
  isOpen, 
  setIsOpen, 
  sessions, 
  currentSessionId, 
  onNewChat, 
  onSelectSession,
  isCompetitionBranch,
  onToggleBranch,
  onImportSession
}: SidebarProps) => {
  return (
    <motion.div
      initial={false}
      animate={{ width: isOpen ? 280 : 0 }}
      transition={{ type: "spring", stiffness: 600, damping: 50 }}
      className={`relative h-screen border-r flex flex-col overflow-hidden transition-colors duration-1000 ${
        isCompetitionBranch ? 'bg-black border-red-900/10' : 'bg-[#0b0b0b] border-white/5'
      }`}
    >
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-colors ${
            isCompetitionBranch ? 'bg-red-600' : 'bg-[#2563eb]'
          }`}>
            <span className="text-white font-black text-xs">{isCompetitionBranch ? "PH" : "RC"}</span>
          </div>
          <span className={`text-sm font-display font-bold tracking-[0.2em] uppercase transition-colors ${
            isCompetitionBranch ? 'text-red-500' : 'text-white'
          }`}>
            {isCompetitionBranch ? "PHENIX" : "RATISS"}
          </span>
        </div>
      </div>

      <div className="flex-1 py-4 flex flex-col overflow-hidden">
        <div className="px-4 mb-4 grid grid-cols-2 gap-2">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNewChat}
            className={`py-2.5 rounded-full border text-[10px] font-bold tracking-wide transition-all uppercase ${
              isCompetitionBranch 
              ? 'bg-red-500/5 border-red-500/20 text-red-500 hover:bg-red-500/10' 
              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            }`}
          >
            + New Chat
          </motion.button>
          
          <label className="cursor-pointer">
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
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`py-2.5 rounded-full border text-[10px] font-bold tracking-wide transition-all uppercase text-center flex items-center justify-center gap-1 ${
                isCompetitionBranch 
                ? 'bg-red-500/5 border-red-500/20 text-red-500/80 hover:text-red-500' 
                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
            >
              Importer
            </motion.div>
          </label>
        </div>

        {/* Branch Toggle */}
        <div className="px-4 mb-6">
          <button 
            onClick={onToggleBranch}
            className={`w-full py-3 rounded-xl border flex items-center justify-center gap-3 transition-all ${
              isCompetitionBranch 
              ? 'bg-red-600 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]' 
              : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:border-white/10'
            }`}
          >
            <Zap className={`w-4 h-4 ${isCompetitionBranch ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isCompetitionBranch ? "Competition Active" : "Go Competition"}
            </span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <AnimatePresence mode="popLayout">
            {sessions.map((session, idx) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onSelectSession(session.id)}
                className={`group flex items-center px-4 py-3 rounded-xl transition-all cursor-pointer border ${
                  currentSessionId === session.id 
                    ? (isCompetitionBranch ? 'bg-red-500/10 border-red-500/20' : 'bg-white/10 border-white/10') 
                    : 'hover:bg-white/5 border-transparent'
                }`}
              >
                <div className="flex-1 truncate">
                  <div className={`text-[13px] font-normal transition-colors ${
                    currentSessionId === session.id 
                    ? 'text-white' 
                    : 'text-slate-400 group-hover:text-white'
                  }`}>
                    {session.title}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className={`p-4 border-t transition-colors ${isCompetitionBranch ? 'border-red-900/10' : 'border-white/5'}`}>
        <div className="flex items-center space-x-3 p-2 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer">
          <div className={`w-8 h-8 rounded-full shrink-0 transition-colors ${isCompetitionBranch ? 'bg-red-950/30 border border-red-500/20' : 'bg-slate-800'}`}></div>
          <div className="flex-1 overflow-hidden">
            <div className="text-[12px] font-medium text-white truncate">JohnKing0</div>
            <div className={`text-[9px] font-mono tracking-widest uppercase ${isCompetitionBranch ? 'text-red-500' : 'text-slate-500'}`}>
              {isCompetitionBranch ? "GLADIATOR" : "Premium"}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
