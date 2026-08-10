import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Send, Mic } from "lucide-react";
import { motion } from "motion/react";

export interface ChatInputHandle {
  setValue: (val: string) => void;
}

interface ChatInputProps {
  onSend: (val: string) => void;
  isThinking: boolean;
  hasAttachment?: boolean;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(({ onSend, isThinking, hasAttachment }, ref) => {
  const [localValue, setLocalValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    setValue: (val: string) => {
      setLocalValue(val);
    }
  }));

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baselineValueRef = useRef("");

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'fr-FR'; // Default to French as requested by user

      recognitionRef.current.onresult = (event: any) => {
        let sessionTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          sessionTranscript += event.results[i][0].transcript;
        }
        
        const baseline = baselineValueRef.current;
        const separator = (baseline && !baseline.endsWith(" ")) ? " " : "";
        setLocalValue(baseline + separator + sessionTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        baselineValueRef.current = localValue;
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start recognition:", err);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter (sans Shift) OU Ctrl/Cmd+Enter envoie le message
    if ((e.key === 'Enter' && !e.shiftKey) || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
      e.preventDefault();
      if ((localValue.trim() || hasAttachment) && !isThinking) {
        onSend(localValue);
        setLocalValue("");
      }
    }
  };

  const handleSendClick = () => {
    if ((localValue.trim() || hasAttachment) && !isThinking) {
      onSend(localValue);
      setLocalValue("");
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [localValue]);

  return (
    <div className="flex-1 flex items-end min-h-[44px]">
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Posez une question..."
        rows={1}
        className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] text-white px-3 py-4 placeholder-slate-500 font-normal outline-none resize-none overflow-y-auto leading-relaxed whitespace-pre-wrap break-words"
        style={{ minHeight: '56px', maxHeight: '200px' }}
      />

      <div className="flex items-center gap-2 pb-2 pr-2">
        <button 
          type="button"
          onClick={toggleRecording}
          className={`p-2 rounded-full transition-all duration-300 relative ${
            isRecording 
              ? 'bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
              : 'hover:bg-white/5 text-slate-500'
          }`}
          title={isRecording ? "Arrêter l'enregistrement" : "Démarrer la transcription vocale"}
        >
          {isRecording && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 bg-red-500 rounded-full"
            />
          )}
          <Mic className={`w-5 h-5 relative z-10 ${isRecording ? 'animate-pulse' : ''}`} />
        </button>

        <motion.button 
          whileHover={(localValue.trim() || hasAttachment) ? { scale: 1.05 } : {}}
          whileTap={(localValue.trim() || hasAttachment) ? { scale: 0.95 } : {}}
          onClick={handleSendClick}
          disabled={(!localValue.trim() && !hasAttachment) || isThinking}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
            (localValue.trim() || hasAttachment) ? 'bg-white text-black shadow-lg' : 'bg-white/5 text-white/10'
          }`}
        >
          <Send className="w-4 h-4 ml-0.5" />
        </motion.button>
      </div>
    </div>
  );
});
