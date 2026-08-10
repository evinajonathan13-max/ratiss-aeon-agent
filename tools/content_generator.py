"""
tools/content_generator.py — Génération de contenu (PDF, images, pages web).

Permet à l'agent de produire :
  - generate_pdf(title, sections)    : rapport scientifique PDF
  - generate_chart(data, kind, title) : graphique PNG (matplotlib)
  - generate_webpage(html, title)     : page HTML sauvegardée et previewable
  - generate_betti_diagram(diagrams)  : diagramme de persistance (topologie)
  - generate_energy_plot(e0, gap)     : plot d'énergie (quantique)

Dépendances : matplotlib + fpdf2 (installés via requirements.txt).
Fallback : si matplotlib absent, génère un SVG simple.
"""
from __future__ import annotations

import os
import json
import base64
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("ratiss.content")

_ROOT = Path(__file__).resolve().parent.parent


def _ensure_mpl():
    """Tente d'importer matplotlib. Retourne (pyplot, disponible)."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        plt.rcParams.update({
            "figure.facecolor": "#0d1117",
            "axes.facecolor": "#161b22",
            "axes.edgecolor": "#30363d",
            "axes.labelcolor": "#e6edf3",
            "xtick.color": "#8b949e",
            "ytick.color": "#8b949e",
            "text.color": "#e6edf3",
            "axes.titlecolor": "#4493f8",
            "font.family": "DejaVu Sans",
            "font.size": 10,
        })
        return plt, True
    except ImportError:
        return None, False


def generate_chart(data: dict[str, Any], kind: str = "bar", title: str = "Graphique", output_dir: Path | None = None) -> dict[str, Any]:
    """Génère un graphique PNG.

    Args:
        data: Soit {labels: [...], values: [...]}, soit {x: [...], y: [...]}
        kind: 'bar', 'line', 'scatter', 'pie'
        title: Titre du graphique
        output_dir: Dossier de sortie (défaut: workspace)

    Returns:
        {path, filename, kind, title, size_bytes, base64_preview}
    """
    out_dir = output_dir or _ROOT / "workspace"
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"chart_{kind}_{title.lower().replace(' ', '_')[:30]}.png"
    path = out_dir / filename

    plt, available = _ensure_mpl()
    if not available:
        # Fallback SVG
        return _generate_svg_chart(data, kind, title, out_dir)

    fig, ax = plt.subplots(figsize=(7, 4), dpi=120)

    labels = data.get("labels", [])
    values = data.get("values", data.get("y", []))
    xs = data.get("x", list(range(len(values))))

    if kind == "bar":
        ax.bar(labels, values, color="#4493f8", edgecolor="#1f6feb", alpha=0.85)
    elif kind == "line":
        ax.plot(xs, values, color="#4493f8", linewidth=2, marker="o", markersize=4)
        ax.fill_between(xs, values, alpha=0.15, color="#4493f8")
    elif kind == "scatter":
        ax.scatter(xs, values, c="#3fb950", alpha=0.7, edgecolors="#1f6feb")
    elif kind == "pie":
        ax.pie(values, labels=labels, autopct="%1.1f%%", colors=["#4493f8", "#3fb950", "#d29922", "#f85149", "#a371f7"])
        ax.set_aspect("equal")
    else:
        ax.bar(labels, values, color="#4493f8")

    ax.set_title(title, fontsize=13, fontweight="bold", pad=12)
    if kind != "pie":
        ax.grid(True, color="#21262d", linestyle="-", linewidth=0.5, alpha=0.7)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)

    fig.tight_layout()
    fig.savefig(str(path), facecolor="#0d1117", bbox_inches="tight")
    plt.close(fig)

    # Encoder en base64 pour preview
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")

    return {
        "path": str(path.relative_to(_ROOT)),
        "filename": filename,
        "kind": kind,
        "title": title,
        "size_bytes": path.stat().st_size,
        "base64_preview": b64[:200] + "..." if len(b64) > 200 else b64,
        "preview_url": f"/api/preview/{filename}",
    }


def _generate_svg_chart(data, kind, title, out_dir) -> dict[str, Any]:
    """Fallback SVG si matplotlib absent."""
    filename = f"chart_{kind}_{title.lower().replace(' ', '_')[:30]}.svg"
    path = out_dir / filename
    labels = data.get("labels", ["A", "B", "C"])
    values = data.get("values", data.get("y", [1, 2, 3]))
    max_v = max(values) if values else 1
    w, h = 400, 220
    bar_w = w / (len(values) * 1.5)
    bars = ""
    for i, (l, v) in enumerate(zip(labels, values)):
        bh = (v / max_v) * (h - 60) if max_v > 0 else 0
        x = 30 + i * (bar_w + 10)
        y = h - 30 - bh
        bars += f'<rect x="{x}" y="{y}" width="{bar_w}" height="{bh}" fill="#4493f8" rx="2"/>'
        bars += f'<text x="{x + bar_w/2}" y="{h - 15}" fill="#8b949e" font-size="10" text-anchor="middle">{l}</text>'
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
    svg += f'<rect width="{w}" height="{h}" fill="#161b22"/>'
    svg += f'<text x="{w/2}" y="20" fill="#4493f8" font-size="13" font-weight="bold" text-anchor="middle">{title}</text>'
    svg += bars
    svg += "</svg>"
    path.write_text(svg, encoding="utf-8")
    return {
        "path": str(path.relative_to(_ROOT)),
        "filename": filename,
        "kind": kind,
        "title": title,
        "size_bytes": path.stat().st_size,
        "preview_url": f"/api/preview/{filename}",
        "fallback": "svg_no_matplotlib",
    }


def generate_betti_diagram(diagrams: dict[str, list], output_dir: Path | None = None) -> dict[str, Any]:
    """Génère un diagramme de persistance (topologie)."""
    out_dir = output_dir or _ROOT / "workspace"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "betti_persistence_diagram.png"

    plt, available = _ensure_mpl()
    if not available:
        # Données simples pour fallback
        return _generate_svg_chart(
            {"labels": [f"B{i}" for i in range(3)], "values": [len(diagrams.get(str(i), [])) for i in range(3)]},
            "bar", "Betti Numbers", out_dir,
        )

    fig, ax = plt.subplots(figsize=(6, 6), dpi=120)
    colors = ["#4493f8", "#3fb950", "#f85149", "#d29922"]
    for dim_str, points in diagrams.items():
        dim = int(dim_str)
        if not points:
            continue
        color = colors[dim % len(colors)]
        for birth, death in points:
            if death == float("inf"):
                ax.scatter([birth], [birth], c=color, marker="^", s=30, label=f"dim {dim} (∞)" if dim == int(dim_str) else "")
            else:
                ax.scatter([birth], [death], c=color, s=15, alpha=0.6)

    # Ligne diagonale
    lim = ax.get_xlim()
    ax.plot([lim[0], lim[1]], [lim[0], lim[1]], "--", color="#30363d", linewidth=0.8)
    ax.set_xlabel("Naissance (birth)", fontsize=11)
    ax.set_ylabel("Décès (death)", fontsize=11)
    ax.set_title("Diagramme de Persistance", fontsize=13, fontweight="bold")
    ax.grid(True, color="#21262d", alpha=0.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    fig.savefig(str(path), facecolor="#0d1117", bbox_inches="tight")
    plt.close(fig)

    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return {
        "path": str(path.relative_to(_ROOT)),
        "filename": "betti_persistence_diagram.png",
        "kind": "persistence_diagram",
        "title": "Diagramme de Persistance",
        "size_bytes": path.stat().st_size,
        "preview_url": "/api/preview/betti_persistence_diagram.png",
    }


def generate_pdf(title: str, sections: list[dict[str, Any]], output_dir: Path | None = None) -> dict[str, Any]:
    """Génère un rapport scientifique PDF.

    Args:
        title: Titre du rapport
        sections: Liste de {heading, content, kind} où kind est 'text' ou 'table' ou 'code'
        output_dir: Dossier de sortie

    Returns:
        {path, filename, size_bytes, preview_url}
    """
    out_dir = output_dir or _ROOT / "workspace"
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"rapport_{title.lower().replace(' ', '_')[:30]}.pdf"
    path = out_dir / filename

    try:
        from fpdf import FPDF
    except ImportError:
        # Fallback : générer un fichier texte si fpdf2 absent
        txt_path = path.with_suffix(".txt")
        lines = [f"RAPPORT: {title}", "=" * 60, ""]
        for s in sections:
            lines.append(s.get("heading", ""))
            lines.append("-" * 40)
            content = s.get("content", "")
            if isinstance(content, (dict, list)):
                content = json.dumps(content, indent=2, default=str)
            lines.append(str(content))
            lines.append("")
        txt_path.write_text("\n".join(lines), encoding="utf-8")
        return {
            "path": str(txt_path.relative_to(_ROOT)),
            "filename": txt_path.name,
            "size_bytes": txt_path.stat().st_size,
            "preview_url": f"/api/preview/{txt_path.name}",
            "fallback": "txt_no_fpdf",
        }

    def _sanitize(text: str) -> str:
        """Remplace les caractères non latin-1 pour fpdf2 (Helvetica core font)."""
        replacements = {
            "\u2014": "-", "\u2013": "-", "\u2018": "'", "\u2019": "'",
            "\u201c": '"', "\u201d": '"', "\u2026": "...", "\u00a0": " ",
            "\u2192": "->", "\u2190": "<-", "\u2022": "*", "\u00b0": " deg",
            "\u0394": "Delta", "\u03b8": "theta", "\u03bb": "lambda",
            "\u03c8": "psi", "\u03a3": "Sigma", "\u03b5": "epsilon",
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        # Encoder en latin-1 avec remplacement pour les caractères restants
        return text.encode("latin-1", errors="replace").decode("latin-1")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # En-tête
    pdf.set_fill_color(13, 17, 23)
    pdf.rect(0, 0, 210, 30, "F")
    pdf.set_text_color(68, 147, 248)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 12, "RATISS Aeon Prime", new_x="LMARGIN", new_y="NEXT", align="L")
    pdf.set_text_color(139, 148, 158)
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(0, 5, "Agent scientifique souverain - Rapport genere automatiquement", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)

    # Titre
    pdf.set_text_color(230, 237, 243)
    pdf.set_font("Helvetica", "B", 14)
    pdf.multi_cell(0, 8, _sanitize(title))
    pdf.ln(4)

    # Ligne séparatrice
    pdf.set_draw_color(48, 54, 61)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)

    # Auteur / date
    pdf.set_text_color(139, 148, 158)
    pdf.set_font("Helvetica", "I", 9)
    from datetime import datetime, timezone
    pdf.cell(0, 5, _sanitize(f"Auteur: Jonathan Evina  |  Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}  |  ORCID: 0009-0000-4092-5313"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Sections
    for section in sections:
        heading = section.get("heading", "")
        content = section.get("content", "")
        kind = section.get("kind", "text")

        pdf.set_text_color(68, 147, 248)
        pdf.set_font("Helvetica", "B", 11)
        pdf.multi_cell(0, 7, _sanitize(heading))
        pdf.ln(2)

        pdf.set_text_color(230, 237, 243)
        if kind == "code":
            pdf.set_font("Courier", "", 9)
            pdf.set_text_color(139, 148, 158)
        elif kind == "table":
            pdf.set_font("Helvetica", "", 10)
        else:
            pdf.set_font("Helvetica", "", 10)

        if isinstance(content, (dict, list)):
            content = json.dumps(content, indent=2, default=str, ensure_ascii=False)

        if kind == "image":
            # Insertion d'une image (graphique/diagramme) dans le PDF
            img_path = str(content)
            try:
                # Contenu largeur adaptée (max 190 mm), garde l'aspect ratio
                pdf.image(img_path, x=10, w=190)
            except Exception as img_err:
                pdf.set_text_color(200, 120, 120)
                pdf.multi_cell(0, 5, _sanitize(f"[Image indisponible: {img_err}]"))
        else:
            pdf.multi_cell(0, 5, _sanitize(str(content)))
        pdf.ln(4)

    # Pied de page
    pdf.set_y(-25)
    pdf.set_draw_color(48, 54, 61)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)
    pdf.set_text_color(110, 118, 129)
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(0, 5, "RATISS Aeon Prime | DOI: 10.17605/OSF.IO/6JZMB | MIT License", align="C")

    pdf.output(str(path))

    return {
        "path": str(path.relative_to(_ROOT)),
        "filename": filename,
        "size_bytes": path.stat().st_size,
        "preview_url": f"/api/preview/{filename}",
        "sections_count": len(sections),
    }


def generate_webpage(html_content: str, title: str = "Page générée", output_dir: Path | None = None) -> dict[str, Any]:
    """Sauvegarde une page HTML pour preview dans l'UI."""
    out_dir = output_dir or _ROOT / "workspace"
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"page_{title.lower().replace(' ', '_')[:20]}.html"
    path = out_dir / filename

    # Wrapper avec style minimal si le contenu n'a pas de <html>
    if "<html" not in html_content.lower():
        full_html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
