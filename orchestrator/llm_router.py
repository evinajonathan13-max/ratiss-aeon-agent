"""
orchestrator/llm_router.py — Routeur LLM unifié multi-fournisseurs.

Supporte :
  - Anthropic (Claude 3.5 Sonnet, Opus, Haiku)
  - Google Gemini (2.0 Flash, 1.5 Pro)
  - OpenAI (GPT-4o, GPT-4o-mini, o1)
  - OpenRouter / Nemotron (Nemotron, Llama, Qwen, DeepSeek…)

Chaque fournisseur expose deux méthodes :
  - complete(messages, system, temperature, max_tokens) -> str  (chat libre)
  - plan(task) -> dict  (planification structurée RATISS)

Souveraineté : si aucune clé n'est configurée pour le fournisseur demandé,
bascule sur le planificateur local déterministe (heuristique par mots-clés).
Aucune clé n'est jamais loggée.

IDENTITÉ SOUVERAINE : chaque appel LLM est préfixé par l'identité ancrée de
Ratiss (JohnKing0 / RATISS V9 Aeon Prime) + un résumé de la mémoire persistante.
Peu importe le modèle branché, c'est Ratiss qui répond — il ne dit jamais « je
suis GPT » ou « je suis Gemini ». Voir config/sovereign_identity.py et
kernel/system/sovereign_memory.py.

Usage :
    from orchestrator.llm_router import llm_router
    text = llm_router.complete("Explique la mécanique quantique", model_id="anthropic/claude-3-5-sonnet")
    plan = llm_router.plan("Analyse 4MZI", model_id="google/gemini-2.0-flash")
"""
from __future__ import annotations

import os
import json
import logging
import urllib.request
from typing import Any

logger = logging.getLogger("ratiss.llm_router")

SYSTEM_PROMPT_PLANNER = """Tu es le planificateur scientifique de RATISS V9 Aeon Prime.
Tu reçois une tâche scientifique en langage naturel et tu la décomposes en un plan structuré.

Réponds UNIQUEMENT avec un objet JSON de la forme :
{
  "goal": "résumé de l'objectif",
  "domain": "quantum | topology | structural_biology | crypto | orchestration",
  "steps": [
    {"id": 1, "action": "load_pdb", "params": {"pdb_id": "4MZI"}, "description": "Charger la structure"},
    {"id": 2, "action": "topology", "params": {"max_dimension": 2}, "description": "Homologie persistante"},
    {"id": 3, "action": "quantum_ed", "params": {"Lx": 4, "Ly": 4}, "description": "Diagonalisation Lanczos"},
    {"id": 4, "action": "zk_proof", "params": {}, "description": "Certification ZK-STARK"}
  ],
  "expected_artifacts": ["result.json", "zk_receipt.b64", "betti_diagram.png"]
}

Actions disponibles : load_pdb, topology, quantum_ed, zk_proof, full_pipeline, tryperposition,
generate_pdf, generate_chart, generate_webpage, generate_betti_diagram,
terminal, python_execute, google_search, file_editor, file_saver,
web_arxiv, web_pubmed, web_chembl, web_pdb, web_alphafold, browser.

Sois précis et minimal. Pas de texte hors JSON."""

TIMEOUT = int(os.environ.get("RATISS_LLM_TIMEOUT", "30"))


# ── Préfixe système souverain (identité + mémoire persistante) ─────────────────


def _sovereign_system_prefix(extra: str = "") -> str:
    """Construit le préfixe système ancré : identité Ratiss + mémoire persistante.

    Injecté à chaque appel LLM. Garantit que, peu importe le modèle branché,
    c'est Ratiss qui répond et qu'il garde ses souvenirs et le profil de
    l'utilisateur, même au milieu d'un travail long (le contexte du modèle peut
    être saturé, mais l'identité et l'essentiel de la mémoire sont toujours en
    tête de chaque appel). Voir config/sovereign_identity.py.
    """
    try:
        from kernel.system.sovereign_memory import get_memory

        base = get_memory().build_system_prefix()
    except Exception:  # défense : toujours avoir une identité
        from config.sovereign_identity import build_system_prefix

        base = build_system_prefix()
    if extra:
        return f"{base}\n\n{extra}"
    return base


# ── Catalogue des modèles ────────────────────────────────────────────────────

