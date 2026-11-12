import {
  Card,
  HandCategory,
  HandEvaluation,
  Player,
  PlayerColorId,
  PlayerColorOption,
  RankLabel,
  RankValue,
  ResolutionSummary,
  Suit,
} from './types';

export const PLAYER_COLORS: PlayerColorOption[] = [
  {
    id: 'emerald',
    nameArabic: 'أخضر زمردي',
    bgHex: '#062C1E',
    headerBgHex: '#041E14',
    borderHex: '#10B981',
    accentHex: '#34D399',
  },
  {
    id: 'amber',
    nameArabic: 'ذهبي ملكي',
    bgHex: '#331D06',
    headerBgHex: '#241404',
    borderHex: '#F59E0B',
    accentHex: '#FBBF24',
  },
  {
    id: 'ruby',
    nameArabic: 'أحمر ياقوتي',
    bgHex: '#350B0B',
    headerBgHex: '#240707',
    borderHex: '#EF4444',
    accentHex: '#F87171',
  },
  {
    id: 'sapphire',
    nameArabic: 'أزرق ياقوتي',
    bgHex: '#0B1E3B',
    headerBgHex: '#071429',
    borderHex: '#3B82F6',
    accentHex: '#60A5FA',
  },
  {
    id: 'amethyst',
    nameArabic: 'بنفسجي ملكي',
    bgHex: '#23103A',
    headerBgHex: '#170A29',
    borderHex: '#8B5CF6',
    accentHex: '#A78BFA',
  },
  {
    id: 'teal',
    nameArabic: 'فيروزي داكن',
    bgHex: '#072B2E',
    headerBgHex: '#041D1F',
    borderHex: '#14B8A6',
    accentHex: '#2DD4BF',
  },
  {
    id: 'copper',
    nameArabic: 'نحاسي عتيق',
    bgHex: '#361708',
    headerBgHex: '#240E04',
    borderHex: '#EA580C',
    accentHex: '#FB923C',
  },
  {
    id: 'crimson',
    nameArabic: 'عنابي فخم',
    bgHex: '#330A1E',
    headerBgHex: '#220614',
    borderHex: '#EC4899',
    accentHex: '#F472B6',
  },
  {
    id: 'indigo',
    nameArabic: 'كحلي نيلي',
    bgHex: '#14163A',
    headerBgHex: '#0C0E26',
    borderHex: '#6366F1',
    accentHex: '#818CF8',
  },
  {
    id: 'olive',
    nameArabic: 'زيتوني عسكري',
    bgHex: '#1E2B0B',
    headerBgHex: '#141D07',
    borderHex: '#84CC16',
    accentHex: '#A3E635',
  },
];

export function getPlayerColorOption(colorId?: PlayerColorId): PlayerColorOption {
  return PLAYER_COLORS.find((c) => c.id === colorId) || PLAYER_COLORS[0];
}

export function getFirstAvailableColorId(existingPlayers: Pick<Player, 'colorId'>[]): PlayerColorId {
  const taken = new Set(existingPlayers.map((p) => p.colorId));
  for (const c of PLAYER_COLORS) {
    if (!taken.has(c.id)) return c.id;
  }
  return PLAYER_COLORS[0].id;
}

export function canSelectPlayerColor(
  players: Pick<Player, 'id' | 'colorId'>[],
  requestingPlayerId: string,
  targetColorId: PlayerColorId
): boolean {
  return !players.some((p) => p.id !== requestingPlayerId && p.colorId === targetColorId);
}

/**
 * Checks if any player has reached or exceeded the winningTarget balance.
 * If multiple players reach it in the same round, the player with the highest balance wins the table.
 */
export function checkTableWinner(
  players: Pick<Player, 'id' | 'balance'>[],
  winningTarget: number
): string | null {
  if (!winningTarget || winningTarget <= 0) return null;
  const qualified = players
    .filter((p) => p.balance >= winningTarget)
    .sort((a, b) => b.balance - a.balance);

  return qualified.length > 0 ? qualified[0].id : null;
}

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];

