import React from 'react';
import styles from './Cell.module.css';
import { Cell as CellType } from '../engine/gameRules';
import { Unit, getMaxHp } from '../engine/combatResolver';
import {
  OffenseIcon,
  SupportIcon,
  GathererIcon,
  MountainIcon,
  ObstacleIcon,
  GoldIcon,
  BaseIcon
} from './UnitIcons';

const BootIconTiny: React.FC<{ size?: number; className?: string }> = ({ size = 10, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '3px' }}
  >
    <path d="M21.5 16.5l-4-4.5c-.2-.2-.5-.3-.8-.3h-3.2V5c0-.6-.4-1-1-1H7.5c-.6 0-1 .4-1 1v4.5H5.8c-1 0-1.8.8-1.8 1.8V17c0 1.7 1.3 3 3 3h12.7c1.3 0 2.4-1 2.5-2.3l.3-1.2z" />
  </svg>
);

interface CellProps {
  cell: CellType;
  unit?: Unit;
  isReachable: boolean;
  isValidAttackTarget: boolean;
  isValidHealTarget: boolean;
  isValidClearTarget: boolean;
  isSelected: boolean;
  onCellClick: () => void;
}

export const Cell: React.FC<CellProps> = ({
  cell,
  unit,
  isReachable,
  isValidAttackTarget,
  isValidHealTarget,
  isValidClearTarget,
  isSelected,
  onCellClick
}) => {
  const { type, hasObstacle } = cell;

  const cellClass = `${styles.cell} ${styles[type]}`;

  const renderTerrainIcon = () => {
    switch (type) {
      case 'mountain':
        return <MountainIcon className={styles.terrainIcon} size={28} />;
      case 'resource':
        return <GoldIcon className={styles.terrainIcon} size={28} />;
      case 'base':
        return <BaseIcon className={styles.terrainIcon} size={32} />;
      default:
        return null;
    }
  };

  const renderUnitIcon = (unitType: string) => {
    switch (unitType) {
      case 'offense':
        return <OffenseIcon size={26} />;
      case 'support':
        return <SupportIcon size={26} />;
      case 'gatherer':
        return <GathererIcon size={26} />;
      default:
        return null;
    }
  };

  const getHpPercentage = (u: Unit) => {
    return (u.hp / getMaxHp(u)) * 100;
  };

  // Determine dynamic Gold yield text based on occupant Scout upgrade status
  const getGoldYieldText = () => {
    if (type !== 'resource') return null;
    if (unit && unit.type === 'gatherer') {
      // Check if the unit is invisible to player
      if (unit.owner === 'ai' && unit.hasAmbushBuff) return '+3g';
      const hasDeepMining = unit.unlockedUpgrades.includes('gat_dgp_2');
      return hasDeepMining ? '+5g' : '+3g';
    }
    return '+3g';
  };

  // True Stealth Visibility check: AI units with Ambush are completely invisible (unrendered) to the player
  const shouldRenderUnit = unit ? !(unit.owner === 'ai' && unit.hasAmbushBuff) : false;

  return (
    <div className={cellClass} onClick={onCellClick}>
      {/* Terrain Backdrop Icon */}
      {renderTerrainIcon()}

      {/* Gold yield indicators directly on resource tiles */}
      {type === 'resource' && (
        <div className={styles.goldYieldBadge}>
          {getGoldYieldText()}
        </div>
      )}

      {/* Obstacles (Ore Boulders) */}
      {hasObstacle && (
        <div className={styles.obstacleContainer}>
          <div className={styles.boulderGoldGleam} />
          <ObstacleIcon size={34} />
        </div>
      )}

      {/* Range Action Overlays */}
      {isReachable && <div className={`${styles.overlay} ${styles.overlayMove}`} />}
      {isValidAttackTarget && <div className={`${styles.overlay} ${styles.overlayAttack}`} />}
      {isValidHealTarget && <div className={`${styles.overlay} ${styles.overlayHeal}`} />}
      {isValidClearTarget && <div className={`${styles.overlay} ${styles.overlayClear}`} />}

      {/* Movement cost helper indicator inside movement overlay */}
      {isReachable && (
        <div className={styles.moveCostBadge} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <BootIconTiny size={10} />
          {type === 'mountain' ? '2' : '1'}
        </div>
      )}

      {/* Unit container */}
      {unit && shouldRenderUnit && (
        <div 
          className={`
            ${styles.unitWrapper} 
            ${isSelected ? styles.selected : ''}
            ${unit.hasAmbushBuff ? styles.stealthWrapper : ''}
          `}
        >
          {/* Level / Upgrades indicators */}
          {unit.unlockedUpgrades.length > 0 && (
            <div className={styles.stars}>
              {Array.from({ length: unit.unlockedUpgrades.length }).map((_, i) => (
                <span key={i}>★</span>
              ))}
            </div>
          )}

          {/* Unit Ready Dot Indicator Badge */}
          {unit.owner === 'player' && !unit.hasActed && (
            <div className={styles.readyBadge} title="Ready to act">●</div>
          )}

          {/* Visual Buff Overlays */}
          {unit.hasEnrageBuff && <div className={styles.enrageRing} />}
          {unit.hasFortifyBuff && <div className={styles.fortifyRing} />}
          {unit.hasSaddleBuff && <div className={styles.saddleRing} />}
          
          {/* Private Buffs (Visible to owner only) */}
          {unit.hasMissedBuff && unit.owner === 'player' && <div className={styles.dodgeShield} />}
          {unit.hasSecondWindBuff && unit.owner === 'player' && <div className={styles.secondWindRing} />}
          {unit.hasAmbushBuff && unit.owner === 'player' && <div className={styles.stealthRing} />}

          {/* Active Guardian Shield Visual */}
          {unit.shieldActive && <div className={styles.shieldGlow} />}

          <div
            className={`
              ${styles.unitToken}
              ${unit.owner === 'player' ? styles.playerUnit : styles.aiUnit}
              ${unit.hasActed ? styles.acted : ''}
            `}
          >
            {renderUnitIcon(unit.type)}
          </div>

          {/* Health Bar */}
          <div className={styles.hpBarContainer}>
            <div
              className={`${styles.hpBarFill} ${getHpPercentage(unit) < 40 ? styles.hpLow : ''}`}
              style={{ width: `${getHpPercentage(unit)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default Cell;
