export type Suit = '♠' | '♥' | '♦' | '♣';

export type RankLabel = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export type RankValue = 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  id: string;
  suit: Suit;
  rank: RankLabel;
  value: RankValue;
}

export type HandCategory =
  | 'FIVE_OF_A_KIND'
  | 'FOUR_OF_A_KIND'
  | 'FULL_HOUSE'
  | 'THREE_OF_A_KIND'
  | 'TWO_PAIR'
  | 'ONE_PAIR'
  | 'HIGH_CARD';

export interface HandEvaluation {
  category: HandCategory;
  categoryScore: number; // 7 down to 1
  categoryArabic: string;
  tiebreakerValues: number[]; // Descending comparison array of ranks
  descriptionArabic: string;
}

export type PlayerColorId =
  | 'emerald'
  | 'amber'
  | 'ruby'
  | 'sapphire'
  | 'amethyst'
  | 'teal'
  | 'copper'
  | 'crimson'
  | 'indigo'
  | 'olive';

export interface PlayerColorOption {
  id: PlayerColorId;
  nameArabic: string;
  bgHex: string;
  borderHex: string;
  accentHex: string;
  headerBgHex: string;
}

export type PlayerRoundStatus =
  | 'WAITING'
  | 'ACTIVE_BIDDING'
  | 'BID_PLACED'
  | 'ALL_IN'
  | 'OUT'
  | 'HIGH_BIDDER'
  | 'OFFER_PENDING'
  | 'BARGAINING'
  | 'ACCEPTED'
  | 'CHALLENGED';

export interface Player {
  id: string;
  name: string;
  colorId: PlayerColorId;
  isHost: boolean;
  isBot: boolean;
  seatIndex: number;
  balance: number;
  hand: Card[];
  enteredBid: number;
  hasActedInBidding: boolean;
  roundStatus: PlayerRoundStatus;
  currentOffer: number;
  agreedOffer: number;
  requestedBargain: number | null;
  bargainCount: number; // 0, 1, 2 (strict max 2)
  handEvaluation?: HandEvaluation;
  lastRoundDelta?: number;
}

export type GamePhase =
  | 'LOBBY'
  | 'BIDDING'
  | 'OFFERS_AND_BARGAINING'
  | 'SHOWDOWN_REVEAL'
  | 'ROUND_RESOLUTION'
  | 'GAME_OVER';

export interface RoomSettings {
  maxPlayers: number; // up to 10
  startingBalance: 500 | 2000;
  cardsPerPlayer: 4 | 5;
  winningTarget: number; // e.g., 10000, 100000, 1000000
}

export interface ResolutionSummary {
  branch: 'ALL_ACCEPTED' | 'HIGH_BIDDER_WON' | 'CHALLENGER_WON';
  winnerIds: string[];
  headlineArabic: string;
  sublineArabic: string;
  playerDeltas: Record<string, number>;
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  settings: RoomSettings;
  players: Player[];
  roundNumber: number;
  startingBidderIndex: number;
  currentTurnPlayerId: string | null;
  highestBid: number;
  highBidderId: string | null;
  offersSent: boolean;
  showdownStartTime: number | null;
  resolutionSummary: ResolutionSummary | null;
  tableWinnerId: string | null;
}

export type ClientAction =
  | { type: 'JOIN_ROOM'; playerId: string; name: string }
  | { type: 'LEAVE_ROOM'; playerId: string }
  | { type: 'SELECT_COLOR'; playerId: string; colorId: PlayerColorId }
  | { type: 'SUBMIT_BID'; playerId: string; amount: number; isAllIn?: boolean }
  | { type: 'FOLD_OUT'; playerId: string }
  | { type: 'UPDATE_DRAFT_OFFER'; playerId: string; targetPlayerId: string; amount: number }
  | { type: 'SEND_OFFERS'; playerId: string; offers: Record<string, number> }
  | { type: 'ACCEPT_OFFER'; playerId: string }
  | { type: 'CHALLENGE_MUDAQASH'; playerId: string }
  | { type: 'REQUEST_BARGAIN'; playerId: string; requestedAmount: number }
  | { type: 'RESPOND_BARGAIN'; playerId: string; targetPlayerId: string; accept: boolean };
