import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Flame,
  Handshake,
  Scale,
  Send,
  AlertTriangle,
  ArrowLeftRight,
  Ban,
} from 'lucide-react';
import { evaluateHand, getBiddingCapabilities } from '../game/rules';
import { GameState, Player } from '../game/types';
import { PlayingCard } from './PlayingCard';

interface ActionDockProps {
  gameState: GameState;
  localPlayer: Player;
  isMyTurnToBid: boolean;
  isHighBidder: boolean;
  remainingShare: number;
  onFoldOut: () => void;
  onSubmitBid: (amount: number, isAllIn: boolean) => void;
  onSendOffers: () => void;
  onAcceptOffer: () => void;
  onChallengeMudaqash: () => void;
  onRequestBargain: (requestedAmount: number) => void;
}

export const ActionDock: React.FC<ActionDockProps> = ({
  gameState,
  localPlayer,
  isMyTurnToBid,
  isHighBidder,
  remainingShare,
  onFoldOut,
  onSubmitBid,
  onSendOffers,
  onAcceptOffer,
  onChallengeMudaqash,
  onRequestBargain,
}) => {
  const isFirstBidder = gameState.highestBid === 0;
  const bidCaps = getBiddingCapabilities(
    localPlayer.balance,
    gameState.highestBid,
    isFirstBidder
  );

  const [bidInput, setBidInput] = useState<number>(bidCaps.minNormalBid);
  const [showBargainInput, setShowBargainInput] = useState<boolean>(false);
  const [bargainAmount, setBargainAmount] = useState<number>(
    Math.max(100, localPlayer.currentOffer + 200)
  );

  useEffect(() => {
    setBidInput(bidCaps.minNormalBid);
  }, [bidCaps.minNormalBid, gameState.highestBid, isMyTurnToBid]);

  useEffect(() => {
    setBargainAmount(Math.max(100, localPlayer.currentOffer + 200));
    setShowBargainInput(false);
  }, [localPlayer.currentOffer, gameState.offersSent]);

  if (gameState.phase === 'LOBBY') {
    return null;
  }

  const myHandEval = evaluateHand(localPlayer.hand);
  const isOut = localPlayer.roundStatus === 'OUT';

  // Phase 2 non-High Bidder button states
  const areOfferButtonsUnlocked =
    gameState.phase === 'OFFERS_AND_BARGAINING' &&
    !isHighBidder &&
    !isOut &&
    gameState.offersSent &&
    localPlayer.roundStatus === 'OFFER_PENDING';

  const isBargainLockedByLimit = localPlayer.bargainCount >= 2;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-5xl pointer-events-auto">
      <div className="bg-[#111827] border-2 border-[#334155] rounded-2xl px-4 py-3 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left / Right RTL Zone: Local Player's Secret Cards & Hand Rank */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            {localPlayer.hand.map((card) => (
              <PlayingCard
                key={card.id}
                card={card}
                faceDown={isOut}
                size="md"
                highlighted={isMyTurnToBid}
              />
            ))}
          </div>

          <div className="flex flex-col justify-center border-r border-[#1E293B] pr-3">
            <span className="text-xs text-[#94A3B8]">قوة كروتك الحالية</span>
            <span className="text-sm font-bold text-[#F59E0B]">{myHandEval.descriptionArabic}</span>
            <span className="text-xs text-[#CBD5E1] font-mono-num mt-0.5">
              رصيدك: {localPlayer.balance.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {/* Center / Action Zone depending on Phase */}
        <div className="flex-1 flex items-center justify-end w-full">
          {/* PHASE 1: BIDDING CIRCLE */}
          {gameState.phase === 'BIDDING' && (
            <div className="w-full flex flex-col sm:flex-row items-center justify-end gap-3">
              {isMyTurnToBid ? (
                <>
                  <div className="flex items-center gap-2 bg-[#0F172A] border border-[#334155] px-3 py-2 rounded-xl">
                    <span className="text-xs text-[#94A3B8] whitespace-nowrap">
                      أعلى مزايدة:
                    </span>
                    <span className="font-mono-num font-bold text-sm text-[#F59E0B]">
                      {gameState.highestBid.toLocaleString('en-US')}
                    </span>
                  </div>

                  {/* Conditional Bid Input or All-In */}
                  {bidCaps.mustAllIn ? (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className="text-xs text-[#FDE68A] bg-[#78350F] border border-[#D97706] px-2.5 py-1.5 rounded-lg font-bold">
                        رصيدك ({localPlayer.balance.toLocaleString('en-US')}) لا يتجاوز المزايدة الحالية — ادخل بكل فلوسك أو أوت
                      </span>
                      <button
                        type="button"
                        onClick={() => onSubmitBid(bidCaps.allInAmount, true)}
                        disabled={localPlayer.balance <= 0}
                        className="px-5 py-2.5 bg-[#D97706] hover:bg-[#B45309] disabled:opacity-40 text-white font-bold text-sm rounded-xl border border-[#F59E0B] flex items-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        <Flame className="w-4 h-4" />
                        <span>
                          كل فلوسي / كلي ({bidCaps.allInAmount.toLocaleString('en-US')})
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <div className="flex items-center gap-1 bg-[#0F172A] border border-[#475569] rounded-xl p-1">
                        <input
                          type="number"
                          aria-label="مبلغ المزايدة"
                          min={bidCaps.minNormalBid}
                          max={bidCaps.maxNormalBid}
                          step={50}
                          value={bidInput}
                          onChange={(e) => {
                            const raw = parseInt(e.target.value, 10) || 0;
                            setBidInput(Math.min(bidCaps.maxNormalBid, Math.max(0, raw)));
                          }}
                          className="w-24 bg-[#1E293B] text-[#F8FAFC] font-mono-num font-bold text-sm text-center py-1.5 px-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F59E0B]"
                        />
                        <button
                          type="button"
                          disabled={bidInput >= bidCaps.maxNormalBid}
                          onClick={() =>
                            setBidInput((v) =>
                              Math.min(
                                bidCaps.maxNormalBid,
                                Math.max(bidCaps.minNormalBid, v + 100)
                              )
                            )
                          }
                          className="px-2 py-1.5 bg-[#1E293B] hover:bg-[#334155] disabled:opacity-40 text-xs font-mono-num font-bold rounded-lg text-[#CBD5E1] cursor-pointer"
                        >
                          +100
                        </button>
                        <button
                          type="button"
                          disabled={bidInput >= bidCaps.maxNormalBid}
                          onClick={() =>
                            setBidInput((v) =>
                              Math.min(
                                bidCaps.maxNormalBid,
                                Math.max(bidCaps.minNormalBid, v + 500)
                              )
                            )
                          }
                          className="px-2 py-1.5 bg-[#1E293B] hover:bg-[#334155] disabled:opacity-40 text-xs font-mono-num font-bold rounded-lg text-[#CBD5E1] cursor-pointer"
                        >
                          +500
                        </button>
                        <button
                          type="button"
                          onClick={() => setBidInput(bidCaps.maxNormalBid)}
                          className="px-2 py-1.5 bg-[#78350F] hover:bg-[#92400E] text-xs font-bold rounded-lg text-[#FDE68A] cursor-pointer whitespace-nowrap"
                        >
                          أقصى حد ({bidCaps.maxNormalBid.toLocaleString('en-US')})
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const clampedBid = Math.min(
                            bidCaps.maxNormalBid,
                            Math.max(bidCaps.minNormalBid, bidInput)
                          );
                          onSubmitBid(clampedBid, clampedBid === localPlayer.balance);
                        }}
                        disabled={
                          bidInput <= gameState.highestBid ||
                          bidInput > localPlayer.balance ||
                          localPlayer.balance <= 0
                        }
                        className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        <Gavel className="w-4 h-4" />
                        <span>
                          {isFirstBidder ? 'فتح المزايدة' : 'مزايدة'} (
                          {Math.min(
                            bidCaps.maxNormalBid,
                            Math.max(bidCaps.minNormalBid, bidInput)
                          ).toLocaleString('en-US')}
                          )
                        </span>
                      </button>
                    </div>
                  )}

                  {/* "أوت" (Out) Button */}
                  <button
                    type="button"
                    onClick={onFoldOut}
                    className="px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Ban className="w-4 h-4" />
                    <span>أوت</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3 px-4 py-2 bg-[#0F172A] border border-[#1E293B] rounded-xl text-sm text-[#94A3B8]">
                  <span>
                    {localPlayer.hasActedInBidding
                      ? isOut
                        ? 'خرجت من هذه الجولة (أوت)'
                        : `دخلت المزايدة بمبلغ ${localPlayer.enteredBid.toLocaleString('en-US')} — بانتظار اكتمال الدائرة`
                      : 'بانتظار وصول دورك في دائرة المزايدة...'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* PHASE 2A: HIGH BIDDER'S SCREEN */}
          {gameState.phase === 'OFFERS_AND_BARGAINING' && isHighBidder && (
            <div className="w-full flex flex-wrap items-center justify-end gap-4">
              <div className="flex items-center gap-4 bg-[#0F172A] border border-[#334155] px-4 py-2 rounded-xl">
                <div>
                  <div className="text-[11px] text-[#94A3B8]">مجموع مزايدتك (Pool)</div>
                  <div className="font-mono-num font-bold text-base text-[#F8FAFC]">
                    {localPlayer.enteredBid.toLocaleString('en-US')}
                  </div>
                </div>
                <div className="h-8 w-px bg-[#1E293B]" />
                <div>
                  <div className="text-[11px] text-[#FDE68A]">صافي نصيبك المتبقي</div>
                  <div
                    data-testid="remaining-share-counter"
                    className={`font-mono-num font-bold text-lg ${
                      remainingShare >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
                    }`}
                  >
                    {remainingShare.toLocaleString('en-US')}
                  </div>
                </div>
              </div>

              {!gameState.offersSent ? (
                <button
                  type="button"
                  onClick={onSendOffers}
                  className="px-6 py-3 bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-sm rounded-xl flex items-center gap-2 cursor-pointer whitespace-nowrap shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال العروض</span>
                </button>
              ) : (
                <div className="px-4 py-2.5 bg-[#1E293B] border border-[#475569] rounded-xl text-xs font-bold text-[#FDE68A]">
                  تم إرسال العروض — بانتظار قرارات اللاعبين أو الرد على المكاسرات على الطاولة
                </div>
              )}
            </div>
          )}

          {/* PHASE 2B: OTHER ACTIVE PLAYERS' SCREENS */}
          {gameState.phase === 'OFFERS_AND_BARGAINING' && !isHighBidder && (
            <div className="w-full flex flex-col sm:flex-row items-center justify-end gap-3">
              {isOut ? (
                <div className="px-4 py-2 bg-[#0F172A] border border-[#1E293B] rounded-xl text-xs text-[#94A3B8]">
                  أنت خارج هذه الجولة (أوت) — تتابع مرحلة العروض والمداقشة
                </div>
              ) : (
                <>
                  {/* Offer Display Box */}
                  <div className="flex items-center gap-2 bg-[#0F172A] border border-[#334155] px-3.5 py-2 rounded-xl">
                    <span className="text-xs text-[#94A3B8]">العرض المقدم لك:</span>
                    <span className="font-mono-num font-bold text-base text-[#FBBF24]">
                      {gameState.offersSent
                        ? localPlayer.currentOffer.toLocaleString('en-US')
                        : 'بانتظار راعي المزايدة...'}
                    </span>
                  </div>

                  {/* Bargain Input Sub-panel if user clicked "مكاسرة" */}
                  {showBargainInput && areOfferButtonsUnlocked && !isBargainLockedByLimit ? (
                    <div className="flex items-center gap-2 bg-[#0F172A] border border-[#F59E0B] p-1.5 rounded-xl">
                      <input
                        type="number"
                        aria-label="المبلغ المطلوب للمكاسرة"
                        min={localPlayer.currentOffer + 50}
                        step={50}
                        value={bargainAmount}
                        onChange={(e) =>
                          setBargainAmount(Math.max(0, parseInt(e.target.value, 10) || 0))
                        }
                        className="w-24 bg-[#1E293B] text-[#FBBF24] font-mono-num font-bold text-sm text-center py-1 px-2 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onRequestBargain(
                            Math.max(localPlayer.currentOffer + 50, bargainAmount)
                          );
                          setShowBargainInput(false);
                        }}
                        className="px-3 py-1.5 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        إرسال الطلب
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBargainInput(false)}
                        className="px-2.5 py-1.5 bg-[#1E293B] text-[#94A3B8] text-xs font-bold rounded-lg cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    /* The 3 Strict Buttons: قبول | مداقش | مكاسرة */
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={!areOfferButtonsUnlocked}
                        onClick={onAcceptOffer}
                        className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] disabled:bg-[#1E293B] disabled:text-[#475569] disabled:border-[#334155] disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl border border-[#10B981] flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <Handshake className="w-4 h-4" />
                        <span>قبول</span>
                      </button>

                      <button
                        type="button"
                        disabled={!areOfferButtonsUnlocked}
                        onClick={onChallengeMudaqash}
                        className="px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-[#1E293B] disabled:text-[#475569] disabled:border-[#334155] disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl border border-[#EF4444] flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <Flame className="w-4 h-4" />
                        <span>مداقش</span>
                      </button>

                      <button
                        type="button"
                        disabled={!areOfferButtonsUnlocked || isBargainLockedByLimit}
                        onClick={() => setShowBargainInput(true)}
                        className="px-4 py-2.5 bg-[#D97706] hover:bg-[#B45309] disabled:bg-[#1E293B] disabled:text-[#475569] disabled:border-[#334155] disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl border border-[#F59E0B] flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <Scale className="w-4 h-4" />
                        <span>
                          {isBargainLockedByLimit
                            ? 'مكاسرة (استُنفدت 2/2)'
                            : `مكاسرة (${localPlayer.bargainCount}/2)`}
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* PHASE 3: SHOWDOWN / RESOLUTION STATUS */}
          {(gameState.phase === 'SHOWDOWN_REVEAL' ||
            gameState.phase === 'ROUND_RESOLUTION') && (
            <div className="px-4 py-2 bg-[#0F172A] border border-[#334155] rounded-xl text-xs font-bold text-[#CBD5E1]">
              {gameState.phase === 'SHOWDOWN_REVEAL'
                ? 'كشف الأوراق على الطاولة... جاري حسم المداقشة!'
                : 'انتهت الجولة وتم تحديث الأرصدة'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