MODELS_CATALOG: list[dict[str, str]] = [
    # Anthropic
    {"id": "anthropic/claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "provider": "Anthropic", "desc": "Raisonnement scientifique avancé, analyse de code"},
    {"id": "anthropic/claude-3-5-haiku", "name": "Claude 3.5 Haiku", "provider": "Anthropic", "desc": "Rapide, économique, multilingue"},
    {"id": "anthropic/claude-3-opus", "name": "Claude 3 Opus", "provider": "Anthropic", "desc": "Profondeur de raisonnement maximale"},
    # Google Gemini
    {"id": "google/gemini-2.0-flash", "name": "Gemini 2.0 Flash", "provider": "Google", "desc": "Multimodal natif, très rapide"},
    {"id": "google/gemini-1.5-pro", "name": "Gemini 1.5 Pro", "provider": "Google", "desc": "Contexte long (2M tokens), analyse profonde"},
    {"id": "google/gemini-1.5-flash", "name": "Gemini 1.5 Flash", "provider": "Google", "desc": "Léger, réactif, peu coûteux"},
    # OpenAI
    {"id": "openai/gpt-4o", "name": "GPT-4o", "provider": "OpenAI", "desc": "Multimodal, généraliste haut de gamme"},
    {"id": "openai/gpt-4o-mini", "name": "GPT-4o mini", "provider": "OpenAI", "desc": "Rapide, économique, bon raisonnement"},
    {"id": "openai/o1", "name": "o1", "provider": "OpenAI", "desc": "Raisonnement étape par étape, mathématiques"},
    # OpenRouter / Nemotron (slugs :free vérifiés le 2026-08)
    {"id": "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free", "name": "Nemotron 3 Ultra", "provider": "OpenRouter", "desc": "Planification scientifique, gratuit"},
    {"id": "openrouter/nvidia/nemotron-3-super-120b-a12b:free", "name": "Nemotron 3 Super 120B", "provider": "OpenRouter", "desc": "Raisonnement large, gratuit"},
    {"id": "openrouter/google/gemma-4-26b-a4b-it:free", "name": "Gemma 4 26B", "provider": "OpenRouter", "desc": "Léger et réactif, gratuit"},
    {"id": "openrouter/meta-llama/llama-3.3-70b-instruct", "name": "Llama 3.3 70B", "provider": "OpenRouter", "desc": "Génération longue, robuste (payant)"},
    # Souverain
    {"id": "local/ratiss-planner", "name": "RATISS Local", "provider": "Souverain", "desc": "100% local, hors cloud, heuristique"},
]


def _parse_model_id(model_id: str) -> tuple[str, str]:
    """Sépare 'provider/model...' -> ('provider', 'model').

    Gère les IDs à barre oblique multiple (ex: openrouter/nvidia/nemotron).
    """
    if not model_id:
        return ("openrouter", "")
    parts = model_id.split("/", 1)
    if len(parts) == 1:
        return ("openrouter", parts[0])
    return (parts[0], parts[1])


# ── Helpers HTTP ──────────────────────────────────────────────────────────────


def _post_json(url: str, headers: dict[str, str], body: dict, timeout: int = TIMEOUT) -> dict:
    """POST JSON via urllib. Lève une exception en cas d'erreur HTTP."""
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ── Fournisseurs ──────────────────────────────────────────────────────────────


class AnthropicProvider:
    """Anthropic Claude via l'API Messages."""

    BASE_URL = "https://api.anthropic.com/v1/messages"
    API_VERSION = "2023-06-01"

    def __init__(self):
        self.api_key = (os.environ.get("ANTHROPIC_API_KEY") or "").strip()
        self.available = bool(self.api_key)

    def complete(self, messages: list[dict], system: str = "", temperature: float = 0.2, max_tokens: int = 4096, model: str = "claude-3-5-sonnet-20241022") -> str:
        if not self.available:
            raise RuntimeError("ANTHROPIC_API_KEY non configurée")
        body: dict[str, Any] = {
            "model": model,
            "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if system:
            body["system"] = system
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": self.API_VERSION,
            "content-type": "application/json",
        }
        resp = _post_json(self.BASE_URL, headers, body)
        blocks = resp.get("content", [])
        return "".join(b.get("text", "") for b in blocks if b.get("type") == "text")

    def plan(self, task: str, model: str = "claude-3-5-sonnet-20241022") -> dict:
        raw = self.complete(
            [{"role": "user", "content": task}],
            system=SYSTEM_PROMPT_PLANNER,
            temperature=0.2,
            max_tokens=2048,
            model=model,
        )
        plan = _extract_json(raw)
        plan["planner"] = "anthropic_claude"
        plan["model"] = f"anthropic/{model}"
        return plan


class GeminiProvider:
    """Google Gemini via l'API Generative Language."""

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self):
        self.api_key = (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
        self.available = bool(self.api_key)

    def complete(self, messages: list[dict], system: str = "", temperature: float = 0.2, max_tokens: int = 4096, model: str = "gemini-2.0-flash") -> str:
        if not self.available:
            raise RuntimeError("GEMINI_API_KEY non configurée")
        contents = []
        for m in messages:
            role = "user" if m["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": m["content"]}]})
        body: dict[str, Any] = {"contents": contents, "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens}}
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}
        url = f"{self.BASE_URL}/{model}:generateContent?key={self.api_key}"
        resp = _post_json(url, {"content-type": "application/json"}, body)
        candidates = resp.get("candidates", [])
        if not candidates:
            return ""
        parts = candidates[0].get("content", {}).get("parts", [])
        return "".join(p.get("text", "") for p in parts)

    def plan(self, task: str, model: str = "gemini-2.0-flash") -> dict:
        raw = self.complete(
            [{"role": "user", "content": task}],
            system=SYSTEM_PROMPT_PLANNER,
            temperature=0.2,
            max_tokens=2048,
            model=model,
        )
        plan = _extract_json(raw)
        plan["planner"] = "google_gemini"
        plan["model"] = f"google/{model}"
        return plan


