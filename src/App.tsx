import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Analytics } from '@vercel/analytics/react';
import {
  calculateRemainingShare,
  canSelectPlayerColor,
  checkTableWinner,
  createBalootDeck,
  evaluateHand,
  getFirstAvailableColorId,
  haveAllActivePlayersDecided,
  resolveRoundPayouts,
} from './game/rules';
import {
  decideBotBidAction,
  decideBotHighBidderOffers,
  decideBotOfferResponse,
  getNextBotName,
} from './game/botLogic';
import { ClientAction, GameState, Player, PlayerColorId, RoomSettings } from './game/types';
import { BalootTable } from './components/BalootTable';
import { ActionDock } from './components/ActionDock';
import { LobbyModal } from './components/LobbyModal';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const PEER_PREFIX = 'mudaqash-room-v1-';

export default function App() {
  const [localPlayerId] = useState<string>(() => `p-${Math.random().toString(36).slice(2, 9)}`);
  const [localPlayerName, setLocalPlayerName] = useState<string>('عبدالله');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [isConnectedToRoom, setIsConnectedToRoom] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [draftOffers, setDraftOffers] = useState<Record<string, number>>({});

  const [gameState, setGameState] = useState<GameState>(() => ({
    roomCode: generateRoomCode(),
    phase: 'LOBBY',
    settings: {
      maxPlayers: 10,
      startingBalance: 2000,
      cardsPerPlayer: 4,
      winningTarget: 100000,
    },
    players: [],
    roundNumber: 1,
    startingBidderIndex: 0,
    currentTurnPlayerId: null,
    highestBid: 0,
    highBidderId: null,
    offersSent: false,
    showdownStartTime: null,
    resolutionSummary: null,
    tableWinnerId: null,
  }));

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const peerRef = useRef<Peer | null>(null);
  const clientConnectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const hostConnectionRef = useRef<DataConnection | null>(null);

  useEffect(() => {
    document.body.dataset.state =
      gameState.phase === 'LOBBY'
        ? 'title'
        : gameState.phase === 'GAME_OVER'
        ? 'gameover'
        : 'playing';
  }, [gameState.phase]);

  const broadcastState = useCallback((nextState: GameState) => {
    setGameState(nextState);
    gameStateRef.current = nextState;
    clientConnectionsRef.current.forEach((conn) => {
      if (conn.open) {
        conn.send({ type: 'SYNC_STATE', state: nextState });
      }
    });
  }, []);

  const finalizeRoundOrGameOver = useCallback(
    (baseState: GameState, updatedPlayers: Player[], summary: GameState['resolutionSummary']) => {
      const winnerId = checkTableWinner(updatedPlayers, baseState.settings.winningTarget);
      broadcastState({
        ...baseState,
        phase: winnerId ? 'GAME_OVER' : 'ROUND_RESOLUTION',
        players: updatedPlayers,
        currentTurnPlayerId: null,
        resolutionSummary: summary,
        tableWinnerId: winnerId,
      });
    },
    [broadcastState]
  );

  const startRoundOnHost = useCallback(
    (baseState: GameState, roundNum: number, startIdx: number) => {
      const playerCount = baseState.players.length;
      if (playerCount < 2) return;

      const deck = createBalootDeck(playerCount, baseState.settings.cardsPerPlayer);
      const validStartIdx = startIdx % playerCount;
      const firstPlayerId = baseState.players[validStartIdx].id;

      const dealtPlayers: Player[] = baseState.players.map((p, idx) => {
        const hand = deck.slice(
          idx * baseState.settings.cardsPerPlayer,
          (idx + 1) * baseState.settings.cardsPerPlayer
        );
        return {
          ...p,
          seatIndex: idx,
          hand,
          handEvaluation: evaluateHand(hand),
          enteredBid: 0,
          hasActedInBidding: false,
          roundStatus: idx === validStartIdx ? 'ACTIVE_BIDDING' : 'WAITING',
          currentOffer: 0,
          agreedOffer: 0,
          requestedBargain: null,
          bargainCount: 0,
          lastRoundDelta: undefined,
        };
      });

      setDraftOffers({});
      broadcastState({
        ...baseState,
        phase: 'BIDDING',
        roundNumber: roundNum,
        startingBidderIndex: validStartIdx,
        players: dealtPlayers,
        currentTurnPlayerId: firstPlayerId,
        highestBid: 0,
        highBidderId: null,
        offersSent: false,
        showdownStartTime: null,
        resolutionSummary: null,
        tableWinnerId: null,
      });
    },
    [broadcastState]
  );

  const triggerPhase3OnHost = useCallback(
    (stateAfterDecisions: GameState) => {
      const highBidderId = stateAfterDecisions.highBidderId;
      if (!highBidderId) return;

      const challengers = stateAfterDecisions.players.filter(
        (p) => p.roundStatus === 'CHALLENGED'
      );

      if (challengers.length === 0) {
        const { updatedPlayers, summary } = resolveRoundPayouts(
          stateAfterDecisions.players,
          highBidderId
        );
        finalizeRoundOrGameOver(stateAfterDecisions, updatedPlayers, summary);
      } else {
        broadcastState({
          ...stateAfterDecisions,
          phase: 'SHOWDOWN_REVEAL',
          currentTurnPlayerId: null,
          showdownStartTime: Date.now(),
        });
      }
    },
    [broadcastState, finalizeRoundOrGameOver]
  );

  const processActionOnHost = useCallback(
    (action: ClientAction) => {
      const current = gameStateRef.current;

      if (action.type === 'JOIN_ROOM') {
        if (current.phase !== 'LOBBY') return;
        if (current.players.some((p) => p.id === action.playerId)) return;
        if (current.players.length >= current.settings.maxPlayers) return;

        const assignedColor = getFirstAvailableColorId(current.players);
        const newPlayer: Player = {
          id: action.playerId,
          name: action.name.trim() || `لاعب ${current.players.length + 1}`,
          colorId: assignedColor,
          isHost: false,
          isBot: false,
          seatIndex: current.players.length,
          balance: current.settings.startingBalance,
          hand: [],
          enteredBid: 0,
          hasActedInBidding: false,
          roundStatus: 'WAITING',
          currentOffer: 0,
          agreedOffer: 0,
          requestedBargain: null,
          bargainCount: 0,
        };

        broadcastState({
          ...current,
          players: [...current.players, newPlayer],
        });
        return;
      }

      if (action.type === 'LEAVE_ROOM') {
        const filtered = current.players
          .filter((p) => p.id !== action.playerId)
          .map((p, idx) => ({ ...p, seatIndex: idx }));
        broadcastState({
          ...current,
          players: filtered,
        });
        return;
      }

      if (action.type === 'SELECT_COLOR') {
        if (current.phase !== 'LOBBY') return;
        if (!canSelectPlayerColor(current.players, action.playerId, action.colorId)) {
          return;
        }
        const updatedPlayers = current.players.map((p) =>
          p.id === action.playerId ? { ...p, colorId: action.colorId } : p
        );
        broadcastState({
          ...current,
          players: updatedPlayers,
        });
        return;
      }

      // PHASE 1: BIDDING ACTIONS
      if (action.type === 'SUBMIT_BID' || action.type === 'FOLD_OUT') {
        if (current.phase !== 'BIDDING') return;
        if (current.currentTurnPlayerId !== action.playerId) return;

        const actingIdx = current.players.findIndex((p) => p.id === action.playerId);
        if (actingIdx === -1) return;

        let newHighestBid = current.highestBid;
        let newHighBidderId = current.highBidderId;

        const updatedPlayers = current.players.map((p, idx) => {
          if (idx !== actingIdx) return p;

          if (action.type === 'FOLD_OUT') {
            return {
              ...p,
              enteredBid: 0,
              hasActedInBidding: true,
              roundStatus: 'OUT' as const,
            };
          } else {
            const maxAllowed = Math.max(0, p.balance);
            if (maxAllowed <= 0) {
              return {
                ...p,
                enteredBid: 0,
                hasActedInBidding: true,
                roundStatus: 'OUT' as const,
              };
            }

            const mustEnterAllIn = current.highestBid > 0 && maxAllowed <= current.highestBid;
            const bidAmt = mustEnterAllIn
              ? maxAllowed
              : Math.min(maxAllowed, Math.max(1, action.amount));
            const isAllIn = Boolean(action.isAllIn) || mustEnterAllIn || bidAmt === maxAllowed;

            if (bidAmt > newHighestBid || newHighBidderId === null) {
              newHighestBid = bidAmt;
              newHighBidderId = p.id;
            }
            return {
              ...p,
              enteredBid: bidAmt,
              hasActedInBidding: true,
              roundStatus: isAllIn ? ('ALL_IN' as const) : ('BID_PLACED' as const),
            };
          }
        });

        const allActed = updatedPlayers.every((p) => p.hasActedInBidding);

        if (!allActed) {
          const nextIdx = (actingIdx + 1) % updatedPlayers.length;
          const nextPlayerId = updatedPlayers[nextIdx].id;
          const nextPlayers = updatedPlayers.map((p, idx) =>
            idx === nextIdx ? { ...p, roundStatus: 'ACTIVE_BIDDING' as const } : p
          );

          broadcastState({
            ...current,
            players: nextPlayers,
            currentTurnPlayerId: nextPlayerId,
            highestBid: newHighestBid,
            highBidderId: newHighBidderId,
          });
          return;
        }

        if (!newHighBidderId) {
          const fallbackIdx = current.startingBidderIndex % updatedPlayers.length;
          newHighBidderId = updatedPlayers[fallbackIdx].id;
          const fallbackAmt = Math.min(100, Math.max(50, updatedPlayers[fallbackIdx].balance));
          newHighestBid = fallbackAmt;
          updatedPlayers[fallbackIdx] = {
            ...updatedPlayers[fallbackIdx],
            enteredBid: fallbackAmt,
            roundStatus: 'HIGH_BIDDER',
          };
        }

        const phase2Players: Player[] = updatedPlayers.map((p) => {
          if (p.id === newHighBidderId) {
            return { ...p, roundStatus: 'HIGH_BIDDER' };
          }
          if (p.roundStatus === 'OUT') {
            return p;
          }
          return {
            ...p,
            roundStatus: 'OFFER_PENDING',
            currentOffer: 0,
            agreedOffer: 0,
            requestedBargain: null,
            bargainCount: 0,
          };
        });

        const otherActive = phase2Players.filter(
          (p) => p.id !== newHighBidderId && p.roundStatus !== 'OUT'
        );

        if (otherActive.length === 0) {
          const { updatedPlayers: resolvedPlayers, summary } = resolveRoundPayouts(
            phase2Players,
            newHighBidderId
          );
          finalizeRoundOrGameOver(
            {
              ...current,
              highestBid: newHighestBid,
              highBidderId: newHighBidderId,
            },
            resolvedPlayers,
            summary
          );
          return;
        }

        broadcastState({
          ...current,
          phase: 'OFFERS_AND_BARGAINING',
          players: phase2Players,
          currentTurnPlayerId: newHighBidderId,
          highestBid: newHighestBid,
          highBidderId: newHighBidderId,
          offersSent: false,
        });
        return;
      }

      if (action.type === 'UPDATE_DRAFT_OFFER') {
        if (current.phase !== 'OFFERS_AND_BARGAINING') return;
        if (current.highBidderId !== action.playerId) return;

        const updatedPlayers = current.players.map((p) =>
          p.id === action.targetPlayerId
            ? { ...p, currentOffer: Math.max(0, action.amount) }
            : p
        );

        broadcastState({
          ...current,
          players: updatedPlayers,
        });
        return;
      }

      if (action.type === 'SEND_OFFERS') {
        if (current.phase !== 'OFFERS_AND_BARGAINING') return;
        if (current.highBidderId !== action.playerId) return;

        const updatedPlayers = current.players.map((p) => {
          if (p.id === current.highBidderId || p.roundStatus === 'OUT') return p;
          const offeredAmt = Math.max(0, action.offers[p.id] ?? p.currentOffer ?? 0);
          return {
            ...p,
            currentOffer: offeredAmt,
            roundStatus: 'OFFER_PENDING' as const,
          };
        });

        broadcastState({
          ...current,
          players: updatedPlayers,
          offersSent: true,
          currentTurnPlayerId: null,
        });
        return;
      }

      if (action.type === 'ACCEPT_OFFER') {
        if (current.phase !== 'OFFERS_AND_BARGAINING' || !current.offersSent) return;

        const updatedPlayers = current.players.map((p) =>
          p.id === action.playerId
            ? {
                ...p,
                roundStatus: 'ACCEPTED' as const,
                agreedOffer: p.currentOffer,
                requestedBargain: null,
              }
            : p
        );

        const nextState: GameState = {
          ...current,
          players: updatedPlayers,
        };

        if (
          current.highBidderId &&
          haveAllActivePlayersDecided(updatedPlayers, current.highBidderId)
        ) {
          triggerPhase3OnHost(nextState);
        } else {
          broadcastState(nextState);
        }
        return;
      }

      if (action.type === 'CHALLENGE_MUDAQASH') {
        if (current.phase !== 'OFFERS_AND_BARGAINING' || !current.offersSent) return;

        const updatedPlayers = current.players.map((p) =>
          p.id === action.playerId
            ? {
                ...p,
                roundStatus: 'CHALLENGED' as const,
                agreedOffer: 0,
                requestedBargain: null,
              }
            : p
        );

        const nextState: GameState = {
          ...current,
          players: updatedPlayers,
        };

        if (
          current.highBidderId &&
          haveAllActivePlayersDecided(updatedPlayers, current.highBidderId)
        ) {
          triggerPhase3OnHost(nextState);
        } else {
          broadcastState(nextState);
        }
        return;
      }

      if (action.type === 'REQUEST_BARGAIN') {
        if (current.phase !== 'OFFERS_AND_BARGAINING' || !current.offersSent) return;

        const targetPlayer = current.players.find((p) => p.id === action.playerId);
        if (!targetPlayer || targetPlayer.bargainCount >= 2) return;

        const updatedPlayers = current.players.map((p) =>
          p.id === action.playerId
            ? {
                ...p,
                roundStatus: 'BARGAINING' as const,
                requestedBargain: Math.max(p.currentOffer + 50, action.requestedAmount),
                bargainCount: p.bargainCount + 1,
              }
            : p
        );

        broadcastState({
          ...current,
          players: updatedPlayers,
        });
        return;
      }

      if (action.type === 'RESPOND_BARGAIN') {
        if (current.phase !== 'OFFERS_AND_BARGAINING') return;
        if (current.highBidderId !== action.playerId) return;

        const updatedPlayers = current.players.map((p) => {
          if (p.id !== action.targetPlayerId) return p;
          if (action.accept && p.requestedBargain !== null) {
            return {
              ...p,
              currentOffer: p.requestedBargain,
              agreedOffer: p.requestedBargain,
              roundStatus: 'ACCEPTED' as const,
              requestedBargain: null,
            };
          } else {
            return {
              ...p,
              roundStatus: 'OFFER_PENDING' as const,
              requestedBargain: null,
            };
          }
        });

        const nextState: GameState = {
          ...current,
          players: updatedPlayers,
        };

        if (
          current.highBidderId &&
          haveAllActivePlayersDecided(updatedPlayers, current.highBidderId)
        ) {
          triggerPhase3OnHost(nextState);
        } else {
          broadcastState(nextState);
        }
        return;
      }
    },
    [broadcastState, finalizeRoundOrGameOver, triggerPhase3OnHost]
  );

  const dispatchAction = useCallback(
    (action: ClientAction) => {
      if (isHost) {
        processActionOnHost(action);
      } else if (hostConnectionRef.current && hostConnectionRef.current.open) {
        hostConnectionRef.current.send({ type: 'CLIENT_ACTION', action });
      }
    },
    [isHost, processActionOnHost]
  );

  useEffect(() => {
    if (!isHost || gameState.phase !== 'SHOWDOWN_REVEAL' || !gameState.highBidderId) {
      return;
    }

    const timer = setTimeout(() => {
      const latest = gameStateRef.current;
      if (latest.phase === 'SHOWDOWN_REVEAL' && latest.highBidderId) {
        const { updatedPlayers, summary } = resolveRoundPayouts(
          latest.players,
          latest.highBidderId
        );
        finalizeRoundOrGameOver(latest, updatedPlayers, summary);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isHost, gameState.phase, gameState.highBidderId, finalizeRoundOrGameOver]);

  // AI Bot Automation Loop on Host
  useEffect(() => {
    if (!isHost) return;

    if (gameState.phase === 'BIDDING' && gameState.currentTurnPlayerId) {
      const currentBidder = gameState.players.find(
        (p) => p.id === gameState.currentTurnPlayerId
      );
      if (currentBidder && currentBidder.isBot) {
        const timer = setTimeout(() => {
          const decision = decideBotBidAction(currentBidder, gameStateRef.current);
          if (decision.action === 'FOLD') {
            processActionOnHost({ type: 'FOLD_OUT', playerId: currentBidder.id });
          } else {
            processActionOnHost({
              type: 'SUBMIT_BID',
              playerId: currentBidder.id,
              amount: decision.amount,
              isAllIn: decision.isAllIn,
            });
          }
        }, 650);
        return () => clearTimeout(timer);
      }
    }

    if (gameState.phase === 'OFFERS_AND_BARGAINING' && gameState.highBidderId) {
      const highBidder = gameState.players.find((p) => p.id === gameState.highBidderId);

      if (highBidder && highBidder.isBot && !gameState.offersSent) {
        const timer = setTimeout(() => {
          const botOffers = decideBotHighBidderOffers(highBidder, gameStateRef.current);
          processActionOnHost({
            type: 'SEND_OFFERS',
            playerId: highBidder.id,
            offers: botOffers,
          });
        }, 900);
        return () => clearTimeout(timer);
      }

      if (highBidder && highBidder.isBot && gameState.offersSent) {
        const bargainingPlayer = gameState.players.find(
          (p) => p.roundStatus === 'BARGAINING' && p.requestedBargain !== null
        );
        if (bargainingPlayer) {
          const timer = setTimeout(() => {
            const reqAmt = bargainingPlayer.requestedBargain || 0;
            const accept = reqAmt <= highBidder.enteredBid * 0.35;
            processActionOnHost({
              type: 'RESPOND_BARGAIN',
              playerId: highBidder.id,
              targetPlayerId: bargainingPlayer.id,
              accept,
            });
          }, 800);
          return () => clearTimeout(timer);
        }
      }

      if (gameState.offersSent) {
        const pendingBot = gameState.players.find(
          (p) =>
            p.isBot &&
            p.id !== gameState.highBidderId &&
            p.roundStatus === 'OFFER_PENDING'
        );
        if (pendingBot) {
          const timer = setTimeout(() => {
            const resp = decideBotOfferResponse(pendingBot, gameStateRef.current);
            if (resp.decision === 'ACCEPT') {
              processActionOnHost({ type: 'ACCEPT_OFFER', playerId: pendingBot.id });
            } else if (resp.decision === 'CHALLENGE') {
              processActionOnHost({ type: 'CHALLENGE_MUDAQASH', playerId: pendingBot.id });
            } else if (resp.decision === 'BARGAIN' && resp.requestedAmount) {
              processActionOnHost({
                type: 'REQUEST_BARGAIN',
                playerId: pendingBot.id,
                requestedAmount: resp.requestedAmount,
              });
            }
          }, 750);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [
    isHost,
    gameState.phase,
    gameState.currentTurnPlayerId,
    gameState.highBidderId,
    gameState.offersSent,
    gameState.players,
    processActionOnHost,
  ]);

  const handleCreateRoom = useCallback(() => {
    const code = generateRoomCode();
    const hostPlayer: Player = {
      id: localPlayerId,
      name: localPlayerName.trim() || 'مضيف الغرفة',
      colorId: 'emerald',
      isHost: true,
      isBot: false,
      seatIndex: 0,
      balance: gameStateRef.current.settings.startingBalance,
      hand: [],
      enteredBid: 0,
      hasActedInBidding: false,
      roundStatus: 'WAITING',
      currentOffer: 0,
      agreedOffer: 0,
      requestedBargain: null,
      bargainCount: 0,
    };

    const initialState: GameState = {
      ...gameStateRef.current,
      roomCode: code,
      phase: 'LOBBY',
      players: [hostPlayer],
      tableWinnerId: null,
    };

    setIsHost(true);
    setIsConnectedToRoom(true);
    setConnectionError(null);
    setGameState(initialState);
    gameStateRef.current = initialState;

    try {
      peerRef.current?.destroy();
      const peer = new Peer(`${PEER_PREFIX}${code}`);
      peerRef.current = peer;

      peer.on('connection', (conn) => {
        clientConnectionsRef.current.set(conn.peer, conn);
        conn.on('data', (raw: unknown) => {
          const msg = raw as { type?: string; action?: ClientAction };
          if (msg && msg.type === 'CLIENT_ACTION' && msg.action) {
            processActionOnHost(msg.action);
          }
        });
        conn.on('open', () => {
          conn.send({ type: 'SYNC_STATE', state: gameStateRef.current });
        });
        conn.on('close', () => {
          clientConnectionsRef.current.delete(conn.peer);
        });
      });
    } catch {
      // Offline / local fallback
    }
  }, [localPlayerId, localPlayerName, processActionOnHost]);

  const handleJoinRoom = useCallback(() => {
    const targetCode = joinCodeInput.trim().toUpperCase();
    if (targetCode.length < 4) return;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      peerRef.current?.destroy();
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', () => {
        const conn = peer.connect(`${PEER_PREFIX}${targetCode}`, { reliable: true });
        hostConnectionRef.current = conn;

        conn.on('open', () => {
          setIsConnecting(false);
          setIsHost(false);
          setIsConnectedToRoom(true);
          conn.send({
            type: 'CLIENT_ACTION',
            action: {
              type: 'JOIN_ROOM',
              playerId: localPlayerId,
              name: localPlayerName.trim() || 'لاعب',
            },
          });
        });

        conn.on('data', (raw: unknown) => {
          const msg = raw as { type?: string; state?: GameState };
          if (msg && msg.type === 'SYNC_STATE' && msg.state) {
            setGameState(msg.state);
            gameStateRef.current = msg.state;
          }
        });

        conn.on('error', () => {
          setIsConnecting(false);
          setConnectionError('تعذر الاتصال بالغرفة. تأكد من صحة الكود.');
        });
      });

      peer.on('error', () => {
        setIsConnecting(false);
        setConnectionError('تعذر العثور على الغرفة بهذا الكود.');
      });
    } catch {
      setIsConnecting(false);
      setConnectionError('حدث خطأ أثناء الاتصال بشبكة الغرفة.');
    }
  }, [joinCodeInput, localPlayerId, localPlayerName]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && !isConnectedToRoom) {
      const code = generateRoomCode();
      const startBal = 2000;
      const initialPlayers: Player[] = [
        {
          id: localPlayerId,
          name: 'عبدالله',
          colorId: 'emerald',
          isHost: true,
          isBot: false,
          seatIndex: 0,
          balance: startBal,
          hand: [],
          enteredBid: 0,
          hasActedInBidding: false,
          roundStatus: 'WAITING',
          currentOffer: 0,
          agreedOffer: 0,
          requestedBargain: null,
          bargainCount: 0,
        },
        {
          id: 'bot-1',
          name: 'سلطان',
          colorId: 'amber',
          isHost: false,
          isBot: true,
          seatIndex: 1,
          balance: startBal,
          hand: [],
          enteredBid: 0,
          hasActedInBidding: false,
          roundStatus: 'WAITING',
          currentOffer: 0,
          agreedOffer: 0,
          requestedBargain: null,
          bargainCount: 0,
        },
        {
          id: 'bot-2',
          name: 'فهد',
          colorId: 'ruby',
          isHost: false,
          isBot: true,
          seatIndex: 2,
          balance: startBal,
          hand: [],
          enteredBid: 0,
          hasActedInBidding: false,
          roundStatus: 'WAITING',
          currentOffer: 0,
          agreedOffer: 0,
          requestedBargain: null,
          bargainCount: 0,
        },
        {
          id: 'bot-3',
          name: 'راشد',
          colorId: 'sapphire',
          isHost: false,
          isBot: true,
          seatIndex: 3,
          balance: startBal,
          hand: [],
          enteredBid: 0,
          hasActedInBidding: false,
          roundStatus: 'WAITING',
          currentOffer: 0,
          agreedOffer: 0,
          requestedBargain: null,
          bargainCount: 0,
        },
      ];

      setIsHost(true);
      setIsConnectedToRoom(true);
      const base: GameState = {
        ...gameStateRef.current,
        roomCode: code,
        players: initialPlayers,
      };
      startRoundOnHost(base, 1, 0);
    }
  }, [isConnectedToRoom, localPlayerId, startRoundOnHost]);

  const handleUpdateSettings = (partial: Partial<RoomSettings>) => {
    const nextSettings = { ...gameState.settings, ...partial };
    const updatedPlayers =
      partial.startingBalance !== undefined
        ? gameState.players.map((p) => ({ ...p, balance: partial.startingBalance! }))
        : gameState.players;

    if (isConnectedToRoom && isHost) {
      broadcastState({
        ...gameState,
        settings: nextSettings,
        players: updatedPlayers,
      });
    } else if (!isConnectedToRoom) {
      setGameState((prev) => ({
        ...prev,
        settings: nextSettings,
      }));
    }
  };

  const handleSelectColor = (colorId: PlayerColorId) => {
    dispatchAction({
      type: 'SELECT_COLOR',
      playerId: localPlayerId,
      colorId,
    });
  };

  const handleAddBot = () => {
    if (!isHost || gameState.players.length >= gameState.settings.maxPlayers) return;
    const botName = getNextBotName(gameState.players);
    const botColor = getFirstAvailableColorId(gameState.players);
    const newBot: Player = {
      id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: botName,
      colorId: botColor,
      isHost: false,
      isBot: true,
      seatIndex: gameState.players.length,
      balance: gameState.settings.startingBalance,
      hand: [],
      enteredBid: 0,
      hasActedInBidding: false,
      roundStatus: 'WAITING',
      currentOffer: 0,
      agreedOffer: 0,
      requestedBargain: null,
      bargainCount: 0,
    };

    broadcastState({
      ...gameState,
      players: [...gameState.players, newBot],
    });
  };

  const handleRemoveBot = (botId: string) => {
    if (!isHost) return;
    const filtered = gameState.players
      .filter((p) => p.id !== botId)
      .map((p, idx) => ({ ...p, seatIndex: idx }));
    broadcastState({
      ...gameState,
      players: filtered,
    });
  };

  const handleStartMatch = () => {
    if (!isHost || gameState.players.length < 2) return;
    startRoundOnHost(gameState, 1, 0);
  };

  const handleNextRound = () => {
    if (!isHost) return;
    const nextRound = gameState.roundNumber + 1;
    const nextStarter = (gameState.startingBidderIndex + 1) % gameState.players.length;
    startRoundOnHost(gameState, nextRound, nextStarter);
  };

  const handleResetBalances = () => {
    if (!isHost) return;
    const resetPlayers = gameState.players.map((p) => ({
      ...p,
      balance: gameState.settings.startingBalance,
    }));
    broadcastState({
      ...gameState,
      players: resetPlayers,
    });
  };

  const handleRestartTableAfterWin = () => {
    if (!isHost) return;
    const resetPlayers = gameState.players.map((p) => ({
      ...p,
      balance: gameState.settings.startingBalance,
      enteredBid: 0,
      hasActedInBidding: false,
      roundStatus: 'WAITING' as const,
      currentOffer: 0,
      agreedOffer: 0,
      requestedBargain: null,
      bargainCount: 0,
      lastRoundDelta: undefined,
    }));
    broadcastState({
      ...gameState,
      phase: 'LOBBY',
      roundNumber: 1,
      players: resetPlayers,
      tableWinnerId: null,
      resolutionSummary: null,
    });
  };

  const handleLeaveRoom = useCallback(() => {
    if (!isHost && hostConnectionRef.current && hostConnectionRef.current.open) {
      hostConnectionRef.current.send({
        type: 'CLIENT_ACTION',
        action: { type: 'LEAVE_ROOM', playerId: localPlayerId },
      });
    }
    clientConnectionsRef.current.forEach((conn) => conn.close());
    clientConnectionsRef.current.clear();
    hostConnectionRef.current?.close();
    hostConnectionRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;

    setIsHost(false);
    setIsConnectedToRoom(false);
    setIsConnecting(false);
    setConnectionError(null);
    setDraftOffers({});

    const freshState: GameState = {
      roomCode: generateRoomCode(),
      phase: 'LOBBY',
      settings: gameStateRef.current.settings,
      players: [],
      roundNumber: 1,
      startingBidderIndex: 0,
      currentTurnPlayerId: null,
      highestBid: 0,
      highBidderId: null,
      offersSent: false,
      showdownStartTime: null,
      resolutionSummary: null,
      tableWinnerId: null,
    };
    setGameState(freshState);
    gameStateRef.current = freshState;
  }, [isHost, localPlayerId]);

  const handleAdjustDraftOffer = (targetPlayerId: string, newAmount: number) => {
    const cleanAmt = Math.max(0, newAmount);
    setDraftOffers((prev) => ({
      ...prev,
      [targetPlayerId]: cleanAmt,
    }));
    dispatchAction({
      type: 'UPDATE_DRAFT_OFFER',
      playerId: localPlayerId,
      targetPlayerId,
      amount: cleanAmt,
    });
  };

  const handleSendOffers = () => {
    const finalOffers: Record<string, number> = {};
    for (const p of gameState.players) {
      if (p.id !== localPlayerId && p.roundStatus !== 'OUT') {
        finalOffers[p.id] = draftOffers[p.id] ?? p.currentOffer ?? 0;
      }
    }
    dispatchAction({
      type: 'SEND_OFFERS',
      playerId: localPlayerId,
      offers: finalOffers,
    });
  };

  const localPlayer =
    gameState.players.find((p) => p.id === localPlayerId) || gameState.players[0];

  const highBidder = gameState.players.find((p) => p.id === gameState.highBidderId);

  const playersWithDraftOffers = gameState.players.map((p) => ({
    id: p.id,
    roundStatus: p.roundStatus,
    currentOffer: !gameState.offersSent
      ? draftOffers[p.id] ?? p.currentOffer ?? 0
      : p.roundStatus === 'ACCEPTED'
      ? p.agreedOffer
      : p.currentOffer,
  }));

  const remainingShare = highBidder
    ? calculateRemainingShare(
        highBidder.enteredBid,
        playersWithDraftOffers,
        highBidder.id
      )
    : 0;

  return (
    <main className="w-screen h-screen overflow-hidden bg-[#0B0F17] relative">
      <BalootTable
        gameState={gameState}
        localPlayerId={localPlayerId}
        draftOffers={draftOffers}
        remainingShare={remainingShare}
        onAdjustDraftOffer={handleAdjustDraftOffer}
        onRespondBargain={(targetPlayerId, accept) =>
          dispatchAction({
            type: 'RESPOND_BARGAIN',
            playerId: localPlayerId,
            targetPlayerId,
            accept,
          })
        }
        onNextRound={handleNextRound}
        onResetBalances={handleResetBalances}
        onRestartTableAfterWin={handleRestartTableAfterWin}
        onLeaveRoom={handleLeaveRoom}
      />

      {localPlayer && gameState.phase !== 'LOBBY' && gameState.phase !== 'GAME_OVER' && (
        <ActionDock
          gameState={gameState}
          localPlayer={localPlayer}
          isMyTurnToBid={
            gameState.phase === 'BIDDING' &&
            gameState.currentTurnPlayerId === localPlayer.id
          }
          isHighBidder={gameState.highBidderId === localPlayer.id}
          remainingShare={remainingShare}
          onFoldOut={() =>
            dispatchAction({ type: 'FOLD_OUT', playerId: localPlayer.id })
          }
          onSubmitBid={(amount, isAllIn) =>
            dispatchAction({
              type: 'SUBMIT_BID',
              playerId: localPlayer.id,
              amount,
              isAllIn,
            })
          }
          onSendOffers={handleSendOffers}
          onAcceptOffer={() =>
            dispatchAction({ type: 'ACCEPT_OFFER', playerId: localPlayer.id })
          }
          onChallengeMudaqash={() =>
            dispatchAction({ type: 'CHALLENGE_MUDAQASH', playerId: localPlayer.id })
          }
          onRequestBargain={(requestedAmount) =>
            dispatchAction({
              type: 'REQUEST_BARGAIN',
              playerId: localPlayer.id,
              requestedAmount,
            })
          }
        />
      )}

      {gameState.phase === 'LOBBY' && (
        <LobbyModal
          gameState={gameState}
          localPlayerId={localPlayerId}
          localPlayerName={localPlayerName}
          onChangePlayerName={setLocalPlayerName}
          isConnectedToRoom={isConnectedToRoom}
          isHost={isHost}
          joinCodeInput={joinCodeInput}
          onChangeJoinCodeInput={setJoinCodeInput}
          connectionError={connectionError}
          isConnecting={isConnecting}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={handleLeaveRoom}
          onUpdateSettings={handleUpdateSettings}
          onSelectColor={handleSelectColor}
          onAddBot={handleAddBot}
          onRemoveBot={handleRemoveBot}
          onStartMatch={handleStartMatch}
        />
      )}
      <Analytics />
    </main>
  );
}
