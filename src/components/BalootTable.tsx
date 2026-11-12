import React from 'react';
import { Crown, Flame, ArrowLeft, Coins, Trophy, RotateCcw, LogOut } from 'lucide-react';
import { evaluateHand, getPlayerColorOption } from '../game/rules';
import { GameState } from '../game/types';
import { PlayerSeat } from './PlayerSeat';
import { PlayingCard } from './PlayingCard';

interface BalootTableProps {
  gameState: GameState;
  localPlayerId: string;
  draftOffers: Record<string, number>;
  remainingShare: number;
  onAdjustDraftOffer: (targetPlayerId: string, newAmount: number) => void;
  onRespondBargain: (targetPlayerId: string, accept: boolean) => void;
  onNextRound: () => void;
  onResetBalances: () => void;
  onRestartTableAfterWin: () => void;
  onLeaveRoom: () => void;
}

function getSeatPerimeterPosition(
  relativeIndex: number,
  totalPlayers: number
): React.CSSProperties {
  const angle = Math.PI / 2 + (relativeIndex / Math.max(1, totalPlayers)) * 2 * Math.PI;

  const rx = 40;
  const ry = 29;
  const centerX = 50;
  const centerY = 46;

  const left = centerX + rx * Math.cos(angle);
  const top = centerY + ry * Math.sin(angle);

  return {
    left: `${left.toFixed(2)}%`,
    top: `${top.toFixed(2)}%`,
  };
}

