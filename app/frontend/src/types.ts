// RATISS frontend — types partagés
// Inférés depuis l'usage dans App.tsx et les composants.

export type QueryLevel = "N0" | "N1" | "N2" | "Standard" | "Cypher ODV" | "Phenix ODV";

export type CalculationMode =
  | "Standard (N1)"
  | "Ontologique (N2)"
  | "RATISS V9 Aeon Prime (Kernel Souverain)"
  | "RATISS Cypher ODV"
  | "V8-OMEGA (Topologique)"
  | "Panthéon Cognitif (30 Moteurs)"
  | "Phenix ODV (Competition)";

export type InterfaceTheme = "dark" | "light";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  imageUrl?: string;
  reasoning?: string;
  bettiNumbers?: number[];
  groundStateEnergy?: number;
  zkProofHash?: string;
  zkVerified?: boolean;
  artifacts?: string[];
  level?: QueryLevel;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  level: QueryLevel;
  mode?: CalculationMode;
  lastMessage?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  desc?: string;
}

// ── Fichiers importés (import universel) ──────────────────────────────────────

export interface ImportedFile {
  id: string;
  name: string;
  path: string;
  absolute_path?: string;
  size_bytes: number;
  size_kb: number;
  content_type: string;
  kind: string; // catégorie scientifique détectée
  uploaded_at: string;
}

// ── Intégrations externes ─────────────────────────────────────────────────────

export interface Integration {
  id: string;
  name: string;
  category: "code" | "publications" | "data" | "structural_biology" | "quantum" | "web";
  icon: string;
  scientific_role: string;
  requires_token: boolean;
  connected: boolean;
  actions: string[];
  docs_url: string;
}

export interface IntegrationsStatus {
  integrations: Integration[];
  total: number;
  connected: number;
  categories: string[];
}

// ── Options agent (paramètres scientifiques) ──────────────────────────────────

export interface AgentOptions {
  memoryLimitMb: number;
  autoZkProof: boolean;
  autoGeneratePdf: boolean;
  reasoningDepth: "fast" | "standard" | "deep";
  academicAuthor: string;
  academicOrcid: string;
  defaultDomain: string;
  maxSteps: number;
  telemetryEnabled: boolean;
}