class OpenAIProvider:
    """OpenAI GPT via l'API Chat Completions."""

    BASE_URL = os.environ.get("OPENAI_API_URL", "https://api.openai.com/v1/chat/completions")

    def __init__(self):
        self.api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
        self.available = bool(self.api_key)

    def complete(self, messages: list[dict], system: str = "", temperature: float = 0.2, max_tokens: int = 4096, model: str = "gpt-4o") -> str:
        if not self.available:
            raise RuntimeError("OPENAI_API_KEY non configurée")
        full_msgs = []
        if system:
            full_msgs.append({"role": "system", "content": system})
        full_msgs.extend(messages)
        body = {"model": model, "messages": full_msgs, "temperature": temperature, "max_tokens": max_tokens}
        headers = {"Authorization": f"Bearer {self.api_key}", "content-type": "application/json"}
        resp = _post_json(self.BASE_URL, headers, body)
        return resp.get("choices", [{}])[0].get("message", {}).get("content", "")

    def plan(self, task: str, model: str = "gpt-4o") -> dict:
        raw = self.complete(
            [{"role": "user", "content": task}],
            system=SYSTEM_PROMPT_PLANNER,
            temperature=0.2,
            max_tokens=2048,
            model=model,
        )
        plan = _extract_json(raw)
        plan["planner"] = "openai_gpt"
        plan["model"] = f"openai/{model}"
        return plan


class OpenRouterProvider:
    """OpenRouter — routeur multi-modèles (Nemotron, Llama, Qwen, DeepSeek…)."""

    BASE_URL = os.environ.get("OPENROUTER_API_URL", "https://openrouter.ai/api/v1/chat/completions")

    def __init__(self):
        self.api_key = (os.environ.get("OPENROUTER_API_KEY") or "").strip()
        self.available = bool(self.api_key)

    def complete(self, messages: list[dict], system: str = "", temperature: float = 0.2, max_tokens: int = 4096, model: str = "nvidia/nemotron-3-ultra-550b-a55b:free") -> str:
        if not self.available:
            raise RuntimeError("OPENROUTER_API_KEY non configurée")
        full_msgs = []
        if system:
            full_msgs.append({"role": "system", "content": system})
        full_msgs.extend(messages)
        body = {"model": model, "messages": full_msgs, "temperature": temperature, "max_tokens": max_tokens}
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "content-type": "application/json",
            "HTTP-Referer": os.environ.get("OPENROUTER_HTTP_REFERER", "http://127.0.0.1:12000"),
            "X-Title": "RATISS Aeon Prime",
        }
        resp = _post_json(self.BASE_URL, headers, body)
        return resp.get("choices", [{}])[0].get("message", {}).get("content", "")

    def plan(self, task: str, model: str = "nvidia/nemotron-3-ultra-550b-a55b:free") -> dict:
        raw = self.complete(
            [{"role": "user", "content": task}],
            system=SYSTEM_PROMPT_PLANNER,
            temperature=0.2,
            max_tokens=2048,
            model=model,
        )
        plan = _extract_json(raw)
        plan["planner"] = "openrouter_nemotron"
        plan["model"] = f"openrouter/{model}"
        return plan


# ── Extraction JSON robuste ───────────────────────────────────────────────────


