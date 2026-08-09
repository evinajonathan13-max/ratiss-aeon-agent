/* RATISS Aeon Prime — Client WebSocket + rendu UI 3 panneaux.
   Écoute le canal multiplexé et met à jour chat, cascade, logs, télémétrie, artéfacts. */

(function () {
  "use strict";

  // ── État global ──────────────────────────────────────────────
  const state = {
    ws: null,
    sessionId: null,
    memHistory: [],
    cpuHistory: [],
    maxHistory: 60,
    steps: {},
    running: false,
  };

  // ── Utilitaires DOM ──────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function fmtTime(ts) {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString("fr-FR", { hour12: false });
  }

  function fmtBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(1) + " MB";
  }

  // ── Connexion WebSocket ──────────────────────────────────────
  function connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    state.ws = new WebSocket(`${proto}://${location.host}/ws`);

    state.ws.onopen = () => {
      $("conn-status").textContent = "● connecté";
      $("conn-status").className = "conn-status connected";
    };

    state.ws.onclose = () => {
      $("conn-status").textContent = "● déconnecté";
      $("conn-status").className = "conn-status disconnected";
      setTimeout(connect, 3000);
    };

    state.ws.onerror = () => {
      $("conn-status").textContent = "● erreur";
      $("conn-status").className = "conn-status disconnected";
    };

    state.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        handleMessage(msg);
      } catch (e) {
        console.error("parse error", e);
      }
    };
  }

  function send(obj) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify(obj));
    }
  }

  // ── Dispatch des événements ──────────────────────────────────
  function handleMessage(msg) {
    switch (msg.type) {
      case "init":
      case "connectors":
        renderConnectors(msg.connectors || msg.status || {});
        break;
      case "telemetry":
        updateTelemetry(msg.memory, msg.cpu_pct);
        break;
      case "skills":
        // optionnel : on pourrait afficher les skills
        break;
      case "chat":
        addChatMessage(msg.role, msg.content);
        break;
      case "planning":
        renderPlan(msg.plan);
        break;
      case "step_start":
        renderStepStart(msg.step);
        break;
      case "step_done":
        renderStepDone(msg.step_id, msg.result);
        fetchArtifacts();
        // Auto-preview des artéfacts de contenu (PDF, PNG, HTML)
        if (msg.result && msg.result.preview_url) {
          showPreview(msg.result.preview_url, msg.result.kind || msg.result.filename);
        }
        break;
      case "step_error":
        renderStepError(msg.step_id, msg.error);
        break;
      case "log":
        // Logs terminal vont dans le terminal, les autres dans les logs
        if (msg.stream && msg.stream.startsWith("terminal")) {
          addTerminalOutput(msg.stream === "terminal_stdout" ? "stdout" : "stderr", msg.message);
        } else {
          addLog(msg.stream, msg.message, msg.ts);
        }
        break;
      case "artifact":
        addArtifact(msg);
        break;
      case "session_start":
        state.sessionId = msg.session_id;
        $("session-id").textContent = `#${msg.session_id.slice(0, 8)}`;
        break;
      case "terminal_start":
        addTerminalCommand(msg.command);
        break;
      case "terminal_output":
        addTerminalOutput(msg.stream, msg.line);
        break;
      case "terminal_done":
        if (msg.result && msg.result.returncode !== 0) {
          addTerminalOutput("stderr", `[exit ${msg.result.returncode}] ${msg.result.error || ""}`);
        } else {
          addTerminalOutput("stdout", `[exit ${msg.result.returncode}] ${msg.result.duration_sec}s`);
        }
        break;
      case "terminal_error":
        addTerminalOutput("stderr", `ERREUR: ${msg.error}`);
        break;
      case "status":
        $("cascade-status").textContent = msg.status + (msg.detail ? " · " + msg.detail : "");
        break;
      case "done":
        handleDone(msg.summary);
        break;
      case "error":
        addChatMessage("assistant", "⚠ Erreur : " + (msg.message || "inconnue"));
        break;
    }
  }

  // ── Chat ─────────────────────────────────────────────────────
  function addChatMessage(role, content) {
    const container = $("chat-messages");
    const m = el("div", `msg ${role}`);
    m.appendChild(el("div", "msg-role", role === "user" ? "Vous" : "RATISS"));
    m.appendChild(el("div", "msg-content", content));
    container.appendChild(m);
    container.scrollTop = container.scrollHeight;
  }

  function sendTask() {
    const input = $("chat-input");
    const task = input.value.trim();
    if (!task || state.running) return;
    addChatMessage("user", task);
    input.value = "";
    state.running = true;
    $("send-btn").disabled = true;
    send({ type: "task", task });
  }

  // ── Plan + Cascade ───────────────────────────────────────────
  function renderPlan(plan) {
    const body = $("cascade-body");
    body.innerHTML = "";
    const block = el("div", "plan-block");
    const header = el("div", "plan-block-header");
    header.appendChild(el("span", "plan-block-title", "Planification"));
    header.appendChild(el("span", "plan-block-meta", `${plan.planner || "?"} · ${plan.domain || "?"}`));
    block.appendChild(header);
    block.appendChild(el("div", "plan-goal", plan.goal || ""));
    body.appendChild(block);

    (plan.steps || []).forEach((step) => {
      const s = el("div", "step pending");
      s.id = `step-${step.id}`;
      s.onclick = () => s.classList.toggle("expanded");

      const sh = el("div", "step-header");
      sh.appendChild(el("span", "step-id", `#${step.id}`));
      sh.appendChild(el("span", "step-desc", step.description || step.action));
      sh.appendChild(el("span", "step-icon", "○"));
      s.appendChild(sh);

      const detail = el("div", "step-detail", `action: ${step.action}\nparams: ${JSON.stringify(step.params || {}, null, 2)}`);
      s.appendChild(detail);
      body.appendChild(s);
      state.steps[step.id] = s;
    });
  }

  function renderStepStart(step) {
    const s = state.steps[step.id];
    if (s) {
      s.className = "step running";
      s.querySelector(".step-icon").textContent = "◐";
    }
  }

  function renderStepDone(stepId, result) {
    const s = state.steps[stepId];
    if (s) {
      s.className = "step done";
      s.querySelector(".step-icon").textContent = "✓";
      const detail = s.querySelector(".step-detail");
      const summary = summarizeResult(result);
      detail.textContent = `action: ${(result.action || "")}\n${summary}`;
    }
  }

  function renderStepError(stepId, error) {
    const s = state.steps[stepId];
    if (s) {
      s.className = "step error";
      s.querySelector(".step-icon").textContent = "✕";
      s.querySelector(".step-detail").textContent = `ERREUR: ${error}`;
    }
  }

  function summarizeResult(result) {
    if (!result || typeof result !== "object") return String(result);
    const lines = [];
    if (result.status) lines.push(`status: ${result.status}`);
    if (result.ground_state_energy != null) lines.push(`E₀: ${result.ground_state_energy.toFixed(6)}`);
    if (result.energy_per_site != null) lines.push(`E/site: ${result.energy_per_site.toFixed(6)}`);
    if (result.betti_numbers) lines.push(`Betti: [${result.betti_numbers.join(", ")}]`);
    if (result.spin_gap != null) lines.push(`Δ_spin: ${result.spin_gap.toFixed(6)}`);
    if (result.zk_commitment) {
      let zk = result.zk_commitment;
      if (typeof zk === "object") zk = zk.state_vector_hash || zk.proof_hash || JSON.stringify(zk).slice(0, 40);
      lines.push(`zk_commitment: ${String(zk).slice(0, 32)}...`);
    }
    if (result.proof_hash) lines.push(`proof_hash: ${result.proof_hash.slice(0, 32)}...`);
    if (result.receipt_b64) lines.push(`receipt: ${result.receipt_b64.slice(0, 32)}...`);
    if (result.verification_time_ms != null) lines.push(`verify: ${result.verification_time_ms} ms`);
    if (result.mem_peak_mb != null) lines.push(`mem_peak: ${result.mem_peak_mb} MB`);
    return lines.join("\n");
  }

  // ── Logs ─────────────────────────────────────────────────────
  function addLog(stream, message, ts) {
    const body = $("logs-body");
    const line = el("div", "log-line");
    line.appendChild(el("span", "log-time", fmtTime(ts || Date.now() / 1000)));
    line.appendChild(el("span", `log-stream ${stream}`, `[${stream}]`));
    line.appendChild(el("span", "log-msg", message));
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
    // Limite à 200 lignes
    while (body.children.length > 200) body.removeChild(body.firstChild);
  }

  // ── Télémétrie ───────────────────────────────────────────────
  function updateTelemetry(mem, cpu) {
    if (!mem) return;
    const cur = mem.current_mb || 0;
    const limit = mem.limit_mb || 7500;
    const pct = mem.usage_pct || 0;
    $("mem-value").textContent = `${Math.round(cur)} / ${Math.round(limit)} MB`;
    $("mem-fill").style.width = Math.min(100, pct) + "%";
    $("cpu-value").textContent = `${(cpu || 0).toFixed(1)} %`;
    $("cpu-fill").style.width = Math.min(100, cpu || 0) + "%";

    // Couleur selon charge
    const fill = $("mem-fill");
    if (pct > 90) fill.style.background = "var(--danger)";
    else if (pct > 70) fill.style.background = "var(--warning)";
    else fill.style.background = "var(--accent)";

    // Historique pour sparkline
    state.memHistory.push(cur);
    state.cpuHistory.push(cpu || 0);
    if (state.memHistory.length > state.maxHistory) state.memHistory.shift();
    if (state.cpuHistory.length > state.maxHistory) state.cpuHistory.shift();

    drawSparkline("mem-chart", state.memHistory, limit, "#4493f8");
    drawSparkline("cpu-chart", state.cpuHistory, 100, "#3fb950");
  }

  // ── Sparklines D3 ────────────────────────────────────────────
  function drawSparkline(svgId, data, max, color) {
    const svg = d3.select("#" + svgId);
    svg.selectAll("*").remove();
    if (data.length < 2) return;

    const elNode = $(svgId);
    const width = elNode.clientWidth || 240;
    const height = 50;
    const pad = 4;

    const x = d3.scaleLinear().domain([0, data.length - 1]).range([pad, width - pad]);
    const y = d3.scaleLinear().domain([0, Math.max(max, d3.max(data) || 1)]).range([height - pad, pad]);

    const line = d3.line()
      .x((d, i) => x(i))
      .y((d) => y(d))
      .curve(d3.curveMonotoneX);

    const area = d3.area()
      .x((d, i) => x(i))
      .y0(height - pad)
      .y1((d) => y(d))
      .curve(d3.curveMonotoneX);

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // Aire dégradée
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient")
      .attr("id", svgId + "-grad")
      .attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
    grad.append("stop").attr("offset", "0%").attr("stop-color", color).attr("stop-opacity", 0.3);
    grad.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0);

    svg.append("path").datum(data).attr("d", area).attr("fill", `url(#${svgId}-grad)`);
    svg.append("path").datum(data).attr("d", line).attr("fill", "none").attr("stroke", color).attr("stroke-width", 1.5);

    // Dernier point
    svg.append("circle")
      .attr("cx", x(data.length - 1))
      .attr("cy", y(data[data.length - 1]))
      .attr("r", 2.5)
      .attr("fill", color);
  }

  // ── Connecteurs ──────────────────────────────────────────────
  function renderConnectors(status) {
    const list = $("connectors-list");
    list.innerHTML = "";
    const conns = [];
    for (const key of ["ibm_quantum", "quandela", "alphafold", "rcsb", "openrouter"]) {
      if (status[key]) conns.push(status[key]);
    }
    if (conns.length === 0) {
      list.appendChild(el("div", "empty-state small", "Aucun connecteur"));
      return;
    }
    conns.forEach((c) => {
      const row = el("div", "connector");
      const left = el("div");
      const dot = el("span", `connector-dot ${c.mode === "live" ? "live" : c.mode === "fallback" ? "fallback" : c.mode === "public_api" ? "public" : "off"}`);
      left.appendChild(dot);
      left.appendChild(el("span", "connector-name", c.name));
      row.appendChild(left);
      row.appendChild(el("span", "connector-mode", c.mode));
      list.appendChild(row);
    });
  }

  // ── Artéfacts ────────────────────────────────────────────────
  function addArtifact(a) {
    const list = $("artifacts-list");
    list.innerHTML = "";
    fetchArtifacts();
  }

  function fetchArtifacts() {
    if (!state.sessionId) return;
    fetch(`/api/artifacts/${state.sessionId}`)
      .then((r) => r.json())
      .then((data) => renderArtifacts(data.artifacts || []))
      .catch(() => {});
  }

  function renderArtifacts(artifacts) {
    const list = $("artifacts-list");
    list.innerHTML = "";
    if (artifacts.length === 0) {
      list.appendChild(el("div", "empty-state small", "Aucun artéfact"));
      return;
    }
    artifacts.forEach((a) => {
      const link = el("a", "artifact clickable");
      link.href = `/api/preview/${a.name}`;
      link.download = a.name;
      link.appendChild(el("span", "artifact-name", a.name));
      const right = el("div");
      right.appendChild(el("span", "artifact-kind", a.kind));
      right.appendChild(el("span", "artifact-meta", " " + fmtBytes(a.size_bytes)));
      link.appendChild(right);
      // Clic = preview (sans téléchargement)
      link.addEventListener("click", (e) => {
        e.preventDefault();
        showPreview(`/api/preview/${a.name}`, a.name);
      });
      list.appendChild(link);
    });
  }

  // ── Terminal ─────────────────────────────────────────────────
  function addTerminalCommand(command) {
    const body = $("terminal-body");
    const line = el("div", "term-line");
    line.appendChild(el("span", "term-prompt", "$"));
    line.appendChild(el("span", "term-cmd", command));
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
  }

  function addTerminalOutput(stream, line) {
    const body = $("terminal-body");
    const div = el("div", "term-line");
    div.appendChild(el("span", `term-${stream}`, line));
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    // Limite à 300 lignes
    while (body.children.length > 300) body.removeChild(body.firstChild);
  }

  function sendTerminalCommand() {
    const input = $("terminal-input");
    const command = input.value.trim();
    if (!command) return;
    input.value = "";
    send({ type: "terminal", command, timeout: 30 });
  }

  // ── Preview artéfact ─────────────────────────────────────────
  function showPreview(url, kindOrName) {
    const container = $("preview-container");
    container.innerHTML = "";
    const name = String(kindOrName || url).toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";

    if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext)) {
      const img = el("img");
      img.src = url;
      img.alt = name;
      container.appendChild(img);
    } else if (ext === "html") {
      const iframe = el("iframe");
      iframe.src = url;
      container.appendChild(iframe);
    } else if (ext === "pdf") {
      const embed = el("embed");
      embed.src = url;
      embed.type = "application/pdf";
      container.appendChild(embed);
    } else {
      // Texte/JSON : fetch et afficher
      fetch(url)
        .then((r) => r.text())
        .then((text) => {
          const pre = el("pre");
          pre.style.cssText = "font-family:var(--mono);font-size:10px;color:var(--text-muted);padding:12px;white-space:pre-wrap;word-break:break-all;width:100%;";
          pre.textContent = text.slice(0, 3000);
          container.appendChild(pre);
        })
        .catch(() => {
          container.appendChild(el("div", "empty-state small", "Aperçu non disponible"));
        });
    }
  }

  // ── Done ─────────────────────────────────────────────────────
  function handleDone(summary) {
    state.running = false;
    $("send-btn").disabled = false;
    $("cascade-status").textContent = "terminé";
    const msg = `Pipeline terminé en ${summary.execution_time_sec}s. ` +
      `${summary.steps_success}/${summary.steps_executed} étapes réussies. ` +
      `Artéfacts générés dans workspace/${summary.workspace}.`;
    addChatMessage("assistant", msg);
    if (summary.results) {
      const zk = summary.results.find((r) => r.action === "zk_proof");
      if (zk && zk.result && zk.result.zk_commitment) {
        let c = zk.result.zk_commitment;
        if (typeof c === "object") c = c.state_vector_hash || c.proof_hash || JSON.stringify(c).slice(0, 48);
        $("cert-hash").textContent = String(c);
      }
    }
    fetchArtifacts();
  }

  // ── Init ─────────────────────────────────────────────────────
  // ── Browser, Python, Search (Manus IA tools) ────────────────────

  function switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.toggle("hidden", content.id !== `tab-content-${tabName}`);
    });
  }

  async function browserNavigate() {
    const url = $("browser-url").value.trim();
    if (!url) return;
    const output = $("browser-output");
    output.innerHTML = '<div class="empty-state small">⏳ Navigation en cours...</div>';
    try {
      const resp = await fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "navigate", url: url }),
      });
      const data = await resp.json();
      output.innerHTML = `
        <div style="color: var(--accent); font-weight: bold;">${data.title || "Sans titre"}</div>
        <div style="color: var(--text-dim); font-size: 10px; margin: 4px 0;">${data.url || ""} (HTTP ${data.status || "?"})</div>
        <div style="color: var(--text); margin-top: 6px; white-space: pre-wrap;">${(data.text || "").substring(0, 1000)}</div>
        <div style="color: var(--text-dim); font-size: 10px; margin-top: 6px;">${(data.links || []).length} liens trouvés</div>
      `;
    } catch (e) {
      output.innerHTML = `<div style="color: #e74c3c;">Erreur: ${e.message}</div>`;
    }
  }

  async function browserScreenshot() {
    const output = $("browser-output");
    output.innerHTML = '<div class="empty-state small">⏳ Screenshot en cours...</div>';
    try {
      const resp = await fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "screenshot", url: $("browser-url").value.trim() || "https://example.com" }),
      });
      const data = await resp.json();
      if (data.status === "SCREENSHOT_TAKEN") {
        output.innerHTML = `
          <div style="color: var(--accent);">📷 ${data.filename}</div>
          <div style="color: var(--text-dim); font-size: 10px;">${data.size_bytes} bytes</div>
          <img src="/api/preview/${data.filename}" style="max-width: 100%; margin-top: 8px; border-radius: 6px;" />
        `;
      } else {
        output.innerHTML = `<div style="color: #e74c3c;">${data.error || "Erreur"}</div>`;
      }
    } catch (e) {
      output.innerHTML = `<div style="color: #e74c3c;">Erreur: ${e.message}</div>`;
    }
  }

  async function browserState() {
    const output = $("browser-output");
    output.innerHTML = '<div class="empty-state small">⏳ Récupération de l\'état...</div>';
    try {
      // Naviguer d'abord si URL présente
      const url = $("browser-url").value.trim();
      if (url) {
        await fetch("/api/browser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "navigate", url: url }),
        });
      }
      const resp = await fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "state" }),
      });
      const data = await resp.json();
      const elements = data.interactive_elements || [];
      output.innerHTML = `
        <div style="color: var(--accent);">${data.title || "Sans titre"}</div>
        <div style="color: var(--text-dim); font-size: 10px;">${data.url || ""}</div>
        <div style="color: var(--text); margin-top: 6px;">${elements.length} éléments interactifs:</div>
        ${elements.slice(0, 10).map((el) => `<div style="font-size: 10px; color: var(--text-dim); padding: 2px 0;">[${el.index}] &lt;${el.tag}&gt; ${el.text.substring(0, 40)}</div>`).join("")}
      `;
    } catch (e) {
      output.innerHTML = `<div style="color: #e74c3c;">Erreur: ${e.message}</div>`;
    }
  }

  async function pythonRun() {
    const code = $("python-code").value.trim();
    if (!code) return;
    const output = $("python-output");
    output.innerHTML = '<div class="empty-state small">⏳ Exécution en cours...</div>';
    try {
      const resp = await fetch("/api/python", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code, timeout: 30 }),
      });
      const data = await resp.json();
      output.innerHTML = `
        <div style="color: ${data.status === "SUCCESS" ? "var(--accent)" : "#e74c3c"};">${data.status}</div>
        ${data.stdout ? `<div style="color: var(--text); white-space: pre-wrap; margin-top: 4px;">${data.stdout}</div>` : ""}
        ${data.result ? `<div style="color: var(--text-dim); margin-top: 4px;">→ ${data.result}</div>` : ""}
        ${data.error ? `<div style="color: #e74c3c; white-space: pre-wrap; margin-top: 4px;">${data.error.substring(0, 500)}</div>` : ""}
      `;
    } catch (e) {
      output.innerHTML = `<div style="color: #e74c3c;">Erreur: ${e.message}</div>`;
    }
  }

  async function webSearch() {
    const query = $("search-query").value.trim();
    if (!query) return;
    const output = $("search-output");
    output.innerHTML = '<div class="empty-state small">⏳ Recherche en cours...</div>';
    try {
      const resp = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query, max_results: 5 }),
      });
      const data = await resp.json();
      const results = data.results || [];
      output.innerHTML = `
        <div style="color: var(--accent); margin-bottom: 6px;">${data.engine || "?"}: ${data.count || 0} résultats</div>
        ${results.map((r) => `
          <div class="search-result">
            <div class="search-result-title" onclick="window.open('${r.url}', '_blank')">${r.title}</div>
            <div class="search-result-url">${r.url}</div>
            <div class="search-result-snippet">${r.snippet}</div>
          </div>
        `).join("")}
      `;
    } catch (e) {
      output.innerHTML = `<div style="color: #e74c3c;">Erreur: ${e.message}</div>`;
    }
  }

  function init() {
    connect();
    $("send-btn").addEventListener("click", sendTask);
    $("chat-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendTask();
      }
    });
    // Terminal : Enter pour exécuter
    $("terminal-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendTerminalCommand();
      }
    });
    // Browser/Python/Search tabs
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
    $("browser-go").addEventListener("click", browserNavigate);
    $("browser-screenshot").addEventListener("click", browserScreenshot);
    $("browser-state").addEventListener("click", browserState);
    $("browser-url").addEventListener("keydown", (e) => {
      if (e.key === "Enter") browserNavigate();
    });
    $("python-run").addEventListener("click", pythonRun);
    $("search-btn").addEventListener("click", webSearch);
    $("search-query").addEventListener("keydown", (e) => {
      if (e.key === "Enter") webSearch();
    });
    // Ping périodique
    setInterval(() => {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        send({ type: "ping" });
      }
    }, 25000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
