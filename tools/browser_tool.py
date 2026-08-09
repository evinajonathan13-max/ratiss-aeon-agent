"""
tools/browser_tool.py — Browser automation (type Manus IA / OpenManus).

Permet à l'agent RATISS de naviguer le web comme un humain :
  - Naviguer vers une URL
  - Cliquer sur des éléments (par sélecteur CSS)
  - Taper du texte dans des champs
  - Extraire le contenu (texte, HTML, liens)
  - Prendre des screenshots
  - Scroller
  - Obtenir l'état de la page (éléments interactifs)

Utilise un subprocess one-shot par commande (évite les conflits d'event loop
avec FastAPI). Souveraineté : tout reste local.

Équivalent du BrowserUseTool d'OpenManus, adapté pour RATISS.
"""
from __future__ import annotations

import os
import sys
import json
import time as _time
import logging
import subprocess
from pathlib import Path
from typing import Any, Callable

logger = logging.getLogger("ratiss.browser")

_ROOT = Path(__file__).resolve().parent.parent

# Script Playwright one-shot : reçoit une commande JSON en argv, retourne le résultat sur stdout
_BROWSER_SCRIPT = r'''
import sys, json, os, time

def main():
    cmd_json = sys.argv[1] if len(sys.argv) > 1 else "{}"
    cmd = json.loads(cmd_json)
    action = cmd.get("action", "")
    params = cmd.get("params", {})

    from playwright.sync_api import sync_playwright

    result = {"status": "ERROR", "error": "unknown_action"}

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--no-sandbox", "--disable-gpu"])
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="RATISS-Aeon-Agent/9.0 (Scientific Research Bot)",
        )
        page = context.new_page()

        try:
            if action in ("navigate", "goto", "open"):
                url = params.get("url", "")
                if not url.startswith("http"):
                    url = "https://" + url
                resp = page.goto(url, wait_until="domcontentloaded", timeout=20000)
                title = page.title()
                text = page.evaluate("() => document.body ? document.body.innerText.substring(0, 5000) : ''")
                links = page.evaluate("""() => Array.from(document.querySelectorAll('a[href]')).slice(0, 30).map(a => ({text: a.innerText.trim().substring(0, 80), href: a.href})).filter(l => l.text.length > 0)""")
                result = {"url": url, "title": title, "status": resp.status if resp else 0, "text": text, "links": links}

            elif action in ("click",):
                sel = params.get("selector", "")
                page.click(sel, timeout=10000)
                page.wait_for_load_state("domcontentloaded", timeout=10000)
                result = {"status": "CLICKED", "selector": sel, "title": page.title()}

            elif action in ("type", "fill", "input"):
                sel = params.get("selector", "")
                text = params.get("text", "")
                try:
                    page.fill(sel, text, timeout=10000)
                except Exception:
                    page.click(sel, timeout=5000)
                    page.keyboard.type(text)
                result = {"status": "TYPED", "selector": sel}

            elif action in ("extract", "get_text", "read"):
                sel = params.get("selector", "body")
                el = page.query_selector(sel)
                if not el:
                    result = {"status": "NOT_FOUND", "selector": sel}
                else:
                    text = el.inner_text()
                    result = {"status": "EXTRACTED", "selector": sel, "text": text[:5000] if text else ""}

            elif action in ("screenshot", "capture"):
                outdir = params.get("output_dir", ".")
                os.makedirs(outdir, exist_ok=True)
                fname = f"screenshot_{int(time.time())}.png"
                fpath = os.path.join(outdir, fname)
                if params.get("url"):
                    url = params["url"]
                    if not url.startswith("http"):
                        url = "https://" + url
                    page.goto(url, wait_until="domcontentloaded", timeout=20000)
                page.screenshot(path=fpath, full_page=params.get("full_page", True))
                size = os.path.getsize(fpath)
                result = {"status": "SCREENSHOT_TAKEN", "filename": fname, "path": fpath, "size_bytes": size}

            elif action in ("scroll",):
                dy = params.get("amount", 500) if params.get("direction", "down") == "down" else -params.get("amount", 500)
                page.mouse.wheel(0, dy)
                time.sleep(0.5)
                result = {"status": "SCROLLED", "direction": params.get("direction", "down"), "amount": params.get("amount", 500)}

            elif action in ("state", "get_state", "inspect"):
                title = page.title()
                url = page.url
                elements = page.evaluate("""() => {
                    const interactive = [];
                    document.querySelectorAll('a, button, input, select, textarea, [role="button"]').forEach((el, i) => {
                        if (i >= 50) return;
                        interactive.push({index: i, tag: el.tagName.toLowerCase(), type: el.type || '', text: (el.innerText || el.value || el.placeholder || '').trim().substring(0, 60), href: el.href || ''});
                    });
                    return interactive;
                }""")
                result = {"url": url, "title": title, "interactive_elements": elements}

            elif action in ("back",):
                # Pour back, il faut d'abord naviguer
                if params.get("url"):
                    url = params["url"]
                    if not url.startswith("http"):
                        url = "https://" + url
                    page.goto(url, wait_until="domcontentloaded", timeout=20000)
                    result = {"status": "NAVIGATED", "title": page.title(), "url": page.url}
                else:
                    result = {"status": "ERROR", "error": "back requires url in one-shot mode"}

            else:
                result = {"status": "UNKNOWN_ACTION", "action": action}

        except Exception as e:
            result = {"status": "ERROR", "error": str(e)}
        finally:
            browser.close()

    print(json.dumps(result, default=str))

main()
'''


