import matplotlib.pyplot as plt
import numpy as np

# Configuration du style
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
fig_dir = '/home/ubuntu/ratiss-kkl/exemples_concrets'

# 1. Graphique d'énergie E0 de la bulle d'Alcubierre
plt.figure(figsize=(6, 3.5))
r = np.linspace(0, 5, 200)
# Profil d'énergie avec le terme de couplage xi = 0.01874
energy = 0.03 * np.exp(-((r - 1.5)**2) / 0.5) - 0.01 * np.exp(-((r - 3.0)**2) / 1.0)
plt.plot(r, energy, label=r'Énergie $E_0$ ($\xi = 0.01874$)', color='#2b6cb0', lw=2)
plt.axhline(0, color='black', ls='--', lw=1, alpha=0.7)
plt.title("Profil d'Énergie de la Bulle d'Alcubierre", fontsize=11, fontweight='bold')
plt.xlabel("Rayon normalisé $r_s$", fontsize=9)
plt.ylabel("Densité d'énergie ($M_{Jup}c^2$)", fontsize=9)
plt.legend(loc='upper right', fontsize=8)
plt.tight_layout()
plt.savefig(f'{fig_dir}/energy_profile.png', dpi=300)
plt.close()

# 2. Diagramme de persistance / Nombres de Betti
plt.figure(figsize=(6, 3.5))
# Naissance vs Mort (Diagramme de persistance)
births_0 = [0.0, 0.0, 0.0]
deaths_0 = [1.2, 2.5, 4.0]
births_1 = [0.4, 0.8]
deaths_1 = [1.8, 3.2]
births_2 = [1.1]
deaths_2 = [2.9]

plt.scatter(births_0, deaths_0, color='blue', label=r'$\beta_0$ (composantes connexes): 3', s=50, zorder=3)
plt.scatter(births_1, deaths_1, color='green', label=r'$\beta_1$ (cycles 1D): 2', s=50, zorder=3)
plt.scatter(births_2, deaths_2, color='red', label=r'$\beta_2$ (cavités 2D): 1', s=50, zorder=3)

plt.plot([0, 4], [0, 4], 'k--', alpha=0.5, label='Ligne limite (persistence = 0)')
plt.title("Diagramme de Persistance Topologique (Nombres de Betti)", fontsize=11, fontweight='bold')
plt.xlabel("Naissance", fontsize=9)
plt.ylabel("Mort", fontsize=9)
plt.legend(loc='lower right', fontsize=8)
plt.tight_layout()
plt.savefig(f'{fig_dir}/betti_persistence.png', dpi=300)
plt.close()

print("Graphiques générés avec succès.")
