// RATISS — modèles disponibles (OpenRouter gratuit + local)
// L'agent peut basculer entre ces backends via /model use <id> ou le sélecteur UI.

import { ModelInfo } from "./types";

export const MODELS: ModelInfo[] = [
  { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B", provider: "Google", desc: "Équilibré, rapide, multilingue" },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct:free", name: "Nemotron 70B", provider: "NVIDIA", desc: "Raisonnement scientifique avancé" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", provider: "Meta", desc: "Génération longue, robuste" },
  { id: "qwen/qwen-2.5-72b-instruct:free", name: "Qwen 2.5 72B", provider: "Qwen", desc: "Mathématiques et code" },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1", provider: "DeepSeek", desc: "Raisonnement étape par étape" },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B", provider: "Mistral", desc: "Léger, réactif" },
  { id: "local-piper", name: "Piper Local", provider: "Souverain", desc: "100% local, hors cloud" },
];
