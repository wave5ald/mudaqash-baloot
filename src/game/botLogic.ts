import { evaluateHand, getBiddingCapabilities } from './rules';
import { GameState, Player } from './types';

const ARABIC_BOT_NAMES = [
  'سلطان',
  'فهد',
  'راشد',
  'نواف',
  'عبدالعزيز',
  'سعود',
  'فيصل',
  'تركي',
  'بدر',
];

export function getNextBotName(existingPlayers: Player[]): string {
  const used = new Set(existingPlayers.map((p) => p.name));
  for (const name of ARABIC_BOT_NAMES) {
    if (!used.has(name)) return name;
  }
  return `لاعب آلي ${existingPlayers.length + 1}`;
}

/**
 * Decides a realistic action for a Bot during Phase 1: Bidding Circle
 */
export function decideBotBidAction(
  bot: Player,
  state: GameState
): { action: 'FOLD' } | { action: 'BID'; amount: number; isAllIn: boolean } {
  if (bot.balance <= 0) {
    return { action: 'FOLD' };
  }

  const handEval = evaluateHand(bot.hand);
  const isFirst = state.highestBid === 0;
  const caps = getBiddingCapabilities(bot.balance, state.highestBid, isFirst);

  // Hand strength score 1..7
  const score = handEval.categoryScore;
  const topCard = handEval.tiebreakerValues[0] || 7;

  if (isFirst) {
    // First bidder opens with a sensible bid strictly capped at bot.balance
    const rawBase = score >= 3 ? 600 : score === 2 ? 350 : 200;
    const baseBid = Math.min(bot.balance, rawBase);
    return { action: 'BID', amount: baseBid, isAllIn: baseBid === bot.balance };
  }

  // If bot has weak High Card (no Ace) and bid is already high, fold ("أوت")
  if (score === 1 && topCard < 14 && state.highestBid >= 400) {
    return { action: 'FOLD' };
  }

  // If bot's balance <= current highest bid, bot can ONLY go All-In ("كل فلوسي") or Fold ("أوت")
  if (caps.mustAllIn) {
    if (score >= 3 || (score === 2 && topCard >= 12) || state.highestBid <= bot.balance * 2) {
      return { action: 'BID', amount: caps.allInAmount, isAllIn: true };
    }
    return { action: 'FOLD' };
  }

  // Bot has more balance than state.highestBid -> can bid higher up to bot.balance
  const willingnessRatio =
    score >= 5 ? 1.0 : score === 4 ? 0.95 : score === 3 ? 0.85 : score === 2 ? 0.65 : 0.4;
  const maxWilling = Math.min(
    bot.balance,
    Math.max(caps.minNormalBid, Math.round(bot.balance * willingnessRatio))
  );

  if (state.highestBid < maxWilling) {
    const step = state.highestBid >= 1000 ? 200 : 100;
    const nextBid = Math.min(bot.balance, Math.max(caps.minNormalBid, state.highestBid + step));
    return {
      action: 'BID',
      amount: nextBid,
      isAllIn: nextBid === bot.balance,
    };
  }

  return { action: 'FOLD' };
}

/**
 * If a Bot becomes the High Bidder ("راعي المزايدة"), generates offers for active players
 */
export function decideBotHighBidderOffers(
  bot: Player,
  state: GameState
): Record<string, number> {
  const handEval = evaluateHand(bot.hand);
  const activeOthers = state.players.filter(
    (p) => p.id !== bot.id && p.roundStatus !== 'OUT'
  );

  if (activeOthers.length === 0) return {};

  // Strong hand -> offer smaller amounts (wants people to either accept cheap or challenge and lose)
  // Weak hand (bluff) -> offer generous share to persuade others to accept without showdown
  const isStrong = handEval.categoryScore >= 3 || (handEval.categoryScore === 2 && handEval.tiebreakerValues[0] >= 13);
  const totalPoolToDistribute = isStrong
    ? Math.floor(bot.enteredBid * 0.35)
    : Math.floor(bot.enteredBid * 0.65);

  const perPlayerOffer = Math.max(
    100,
    Math.round(totalPoolToDistribute / activeOthers.length / 50) * 50
  );

  const offers: Record<string, number> = {};
  for (const p of activeOthers) {
    offers[p.id] = perPlayerOffer;
  }
  return offers;
}

/**
 * Decides how a Bot responds when High Bidder sends offers or responds to a bargain
 */
export function decideBotOfferResponse(
  bot: Player,
  state: GameState
): { decision: 'ACCEPT' | 'CHALLENGE' | 'BARGAIN'; requestedAmount?: number } {
  const handEval = evaluateHand(bot.hand);
  const offer = bot.currentOffer;
  const highBid = state.highestBid || 1000;

  // Very strong hand (Three of a Kind, Full House, Four of a Kind, or Two Pair Aces/Kings) -> Challenge (مداقش)
  if (
    handEval.categoryScore >= 4 ||
    (handEval.categoryScore === 3 && handEval.tiebreakerValues[0] >= 13)
  ) {
    // Unless offer is huge (>= 45% of high bid)
    if (offer >= highBid * 0.45) {
      return { decision: 'ACCEPT' };
    }
    return { decision: 'CHALLENGE' };
  }

  // Medium hand (Two Pair or High Pair)
  if (handEval.categoryScore >= 2) {
    if (offer >= Math.max(250, bot.enteredBid * 0.5)) {
      return { decision: 'ACCEPT' };
    }
    if (bot.bargainCount < 2) {
      const bump = Math.max(150, Math.round((bot.enteredBid * 0.65) / 50) * 50);
      const targetReq = Math.max(offer + 100, bump);
      if (targetReq < highBid * 0.6) {
        return { decision: 'BARGAIN', requestedAmount: targetReq };
      }
    }
    // Decide between Challenge and Accept
    if (handEval.tiebreakerValues[0] >= 13 && offer < 200) {
      return { decision: 'CHALLENGE' };
    }
    return { decision: 'ACCEPT' };
  }

  // Weak hand (High card)
  if (offer > 0) {
    if (bot.bargainCount === 0 && offer < 150) {
      return { decision: 'BARGAIN', requestedAmount: offer + 150 };
    }
    return { decision: 'ACCEPT' };
  }

  // Offer is 0
  if (bot.bargainCount < 2) {
    return { decision: 'BARGAIN', requestedAmount: 200 };
  }
  return handEval.tiebreakerValues[0] === 14 ? { decision: 'CHALLENGE' } : { decision: 'ACCEPT' };
}
