import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRemainingShare,
  canSelectPlayerColor,
  checkTableWinner,
  compareEvaluatedHands,
  createBalootDeck,
  evaluateHand,
  getBiddingCapabilities,
  getFirstAvailableColorId,
  MIN_PLAYERS_TO_START,
  PLAYER_COLORS,
  resolveRoundPayouts,
} from './rules';
import { Card, Player } from './types';

function makeCards(specs: [ Card['rank'], Card['suit'], Card['value'] ][]): Card[] {
  return specs.map(([rank, suit, value], idx) => ({
    id: `${rank}${suit}-${idx}`,
    rank,
    suit,
    value,
  }));
}

test('Minimum players is 4, and deck size scales dynamically to 4 * playerCount using highest ranks', () => {
  assert.equal(MIN_PLAYERS_TO_START, 4);

  // 4 players -> 16 cards of top 4 ranks: A, K, Q, J
  const deck4 = createBalootDeck(4);
  assert.equal(deck4.length, 16);
  const ranks4 = new Set(deck4.map((c) => c.rank));
  assert.deepEqual(Array.from(ranks4).sort(), ['A', 'J', 'K', 'Q']);

  // 5 players -> 20 cards from A down to 10 (A, K, Q, J, 10)
  const deck5 = createBalootDeck(5);
  assert.equal(deck5.length, 20);
  const ranks5 = new Set(deck5.map((c) => c.rank));
  assert.deepEqual(Array.from(ranks5).sort(), ['10', 'A', 'J', 'K', 'Q']);

  // 8 players -> 32 cards (A down to 7)
  const deck8 = createBalootDeck(8);
  assert.equal(deck8.length, 32);

  // 10 players -> 40 cards (A down to 5)
  const deck10 = createBalootDeck(10);
  assert.equal(deck10.length, 40);
});

test('10 exclusive player colors and color reservation lock', () => {
  assert.equal(PLAYER_COLORS.length, 10);

  const existing = [
    { id: 'p1', colorId: 'emerald' as const },
    { id: 'p2', colorId: 'amber' as const },
  ];

  assert.equal(canSelectPlayerColor(existing, 'p3', 'emerald'), false);
  assert.equal(canSelectPlayerColor(existing, 'p3', 'amber'), false);
  assert.equal(canSelectPlayerColor(existing, 'p3', 'ruby'), true);
  assert.equal(canSelectPlayerColor(existing, 'p1', 'emerald'), true);
  assert.equal(getFirstAvailableColorId(existing), 'ruby');
});

test('Winning target threshold check ends table when player reaches target (e.g. 100,000 or 1,000,000)', () => {
  const players = [
    { id: 'p1', balance: 85000 },
    { id: 'p2', balance: 105000 },
    { id: 'p3', balance: 12000 },
  ];

  assert.equal(checkTableWinner(players, 100000), 'p2');
  assert.equal(checkTableWinner(players, 1000000), null);
});

test('Exact user hand comparison examples: 4(J) > 3(A)+1(K), 3(J) > 2(A)+2(K), 2(Q)+2(J) > 2(A)+any+any', () => {
  const fourJacks = evaluateHand(
    makeCards([
      ['J', '♠', 11],
      ['J', '♥', 11],
      ['J', '♦', 11],
      ['J', '♣', 11],
    ])
  );
  const threeAcesOneKing = evaluateHand(
    makeCards([
      ['A', '♠', 14],
      ['A', '♥', 14],
      ['A', '♦', 14],
      ['K', '♣', 13],
    ])
  );
  const threeJacksOneTen = evaluateHand(
    makeCards([
      ['J', '♠', 11],
      ['J', '♥', 11],
      ['J', '♦', 11],
      ['10', '♣', 10],
    ])
  );
  const twoAcesTwoKings = evaluateHand(
    makeCards([
      ['A', '♠', 14],
      ['A', '♥', 14],
      ['K', '♦', 13],
      ['K', '♣', 13],
    ])
  );
  const twoQueensTwoJacks = evaluateHand(
    makeCards([
      ['Q', '♠', 12],
      ['Q', '♥', 12],
      ['J', '♦', 11],
      ['J', '♣', 11],
    ])
  );
  const twoAcesKingQueen = evaluateHand(
    makeCards([
      ['A', '♠', 14],
      ['A', '♥', 14],
      ['K', '♦', 13],
      ['Q', '♣', 12],
    ])
  );

  // Example 1 & 3: 4 (J) > 3 (A) + 1 (K)
  assert.ok(
    compareEvaluatedHands(fourJacks, threeAcesOneKing) > 0,
    '4 (J) beats 3 (A) + 1 (K)'
  );

  // Prompt rule: 3 (J)s is stronger than someone who has 2 (A) and 2 (K)
  assert.ok(
    compareEvaluatedHands(threeJacksOneTen, twoAcesTwoKings) > 0,
    '3 (J)s beats 2 (A) + 2 (K)'
  );

  // Example 2: 2 (Q) + 2 (J) > 2 (A) + any card + any other card
  assert.ok(
    compareEvaluatedHands(twoQueensTwoJacks, twoAcesKingQueen) > 0,
    '2 (Q) + 2 (J) beats 2 (A) + K + Q'
  );

  // Tie-breakers within same category: 3 (A) > 3 (J), and 2 (A)+2(K) > 2(Q)+2(J)
  assert.ok(
    compareEvaluatedHands(threeAcesOneKing, threeJacksOneTen) > 0,
    '3 (A) beats 3 (J)'
  );
  assert.ok(
    compareEvaluatedHands(twoAcesTwoKings, twoQueensTwoJacks) > 0,
    '2 (A) + 2 (K) beats 2 (Q) + 2 (J)'
  );
});