body {{ font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #e6edf3; padding: 24px; max-width: 900px; margin: 0 auto; line-height: 1.6; }}
h1 {{ color: #4493f8; border-bottom: 1px solid #30363d; padding-bottom: 8px; }}
h2 {{ color: #4493f8; }}
code {{ background: #161b22; padding: 2px 6px; border-radius: 3px; font-family: monospace; }}
pre {{ background: #161b22; padding: 12px; border-radius: 6px; overflow-x: auto; }}
table {{ border-collapse: collapse; width: 100%; }}
th, td {{ border: 1px solid #30363d; padding: 8px; text-align: left; }}
th {{ background: #161b22; color: #4493f8; }}
</style>
</head>
<body>
{html_content}
</body>
</html>"""
    else:
        full_html = html_content

    path.write_text(full_html, encoding="utf-8")
    return {
        "path": str(path.relative_to(_ROOT)),
        "filename": filename,
        "size_bytes": path.stat().st_size,
        "preview_url": f"/api/preview/{filename}",
        "title": title,
    }


CONTENT_ACTIONS = {
    "generate_pdf": {"fn": generate_pdf, "label": "Générer un rapport PDF"},
    "generate_chart": {"fn": generate_chart, "label": "Générer un graphique"},
    "generate_webpage": {"fn": generate_webpage, "label": "Générer une page web"},
    "generate_betti_diagram": {"fn": generate_betti_diagram, "label": "Diagramme de persistance"},
}