export const RANKS: { label: RankLabel; value: RankValue; arabicName: string }[] = [
  { label: 'A', value: 14, arabicName: 'الأكة' },
  { label: 'K', value: 13, arabicName: 'الشايب' },
  { label: 'Q', value: 12, arabicName: 'البنت' },
  { label: 'J', value: 11, arabicName: 'الولد' },
  { label: '10', value: 10, arabicName: '10' },
  { label: '9', value: 9, arabicName: '9' },
  { label: '8', value: 8, arabicName: '8' },
  { label: '7', value: 7, arabicName: '7' },
];

export function getRankArabicName(value: number): string {
  const found = RANKS.find((r) => r.value === value);
  return found ? found.arabicName : String(value);
}

/**
 * Generates a 32-card Baloot deck, or a 64-card double Baloot deck automatically
 * if playerCount > 7 or total cards required > 32.
 */
export function createBalootDeck(playerCount: number, cardsPerPlayer: 4 | 5 = 4): Card[] {
  const needsDoubleDeck = playerCount > 7 || playerCount * cardsPerPlayer > 32;
  const deckCopies = needsDoubleDeck ? 2 : 1;
  const deck: Card[] = [];

  for (let copy = 0; copy < deckCopies; copy++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          id: `${rank.label}${suit}-${copy}`,
          suit,
          rank: rank.label,
          value: rank.value,
        });
      }
    }
  }

  return shuffleDeck(deck);
}