def _extract_json(raw: str) -> dict[str, Any]:
    """Extrait un objet JSON d'une réponse LLM (gère markdown code fences)."""
    text = raw.strip()
    if "```" in text:
        # Extraire le bloc de code
        parts = text.split("```", 2)
        if len(parts) >= 2:
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
    # Trouver le premier { et le dernier }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start : end + 1]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning(f"[LLM] JSON illisible, fallback local. Début: {raw[:200]}")
        return {"_parse_error": True, "raw": raw[:500]}


# ── Routeur unifié ────────────────────────────────────────────────────────────


class LLMRouter:
    """Routeur LLM unifié — sélectionne le fournisseur selon le model_id."""

    # Mappe provider -> (instance, modèles par défaut pour plan/complete)
    _default_plan_models = {
        "anthropic": "claude-3-5-sonnet-20241022",
        "google": "gemini-2.0-flash",
        "openai": "gpt-4o",
        "openrouter": "google/gemma-4-26b-a4b-it:free",
    }

    # Modèles OpenRouter de secours éprouvés (essayés dans l'ordre si le modèle
    # demandé échoue en 404/502/etc.). On évite ainsi le fallback local quand un
    # seul modèle gratuit devient indisponible pour la clé de l'utilisateur.
    _openrouter_fallbacks = [
        "google/gemma-4-26b-a4b-it:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "openai/gpt-oss-20b:free",
        "nvidia/nemotron-nano-9b-v2:free",
    ]

    def __init__(self):
        self.providers: dict[str, Any] = {
            "anthropic": AnthropicProvider(),
            "google": GeminiProvider(),
            "openai": OpenAIProvider(),
            "openrouter": OpenRouterProvider(),
        }

    def get_provider(self, model_id: str = "") -> tuple[str, Any, str]:
        """Retourne (provider_key, provider_instance, model_name)."""
        provider_key, model_name = _parse_model_id(model_id)
        if provider_key not in self.providers:
            provider_key = "openrouter"
        provider = self.providers[provider_key]
        if not model_name:
            model_name = self._default_plan_models.get(provider_key, "")
        return provider_key, provider, model_name

    def status(self) -> dict[str, Any]:
        """Retourne l'état de configuration de chaque fournisseur."""
        return {
            "models": MODELS_CATALOG,
            "providers": {
                key: {
                    "name": p.__class__.__name__,
                    "available": p.available,
                    "configured": p.available,
                }
                for key, p in self.providers.items()
            },
            "default_model": os.environ.get("RATISS_MODEL_ID", "local/ratiss-planner"),
        }

    def complete(self, prompt: str, model_id: str = "", system: str = "", temperature: float = 0.2, max_tokens: int = 4096) -> str:
        """Chat libre — renvoie le texte généré.

        Args:
            prompt: texte de l'utilisateur
            model_id: 'anthropic/claude-3-5-sonnet', 'google/gemini-2.0-flash', etc.
                      Si vide ou 'local/...', utilise le planificateur local.
            system: préfixe système additionnel (fusionné avec l'identité souveraine).
        """
        sovereign = _sovereign_system_prefix(system)
        if not model_id or model_id.startswith("local/"):
            return _local_complete(prompt, sovereign)

        provider_key, provider, model_name = self.get_provider(model_id)
        # Liste des modèles à essayer : le demandé d'abord, puis des secours pour OpenRouter.
        if provider_key == "openrouter":
            try_models = [model_name] + [
                m for m in self._openrouter_fallbacks if m != model_name
            ]
        else:
            try_models = [model_name]

        last_err = None
        for m in try_models:
            try:
                return provider.complete(
                    [{"role": "user", "content": prompt}],
                    system=sovereign,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    model=m,
                )
            except Exception as e:
                last_err = e
                logger.warning(f"[LLM] Échec {provider_key}/{m} ({e}), essai suivant.")
        logger.warning(f"[LLM] Tous les modèles {provider_key} ont échoué, fallback local.")
        return _local_complete(prompt, sovereign)

    def plan(self, task: str, model_id: str = "") -> dict[str, Any]:
        """Planifie une tâche — route vers le fournisseur approprié.

        Sans clé ou avec model_id='local/...', utilise le planificateur local.
        """
        if not model_id or model_id.startswith("local/"):
            return _local_plan(task)

        provider_key, provider, model_name = self.get_provider(model_id)
        if not provider.available:
            logger.info(f"[LLM] {provider_key} non configuré, plan local.")
            return _local_plan(task)
        try:
            plan = provider.plan(task, model=model_name)
            # Si le LLM a renvoyé un JSON illisible, fallback local
            if plan.get("_parse_error"):
                logger.warning(f"[LLM] Plan {provider_key} illisible, fallback local.")
                local = _local_plan(task)
                local["planner"] = f"{plan.get('planner', provider_key)}_fallback"
                local["llm_raw"] = plan.get("raw", "")
                return local
            return plan
        except Exception as e:
            logger.warning(f"[LLM] Échec plan {provider_key}/{model_name} ({e}), fallback local.")
            return _local_plan(task)


