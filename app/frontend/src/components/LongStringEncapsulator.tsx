import React, { useState } from "react";
import { Lock, Eye, EyeOff, Key } from "lucide-react";

interface LongStringEncapsulatorProps {
  value: string;
}

export function LongStringEncapsulator({ value }: LongStringEncapsulatorProps) {
  const [show, setShow] = useState(false);

  if (value.length <= 64) return <span>{value}</span>;

  return (
    <span className="inline-flex flex-col max-w-full my-1 align-bottom">
      <span className="flex items-center gap-2 px-2 py-1 bg-black/60 border border-white/10 rounded-md text-[10px] font-mono text-slate-400">
        <Key className="w-3 h-3 text-cyan-400" />
        <span className="font-bold tracking-tight uppercase">Data Encapsulated</span>
        <span className="px-1.5 py-0.5 bg-white/5 rounded text-[9px]">{value.length} chars</span>
        <button 
          onClick={() => setShow(!show)}
          className="ml-auto p-1 hover:bg-white/10 rounded transition-colors text-slate-300 hover:text-white"
        >
          {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      </span>
      {show && (
        <span className="mt-1 p-2 bg-black/40 border border-white/5 rounded-md text-[11px] font-mono text-blue-200/70 break-all leading-tight shadow-inner">
          {value}
        </span>
      )}
    </span>
  );
}