export function shuffleDeck(cards: Card[]): Card[] {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/**
 * Evaluates a 4-card or 5-card Mudaqash Baloot hand according to the strict hierarchy:
 * 1. Four of a Kind (أربعات)
 * 2. Full House (فل هاوس - if 5 cards: 3 of a kind + 1 Pair)
 * 3. Three of a Kind (ثلاثيات)
 * 4. Two Pair (زوجين)
 * 5. One Pair (زوج واحد)
 * 6. High Card (كرت عالي - A = 14 highest)
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (!cards || cards.length === 0) {
    return {
      category: 'HIGH_CARD',
      categoryScore: 1,
      categoryArabic: 'كرت عالي',
      tiebreakerValues: [0],
      descriptionArabic: 'بدون كروت',
    };
  }

  const freqMap = new Map<number, number>();
  for (const c of cards) {
    freqMap.set(c.value, (freqMap.get(c.value) || 0) + 1);
  }

  // Sort groups by count DESC, then by card rank value DESC
  const groups = Array.from(freqMap.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.value - a.value;
    });

  const tiebreakerValues = groups.map((g) => g.value);
  const topCount = groups[0].count;
  const secondCount = groups[1]?.count || 0;

  if (topCount >= 4) {
    const isFive = topCount === 5;
    const category: HandCategory = isFive ? 'FIVE_OF_A_KIND' : 'FOUR_OF_A_KIND';
    return {
      category,
      categoryScore: isFive ? 7 : 6,
      categoryArabic: 'أربعات',
      tiebreakerValues,
      descriptionArabic: `أربعات (${getRankArabicName(groups[0].value)})`,
    };
  }

  if (topCount === 3 && secondCount >= 2) {
    return {
      category: 'FULL_HOUSE',
      categoryScore: 5,
      categoryArabic: 'فل هاوس',
      tiebreakerValues,
      descriptionArabic: `فل هاوس (${getRankArabicName(groups[0].value)} و ${getRankArabicName(groups[1].value)})`,
    };
  }

  if (topCount === 3) {
    return {
      category: 'THREE_OF_A_KIND',
      categoryScore: 4,
      categoryArabic: 'ثلاثيات',
      tiebreakerValues,
      descriptionArabic: `ثلاثيات (${getRankArabicName(groups[0].value)})`,
    };
  }

  if (topCount === 2 && secondCount === 2) {
    return {
      category: 'TWO_PAIR',
      categoryScore: 3,
      categoryArabic: 'زوجين',
      tiebreakerValues,
      descriptionArabic: `زوجين (${getRankArabicName(groups[0].value)} و ${getRankArabicName(groups[1].value)})`,
    };
  }

  if (topCount === 2) {
    return {
      category: 'ONE_PAIR',
      categoryScore: 2,
      categoryArabic: 'زوج واحد',
      tiebreakerValues,
      descriptionArabic: `زوج (${getRankArabicName(groups[0].value)})`,
    };
  }

  return {
    category: 'HIGH_CARD',
    categoryScore: 1,
    categoryArabic: 'كرت عالي',
    tiebreakerValues,
    descriptionArabic: `كرت عالي (${getRankArabicName(groups[0].value)})`,
  };
}

/**
 * Compares two evaluated hands.
 * Returns > 0 if handA > handB, < 0 if handA < handB, 0 if exact tie.
 */
export function compareEvaluatedHands(handA: HandEvaluation, handB: HandEvaluation): number {
  if (handA.categoryScore !== handB.categoryScore) {
    return handA.categoryScore - handB.categoryScore;
  }

  const len = Math.max(handA.tiebreakerValues.length, handB.tiebreakerValues.length);
  for (let i = 0; i < len; i++) {
    const valA = handA.tiebreakerValues[i] ?? 0;
    const valB = handB.tiebreakerValues[i] ?? 0;
    if (valA !== valB) {
      return valA - valB;
    }
  }
  return 0;
}

/**
 * Calculates the remaining share for the High Bidder:
 * Remaining Share = HighBidder.enteredBid - Sum(All Offers Assigned to Others)
 */
export function calculateRemainingShare(
  highBidderEnteredBid: number,
  players: Pick<Player, 'id' | 'roundStatus' | 'currentOffer'>[],
  highBidderId: string
): number {
  const sumOffers = players
    .filter((p) => p.id !== highBidderId && p.roundStatus !== 'OUT')
    .reduce((acc, p) => acc + (p.currentOffer || 0), 0);

  return highBidderEnteredBid - sumOffers;
}

/**
 * Determines whether a player in the bidding circle must use the "All-In" (كل فلوسي / كلي) button
 * or can bid normally, strictly capped at their current balance.
 */
export function getBiddingCapabilities(
  playerBalance: number,
  currentHighestBid: number,
  isFirstBidderToOpen: boolean
): {
  canNormalBid: boolean;
  mustAllIn: boolean;
  minNormalBid: number;
  maxNormalBid: number;
  allInAmount: number;
} {
  const safeBalance = Math.max(0, playerBalance);

  if (safeBalance === 0) {
    return {
      canNormalBid: false,
      mustAllIn: true,
      minNormalBid: 0,
      maxNormalBid: 0,
      allInAmount: 0,
    };
  }

  if (isFirstBidderToOpen || currentHighestBid === 0) {
    const minBid = Math.min(50, safeBalance);
    return {
      canNormalBid: true,
      mustAllIn: false,
      minNormalBid: minBid,
      maxNormalBid: safeBalance,
      allInAmount: safeBalance,
    };
  }

  if (safeBalance <= currentHighestBid) {
    return {
      canNormalBid: false,
      mustAllIn: true,
      minNormalBid: safeBalance,
      maxNormalBid: safeBalance,
      allInAmount: safeBalance,
    };
  }

  const nextMin = Math.min(safeBalance, currentHighestBid + 50);
  return {
    canNormalBid: true,
    mustAllIn: false,
    minNormalBid: nextMin > currentHighestBid ? nextMin : currentHighestBid + 1,
    maxNormalBid: safeBalance,
    allInAmount: safeBalance,
  };
}

/**
 * Pure payout resolution function implementing the exact Phase 3 math.
 */
export function resolveRoundPayouts(
  players: Player[],
  highBidderId: string
): {
  updatedPlayers: Player[];
  summary: ResolutionSummary;
} {
  const highBidder = players.find((p) => p.id === highBidderId);
  if (!highBidder) {
    throw new Error('High bidder not found');
  }

  const challengers = players.filter((p) => p.roundStatus === 'CHALLENGED');
  const acceptors = players.filter((p) => p.roundStatus === 'ACCEPTED');
  const playerDeltas: Record<string, number> = {};

  for (const p of players) {
    playerDeltas[p.id] = 0;
  }

  // Branch 1: Everyone Accepted (no challengers)
  if (challengers.length === 0) {
    const sumOfAllAgreedOffers = acceptors.reduce((sum, p) => sum + p.agreedOffer, 0);
    const highBidderShare = highBidder.enteredBid - sumOfAllAgreedOffers;

    playerDeltas[highBidder.id] = highBidderShare;
    for (const acc of acceptors) {
      playerDeltas[acc.id] = acc.agreedOffer;
    }

    const updatedPlayers = players.map((p) => ({
      ...p,
      balance: p.balance + (playerDeltas[p.id] || 0),
      lastRoundDelta: playerDeltas[p.id] || 0,
    }));

    return {
      updatedPlayers,
      summary: {
        branch: 'ALL_ACCEPTED',
        winnerIds: [highBidder.id, ...acceptors.map((a) => a.id)],
        headlineArabic: 'الكل وافق على العروض — بدون مداقشة',
        sublineArabic: `حصل راعي المزايدة (${highBidder.name}) على صافي نصيبه المتبقي (${highBidderShare.toLocaleString('en-US')}) وتم توزيع العروض المتفق عليها.`,
        playerDeltas,
      },
    };
  }

  // Branch 2: Showdown between High Bidder and Challengers
  const showdownParticipants = [highBidder, ...challengers].map((p) => ({
    player: p,
    evalResult: p.handEvaluation || evaluateHand(p.hand),
  }));

  let bestEval = showdownParticipants[0].evalResult;
  for (let i = 1; i < showdownParticipants.length; i++) {
    if (compareEvaluatedHands(showdownParticipants[i].evalResult, bestEval) > 0) {
      bestEval = showdownParticipants[i].evalResult;
    }
  }

  const showdownWinners = showdownParticipants
    .filter((sp) => compareEvaluatedHands(sp.evalResult, bestEval) === 0)
    .map((sp) => sp.player);

  const highBidderWon = showdownWinners.some((w) => w.id === highBidder.id);

  if (highBidderWon) {
    playerDeltas[highBidder.id] = highBidder.enteredBid;

    for (const acc of acceptors) {
      playerDeltas[acc.id] = acc.agreedOffer;
    }

    for (const ch of challengers) {
      playerDeltas[ch.id] = -ch.enteredBid;
    }

    const updatedPlayers = players.map((p) => ({
      ...p,
      balance: p.balance + (playerDeltas[p.id] || 0),
      lastRoundDelta: playerDeltas[p.id] || 0,
      handEvaluation: p.handEvaluation || evaluateHand(p.hand),
    }));

    return {
      updatedPlayers,
      summary: {
        branch: 'HIGH_BIDDER_WON',
        winnerIds: [highBidder.id],
        headlineArabic: `فاز راعي المزايدة (${highBidder.name}) بالتحدي!`,
        sublineArabic: `ربح راعي المزايدة كامل مزايدته (+${highBidder.enteredBid.toLocaleString('en-US')}) بيد ${bestEval.descriptionArabic}، وحصل القابلون على عروضهم، وخسر المداقشون مبالغ دخولهم.`,
        playerDeltas,
      },
    };
  } else {
    const winnerIds = showdownWinners.map((w) => w.id);

    for (const acc of acceptors) {
      playerDeltas[acc.id] = 0;
    }

    playerDeltas[highBidder.id] = -highBidder.enteredBid;

    for (const ch of challengers) {
      if (winnerIds.includes(ch.id)) {
        playerDeltas[ch.id] = ch.enteredBid;
      } else {
        playerDeltas[ch.id] = -ch.enteredBid;
      }
    }

    const winnerNames = showdownWinners.map((w) => w.name).join(' و ');
    const updatedPlayers = players.map((p) => ({
      ...p,
      balance: p.balance + (playerDeltas[p.id] || 0),
      lastRoundDelta: playerDeltas[p.id] || 0,
      handEvaluation: p.handEvaluation || evaluateHand(p.hand),
    }));

    return {
      updatedPlayers,
      summary: {
        branch: 'CHALLENGER_WON',
        winnerIds,
        headlineArabic: `خسر راعي المزايدة وفاز المداقش (${winnerNames})!`,
        sublineArabic: `فاز ${winnerNames} بيد ${bestEval.descriptionArabic} وكسب مبلغ دخوله الشخصي، وأُلغيت عروض القابلين (0)، وخسر راعي المزايدة وبقية المداقشين مبالغ دخولهم.`,
        playerDeltas,
      },
    };
  }
}

export function haveAllActivePlayersDecided(players: Player[], highBidderId: string): boolean {
  const activeOthers = players.filter((p) => p.id !== highBidderId && p.roundStatus !== 'OUT');
  if (activeOthers.length === 0) return true;
  return activeOthers.every(
    (p) => p.roundStatus === 'ACCEPTED' || p.roundStatus === 'CHALLENGED'
  );
}
