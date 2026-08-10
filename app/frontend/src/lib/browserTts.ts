// RATISS — synthèse vocale navigateur (fallback souverain, hors cloud)
// Signature compatible avec les callbacks utilisés par MessageBubble/RatissLive/VoiceManager.

export function speakBrowserTts(
  text: string,
  voice: "homme" | "femme" = "femme",
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (e: any) => void
) {
  if (!("speechSynthesis" in window)) {
    onError?.(new Error("speechSynthesis unavailable"));
    return;
  }
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "fr-FR";
  utter.rate = 1.0;
  utter.pitch = voice === "femme" ? 1.1 : 0.9;

  const voices = window.speechSynthesis.getVoices();
  const fr = voices.filter((v) => v.lang.startsWith("fr"));
  if (fr.length > 0) {
    const picked =
      voice === "femme"
        ? fr.find((v) => /fem|femme|female/i.test(v.name)) || fr[0]
        : fr.find((v) => /hom|homme|male/i.test(v.name)) || fr[0];
    if (picked) utter.voice = picked;
  }

  utter.onstart = () => onStart?.();
  utter.onend = () => onEnd?.();
  utter.onerror = (e) => onError?.(e);

  window.speechSynthesis.speak(utter);
}

export function stopBrowserTts() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
