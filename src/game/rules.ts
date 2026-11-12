import {
  Card,
  HandEvaluation,
  Player,
  PlayerColorId,
  PlayerColorOption,
  RankLabel,
  RankValue,
  ResolutionSummary,
  Suit,
} from './types';

export const MIN_PLAYERS_TO_START = 4;
export const CARDS_PER_PLAYER = 4;

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

/**
 * Full descending rank list from strongest (A = 14) down to 5 (for up to 10 players).
 * When there are N players (4..10), only the top N strongest ranks are included in the deck
 * (4 suits per rank = 4 * N total cards).
 * - 4 players -> 16 cards: A, K, Q, J
 * - 5 players -> 20 cards: A, K, Q, J, 10
 * - 6 players -> 24 cards: A, K, Q, J, 10, 9
 * - 7 players -> 28 cards: A, K, Q, J, 10, 9, 8
 * - 8 players -> 32 cards: A, K, Q, J, 10, 9, 8, 7
 * - 9 players -> 36 cards: A, K, Q, J, 10, 9, 8, 7, 6
 * - 10 players -> 40 cards: A, K, Q, J, 10, 9, 8, 7, 6, 5
 */
export const RANKS: { label: RankLabel; value: RankValue; arabicName: string }[] = [
  { label: 'A', value: 14, arabicName: 'الأكة' },
  { label: 'K', value: 13, arabicName: 'الشايب' },
  { label: 'Q', value: 12, arabicName: 'البنت' },
  { label: 'J', value: 11, arabicName: 'الولد' },
  { label: '10', value: 10, arabicName: '10' },
  { label: '9', value: 9, arabicName: '9' },
  { label: '8', value: 8, arabicName: '8' },
  { label: '7', value: 7, arabicName: '7' },
  { label: '6', value: 6, arabicName: '6' },
  { label: '5', value: 5, arabicName: '5' },
];

export function getRankArabicName(value: number): string {
  const found = RANKS.find((r) => r.value === value);
  return found ? found.arabicName : String(value);
}

/**
 * Returns the active rank slice for a given playerCount (clamped between 4 and 10).
 */
export function getActiveRanksForPlayerCount(playerCount: number) {
  const clampedCount = Math.min(10, Math.max(MIN_PLAYERS_TO_START, playerCount));
  return RANKS.slice(0, clampedCount);
}

/**
 * Generates the exact Mudaqash deck scaled to the number of players:
 * For N players (minimum 4, maximum 10), uses the N highest card ranks across 4 suits = 4 * N cards.
 * - 4 players -> 16 cards (A, K, Q, J)
 * - 5 players -> 20 cards (A, K, Q, J, 10)
 * etc.
 */
export function createBalootDeck(playerCount: number): Card[] {
  const activeRanks = getActiveRanksForPlayerCount(playerCount);
  const deck: Card[] = [];

  for (const rank of activeRanks) {
    for (const suit of SUITS) {
      deck.push({
        id: `${rank.label}${suit}`,
        suit,
        rank: rank.label,
        value: rank.value,
      });
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
 * Evaluates a 4-card Mudaqash hand according to the exact similarity count & rank rules:
 * Hand strength is determined by how many matching cards of the same rank you have:
 * 1. FOUR_OF_A_KIND (أربعات - 4 of the same rank, e.g. 4 Jacks > 3 Aces + 1 King) -> categoryScore = 5
 * 2. THREE_OF_A_KIND (ثلاثيات - 3 of the same rank, e.g. 3 Jacks > 2 Aces + 2 Kings) -> categoryScore = 4
 * 3. TWO_PAIR (زوجين - 2 of one rank + 2 of another rank, e.g. 2 Queens + 2 Jacks > 2 Aces + 1 King + 1 Ten) -> categoryScore = 3
 * 4. ONE_PAIR (زوج واحد - 2 of the same rank + 2 unmatched cards) -> categoryScore = 2
 * 5. HIGH_CARD (كرت عالي - 4 distinct ranks) -> categoryScore = 1
 *
 * Tie-breaker within the same category:
 * Groups are sorted by count descending, then by rank value descending (A=14 > K=13 > Q=12 > J=11 > 10 ...).
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

  // 1. Four of a Kind (4 matching cards)
  if (topCount >= 4) {
    return {
      category: 'FOUR_OF_A_KIND',
      categoryScore: 5,
      categoryArabic: 'أربعات',
      tiebreakerValues,
      descriptionArabic: `أربعات (${getRankArabicName(groups[0].value)})`,
    };
  }

  // 2. Three of a Kind (3 matching cards + 1 kicker)
  if (topCount === 3) {
    return {
      category: 'THREE_OF_A_KIND',
      categoryScore: 4,
      categoryArabic: 'ثلاثيات',
      tiebreakerValues,
      descriptionArabic: `ثلاثيات (${getRankArabicName(groups[0].value)})`,
    };
  }

  // 3. Two Pair (2 matching cards + 2 matching cards)
  if (topCount === 2 && secondCount === 2) {
    return {
      category: 'TWO_PAIR',
      categoryScore: 3,
      categoryArabic: 'زوجين',
      tiebreakerValues,
      descriptionArabic: `زوجين (${getRankArabicName(groups[0].value)} و ${getRankArabicName(groups[1].value)})`,
    };
  }

  // 4. One Pair (2 matching cards + 2 kickers)
  if (topCount === 2) {
    return {
      category: 'ONE_PAIR',
      categoryScore: 2,
      categoryArabic: 'زوج واحد',
      tiebreakerValues,
      descriptionArabic: `زوج (${getRankArabicName(groups[0].value)})`,
    };
  }

  // 5. High Card
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