test('Live Auto-Deduction Counter: calculates High Bidder remaining share accurately', () => {
  const players = [
    { id: 'p1', roundStatus: 'HIGH_BIDDER' as const, currentOffer: 0 },
    { id: 'p2', roundStatus: 'OFFER_PENDING' as const, currentOffer: 5000 },
    { id: 'p3', roundStatus: 'OFFER_PENDING' as const, currentOffer: 5000 },
    { id: 'p4', roundStatus: 'OFFER_PENDING' as const, currentOffer: 5000 },
    { id: 'p5', roundStatus: 'OUT' as const, currentOffer: 9999 },
  ];

  const remaining = calculateRemainingShare(20000, players, 'p1');
  assert.equal(remaining, 5000);
});

test('Bidding capabilities: strictly caps maxNormalBid at playerBalance and enforces All-In when balance <= currentHighestBid', () => {
  const firstCap = getBiddingCapabilities(500, 0, true);
  assert.equal(firstCap.canNormalBid, true);
  assert.equal(firstCap.mustAllIn, false);
  assert.equal(firstCap.maxNormalBid, 500);

  const subHigherBalance = getBiddingCapabilities(2000, 1000, false);
  assert.equal(subHigherBalance.canNormalBid, true);
  assert.equal(subHigherBalance.mustAllIn, false);
  assert.equal(subHigherBalance.minNormalBid, 1050);
  assert.equal(subHigherBalance.maxNormalBid, 2000);

  const subLowerBalance = getBiddingCapabilities(600, 1000, false);
  assert.equal(subLowerBalance.canNormalBid, false);
  assert.equal(subLowerBalance.mustAllIn, true);
  assert.equal(subLowerBalance.allInAmount, 600);
  assert.equal(subLowerBalance.maxNormalBid, 600);
});

function createMockPlayer(overrides: Partial<Player>): Player {
  return {
    id: 'p',
    name: 'Player',
    colorId: 'emerald',
    isHost: false,
    isBot: false,
    seatIndex: 0,
    balance: 2000,
    hand: [],
    enteredBid: 0,
    hasActedInBidding: true,
    roundStatus: 'WAITING',
    currentOffer: 0,
    agreedOffer: 0,
    requestedBargain: null,
    bargainCount: 0,
    ...overrides,
  };
}

test('Phase 3 Branch 1: Everyone Accepted payout math', () => {
  const players: Player[] = [
    createMockPlayer({
      id: 'hb',
      name: 'HighBidder',
      balance: 2000,
      enteredBid: 20000,
      roundStatus: 'HIGH_BIDDER',
    }),
    createMockPlayer({
      id: 'p2',
      name: 'P2',
      balance: 2000,
      enteredBid: 5000,
      roundStatus: 'ACCEPTED',
      agreedOffer: 3000,
    }),
    createMockPlayer({
      id: 'p3',
      name: 'P3',
      balance: 2000,
      enteredBid: 8000,
      roundStatus: 'ACCEPTED',
      agreedOffer: 3000,
    }),
  ];

  const { updatedPlayers, summary } = resolveRoundPayouts(players, 'hb');
  assert.equal(summary.branch, 'ALL_ACCEPTED');

  const hb = updatedPlayers.find((p) => p.id === 'hb')!;
  const p2 = updatedPlayers.find((p) => p.id === 'p2')!;
  const p3 = updatedPlayers.find((p) => p.id === 'p3')!;

  assert.equal(hb.balance, 16000);
  assert.equal(p2.balance, 5000);
  assert.equal(p3.balance, 5000);
});

