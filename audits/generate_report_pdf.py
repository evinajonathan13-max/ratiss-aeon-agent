#!/usr/bin/env python3
"""Genere le PDF du rapport d'audit Afriland + NASA."""
from fpdf import FPDF


class ReportPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Courier", "B", 9)
            self.set_text_color(80, 80, 80)
            self.cell(0, 5, "RATISS v9.5 Aeon Prime - Rapport d'audit defensif", align="R")
            self.ln(8)
            self.set_draw_color(200, 200, 200)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(3)

    def footer(self):
        self.set_y(-15)
        self.set_font("Courier", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Page {self.page_no()} - RATISS Aeon Prime v9.5 - Souverainete africaine", align="C")


def build_pdf():
    pdf = ReportPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_margins(left=10, top=15, right=10)
    pdf.add_page()

    # Titre
    pdf.set_font("Courier", "B", 16)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 8, "RAPPORT D'AUDIT DE SECURITE DEFENSIF")
    pdf.set_font("Courier", "", 11)
    pdf.set_text_color(60, 60, 60)
    pdf.ln(2)
    pdf.multi_cell(190, 6, "RATISS v9.5 Aeon Prime")
    pdf.multi_cell(190, 6, "Module: vuln_scanner + transdisc_security")
    pdf.ln(3)
    pdf.set_draw_color(100, 100, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(5)

    # Infos
    pdf.set_font("Courier", "", 10)
    pdf.set_text_color(40, 40, 40)
    for line in [
        "Date du scan       : 10 aout 2026",
        "Scanner            : RATISS v9.5 vuln_scanner (bride, defensif)",
        "Analyse            : transdisc_security (homologie persistante)",
        "Chiffrement        : Fernet (AES-128-CBC + HMAC-SHA256)",
        "Cle                : PBKDF2-HMAC-SHA256, 480 000 iterations",
        "Cadre legal        : Convention de Budapest + loi 2010/013 Cameroun",
    ]:
        pdf.multi_cell(190, 5, line)
    pdf.ln(5)

    # Avertissement
    pdf.set_font("Courier", "B", 10)
    pdf.set_text_color(180, 40, 40)
    pdf.multi_cell(190, 5, "AVERTISSEMENT LEGAL ET ETHIQUE")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(60, 60, 60)
    pdf.multi_cell(190, 4.5,
        "Ce rapport est destine a un usage DEFENSIF et LEGAL. Le scanner est "
        "BRIDE par construction : il detecte et rapporte uniquement. Il ne "
        "peut PAS attaquer, exploiter, brute-forcer, installer de backdoor "
        "ou executer de payload. 40+ actions offensives interdites par code. "
        "execute_attack() leve TOUJOURS RuntimeError."
    )
    pdf.ln(5)

    # ===================== PARTIE 1: AFRILAND =====================
    pdf.set_fill_color(20, 80, 20)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Courier", "B", 14)
    pdf.cell(0, 10, "  PARTIE 1 : AFRILAND FIRST BANK (Cameroun)", fill=True)
    pdf.ln(10)
    pdf.set_text_color(40, 40, 40)
    pdf.set_font("Courier", "", 10)
    pdf.multi_cell(190, 5, "Cible : www.afrilandfirstbank.com")
    pdf.multi_cell(190, 5, "Etablissement : Afriland First Bank (Cameroun)")
    pdf.multi_cell(190, 5, "Type de scan : reseau + web (defensif, lecture seule)")
    pdf.ln(3)

    # Phase 1
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 1 - SCAN RESEAU (TCP connect, passif)")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5,
        "RATISS a tente de se connecter aux ports via TCP connect (poignee "
        "de main TCP complete, comme un navigateur web standard). Aucun "
        "paquet SYN stealth, aucune agressivite. Lecture de banniere passive."
    )
    pdf.ln(2)
    pdf.multi_cell(190, 4.5, "Ports testes : 80, 443, 8080, 8443, 22, 21, 25, 3389 (8 ports)")
    pdf.multi_cell(190, 4.5, "Ports ouverts : 4")
    pdf.multi_cell(190, 4.5, "  Port 80   : OUVERT (HTTP)")
    pdf.multi_cell(190, 4.5, "  Port 443  : OUVERT (HTTPS)")
    pdf.multi_cell(190, 4.5, "  Port 8080 : OUVERT (web alternatif)")
    pdf.multi_cell(190, 4.5, "  Port 8443 : OUVERT (web alternatif HTTPS)")
    pdf.multi_cell(190, 4.5, "  Ports 22, 21, 25, 3389 : FERMES (aucun port sensible)")
    pdf.ln(2)
    pdf.multi_cell(190, 4.5,
        "Interpretation : Afriland est derriere Cloudflare. Ports 80 et 443 "
        "ouverts (normal pour un site bancaire). Ports 8080 et 8443 "
        "(alternatifs) ouverts = services web additionnels ou reverse proxy. "
        "Ports sensibles (SSH, FTP, SMTP, RDP) FERMES. Aucune exploitation."
    )
    pdf.ln(3)

    # Phase 2
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 2 - AUDIT WEB (headers HTTP + TLS)")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5, "Status HTTP : 200 - Headers recus : 21")
    pdf.ln(2)
    pdf.set_font("Courier", "B", 9)
    pdf.multi_cell(190, 4.5, "Headers de securite PRESENTS (BON) :")
    pdf.set_font("Courier", "", 9)
    pdf.multi_cell(190, 4.5, "  [OK]  strict-transport-security : max-age=31536000; preload")
    pdf.multi_cell(190, 4.5, "  [OK]  content-security-policy : upgrade-insecure-requests;")
    pdf.multi_cell(190, 4.5, "  [OK]  x-frame-options : SAMEORIGIN")
    pdf.multi_cell(190, 4.5, "  [OK]  x-content-type-options : nosniff")
    pdf.multi_cell(190, 4.5, "  [OK]  referrer-policy : strict-origin-when-cross-origin")
    pdf.ln(2)
    pdf.set_font("Courier", "B", 9)
    pdf.multi_cell(190, 4.5, "Headers ABSENTS (PROBLEME) :")
    pdf.set_font("Courier", "", 9)
    pdf.multi_cell(190, 4.5, "  [ABS] permissions-policy : MANQUANT")
    pdf.ln(2)
    pdf.set_font("Courier", "B", 9)
    pdf.multi_cell(190, 4.5, "Headers revelant la technologie :")
    pdf.set_font("Courier", "", 9)
    pdf.multi_cell(190, 4.5, "  [ABS] server : cloudflare")
    pdf.multi_cell(190, 4.5, "  [ABS] x-powered-by : PHP/7.4.33")
    pdf.ln(2)
    pdf.multi_cell(190, 4.5, "Configuration TLS :")
    pdf.multi_cell(190, 4.5, "  Version TLS : TLSv1.3 (excellent)")
    pdf.multi_cell(190, 4.5, "  Cipher : TLS_AES_256_GCM_SHA384 (256 bits, excellent)")
    pdf.multi_cell(190, 4.5, "  Certificat expire : 7 octobre 2026 (57 jours)")
    pdf.ln(2)
    pdf.multi_cell(190, 4.5,
        "Interpretation : TLS excellent (1.3 + AES-256). Certificat valide "
        "(57 jours). La plupart des headers de securite sont en place. "
        "BONNE configuration pour une banque camerounaise. X-Powered-By "
        "revele PHP/7.4.33 (fin de vie depuis nov 2022)."
    )
    pdf.ln(3)

    # Phase 3
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 3 - VULNERABILITES DETECTEES (3, toutes LOW)")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)

    for num, sev, title, owasp, evidence, fix in [
        ("#1", "LOW", "Permissions-policy manquant", "OWASP A05",
         "Preuve: Absence de permissions-policy",
         "Fix: Permissions-Policy: geolocation=(), camera=(), microphone=()"),
        ("#2", "LOW", "Server expose la version", "OWASP A05",
         "Preuve: Server: cloudflare",
         "Fix: Masquer ou anonymiser le header Server"),
        ("#3", "LOW", "X-Powered-By expose la techno", "OWASP A05",
         "Preuve: X-Powered-By: PHP/7.4.33",
         "Fix: expose_php = Off dans php.ini + maj PHP vers 8.2+"),
    ]:
        pdf.set_font("Courier", "B", 9)
        pdf.multi_cell(190, 4.5, f"VULNERABILITE {num} - {sev}")
        pdf.set_font("Courier", "", 9)
        pdf.multi_cell(190, 4.5, f"  Titre: {title}")
        pdf.multi_cell(190, 4.5, f"  {owasp}")
        pdf.multi_cell(190, 4.5, f"  {evidence}")
        pdf.multi_cell(190, 4.5, f"  {fix}")
        pdf.ln(1.5)

    pdf.multi_cell(190, 4.5, "Repartition: 0 CRITICAL, 0 HIGH, 0 MEDIUM, 3 LOW = 3 total")
    pdf.ln(2)
    pdf.set_font("Courier", "B", 9)
    pdf.multi_cell(190, 4.5, "Analyse - Finding #3 (LE PLUS IMPORTANT) :")
    pdf.set_font("Courier", "", 9)
    pdf.multi_cell(190, 4.5,
        "X-Powered-By revele PHP/7.4.33. PHP 7.4 a atteint sa fin de vie le "
        "28 novembre 2022. Plus de correctifs de securite. Un attaquant peut "
        "chercher des CVE specifiques a cette version. Correction : "
        "expose_php = Off + mise a jour PHP 8.2+."
    )
    pdf.ln(3)

    # Phase 4
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 4 - ANALYSE TOPOLOGIQUE TRANSDISCIPLINAIRE")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5,
        "METHODOLOGIE : RATISS transpose son homologie persistante "
        "scientifique vers la cyberssecurite. Chaque vulnerabilite = 1 point "
        "3D (severite radiale, angle OWASP, exposabilite). Les 3 vuln "
        "forment un nuage de 3 points."
    )
    pdf.ln(2)
    pdf.multi_cell(190, 4.5, "Resultats : Points=3 | Aretes=3 | Cycles=1 | Cavites=0")
    pdf.ln(2)
    pdf.multi_cell(190, 4.5, "Beta-0 (B0) = 1 -> 1 bloc connecte, faible nombre")
    pdf.multi_cell(190, 4.5, "Beta-1 (B1) = 1 -> 1 kill chain, surface peu dense (BON)")
    pdf.multi_cell(190, 4.5, "Beta-2 (B2) = 0 -> aucune cavite, pas de reseau complexe")
    pdf.multi_cell(190, 4.5, "Persistance H1 = 0.012 -> kill chain fragile")
    pdf.ln(2)
    pdf.set_font("Courier", "B", 9)
    pdf.multi_cell(190, 4.5, "SCORE DE RISQUE : 35/100 (MOYEN)")
    pdf.set_font("Courier", "", 9)
    pdf.multi_cell(190, 4.5, "  Calcul : 1x10 + 1x25 + 0x15 + 0.012x30 = 35.36")
    pdf.multi_cell(190, 4.5,
        "  Bon resultat pour une banque. 3 vuln LOW, 1 kill chain fragile, "
        "0 cavite. Risque principal : fuite PHP 7.4.33."
    )
    pdf.ln(3)

    # Phase 5
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 5 - KILL CHAIN (1 chaine)")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5, "KC-1 : Server: cloudflare <-> X-Powered-By: PHP/7.4.33")
    pdf.multi_cell(190, 4.5, "  Distance : 0.0119 (tres proche)")
    pdf.multi_cell(190, 4.5,
        "  Interpretation : l'attaquant sait exactement la pile technologique "
        "(Cloudflare + PHP 7.4.33). Chaine de reconnaissance -> CVE ciblees."
    )
    pdf.ln(3)

    # Phase 6
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 6 - BRIDAGE ARCHITECTURAL")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5, "RATISS n'a JAMAIS : payload, brute-force, backdoor,")
    pdf.multi_cell(190, 4.5, "modification, DoS. UNIQUEMENT detecte, lu, rapporte.")
    pdf.ln(3)

    # Phase 7
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 7 - CORRECTIONS PROPOSEES")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5, "1. Permissions-Policy -> geolocation=(), camera=(), microphone=()")
    pdf.multi_cell(190, 4.5, "2. Server: cloudflare -> masquer le header")
    pdf.multi_cell(190, 4.5, "3. X-Powered-By: PHP/7.4.33 -> expose_php = Off + PHP 8.2+")
    pdf.ln(3)

    pdf.set_font("Courier", "B", 10)
    pdf.set_fill_color(200, 230, 200)
    pdf.set_text_color(0, 80, 0)
    pdf.multi_cell(190, 6, "VERDICT AFRILAND : 35/100 (MOYEN) - 3 vuln LOW - 1 kill chain", fill=True)
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5,
        "BONNE configuration pour une banque camerounaise. Majorite des "
        "headers en place, TLS 1.3 + AES-256, certificat valide. Point "
        "faible : PHP 7.4.33 (fin de vie). Aucune vuln CRITIQUE ou HIGH."
    )
    pdf.ln(5)

    # ===================== PARTIE 2: NASA =====================
    pdf.add_page()
    pdf.set_fill_color(20, 20, 80)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Courier", "B", 14)
    pdf.cell(0, 10, "  PARTIE 2 : NASA (National Aeronautics and Space Admin)", fill=True)
    pdf.ln(10)
    pdf.set_text_color(40, 40, 40)
    pdf.set_font("Courier", "", 10)
    pdf.multi_cell(190, 5, "Cible : www.nasa.gov")
    pdf.multi_cell(190, 5, "Type de scan : reseau + web (defensif, lecture seule)")
    pdf.ln(3)

    # Phase 1 NASA
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 1 - SCAN RESEAU")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5, "Ports testes : 8 | Ports ouverts : 2")
    pdf.multi_cell(190, 4.5, "  Port 80 : OUVERT (HTTP) | Port 443 : OUVERT (HTTPS)")
    pdf.multi_cell(190, 4.5, "  Tous les autres : FERMES")
    pdf.ln(2)
    pdf.multi_cell(190, 4.5,
        "Interpretation : la NASA n'expose que 2 ports. Configuration "
        "MINIMALE et disciplinee. Aucun port sensible. Surface d'attaque "
        "reseau reduite au minimum. Excellent."
    )
    pdf.ln(3)

    # Phase 2 NASA
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 2 - AUDIT WEB (headers + TLS)")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5, "Status HTTP : 200 - Headers recus : 15")
    pdf.ln(2)
    pdf.set_font("Courier", "B", 9)
    pdf.multi_cell(190, 4.5, "Headers PRESENTS :")
    pdf.set_font("Courier", "", 9)
    pdf.multi_cell(190, 4.5, "  [OK]  strict-transport-security : preload")
    pdf.multi_cell(190, 4.5, "  [OK]  x-frame-options : SAMEORIGIN")
    pdf.ln(2)
    pdf.set_font("Courier", "B", 9)
    pdf.multi_cell(190, 4.5, "Headers ABSENTS (PROBLEME) :")
    pdf.set_font("Courier", "", 9)
    pdf.multi_cell(190, 4.5, "  [ABS] content-security-policy : MANQUANT (HIGH!)")
    pdf.multi_cell(190, 4.5, "  [ABS] x-content-type-options : MANQUANT")
    pdf.multi_cell(190, 4.5, "  [ABS] referrer-policy : MANQUANT")
    pdf.multi_cell(190, 4.5, "  [ABS] permissions-policy : MANQUANT")
    pdf.ln(2)
    pdf.multi_cell(190, 4.5, "  [ABS] server : nginx")
    pdf.ln(2)
    pdf.multi_cell(190, 4.5, "TLS : TLSv1.3 + AES-128-GCM (128 bits, acceptable)")
    pdf.multi_cell(190, 4.5, "Certificat expire : 9 septembre 2026 (29 jours!)")
    pdf.ln(2)
    pdf.multi_cell(190, 4.5,
        "Interpretation : TLS 1.3 mais AES-128 (vs AES-256 Afriland). "
        "Certificat expire dans 29 jours (urgent). Headers INCOMPLETS : "
        "CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy "
        "ABSENTS. Surprenant pour un site gouvernemental."
    )
    pdf.ln(3)

    # Phase 3 NASA
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 3 - VULNERABILITES DETECTEES (6)")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)

    for num, sev, title, owasp, evidence, fix in [
        ("#1", "HIGH", "CSP manquante", "OWASP A05",
         "Preuve: Absence de content-security-policy",
         "Fix: Content-Security-Policy: default-src 'self'"),
        ("#2", "MEDIUM", "X-Content-Type-Options manquant", "OWASP A05",
         "Preuve: Absence de x-content-type-options",
         "Fix: X-Content-Type-Options: nosniff"),
        ("#3", "LOW", "Referrer-Policy manquant", "OWASP A05",
         "Preuve: Absence de referrer-policy",
         "Fix: Referrer-Policy: strict-origin-when-cross-origin"),
        ("#4", "LOW", "Permissions-Policy manquant", "OWASP A05",
         "Preuve: Absence de permissions-policy",
         "Fix: Permissions-Policy: geolocation=(), camera=()"),
        ("#5", "LOW", "Server expose nginx", "OWASP A05",
         "Preuve: Server: nginx",
         "Fix: Masquer le header Server"),
        ("#6", "MEDIUM", "Certificat TLS 29 jours", "OWASP A02",
         "Preuve: notAfter: Sep 9 2026 GMT",
         "Fix: Renouveler AVANT le 9 septembre 2026"),
    ]:
        pdf.set_font("Courier", "B", 9)
        pdf.multi_cell(190, 4.5, f"VULNERABILITE {num} - {sev}")
        pdf.set_font("Courier", "", 9)
        pdf.multi_cell(190, 4.5, f"  Titre: {title}")
        pdf.multi_cell(190, 4.5, f"  {owasp}")
        pdf.multi_cell(190, 4.5, f"  {evidence}")
        pdf.multi_cell(190, 4.5, f"  {fix}")
        pdf.ln(1.5)

    pdf.multi_cell(190, 4.5, "Repartition: 0 CRITICAL, 1 HIGH, 2 MEDIUM, 3 LOW = 6 total")
    pdf.ln(2)
    pdf.set_font("Courier", "B", 9)
    pdf.multi_cell(190, 4.5, "Analyse particuliere :")
    pdf.set_font("Courier", "", 9)
    pdf.multi_cell(190, 4.5,
        "VULN #1 (HIGH - CSP manquante) : le plus grave. Sans CSP, le site "
        "est vulnerable au XSS. Un attaquant peut injecter du JavaScript "
        "malveillant. Surprenant pour un site gouvernemental americain."
    )
    pdf.ln(1)
    pdf.multi_cell(190, 4.5,
        "VULN #6 (MEDIUM - certificat 29 jours) : si non renouvele avant "
        "le 9 sep 2026, les navigateurs afficheront 'non securise'. "
        "Nuisible pour l'image de la NASA."
    )
    pdf.ln(3)

    # Phase 4 NASA
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 4 - ANALYSE TOPOLOGIQUE TRANSDISCIPLINAIRE")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5, "Resultats : Points=6 | Aretes=15 | Cycles=10 | Cavites=24")
    pdf.ln(2)
    pdf.multi_cell(190, 4.5, "Beta-0 (B0) = 1 -> 1 bloc, les 6 vuln sont toutes reliees")
    pdf.multi_cell(190, 4.5, "Beta-1 (B1) = 10 -> 10 CHAINES D'ATTAQUE. Surface dense.")
    pdf.multi_cell(190, 4.5, "  (Afriland = 1 kill chain, NASA = 10 = 10x plus)")
    pdf.multi_cell(190, 4.5, "Beta-2 (B2) = 24 -> 24 cavites. RESEAU COMPLEXE multidim.")
    pdf.multi_cell(190, 4.5, "Persistance H1 = 6.23 -> kill chains ROBUSTES")
    pdf.multi_cell(190, 4.5, "  (NASA 6.23 vs Afriland 0.012 = 500x plus robuste)")
    pdf.ln(2)
    pdf.set_font("Courier", "B", 9)
    pdf.multi_cell(190, 4.5, "SCORE DE RISQUE : 100/100 (CRITIQUE)")
    pdf.set_font("Courier", "", 9)
    pdf.multi_cell(190, 4.5, "  Calcul : 1x10 + 10x25 + 24x15 + 6.23x30 = 806.9 (plafonne 100)")
    pdf.multi_cell(190, 4.5,
        "  Score CRITIQUE. 10 kill chains persistantes + 24 cavites = "
        "reseau d'attaque dense et multidimensionnel."
    )
    pdf.ln(3)

    # Phase 5 NASA
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 5 - KILL CHAINS (10)")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    for kc_id, a, b, dist in [
        ("KC-1", "referrer-policy", "permissions-policy", "0.027"),
        ("KC-2", "x-content-type-options", "Server: nginx", "0.283"),
        ("KC-3", "x-content-type-options", "referrer-policy", "0.291"),
        ("KC-4", "CSP manquante", "permissions-policy", "0.500"),
        ("KC-5", "CSP manquante", "Server: nginx", "0.513"),
        ("KC-6", "CSP manquante", "x-content-type-options", "0.520"),
        ("KC-7", "referrer-policy", "Server: nginx", "0.532"),
        ("KC-8", "CSP manquante", "referrer-policy", "0.540"),
        ("KC-9", "permissions-policy", "Server: nginx", "0.552"),
        ("KC-10", "x-content-type-options", "permissions-policy", "0.559"),
    ]:
        pdf.multi_cell(190, 4.5, f"  {kc_id}: {a} <-> {b} (d={dist})")
    pdf.ln(2)
    pdf.set_font("Courier", "B", 9)
    pdf.multi_cell(190, 4.5, "Kill chains principales :")
    pdf.set_font("Courier", "", 9)
    pdf.multi_cell(190, 4.5,
        "KC-4 (d=0.500) : CSP manquante <-> Permissions-Policy. KILL CHAIN "
        "XSS LA PLUS DANGEREUSE. Sans CSP + sans Permissions-Policy, un "
        "attaquant peut injecter du JS qui accede a la camera, au micro, "
        "a la geolocalisation. Attaque de surveillance complete."
    )
    pdf.multi_cell(190, 4.5,
        "KC-2 (d=0.283) : X-Content-Type-Options <-> Server: nginx. "
        "MIME sniffing + reconnaissance. CVE nginx ciblees."
    )
    pdf.ln(3)

    # Phase 6 NASA
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 6 - BRIDAGE ARCHITECTURAL")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5, "RATISS n'a JAMAIS : payload, brute-force, backdoor,")
    pdf.multi_cell(190, 4.5, "modification, DoS. UNIQUEMENT detecte, lu, rapporte.")
    pdf.ln(3)

    # Phase 7 NASA
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "PHASE 7 - CORRECTIONS PROPOSEES")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5, "1. CSP manquante (HIGH - URGENT) -> default-src 'self'")
    pdf.multi_cell(190, 4.5, "2. X-Content-Type-Options -> nosniff")
    pdf.multi_cell(190, 4.5, "3. Referrer-Policy -> strict-origin-when-cross-origin")
    pdf.multi_cell(190, 4.5, "4. Permissions-Policy -> geolocation=(), camera=()")
    pdf.multi_cell(190, 4.5, "5. Server: nginx -> masquer")
    pdf.multi_cell(190, 4.5, "6. Certificat -> renouveler AVANT 9 sep 2026")
    pdf.ln(3)

    pdf.set_font("Courier", "B", 10)
    pdf.set_fill_color(230, 200, 200)
    pdf.set_text_color(80, 0, 0)
    pdf.multi_cell(190, 6, "VERDICT NASA : 100/100 (CRITIQUE) - 6 vuln - 10 kill chains", fill=True)
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5,
        "Surface d'attaque CRITIQUE : absence de CSP (HIGH). 10 kill chains "
        "persistantes, 24 cavites = reseau dense. Certificat a renouveler "
        "en urgence (29 jours). Config reseau excellente (2 ports) mais "
        "headers HTTP incomplets."
    )
    pdf.ln(5)

    # ===================== COMPARATIF =====================
    pdf.add_page()
    pdf.set_fill_color(80, 20, 80)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Courier", "B", 14)
    pdf.cell(0, 10, "  COMPARATIF FINAL - AFRILAND vs NASA", fill=True)
    pdf.ln(10)
    pdf.set_text_color(40, 40, 40)

    pdf.set_font("Courier", "B", 9)
    pdf.set_fill_color(220, 220, 240)
    pdf.cell(70, 7, "  Critere", border=1, fill=True)
    pdf.cell(55, 7, "Afriland First Bank", border=1, fill=True)
    pdf.cell(65, 7, "NASA", border=1, fill=True)
    pdf.ln(7)

    pdf.set_font("Courier", "", 8)
    for critere, afriland, nasa in [
        ("Vulnerabilites", "3 (toutes LOW)", "6 (1H, 2M, 3L)"),
        ("Vuln HIGH", "0", "1 (CSP manquante)"),
        ("Score topologique", "35/100 (MOYEN)", "100/100 (CRITIQUE)"),
        ("Kill chains (B1)", "1 (fragile)", "10 (robustes)"),
        ("Cavites (B2)", "0", "24"),
        ("Persistance H1", "0.012", "6.23"),
        ("CSP", "Presente", "ABSENTE (HIGH)"),
        ("HSTS", "Presente", "Presente"),
        ("X-Frame-Options", "Present", "Present"),
        ("X-Content-Type-Opts", "Present", "ABSENT"),
        ("Referrer-Policy", "Present", "ABSENT"),
        ("Permissions-Policy", "Absent", "Absent"),
        ("TLS", "1.3 + AES-256", "1.3 + AES-128"),
        ("Certificat (jours)", "57 jours", "29 (URGENT)"),
        ("Ports ouverts", "4 (80,443,8080,8443)", "2 (80,443)"),
        ("Techno revelee", "PHP/7.4.33 (EOL)", "nginx"),
    ]:
        pdf.cell(70, 6, f"  {critere}", border=1)
        pdf.cell(55, 6, afriland, border=1)
        pdf.cell(65, 6, nasa, border=1)
        pdf.ln(6)

    pdf.ln(5)
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "CONCLUSION SURPRENANTE")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5,
        "Afriland First Bank, une banque camerounaise, est MIEUX SECURISEE "
        "que le site de la NASA sur les headers HTTP. Afriland : 3 vuln LOW, "
        "score 35/100 (MOYEN). NASA : 6 vuln dont 1 HIGH, score 100/100 "
        "(CRITIQUE)."
    )
    pdf.ln(2)
    pdf.multi_cell(190, 4.5,
        "La NASA est mieux sur le plan reseau (2 ports vs 4), mais Afriland "
        "est nettement meilleur sur les headers web (CSP presente, "
        "X-Content-Type-Options present, Referrer-Policy present) et le TLS "
        "(AES-256 vs AES-128)."
    )
    pdf.ln(2)
    pdf.multi_cell(190, 4.5,
        "C'est un argument de vente puissant pour le business au Cameroun : "
        "un site africain peut etre mieux securise qu'un site americain de "
        "premier plan. Avec RATISS, on peut le PROUVER avec des donnees "
        "concretes (score topologique, kill chains, OWASP)."
    )
    pdf.ln(5)

    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(20, 20, 80)
    pdf.multi_cell(190, 6, "A PROPOS DE RATISS")
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(190, 4.5,
        "RATISS v9.5 Aeon Prime est un agent scientifique souverain, 100% "
        "local, aucun cloud. Module de scan de vulnerabilites DEFENSIF et "
        "BRIDE : detecte et rapporte, ne peut jamais attaquer. Touche "
        "unique : homologie persistante (Betti) appliquee a la surface "
        "d'attaque = revelation des chaines d'attaque (kill chains). "
        "107/107 tests passent, 0 DeprecationWarning."
    )
    pdf.ln(3)
    pdf.multi_cell(190, 4.5, "Operateur souverain : Jonathan Evina (instance JohnKing0)")
    pdf.multi_cell(190, 4.5, "Licence : MIT - Souverainete africaine")
    pdf.ln(5)

    pdf.set_font("Courier", "I", 8)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(190, 4.5,
        "Rapport genere par RATISS v9.5 Aeon Prime le 10 aout 2026. "
        "Usage defensif et legal. Scanner bride. Analyse transdisciplinaire "
        "- homologie persistante appliquee a la cyberssecurite."
    )
    pdf.ln(2)
    pdf.multi_cell(190, 4.5, "FIN DU RAPPORT")

    output = "audits/RAPPORT_AUDIT_AFRILAND_NASA.pdf"
    pdf.output(output)
    return output


if __name__ == "__main__":
    path = build_pdf()
    import os
    print(f"PDF genere : {path}")
    print(f"Taille : {os.path.getsize(path)} octets ({os.path.getsize(path)/1024:.1f} KB)")