def _run_browser_subprocess(action: str, params: dict[str, Any]) -> dict[str, Any]:
    """Exécute une action browser dans un subprocess one-shot."""
    cmd = json.dumps({"action": action, "params": params})
    try:
        proc = subprocess.run(
            [sys.executable, "-c", _BROWSER_SCRIPT, cmd],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if proc.returncode != 0:
            return {"status": "ERROR", "error": f"subprocess exit {proc.returncode}", "stderr": proc.stderr[:500]}
        output = proc.stdout.strip()
        if not output:
            return {"status": "ERROR", "error": "no output", "stderr": proc.stderr[:500]}
        return json.loads(output)
    except subprocess.TimeoutExpired:
        return {"status": "ERROR", "error": "timeout (30s)"}
    except json.JSONDecodeError as e:
        return {"status": "ERROR", "error": f"json decode: {e}", "stdout": proc.stdout[:200]}
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}


def browser_navigate(url: str, on_log: Callable[[str], None] | None = None) -> dict[str, Any]:
    """Navigue vers une URL et retourne le contenu de la page."""
    if on_log:
        on_log(f"Navigating to {url}...")
    return _run_browser_subprocess("navigate", {"url": url})


def browser_click(selector: str, on_log: Callable[[str], None] | None = None) -> dict[str, Any]:
    """Clique sur un élément par sélecteur CSS (nécessite une URL au préalable)."""
    if on_log:
        on_log(f"Clicking '{selector}'...")
    return _run_browser_subprocess("click", {"selector": selector})


def browser_type(selector: str, text: str, on_log: Callable[[str], None] | None = None) -> dict[str, Any]:
    """Tape du texte dans un champ."""
    if on_log:
        on_log(f"Typing into '{selector}'...")
    return _run_browser_subprocess("type", {"selector": selector, "text": text})


def browser_extract(selector: str = "body", on_log: Callable[[str], None] | None = None) -> dict[str, Any]:
    """Extrait le contenu d'un élément."""
    if on_log:
        on_log(f"Extracting '{selector}'...")
    return _run_browser_subprocess("extract", {"selector": selector})


def browser_screenshot(output_dir: str | None = None, full_page: bool = True, on_log: Callable[[str], None] | None = None) -> dict[str, Any]:
    """Prend une screenshot de la page courante."""
    if on_log:
        on_log("Taking screenshot...")
    params = {"output_dir": output_dir or ".", "full_page": full_page}
    return _run_browser_subprocess("screenshot", params)


def browser_scroll(direction: str = "down", amount: int = 500, on_log: Callable[[str], None] | None = None) -> dict[str, Any]:
    """Scrolle la page."""
    if on_log:
        on_log(f"Scrolling {direction} by {amount}px...")
    return _run_browser_subprocess("scroll", {"direction": direction, "amount": amount})


def browser_get_state(on_log: Callable[[str], None] | None = None) -> dict[str, Any]:
    """Retourne l'état de la page."""
    if on_log:
        on_log("Getting page state...")
    return _run_browser_subprocess("state", {})


def browser_back(on_log: Callable[[str], None] | None = None) -> dict[str, Any]:
    """Retourne à la page précédente."""
    if on_log:
        on_log("Going back...")
    return _run_browser_subprocess("back", {})


def _close_browser() -> None:
    """No-op en mode one-shot (le browser est fermé après chaque commande)."""
    pass


def execute_browser_action(
    action: str,
    params: dict[str, Any],
    workspace_dir: str | None = None,
    on_log: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    """Point d'entrée unique pour toutes les actions browser."""
    action = action.lower().strip()

    if action in ("navigate", "goto", "open"):
        return browser_navigate(params.get("url", ""), on_log)
    elif action in ("click",):
        return browser_click(params.get("selector", ""), on_log)
    elif action in ("type", "fill", "input"):
        return browser_type(params.get("selector", ""), params.get("text", ""), on_log)
    elif action in ("extract", "get_text", "read"):
        return browser_extract(params.get("selector", "body"), on_log)
    elif action in ("screenshot", "capture"):
        # Si une URL est fournie, naviguer d'abord puis screenshot
        screenshot_params = {"output_dir": workspace_dir or ".", "full_page": params.get("full_page", True)}
        if params.get("url"):
            screenshot_params["url"] = params["url"]
        if on_log:
            on_log("Taking screenshot...")
        return _run_browser_subprocess("screenshot", screenshot_params)
    elif action in ("scroll",):
        return browser_scroll(params.get("direction", "down"), params.get("amount", 500), on_log)
    elif action in ("state", "get_state", "inspect"):
        return browser_get_state(on_log)
    elif action in ("back",):
        return browser_back(on_log)
    elif action in ("close", "quit"):
        _close_browser()
        return {"status": "BROWSER_CLOSED"}
    else:
        return {"status": "UNKNOWN_BROWSER_ACTION", "action": action}
