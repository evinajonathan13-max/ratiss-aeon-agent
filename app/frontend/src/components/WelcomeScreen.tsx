/**
 * components/WelcomeScreen.tsx — Écran d'entrée de Ratiss (onboarding souverain).
 *
 * Une belle image d'entrée, comme quand on ouvre un logiciel : le logo RATISS,
 * une présentation de qui est Ratiss, puis une synchronisation initiale en une
 * fois (âge, données métier, objectif, mode de sécurité). Une fois validé,
 * Ratiss se souvient de l'utilisateur pour toutes les conversations suivantes.
 *
 * Pensé aussi pour téléphone et tablette : responsive, gros boutons tactiles,
 * défilement naturel, calibrage optimiste (feedback immédiat et rassurant).
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Cloud, ArrowRight, Check, Sparkles } from "lucide-react";

export interface OnboardProfile {
  display_name?: string;
  age?: number | string;
  role?: string;
  domain?: string;
  goal?: string;
  security_mode?: "sovereign" | "cloud_opt_in";
}

interface WelcomeScreenProps {
  onDone: () => void;
}

type Step = "welcome" | "profile" | "security" | "syncing";

export function WelcomeScreen({ onDone }: WelcomeScreenProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [profile, setProfile] = useState<OnboardProfile>({ security_mode: "sovereign" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<OnboardProfile>) => setProfile(p => ({ ...p, ...patch }));

  const submitOnboarding = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("sync_failed");
      await res.json();
      onDone();
    } catch (e) {
      // Calibrage optimiste : on garde l'utilisateur dans l'app même si la synchro
      // échoue (mode souverain — pas de blocage).
      setError("Synchronisation impossible pour l'instant. Tu peux continuer, je mémoriserai plus tard.");
      setTimeout(onDone, 1600);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ratiss-welcome">
      <div className="ratiss-welcome-inner">
        {/* Logo + titre */}
        <motion.div
          className="ratiss-welcome-brand"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <img src="/assets/logo.svg" alt="RATISS Aeon Prime" className="ratiss-welcome-logo" />
          <h1 className="ratiss-welcome-title">RATISS</h1>
          <p className="ratiss-welcome-sub">Aeon Prime · Agent scientifique autonome souverain</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ── Étape 1 : bienvenue ───────────────────────────────────── */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              className="ratiss-welcome-card"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
            >
              <p className="ratiss-welcome-intro">
                Je suis <strong>Ratiss</strong>, instance souveraine <strong>JohnKing0</strong>.
                Je tourne en local sur ton nœud, et ma mémoire persiste sur disque : je me souviens
                de toi et de mes capacités entre chaque conversation. Peu importe le modèle branché,
                c'est Ratiss qui te répond.
              </p>
              <ul className="ratiss-welcome-feats">
                <li><Sparkles className="w-4 h-4" /> Physique quantique · topologie · biologie · ZK-STARK</li>
                <li><Shield className="w-4 h-4" /> Souveraineté totale sur le CPU, Memory Guard strict</li>
                <li><Check className="w-4 h-4" /> Mémoire persistante : jamais perdu, même en travail long</li>
              </ul>
              <button className="ratiss-welcome-btn" onClick={() => setStep("profile")}>
                Commencer la synchronisation <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ── Étape 2 : profil (âge + données métier) ───────────────── */}
          {step === "profile" && (
            <motion.div
              key="profile"
              className="ratiss-welcome-card"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
            >
              <h2 className="ratiss-welcome-h2">Faisons connaissance</h2>
              <p className="ratiss-welcome-help">Synchronisé une fois avec Ratiss, puis mémorisé localement.</p>
              <label className="ratiss-welcome-label">
                Ton prénom (optionnel)
                <input
                  className="ratiss-welcome-input"
                  value={profile.display_name || ""}
                  onChange={e => update({ display_name: e.target.value })}
                  placeholder="Ex : Jonathan"
                  autoComplete="given-name"
                />
              </label>
              <label className="ratiss-welcome-label">
                Ton âge
                <input
                  className="ratiss-welcome-input"
                  type="number"
                  min={1}
                  max={120}
                  inputMode="numeric"
                  value={profile.age ?? ""}
                  onChange={e => update({ age: e.target.value })}
                  placeholder="Ex : 18"
                />
              </label>
              <label className="ratiss-welcome-label">
                Ton activité (rôle)
                <input
                  className="ratiss-welcome-input"
                  value={profile.role || ""}
                  onChange={e => update({ role: e.target.value })}
                  placeholder="Ex : Chercheur, étudiant, ingénieur…"
                />
              </label>
              <label className="ratiss-welcome-label">
                Domaine
                <input
                  className="ratiss-welcome-input"
                  value={profile.domain || ""}
                  onChange={e => update({ domain: e.target.value })}
                  placeholder="Ex : Physique quantique, biologie…"
                />
              </label>
              <label className="ratiss-welcome-label">
                Ton objectif principal
                <input
                  className="ratiss-welcome-input"
                  value={profile.goal || ""}
                  onChange={e => update({ goal: e.target.value })}
                  placeholder="Ex : Démocratiser la science"
                />
              </label>
              <div className="ratiss-welcome-actions">
                <button className="ratiss-welcome-btn ghost" onClick={() => setStep("welcome")}>Retour</button>
                <button className="ratiss-welcome-btn" onClick={() => setStep("security")}>
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Étape 3 : standard de sécurité d'entrée ───────────────── */}
          {step === "security" && (
            <motion.div
              key="security"
              className="ratiss-welcome-card"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
            >
              <h2 className="ratiss-welcome-h2">Standard de sécurité</h2>
              <p className="ratiss-welcome-help">Tu choisis qui parle au cloud. Par défaut, on reste fermé.</p>
              <div className="ratiss-welcome-options">
                <button
                  className={`ratiss-welcome-option ${profile.security_mode === "sovereign" ? "active" : ""}`}
                  onClick={() => update({ security_mode: "sovereign" })}
                >
                  <Shield className="w-6 h-6" />
                  <span className="ratiss-welcome-opt-title">Souverain (fermé)</span>
                  <span className="ratiss-welcome-opt-desc">Tout reste local. Aucune donnée vers le cloud. Recommandé.</span>
                </button>
                <button
                  className={`ratiss-welcome-option ${profile.security_mode === "cloud_opt_in" ? "active" : ""}`}
                  onClick={() => update({ security_mode: "cloud_opt_in" })}
                >
                  <Cloud className="w-6 h-6" />
                  <span className="ratiss-welcome-opt-title">Cloud opt-in (ouvert)</span>
                  <span className="ratiss-welcome-opt-desc">Tu acceptes d'ouvrir le cloud (clés API). Tu gardes le contrôle.</span>
                </button>
              </div>
              <div className="ratiss-welcome-actions">
                <button className="ratiss-welcome-btn ghost" onClick={() => setStep("profile")}>Retour</button>
                <button className="ratiss-welcome-btn" onClick={submitOnboarding} disabled={saving}>
                  {saving ? "Synchronisation…" : <>Valider et entrer <Check className="w-4 h-4" /></>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p className="ratiss-welcome-error">{error}</p>}

        <p className="ratiss-welcome-foot">
          Propriété intellectuelle : JOHNKING0 &amp; architecte Jonathan Evina
        </p>
      </div>
    </div>
  );
}

export default WelcomeScreen;