# Singleton
llm_router = LLMRouter()


# ── Planificateur local (fallback souverain) ──────────────────────────────────
# Importé en retard pour éviter les imports circulaires.


def _local_plan(task: str) -> dict[str, Any]:
    """Délègue au planificateur heuristique local de NemotronClient."""
    from orchestrator.nemotron_client import NemotronClient

    nc = NemotronClient()
    return nc._local_plan(task)


def _local_complete(prompt: str, system: str = "") -> str:
    """Complétion locale — Ratiss répond en heuristique, naturellement.

    Le fallback souverain garde l'identité de Ratiss : on répond à la première
    personne, en langage simple, peu importe qu'aucun LLM cloud ne soit branché.
    """
    p = prompt.lower()
    if any(k in p for k in ["betti", "homologie", "topologie"]):
        return (
            "Les nombres de Betti décrivent les trous d'une forme, dimension par "
            "dimension. Pour une structure de protéine : β₀ compte les morceaux "
            "séparés, β₁ les tunnels et cavités, β₂ les volumes enfermés. "
            "Je peux lancer l'homologie persistante (avec GUDHI ou mon fallback "
            "natif) si tu me donnes une structure."
        )
    if any(k in p for k in ["quantique", "quantum", "lanczos", "t-j"]):
        return (
            "Je calcule l'état fondamental du modèle t-J par diagonalisation "
            "exacte Lanczos. Sur une grille 4×4, l'énergie par site E₀ vaut "
            "environ -0.85 t, ce qui traduit les corrélations antiferromagnétiques. "
            "Dis-moi la taille de grille et je lance le calcul."
        )
    if any(k in p for k in ["zk", "stark", "preuve"]):
        return (
            "La preuve ZK-STARK certifie un calcul sans révéler les données. "
            "Je génère un reçu RISC Zero, vérifiable publiquement en moins d'une "
            "milliseconde. Je peux certifier un résultat de calcul si tu veux."
        )
    return (
        f"Je suis Ratiss. J'ai bien reçu ta demande : « {prompt[:200]} ». "
        "Pour l'instant je tourne en mode souverain local. Branche une clé API "
        "(Anthropic, Gemini, OpenAI ou OpenRouter) via l'onglet Modèles pour "
        "activer le raisonnement complet — mais je reste Ratiss, peu importe le "
        "modèle que tu choisis."
    )


def set_api_key(provider: str, api_key: str) -> bool:
    """Configure dynamiquement une clé API pour un fournisseur.

    Args:
        provider: 'anthropic', 'google', 'openai', 'openrouter'
        api_key: la clé API

    Returns:
        True si le fournisseur est reconnu.
    """
    provider = provider.lower().strip()
    env_map = {
        "anthropic": "ANTHROPIC_API_KEY",
        "google": "GEMINI_API_KEY",
        "gemini": "GEMINI_API_KEY",
        "openai": "OPENAI_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
        "nemotron": "OPENROUTER_API_KEY",
    }
    env_var = env_map.get(provider)
    if not env_var:
        return False
    os.environ[env_var] = api_key.strip()
    # Persister la clé dans le vault chiffré pour qu'elle survive aux redémarrages
    vault_key_id = "openrouter" if provider in ("openrouter", "nemotron") else provider
    if provider == "gemini":
        vault_key_id = "google"
    try:
        from security.api_vault import store_key
        store_key(vault_key_id, api_key.strip(), label=provider)
    except Exception:
        # La persistance est best-effort : la clé reste active pour la session courante.
        pass
    # Réinitialiser le fournisseur correspondant
    router = llm_router
    if provider in ("anthropic",):
        router.providers["anthropic"] = AnthropicProvider()
    elif provider in ("google", "gemini"):
        router.providers["google"] = GeminiProvider()
    elif provider == "openai":
        router.providers["openai"] = OpenAIProvider()
    elif provider in ("openrouter", "nemotron"):
        router.providers["openrouter"] = OpenRouterProvider()
    return True
