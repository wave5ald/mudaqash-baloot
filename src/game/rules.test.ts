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

test('Baloot deck creation: 32 cards for <= 7 players, 64 cards for > 7 players', () => {
  const deck4 = createBalootDeck(4, 4);
  assert.equal(deck4.length, 32);

  const deck8 = createBalootDeck(8, 4);
  assert.equal(deck8.length, 64);

  const deck7FiveCards = createBalootDeck(7, 5);
  assert.equal(deck7FiveCards.length, 64);
});

test('10 exclusive player colors and color reservation lock', () => {
  assert.equal(PLAYER_COLORS.length, 10);

  const existing = [
    { id: 'p1', colorId: 'emerald' as const },
    { id: 'p2', colorId: 'amber' as const },
  ];

  // p3 cannot take emerald or amber
  assert.equal(canSelectPlayerColor(existing, 'p3', 'emerald'), false);
  assert.equal(canSelectPlayerColor(existing, 'p3', 'amber'), false);
  // p3 can take ruby
  assert.equal(canSelectPlayerColor(existing, 'p3', 'ruby'), true);
  // p1 can re-select their own color
  assert.equal(canSelectPlayerColor(existing, 'p1', 'emerald'), true);

  // First available color skips emerald and amber -> returns ruby
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

test('Showdown Hand Hierarchy: Four of a Kind > Full House > Three of a Kind > Two Pair > One Pair > High Card', () => {
  const fourAces = evaluateHand(
    makeCards([
      ['A', '♠', 14],
      ['A', '♥', 14],
      ['A', '♦', 14],
      ['A', '♣', 14],
    ])
  );
  const fourKings = evaluateHand(
    makeCards([
      ['K', '♠', 13],
      ['K', '♥', 13],
      ['K', '♦', 13],
      ['K', '♣', 13],
    ])
  );
  const fullHouse = evaluateHand(
    makeCards([
      ['K', '♠', 13],
      ['K', '♥', 13],
      ['K', '♦', 13],
      ['10', '♣', 10],
      ['10', '♠', 10],
    ])
  );
  const threeQueens = evaluateHand(
    makeCards([
      ['Q', '♠', 12],
      ['Q', '♥', 12],
      ['Q', '♦', 12],
      ['7', '♣', 7],
    ])
  );
  const twoPair = evaluateHand(
    makeCards([
      ['J', '♠', 11],
      ['J', '♥', 11],
      ['9', '♦', 9],
      ['9', '♣', 9],
    ])
  );
  const onePairAces = evaluateHand(
    makeCards([
      ['A', '♠', 14],
      ['A', '♥', 14],
      ['10', '♦', 10],
      ['8', '♣', 8],
    ])
  );
  const highCardAce = evaluateHand(
    makeCards([
      ['A', '♠', 14],
      ['K', '♥', 13],
      ['9', '♦', 9],
      ['7', '♣', 7],
    ])
  );

  assert.ok(compareEvaluatedHands(fourAces, fourKings) > 0, 'Four Aces beats Four Kings');
  assert.ok(compareEvaluatedHands(fourKings, fullHouse) > 0, 'Four of a Kind beats Full House');
  assert.ok(compareEvaluatedHands(fullHouse, threeQueens) > 0, 'Full House beats Three of a Kind');
  assert.ok(compareEvaluatedHands(threeQueens, twoPair) > 0, 'Three of a Kind beats Two Pair');
  assert.ok(compareEvaluatedHands(twoPair, onePairAces) > 0, 'Two Pair beats One Pair');
  assert.ok(compareEvaluatedHands(onePairAces, highCardAce) > 0, 'One Pair beats High Card');
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
        ['A', '♠', 14],
        ['A', '♥', 14],
        ['A', '♦', 14],
        ['A', '♣', 14],
      ]),
    }),
    createMockPlayer({
      id: 'loseChal',
      name: 'LosingChallenger',
      balance: 2000,
      enteredBid: 10000,
      roundStatus: 'CHALLENGED',
      hand: makeCards([
        ['K', '♠', 13],
        ['K', '♥', 13],
        ['8', '♦', 8],
        ['7', '♣', 7],
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
