import React, { useState } from "react";
import { Copy, Download, Check, Code2, ChevronDown, ChevronUp } from "lucide-react";

interface CodeBlockProps {
  language?: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extensions: Record<string, string> = {
      python: "py",
      py: "py",
      javascript: "js",
      js: "js",
      typescript: "ts",
      ts: "ts",
      react: "tsx",
      jsx: "jsx",
      tsx: "tsx",
      html: "html",
      css: "css",
      json: "json",
      bash: "sh",
      shell: "sh",
      sql: "sql",
      markdown: "md",
      md: "md",
    };

    const ext = extensions[language?.toLowerCase() || ""] || "txt";
    const filename = `ratiss_export.${ext}`;
    
    const blob = new Blob([value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const displayLanguage = (language || "TEXT").toUpperCase();
  const lineCount = value.split("\n").length;
  const charCount = value.length;

  if (isCollapsed) {
    return (
      <div className="my-3 rounded-xl overflow-hidden border border-cyan-500/20 bg-[#07090e]/95 shadow-[0_0_15px_rgba(6,182,212,0.03)] transition-all duration-300 hover:border-cyan-500/40 group/capsule">
        <div 
          onClick={() => setIsCollapsed(false)}
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover/capsule:scale-105 transition-transform duration-300">
              <Code2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono tracking-[0.25em] text-cyan-400 font-black uppercase">
                CAPSULE DE CODE INTELLIGENTE
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-semibold mt-0.5">
                {displayLanguage} • {lineCount} {lineCount > 1 ? "lignes" : "ligne"} ({charCount} caract.)
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 group-hover/capsule:text-cyan-400 transition-colors uppercase font-black tracking-wider">
              Déployer
            </span>
            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-400 group-hover/capsule:bg-cyan-500/10 group-hover/capsule:text-cyan-400 transition-all duration-300">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/10 bg-black/60 group/code shadow-lg">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400">
            {displayLanguage} ({lineCount} lignes)
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-slate-400 hover:text-cyan-400 transition-colors"
            title="Copier le code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-green-500">COPIÉ</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>COPIER</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-slate-400 hover:text-emerald-400 transition-colors"
            title="Télécharger le fichier"
          >
            <Download className="w-3 h-3" />
            <span>TÉLÉCHARGER</span>
          </button>

          <button
            onClick={() => setIsCollapsed(true)}
            className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-slate-400 hover:text-rose-400 border-l border-white/10 pl-3 transition-colors"
            title="Replier la capsule"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>REPLIER</span>
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="p-4 overflow-x-auto custom-scrollbar bg-black/40">
        <pre className="text-[13px] font-mono leading-relaxed text-blue-100/90">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
}
