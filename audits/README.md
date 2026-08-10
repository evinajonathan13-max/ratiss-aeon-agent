# Rapports d'audit chiffrés (Fernet)

Ce dossier contient les rapports d'audit de vulnérabilités produits par le module
`vuln_scanner` + `transdisc_security` de RATISS v9.5.

## Format

Chaque fichier `.enc` est un rapport JSON chiffré avec **Fernet** (symmetric authenticated encryption). La clé de chiffrement est dérivée du mot de passe opérateur via PBKDF2-HMAC-SHA256 (480 000 itérations, sel fixe).

## Déchiffrement

```python
from security.transdisc_security import decrypt_report
from pathlib import Path

enc = Path("audits/audit_example_com_ac6f4a12ac686334.enc").read_bytes()
report = decrypt_report(enc, "••••••••••••")  # mot de passe opérateur
print(report["vuln_findings"])
print(report["topology_report"]["topology"]["betti_numbers"])
```

Sans le mot de passe, le rapport est illisible (Fernet = AES-128-CBC + HMAC-SHA256).

## Sécurité

- Les rapports ne contiennent QUE des résultats de scan DÉFENSIF (lecture seule)
- Le scanner est bridé : il ne peut pas exploiter les vulnérabilités
- Le chiffrement Fernet garantit que seul l'opérateur souverain peut lire les audits
- Aucune donnée d'exploitation, aucun payload, aucune information d'attaque

## Cadre légal

Les audits sont réalisés sur des sites publics ou avec autorisation explicite.
example.com est un site documentaire géré par l'IANA (domaine réservé).
