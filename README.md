# Grid Wars

**Grid Wars** is a premium, medieval turn-based tactical grid strategy game built with Next.js, React, and TypeScript. Players summon units, manage gold resources, mine gold from resource nodes, clear Ore Boulders, and play cards from a predictable deck to outmaneuver and defeat the AI.

---

## 🎮 Game Overview

Grid Wars combines tactical grid movement (Chess / Advance Wars style) with the hidden bluffing and card management mechanics of games like *Bang!*. The battlefield is an $8 \times 8$ grid featuring base zones, mountains, and gold resource nodes.

### 🛡️ Unit Classes

Each player controls three classes of units, each upgradable via a 3-tier tree:

1. **Swordsman (Offense)**
   * *Stats:* 10 HP | 4 ATK | 2 Move Range
   * *Role:* Heavy frontline combat. Clears Ore Boulders and deals adjacent melee damage.
2. **Archer Medic (Support)**
   * *Stats:* 7 HP | 3 ATK | 2 Move Range
   * *Role:* Ranged attacks and healing support. Cannot attack adjacent enemies.
3. **Scout Miner (Gatherer)**
   * *Stats:* 6 HP | 2 ATK | 3 Move Range
   * *Role:* Mobility and economy. Genders $+3\text{g}$ (upgradable to $+5\text{g}$) when ending a turn on gold nodes. Gains defensive shelter on Mountain cells.

---

## 🃏 Card Deck & Action System

Players draw from a predictable **46-card deck** containing medieval action and equipment cards:

* **Strike! (15 Cards):** Order a unit to attack an enemy in range (maximum of **1 Strike play per turn**).
* **Mead! (8 Cards):** Restores 3 HP to a friendly unit.
* **Dodge! (8 Cards):** *Secret Buff.* Shield a unit from the next incoming attack. The opponent cannot see this buff or its play log until they attack and trigger a **DODGED!** outcome.
* **Ambush (2 Cards):** *Secret Buff.* Turn a unit invisible. Invisible AI units are **completely unrendered** on the player's screen.
  - *Collision Bumping:* If a unit attempts to move into a cell containing a hidden enemy, it stops adjacent to it, breaks the enemy's stealth, reveals them with a `"REVEALED!"` popup, and ends its action.
* **Second Wind (1 Card):** *Secret Buff.* If the buffed unit takes fatal damage, it survives and revives with 3 HP, consuming the buff.
* **Saddle (4 Cards):** Gives $+1$ Move Range for the current turn.
* **Enrage (4 Cards):** Gives $+2$ Attack Power for the current turn.
* **Siege (4 Cards):** Clears an adjacent **Ore Boulder** to harvest $+4\text{g}$ gold, or deals 2 damage to an adjacent enemy.

---

## 🗻 Map Elements & Resources

* **Gold Resource Nodes:** Gathers $+3\text{g}$ gold (or $+5\text{g}$ with Deep Mining upgrade) when a Scout Miner ends its turn here.
* **Mountains:** Moving onto a Mountain cell costs **`🥾 2`** move points (compared to **`🥾 1`** for Plains).
* **Ore Boulders (Obstacles):** Block movement and range. Clearing them (via Siege card or Swordsman Clear action) rewards the player with **$+4\text{g}$ gold**.

---

## ⚙️ Getting Started

### Prerequisites

* Node.js (v18 or higher)
* npm / yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   * [http://localhost:3000](http://localhost:3000)

### Production Build

To compile a highly optimized static production bundle:
```bash
npm run build
npm run start
```

---

## 🌿 Branching Model

This project follows a strict staging release workflow:
* **`prod`**: Stable, production-ready releases.
* **`staging`**: The active development branch. All feature integrations, balance tweaks, and fixes are merged and tested here first.
