/**
 * components/OnboardingGate.tsx — Porte d'entrée de Ratiss.
 *
 * Au démarrage, vérifie si l'utilisateur a déjà fait la synchronisation initiale
 * (onboarding) auprès de Ratiss. Si ce n'est pas le cas, affiche l'écran
 * d'accueil (WelcomeScreen) — une belle image d'entrée, comme ouvrir un
 * logiciel. Une fois synchronisé, on mémorise le choix dans localStorage pour
 * ne pas re-demander à chaque fois, et on laisse passer l'app.
 *
 * Mode souverain : si le backend ne répond pas, on n'enferme pas l'utilisateur
 * — calibrage optimiste, on entre directement dans l'app.
 */
import React, { useEffect, useState } from "react";
import WelcomeScreen from "./WelcomeScreen";

const LOCAL_KEY = "ratiss_onboarded";

interface OnboardingGateProps {
  children: React.ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const [checking, setChecking] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean>(() => localStorage.getItem(LOCAL_KEY) === "true");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("no_profile");
        const data = await res.json();
        if (cancelled) return;
        const done = !!data.onboarded;
        setOnboarded(done);
        if (done) localStorage.setItem(LOCAL_KEY, "true");
      } catch {
        // Backend indisponible : on ne bloque pas (calibrage optimiste).
        if (!cancelled) setOnboarded(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const finishOnboarding = () => {
    localStorage.setItem(LOCAL_KEY, "true");
    setOnboarded(true);
  };

  if (checking) {
    // Écran de chargement sobre, en attendant l'état du backend.
    return (
      <div className="ratiss-gate-loading">
        <img src="/assets/logo.svg" alt="RATISS" className="ratiss-gate-loading-logo" />
      </div>
    );
  }

  if (!onboarded) {
    return <WelcomeScreen onDone={finishOnboarding} />;
  }

  return <>{children}</>;
}

export default OnboardingGate;
