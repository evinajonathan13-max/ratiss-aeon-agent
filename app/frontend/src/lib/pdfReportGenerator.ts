// RATISS — génération de rapport exécutif PDF côté navigateur
// Rendu vectoriel via canvas + impression. Souverain : aucune dépendance externe.

export interface ReportData {
  title: string;
  author: string;
  date: string;
  model: string;
  geometry: string;
  energyE0?: number;
  energyPerSite?: number;
  spinGap?: number;
  dWavePairing?: number;
  bettiNumbers?: number[];
  entropy?: number;
  zkProofStatus: string;
  proofHash?: string;
  receiptB64?: string;
  thermoTime?: number;
  emergenceFlux?: number;
  summaryText: string;
}

export function downloadRatissExecutivePdf(data: ReportData, filename: string) {
  const win = window.open("", "_blank");
  if (!win) return;

  const betti = data.bettiNumbers ? data.bettiNumbers.join(", ") : "—";
  const e0 = data.energyE0 != null ? data.energyE0.toFixed(6) : "—";

  win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
  <title>${data.title}</title>
  <style>
    @page { margin: 18mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0b0b0b; max-width: 720px; margin: 0 auto; padding: 32px; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px; }
    .header h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -0.5px; }
    .meta { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
    h2 { font-size: 14px; color: #2563eb; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
    td, th { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    .summary { background: #f8fafc; border-left: 3px solid #2563eb; padding: 14px 16px; font-size: 12px; line-height: 1.6; white-space: pre-wrap; }
    .zk { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #10b981; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .hash { font-family: monospace; font-size: 10px; color: #2563eb; word-break: break-all; }
    .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8; }
  </style></head><body>
  <div class="header">
    <h1>${data.title}</h1>
    <div class="meta">${data.author} · ${data.date} · ${data.model} · ${data.geometry}</div>
  </div>

  <h2>Résultats scientifiques</h2>
  <table>
    <tr><th>Énergie fondamentale E₀</th><td>${e0} eV</td></tr>
    <tr><th>Nombres de Betti</th><td>${betti}</td></tr>
    <tr><th>Entropie informationnelle</th><td>${data.entropy != null ? data.entropy.toFixed(4) : "—"}</td></tr>
    ${data.spinGap != null ? `<tr><th>Gap de spin</th><td>${data.spinGap.toFixed(4)}</td></tr>` : ""}
    ${data.dWavePairing != null ? `<tr><th>Couplage d-wave</th><td>${data.dWavePairing.toFixed(4)}</td></tr>` : ""}
  </table>

  <h2>Certification cryptographique</h2>
  <p><span class="zk">ZK-STARK ${data.zkProofStatus}</span></p>
  ${data.proofHash ? `<p class="hash">Preuve : ${data.proofHash}</p>` : ""}

  <h2>Synthèse</h2>
  <div class="summary">${(data.summaryText || "").replace(/</g, "&lt;")}</div>

  <div class="footer">RATISS Aeon Agent — Agent scientifique autonome souverain. Rapport généré localement, 100% CPU.</div>
  <script>window.onload = () => { window.print(); };</script>
  </body></html>`);
  win.document.close();
}