test('Phase 3 Branch 2 Case A: High Bidder wins challenge', () => {
  const players: Player[] = [
    createMockPlayer({
      id: 'hb',
      name: 'HighBidder',
      balance: 2000,
      enteredBid: 20000,
      roundStatus: 'HIGH_BIDDER',
      hand: makeCards([
        ['A', '♠', 14],
        ['A', '♥', 14],
        ['A', '♦', 14],
        ['K', '♣', 13],
      ]),
    }),
    createMockPlayer({
      id: 'acc',
      name: 'Acceptor',
      balance: 2000,
      enteredBid: 4000,
      roundStatus: 'ACCEPTED',
      agreedOffer: 2500,
      hand: makeCards([
        ['7', '♠', 7],
        ['8', '♥', 8],
        ['9', '♦', 9],
        ['10', '♣', 10],
      ]),
    }),
    createMockPlayer({
      id: 'chal',
      name: 'Challenger',
      balance: 2000,
      enteredBid: 15000,
      roundStatus: 'CHALLENGED',
      hand: makeCards([
        ['Q', '♠', 12],
        ['Q', '♥', 12],
        ['9', '♦', 9],
        ['8', '♣', 8],
      ]),
    }),
  ];

  const { updatedPlayers, summary } = resolveRoundPayouts(players, 'hb');
  assert.equal(summary.branch, 'HIGH_BIDDER_WON');

  const hb = updatedPlayers.find((p) => p.id === 'hb')!;
  const acc = updatedPlayers.find((p) => p.id === 'acc')!;
  const chal = updatedPlayers.find((p) => p.id === 'chal')!;

  assert.equal(hb.balance, 22000);
  assert.equal(acc.balance, 4500);
  assert.equal(chal.balance, -13000);
});

test('Phase 3 Branch 2 Case B: Challenger beats High Bidder', () => {
  const players: Player[] = [
    createMockPlayer({
      id: 'hb',
      name: 'HighBidder',
      balance: 2000,
      enteredBid: 20000,
      roundStatus: 'HIGH_BIDDER',
      hand: makeCards([
        ['10', '♠', 10],
        ['9', '♥', 9],
        ['8', '♦', 8],
        ['7', '♣', 7],
      ]),
    }),
    createMockPlayer({
      id: 'acc',
      name: 'Acceptor',
      balance: 2000,
      enteredBid: 4000,
      roundStatus: 'ACCEPTED',
      agreedOffer: 5000,
    }),
    createMockPlayer({
      id: 'winChal',
      name: 'WinningChallenger',
      balance: 2000,
      enteredBid: 15000,
      roundStatus: 'CHALLENGED',
      hand: makeCards([
        ['J', '♠', 11],
        ['J', '♥', 11],
        ['J', '♦', 11],
        ['J', '♣', 11],
      ]),
    }),
    createMockPlayer({
      id: 'loseChal',
      name: 'LosingChallenger',
      balance: 2000,
      enteredBid: 10000,
      roundStatus: 'CHALLENGED',
      hand: makeCards([
        ['A', '♠', 14],
        ['A', '♥', 14],
        ['A', '♦', 14],
        ['K', '♣', 13],
      ]),
    }),
  ];

  const { updatedPlayers, summary } = resolveRoundPayouts(players, 'hb');
  assert.equal(summary.branch, 'CHALLENGER_WON');

  const hb = updatedPlayers.find((p) => p.id === 'hb')!;
  const acc = updatedPlayers.find((p) => p.id === 'acc')!;
  const winChal = updatedPlayers.find((p) => p.id === 'winChal')!;
  const loseChal = updatedPlayers.find((p) => p.id === 'loseChal')!;

  assert.equal(hb.balance, -18000);
  assert.equal(acc.balance, 2000);
  assert.equal(winChal.balance, 17000);
  assert.equal(loseChal.balance, -8000);
});