export const BalootTable: React.FC<BalootTableProps> = ({
  gameState,
  localPlayerId,
  draftOffers,
  remainingShare,
  onAdjustDraftOffer,
  onRespondBargain,
  onNextRound,
  onResetBalances,
  onRestartTableAfterWin,
  onLeaveRoom,
}) => {
  const players = gameState.players;
  const localIdx = Math.max(
    0,
    players.findIndex((p) => p.id === localPlayerId)
  );
  const localPlayer = players[localIdx];
  const isHost = localPlayer?.isHost ?? false;
  const localPlayerIsHighBidder = gameState.highBidderId === localPlayerId;
  const highBidder = players.find((p) => p.id === gameState.highBidderId);
  const tableWinner = players.find((p) => p.id === gameState.tableWinnerId);

  const challengers = players.filter((p) => p.roundStatus === 'CHALLENGED');
  const acceptors = players.filter((p) => p.roundStatus === 'ACCEPTED');

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0B0F17] select-none">
      {/* Top Perimeter Status Strip */}
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-6xl flex items-center justify-between bg-[#111827] border border-[#334155] rounded-xl px-4 py-1.5 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-sm text-[#F8FAFC]">مداقش</span>
          <span className="text-[#475569]">·</span>
          <span className="text-xs text-[#94A3B8]">
            كود الغرفة:{' '}
            <strong className="font-mono-num text-[#F59E0B]">{gameState.roomCode}</strong>
          </span>
          <span className="text-[#475569]">·</span>
          <span className="text-xs text-[#94A3B8]">
            الجولة: <strong className="font-mono-num text-[#F8FAFC]">{gameState.roundNumber}</strong>
          </span>
          <span className="text-[#475569]">·</span>
          <span className="text-xs text-[#94A3B8] flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>حد الفوز:</span>
            <strong className="font-mono-num text-[#10B981]">
              {gameState.settings.winningTarget.toLocaleString('en-US')}
            </strong>
          </span>
        </div>

        {/* Phase Indicator */}
        <div className="flex items-center gap-2 text-xs font-bold">
          {gameState.phase === 'BIDDING' && (
            <span className="text-[#F59E0B]">المرحلة 1: دائرة المزايدة</span>
          )}
          {gameState.phase === 'OFFERS_AND_BARGAINING' && (
            <span className="text-[#10B981]">المرحلة 2: العروض والمكاسرة والمداقشة</span>
          )}
          {gameState.phase === 'SHOWDOWN_REVEAL' && (
            <span className="text-[#EF4444]">المرحلة 3: كشف الكروت وحسم المداقشة (3 ثوانٍ)</span>
          )}
          {gameState.phase === 'ROUND_RESOLUTION' && (
            <span className="text-[#38BDF8]">المرحلة 3: نتيجة الجولة وتوزيع الفلوس</span>
          )}
          {gameState.phase === 'GAME_OVER' && (
            <span className="text-[#F59E0B]">انتهت الطاولة — تم الوصول لحد الفوز!</span>
          )}
        </div>

        {/* Host Rebuy / Reset Balances Utility + Leave Room Button */}
        <div className="flex items-center gap-2">
          {isHost && gameState.phase !== 'LOBBY' && (
            <button
              type="button"
              onClick={onResetBalances}
              className="px-2.5 py-1 bg-[#1E293B] hover:bg-[#334155] border border-[#475569] rounded-lg text-xs font-bold text-[#CBD5E1] flex items-center gap-1.5 cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>إعادة ضبط الأرصدة ({gameState.settings.startingBalance})</span>
            </button>
          )}
          {gameState.phase !== 'LOBBY' && (
            <button
              type="button"
              onClick={onLeaveRoom}
              className="px-2.5 py-1 bg-[#7F1D1D] hover:bg-[#991B1B] border border-[#EF4444] rounded-lg text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج من الغرفة</span>
            </button>
          )}
        </div>
      </div>

      {/* Center Royal Baloot Felt Table */}
      <div
        style={{ left: '50%', top: '46%' }}
        className="absolute -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[48vh] max-w-[980px] max-h-[470px] rounded-[220px] bg-[#0B462C] border-[14px] border-[#3E2723] shadow-2xl flex flex-col items-center justify-center p-6 z-10"
      >
        <div className="w-full h-full rounded-[200px] border-2 border-[#D97706]/50 flex flex-col items-center justify-center p-6 relative">
          {/* PHASE 1: BIDDING FELT CENTER */}
          {gameState.phase === 'BIDDING' && (
            <div className="flex flex-col items-center text-center max-w-md">
              <span className="text-xs font-bold text-[#A7F3D0] mb-1">
                أرضية مفتوحة — دائرة المزايدة الواحدة
              </span>
              <div className="bg-[#072E1D] border-2 border-[#D97706] rounded-2xl px-6 py-4 shadow-xl mb-3">
                <div className="text-xs text-[#CBD5E1] mb-1">أعلى مزايدة حالية على الطاولة</div>
                <div
                  data-testid="table-highest-bid"
                  className="font-mono-num font-extrabold text-3xl text-[#F59E0B]"
                >
                  {gameState.highestBid.toLocaleString('en-US')}
                </div>
                {highBidder && (
                  <div className="text-xs text-[#FDE68A] mt-1 font-bold">
                    بواسطة: {highBidder.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PHASE 2: OFFERS & BARGAINING FELT CENTER */}
          {gameState.phase === 'OFFERS_AND_BARGAINING' && highBidder && (
            <div className="flex flex-col items-center text-center max-w-lg">
              <div className="flex items-center gap-2 text-sm font-bold text-[#FDE68A] mb-2">
                <Crown className="w-4 h-4 text-[#F59E0B]" />
                <span>راعي المزايدة: {highBidder.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-[#072E1D] border-2 border-[#D97706] rounded-2xl px-6 py-3 shadow-xl">
                <div>
                  <div className="text-xs text-[#94A3B8]">إجمالي المزايدة (Pool)</div>
                  <div className="font-mono-num font-extrabold text-2xl text-[#F8FAFC]">
                    {highBidder.enteredBid.toLocaleString('en-US')}
                  </div>
                </div>
                <div className="border-r border-[#14532D] pr-4">
                  <div className="text-xs text-[#A7F3D0]">صافي نصيب راعي المزايدة</div>
                  <div className="font-mono-num font-extrabold text-2xl text-[#10B981]">
                    {remainingShare.toLocaleString('en-US')}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs font-bold text-[#E2E8F0]">
                {!gameState.offersSent
                  ? localPlayerIsHighBidder
                    ? 'حدد المبالغ المعروضة لكل لاعب حول الطاولة ثم اضغط "إرسال العروض"'
                    : `يقوم راعي المزايدة (${highBidder.name}) بتوزيع العروض الآن...`
                  : 'تم إرسال العروض! على كل لاعب اختيار: قبول أو مداقش أو مكاسرة (بحد أقصى مرتين)'}
              </div>
            </div>
          )}

          {/* PHASE 3A: 3-SECOND SUSPENSE SHOWDOWN REVEAL */}
          {gameState.phase === 'SHOWDOWN_REVEAL' && highBidder && (
            <div className="w-full flex flex-col items-center justify-center">
              <div className="text-sm font-extrabold text-[#FDE68A] mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#EF4444]" />
                <span>كشف الكروت بأرض الطاولة — جاري حسم المداقشة...</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                {[highBidder, ...challengers].map((participant) => {
                  const evalHand = evaluateHand(participant.hand);
                  const isHB = participant.id === highBidder.id;
                  return (
                    <div
                      key={participant.id}
                      className="bg-[#072E1D] border-2 border-[#F59E0B] rounded-xl p-3 flex flex-col items-center shadow-xl"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#F8FAFC] mb-1">
                        {isHB ? (
                          <Crown className="w-3.5 h-3.5 text-[#F59E0B]" />
                        ) : (
                          <Flame className="w-3.5 h-3.5 text-[#EF4444]" />
                        )}
                        <span>
                          {participant.name} ({isHB ? 'راعي المزايدة' : 'مداقش'})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 my-1">
                        {participant.hand.map((c) => (
                          <PlayingCard key={c.id} card={c} size="sm" />
                        ))}
                      </div>
                      <div className="text-xs font-bold text-[#FBBF24] mt-1">
                        {evalHand.descriptionArabic}
                      </div>
                    </div>
                  );
                })}
              </div>

              {acceptors.length > 0 && (
                <div className="mt-2 text-xs text-[#A7F3D0]">
                  اللاعبون القابلون ({acceptors.map((a) => a.name).join('، ')}) وضعوا كروتهم مقلوبة جانباً بانتظار النتيجة
                </div>
              )}
            </div>
          )}

          {/* PHASE 3B: FINAL RESOLUTION & PAYOUT SUMMARY */}
          {gameState.phase === 'ROUND_RESOLUTION' && gameState.resolutionSummary && (
            <div className="w-full max-w-2xl bg-[#072E1D] border-2 border-[#D97706] rounded-2xl p-4 shadow-2xl flex flex-col items-center text-center">
              <h2
                data-testid="resolution-headline"
                className="text-lg font-extrabold text-[#FDE68A] mb-1"
              >
                {gameState.resolutionSummary.headlineArabic}
              </h2>
              <p className="text-xs text-[#E2E8F0] mb-3 max-w-xl">
                {gameState.resolutionSummary.sublineArabic}
              </p>

              {gameState.resolutionSummary.branch === 'ALL_ACCEPTED' ? (
                <div className="flex items-center justify-center gap-2 my-2">
                  {[0, 1, 2, 3].map((n) => (
                    <PlayingCard key={n} faceDown size="sm" />
                  ))}
                  <span className="text-xs font-bold text-[#A7F3D0] mr-2">
                    أُلقي الورق مقلوباً بدون كشف
                  </span>
                </div>
              ) : (
                highBidder && (
                  <div className="flex flex-wrap items-center justify-center gap-3 my-2">
                    {[highBidder, ...challengers].map((participant) => {
                      const evalHand = evaluateHand(participant.hand);
                      const isWinner = gameState.resolutionSummary?.winnerIds.includes(
                        participant.id
                      );
                      return (
                        <div
                          key={participant.id}
                          className={`px-3 py-2 rounded-xl border ${
                            isWinner
                              ? 'bg-[#064E3B] border-[#10B981]'
                              : 'bg-[#0F172A] border-[#334155]'
                          } flex flex-col items-center`}
                        >
                          <div className="text-xs font-bold text-[#F8FAFC] mb-1">
                            {participant.name} —{' '}
                            <span className="text-[#F59E0B]">{evalHand.descriptionArabic}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {participant.hand.map((c) => (
                              <PlayingCard key={c.id} card={c} size="sm" />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              <div className="mt-3 pt-2 border-t border-[#14532D] w-full flex items-center justify-center">
                {isHost ? (
                  <button
                    type="button"
                    data-testid="next-round-btn"
                    onClick={onNextRound}
                    className="px-6 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-sm rounded-xl flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <span>الجولة التالية</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-xs font-bold text-[#FDE68A]">
                    بانتظار مضيف الغرفة لبدء الجولة التالية...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* GAME OVER: TABLE WINNER REACHED TARGET */}
          {gameState.phase === 'GAME_OVER' && tableWinner && (
            <div
              style={{
                borderColor: getPlayerColorOption(tableWinner.colorId).borderHex,
              }}
              className="w-full max-w-xl bg-[#072E1D] border-4 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#78350F] border-2 border-[#F59E0B] flex items-center justify-center mb-2">
                <Trophy className="w-6 h-6 text-[#FDE68A]" />
              </div>
              <h2 className="text-2xl font-extrabold text-[#FDE68A] mb-1">
                انتهت الطاولة — الفائز النهائي: {tableWinner.name}!
              </h2>
              <p className="text-xs text-[#E2E8F0] mb-4">
                وصل {tableWinner.name} إلى رصيد{' '}
                <strong className="font-mono-num text-[#10B981]">
                  {tableWinner.balance.toLocaleString('en-US')}
                </strong>{' '}
                وتجاوز حد الفوز المحدد للطاولة (
                <span className="font-mono-num">
                  {gameState.settings.winningTarget.toLocaleString('en-US')}
                </span>
                ).
              </p>

              {isHost ? (
                <button
                  type="button"
                  data-start="true"
                  onClick={onRestartTableAfterWin}
                  className="px-6 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm rounded-xl flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>العودة لإعدادات الغرفة وبدء طاولة جديدة</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-[#FDE68A]">
                  بانتظار مضيف الغرفة لبدء طاولة جديدة...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Symmetrical Perimeter Seats (Up to 10 Players) */}
      {players.map((player, index) => {
        const relativeIdx = (index - localIdx + players.length) % players.length;
        const posStyle = getSeatPerimeterPosition(relativeIdx, players.length);
        const isCurrentTurn =
          gameState.phase === 'BIDDING' && gameState.currentTurnPlayerId === player.id;
        const isHighBidder = gameState.highBidderId === player.id;

        return (
          <PlayerSeat
            key={player.id}
            player={player}
            isLocalPlayer={player.id === localPlayerId}
            isCurrentTurn={isCurrentTurn}
            isHighBidder={isHighBidder}
            localPlayerIsHighBidder={localPlayerIsHighBidder}
            phase={gameState.phase}
            offersSent={gameState.offersSent}
            draftOfferAmount={draftOffers[player.id] ?? player.currentOffer ?? 0}
            onAdjustDraftOffer={onAdjustDraftOffer}
            onRespondBargain={onRespondBargain}
            seatStyle={posStyle}
          />
        );
      })}
    </div>
  );
};
