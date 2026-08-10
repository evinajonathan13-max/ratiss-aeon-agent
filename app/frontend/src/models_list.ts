// RATISS — modèles disponibles (multi-fournisseurs : Anthropic, Gemini, OpenAI, OpenRouter + local)
// L'agent peut basculer entre ces backends via le sélecteur UI ou /api/llm/select.

import { ModelInfo } from "./types";

export const MODELS: ModelInfo[] = [
  // Anthropic Claude
  { id: "anthropic/claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", desc: "Raisonnement scientifique avancé, analyse de code" },
  { id: "anthropic/claude-3-5-haiku", name: "Claude 3.5 Haiku", provider: "Anthropic", desc: "Rapide, économique, multilingue" },
  { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic", desc: "Profondeur de raisonnement maximale" },
  // Google Gemini
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", desc: "Multimodal natif, très rapide" },
  { id: "google/gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", desc: "Contexte long (2M tokens), analyse profonde" },
  { id: "google/gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "Google", desc: "Léger, réactif, peu coûteux" },
  // OpenAI
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", desc: "Multimodal, généraliste haut de gamme" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o mini", provider: "OpenAI", desc: "Rapide, économique, bon raisonnement" },
  { id: "openai/o1", name: "o1", provider: "OpenAI", desc: "Raisonnement étape par étape, mathématiques" },
  // OpenRouter (gratuit)
  { id: "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron 3 Ultra", provider: "OpenRouter", desc: "Planification scientifique, gratuit" },
  { id: "openrouter/meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", provider: "OpenRouter", desc: "Génération longue, robuste" },
  { id: "openrouter/deepseek/deepseek-r1:free", name: "DeepSeek R1", provider: "OpenRouter", desc: "Raisonnement étape par étape" },
  { id: "openrouter/qwen/qwen-2.5-72b-instruct:free", name: "Qwen 2.5 72B", provider: "OpenRouter", desc: "Mathématiques et code" },
  // Souverain
  { id: "local/ratiss-planner", name: "RATISS Local", provider: "Souverain", desc: "100% local, hors cloud, heuristique" },
];

// Catégories pour l'affichage groupé dans le sélecteur
export const PROVIDER_ORDER = ["Anthropic", "Google", "OpenAI", "OpenRouter", "Souverain"];
