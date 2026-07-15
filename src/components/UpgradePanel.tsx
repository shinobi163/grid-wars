import React from 'react';
import styles from './UpgradePanel.module.css';
import { useGameStore } from '../store/gameStore';
import { UNIT_REGISTRY } from '../config/unitDefinitions';
import { UPGRADE_TREES, UpgradeNode } from '../config/upgradeTrees';
import { getMaxHp, getAttackPower, getMoveRange, getHealPower } from '../engine/combatResolver';

export const UpgradePanel: React.FC = () => {
  const { units, resources, currentPlayer, selectedUnitId, buyUpgrade, winner } = useGameStore();

  const unit = units.find(u => u.id === selectedUnitId);

  if (!unit) {
    return (
      <div className={styles.panel} style={{ justifyContent: 'center', alignItems: 'center', color: '#7b8580' }}>
        <p>Select a unit on the board to view upgrades and attributes.</p>
      </div>
    );
  }

  const baseConfig = UNIT_REGISTRY[unit.type];
  const tree = UPGRADE_TREES[unit.type];
  const goldPool = resources[currentPlayer];

  const maxHp = getMaxHp(unit);
  const attack = getAttackPower(unit);
  const moveRange = getMoveRange(unit);
  const heal = getHealPower(unit);

  // Helper check: has this unit unlocked any upgrade in a specific tier?
  const hasTier1Unlocked = tree.tier1.some(node => unit.unlockedUpgrades.includes(node.id));
  const hasTier2Unlocked = tree.tier2.some(node => unit.unlockedUpgrades.includes(node.id));
  const hasTier3Unlocked = tree.tier3.some(node => unit.unlockedUpgrades.includes(node.id));

  // Determine if a specific upgrade node can be purchased
  const isNodeLocked = (node: UpgradeNode, tier: 1 | 2 | 3) => {
    if (unit.owner !== 'player' || winner) return true;

    const isAlreadyUnlocked = unit.unlockedUpgrades.includes(node.id);
    if (isAlreadyUnlocked) return false; // Not locked, it is already bought

    if (tier === 1) {
      // Mutually exclusive: cannot buy another Tier 1 node if one is already bought
      return hasTier1Unlocked;
    }
    if (tier === 2) {
      // Requires Tier 1 to be completed, and mutually exclusive in Tier 2
      return !hasTier1Unlocked || hasTier2Unlocked;
    }
    if (tier === 3) {
      // Requires Tier 2 to be completed, and mutually exclusive in Tier 3
      return !hasTier2Unlocked || hasTier3Unlocked;
    }
    return true;
  };

  const handleBuyUpgrade = (node: UpgradeNode, tier: 1 | 2 | 3) => {
    if (isNodeLocked(node, tier) || unit.unlockedUpgrades.includes(node.id)) return;
    buyUpgrade(unit.id, node.id);
  };

  const renderNode = (node: UpgradeNode, tier: 1 | 2 | 3) => {
    const isUnlocked = unit.unlockedUpgrades.includes(node.id);
    const isLocked = isNodeLocked(node, tier);
    const canAfford = goldPool >= node.cost;

    const btnClass = `
      ${styles.upgradeNode}
      ${isUnlocked ? styles.unlocked : ''}
      ${isLocked || (!canAfford && !isUnlocked) ? styles.disabled : ''}
    `;

    return (
      <button
        key={node.id}
        className={btnClass}
        onClick={() => handleBuyUpgrade(node, tier)}
        disabled={isLocked || isUnlocked}
      >
        <div className={styles.nodeName}>
          <span>{node.name}</span>
          {isUnlocked ? (
            <span className={styles.purchasedTag}>Bought</span>
          ) : (
            <span className={styles.costTag}>{node.cost}g</span>
          )}
        </div>
        <div className={styles.nodeDesc}>{node.description}</div>
      </button>
    );
  };

  return (
    <div className={styles.panel}>
      <div className={styles.title}>
        <span>{baseConfig.displayName}</span>
        <span className={`${styles.ownerBadge} ${unit.owner === 'player' ? styles.playerBadge : styles.aiBadge}`}>
          {unit.owner === 'player' ? 'Player Unit' : 'AI Unit'}
        </span>
      </div>

      <div className={styles.desc}>{baseConfig.description}</div>

      {/* Attributes Card */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>HP</div>
          <div className={styles.statVal}>
            {unit.hp} / {maxHp}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Attack</div>
          <div className={styles.statVal}>{attack}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Move Range</div>
          <div className={styles.statVal}>{moveRange}</div>
        </div>
        {unit.type === 'support' && (
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Heal Power</div>
            <div className={styles.statVal}>{heal}</div>
          </div>
        )}
      </div>

      {/* Upgrades Trees */}
      <div className={styles.treeContainer}>
        {/* Tier 1 */}
        <div className={styles.tierSection}>
          <div className={styles.tierHeader}>Tier I — Core (Cost: 5g)</div>
          <div className={`${styles.nodeGrid} ${styles.nodeGrid2}`}>
            {tree.tier1.map(node => renderNode(node, 1))}
          </div>
        </div>

        {/* Tier 2 */}
        <div className={styles.tierSection}>
          <div className={styles.tierHeader}>Tier II — Specialization (Cost: 10g)</div>
          <div className={`${styles.nodeGrid} ${styles.nodeGrid2}`}>
            {tree.tier2.map(node => renderNode(node, 2))}
          </div>
          {!hasTier1Unlocked && unit.owner === 'player' && (
            <div className={styles.disabledReason}>Requires a Tier I upgrade.</div>
          )}
        </div>

        {/* Tier 3 */}
        <div className={styles.tierSection}>
          <div className={styles.tierHeader}>Tier III — Mastery (Cost: 15g)</div>
          <div className={styles.nodeGrid}>
            {tree.tier3.map(node => renderNode(node, 3))}
          </div>
          {!hasTier2Unlocked && unit.owner === 'player' && (
            <div className={styles.disabledReason}>Requires a Tier II upgrade.</div>
          )}
        </div>
      </div>
    </div>
  );
};
export default UpgradePanel;
