export type CardType =
  | 'strike'
  | 'dodge'
  | 'mead'
  | 'barrage'
  | 'steed'
  | 'enrage'
  | 'fortify'
  | 'saddle'
  | 'secondwind'
  | 'ambush'
  | 'command'
  | 'siege';

export type CardCategory = 'instant' | 'equipment';

export interface Card {
  id: string;
  type: CardType;
  category: CardCategory;
  name: string;
  description: string;
  goldCost: number;
}

export interface StatusEffect {
  type: 'stun' | 'poison' | 'strength' | 'shielded';
  duration: number; // turns remaining
  value?: number;
}

export const CARD_TEMPLATES: Record<CardType, Omit<Card, 'id'>> = {
  strike: {
    type: 'strike',
    category: 'instant',
    name: 'Strike!',
    description: 'Trigger an extra attack with a unit (select attacker, then target).',
    goldCost: 0
  },
  dodge: {
    type: 'dodge',
    category: 'instant',
    name: 'Dodge!',
    description: 'Private: Give a unit a shield to block the next attack.',
    goldCost: 0
  },
  mead: {
    type: 'mead',
    category: 'instant',
    name: 'Mead!',
    description: 'Restore 3 HP to a friendly unit.',
    goldCost: 0
  },
  barrage: {
    type: 'barrage',
    category: 'instant',
    name: 'Barrage!',
    description: 'Deal 4 damage to all enemies within 2 tiles. Cast unit takes 2 recoil damage.',
    goldCost: 0
  },
  steed: {
    type: 'steed',
    category: 'equipment',
    name: 'Steed',
    description: 'Equip: Enemies need +1 range to attack this unit.',
    goldCost: 0
  },
  enrage: {
    type: 'enrage',
    category: 'instant',
    name: 'Enrage!',
    description: 'Unit gains +2 Attack Power for the rest of turn.',
    goldCost: 3
  },
  fortify: {
    type: 'fortify',
    category: 'instant',
    name: 'Fortify!',
    description: 'Unit gains +2 Defense (takes 2 less damage) for the rest of turn.',
    goldCost: 2
  },
  saddle: {
    type: 'saddle',
    category: 'instant',
    name: 'Saddle',
    description: 'Unit gains +1 Movement range for this turn.',
    goldCost: 2
  },
  secondwind: {
    type: 'secondwind',
    category: 'instant',
    name: 'Second Wind',
    description: 'Revive unit with 3 HP upon taking fatal damage.',
    goldCost: 0
  },
  ambush: {
    type: 'ambush',
    category: 'instant',
    name: 'Ambush',
    description: 'Unit gains invisibility until it attacks or plays a card.',
    goldCost: 0
  },
  command: {
    type: 'command',
    category: 'instant',
    name: 'Command',
    description: 'Instantly draw 2 cards.',
    goldCost: 0
  },
  siege: {
    type: 'siege',
    category: 'instant',
    name: 'Siege',
    description: 'Clear an adjacent boulder, or deal 2 damage to an adjacent enemy.',
    goldCost: 0
  }
};
export type DeckComposition = Record<string, number>;

export const DECK_TARGET_SIZE = 46;

export const CARD_DEFAULTS: DeckComposition = {
  strike: 15,
  mead: 8,
  dodge: 8,
  ambush: 2,
  secondwind: 1,
  saddle: 4,
  enrage: 4,
  siege: 4,
};

export const CARD_CAPS: DeckComposition = {
  strike: 30,
  mead: 16,
  dodge: 16,
  ambush: 4,
  secondwind: 2,
  saddle: 8,
  enrage: 8,
  siege: 8,
};

// 46 Card predictable deck composition (backward compatible default)
export const DECK_COMPOSITION: Record<CardType, number> = {
  strike: 15,
  dodge: 8,
  mead: 8,
  barrage: 0,
  steed: 0,
  enrage: 4,
  fortify: 0,
  saddle: 4,
  secondwind: 1,
  ambush: 2,
  command: 0,
  siege: 4
};

// Generates a new shuffled deck of 46 cards, using custom composition if provided
export function generateDeck(customComposition?: Record<string, number>): CardType[] {
  const deck: CardType[] = [];
  const comp = customComposition || DECK_COMPOSITION;
  
  (Object.keys(comp) as CardType[]).forEach(type => {
    const count = comp[type];
    for (let i = 0; i < count; i++) {
      deck.push(type);
    }
  });

  // Fisher-Yates Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}
