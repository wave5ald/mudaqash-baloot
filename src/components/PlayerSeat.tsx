import React from 'react';
import { Crown, Bot, Minus, Plus, Check, X } from 'lucide-react';
import { getPlayerColorOption } from '../game/rules';
import { GamePhase, Player } from '../game/types';

interface PlayerSeatProps {
  player: Player;
  isLocalPlayer: boolean;
  isCurrentTurn: boolean;
  isHighBidder: boolean;
  localPlayerIsHighBidder: boolean;
  phase: GamePhase;
  offersSent: boolean;
  draftOfferAmount: number;
  onAdjustDraftOffer: (targetPlayerId: string, newAmount: number) => void;
  onRespondBargain: (targetPlayerId: string, accept: boolean) => void;
  seatStyle: React.CSSProperties;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isLocalPlayer,
  isCurrentTurn,
  isHighBidder,
  localPlayerIsHighBidder,
  phase,
  offersSent,
  draftOfferAmount,
  onAdjustDraftOffer,
  onRespondBargain,
  seatStyle,
}) => {
  const isBankrupt = player.balance <= 0;
  const isOut = player.roundStatus === 'OUT';
  const colorTheme = getPlayerColorOption(player.colorId);

  // Determine status label and color
  const getStatusDisplay = (): { text: string; bgClass: string; textClass: string } | null => {
    if (phase === 'LOBBY') {
      return player.isHost
        ? { text: 'مضيف الغرفة', bgClass: 'bg-[#0F172A]', textClass: 'text-[#F59E0B]' }
        : { text: 'جاهز', bgClass: 'bg-[#0F172A]', textClass: 'text-[#10B981]' };
    }

    if (isOut) {
      return { text: 'أوت (خارج الجولة)', bgClass: 'bg-[#0F172A]', textClass: 'text-[#94A3B8]' };
    }

    if (isHighBidder && phase !== 'BIDDING') {
      return { text: 'راعي المزايدة', bgClass: 'bg-[#78350F]', textClass: 'text-[#FDE68A]' };
    }

    switch (player.roundStatus) {
      case 'ACTIVE_BIDDING':
        return { text: 'يفكر بالمزايدة...', bgClass: 'bg-[#78350F]', textClass: 'text-[#FCD34D]' };
      case 'ALL_IN':
        return { text: 'كل فلوسي (كلي)', bgClass: 'bg-[#7F1D1D]', textClass: 'text-[#FECACA]' };
      case 'BID_PLACED':
        return { text: 'زايد', bgClass: 'bg-[#064E3B]', textClass: 'text-[#A7F3D0]' };
      case 'OFFER_PENDING':
        return offersSent
          ? { text: 'يدرس العرض...', bgClass: 'bg-[#0F172A]', textClass: 'text-[#FCD34D]' }
          : { text: 'ينتظر العرض', bgClass: 'bg-[#0F172A]', textClass: 'text-[#94A3B8]' };
      case 'BARGAINING':
        return { text: 'يطلب مكاسرة!', bgClass: 'bg-[#78350F]', textClass: 'text-[#FDE68A]' };
      case 'ACCEPTED':
        return { text: 'قبل العرض', bgClass: 'bg-[#064E3B]', textClass: 'text-[#6EE7B7]' };
      case 'CHALLENGED':
        return { text: 'مداقش (تحدي)', bgClass: 'bg-[#7F1D1D]', textClass: 'text-[#FCA5A5]' };
      default:
        return null;
    }
  };

  const statusInfo = getStatusDisplay();

  const showOfferCreatorControls =
    localPlayerIsHighBidder &&
    !isLocalPlayer &&
    phase === 'OFFERS_AND_BARGAINING' &&
    !offersSent &&
    !isOut;

  const showBargainResponseControls =
    localPlayerIsHighBidder &&
    !isLocalPlayer &&
    phase === 'OFFERS_AND_BARGAINING' &&
    offersSent &&
    player.roundStatus === 'BARGAINING' &&
    player.requestedBargain !== null;

  return (
    <div
      style={seatStyle}
      data-testid={`player-seat-${player.seatIndex}`}
      className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center transition-transform duration-150 ${
        isOut && phase !== 'LOBBY' ? 'opacity-60' : 'opacity-100'
      }`}
    >
      {/* Main Avatar & Stats Box Colored with Player's Exclusive Color */}
      <div
        style={{
          backgroundColor: colorTheme.bgHex,
          borderColor: isCurrentTurn ? '#F59E0B' : colorTheme.borderHex,
        }}
        className={`w-44 border-2 rounded-xl p-2.5 shadow-xl transition-all ${
          isCurrentTurn ? 'active-turn-glow' : ''
        }`}
      >
        {/* Top Row: Name + Exclusive Color Swatch + Seat Index */}
        <div
          style={{
            backgroundColor: colorTheme.headerBgHex,
            borderColor: colorTheme.borderHex,
          }}
          className="flex items-center justify-between gap-1.5 border-b px-2 py-1 rounded-t-lg -mx-1 -mt-1 mb-1.5"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {isHighBidder && phase !== 'BIDDING' ? (
              <Crown className="w-4 h-4 text-[#F59E0B] shrink-0" />
            ) : player.isBot ? (
              <Bot className="w-4 h-4 shrink-0" style={{ color: colorTheme.accentHex }} />
            ) : (
              <div
                style={{ backgroundColor: colorTheme.borderHex }}
                className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/40"
              />
            )}
            <span
              className="font-bold text-xs text-[#F8FAFC] truncate"
              title={player.name}
            >
              {player.name} {isLocalPlayer ? '(أنت)' : ''}
            </span>
          </div>

          <span
            style={{ color: colorTheme.accentHex }}
            className="font-mono-num text-[11px] font-bold shrink-0"
          >
            #{player.seatIndex + 1}
          </span>
        </div>

        {/* Balance Row */}
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[#CBD5E1]">الرصيد:</span>
          <div className="flex items-center gap-1">
            {isBankrupt && (
              <span className="text-[10px] font-bold text-[#FCA5A5] bg-[#7F1D1D] px-1 rounded">
                مفلس
              </span>
            )}
            <span
              className={`font-mono-num font-bold ${
                player.balance < 0
                  ? 'text-[#EF4444]'
                  : player.balance === 0
                  ? 'text-[#F59E0B]'
                  : 'text-[#10B981]'
              }`}
            >
              {player.balance.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {/* Entered Bid Row */}
        {phase !== 'LOBBY' && (
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#CBD5E1]">دخول المزايدة:</span>
            <span className="font-mono-num font-bold text-[#F8FAFC]">
              {player.enteredBid > 0 ? player.enteredBid.toLocaleString('en-US') : '—'}
            </span>
          </div>
        )}

        {/* Offer / Agreed Offer Badge */}
        {phase !== 'LOBBY' && phase !== 'BIDDING' && !isHighBidder && !isOut && (
          <div className="flex items-center justify-between text-xs mb-1 pt-1 border-t border-white/10">
            <span className="text-[#CBD5E1]">
              {player.roundStatus === 'ACCEPTED' ? 'العرض المقبول:' : 'العرض المقدم:'}
            </span>
            <span className="font-mono-num font-bold text-[#FBBF24]">
              {offersSent
                ? (player.roundStatus === 'ACCEPTED'
                    ? player.agreedOffer
                    : player.currentOffer
                  ).toLocaleString('en-US')
                : 'قيد الإعداد'}
            </span>
          </div>
        )}

        {/* Bargain Count Indicator */}
        {phase === 'OFFERS_AND_BARGAINING' && !isHighBidder && !isOut && offersSent && (
          <div className="flex items-center justify-between text-[11px] text-[#CBD5E1] mb-1">
            <span>المكاسرات:</span>
            <span className="font-mono-num font-semibold text-[#F8FAFC]">
              {player.bargainCount} / 2
            </span>
          </div>
        )}

        {/* Last Round Delta Payout Indicator in Resolution Phase */}
        {(phase === 'ROUND_RESOLUTION' || phase === 'GAME_OVER') &&
          typeof player.lastRoundDelta === 'number' && (
            <div
              className={`mt-1 py-0.5 px-2 rounded text-center font-mono-num font-bold text-xs ${
                player.lastRoundDelta > 0
                  ? 'bg-[#064E3B] text-[#6EE7B7]'
                  : player.lastRoundDelta < 0
                  ? 'bg-[#7F1D1D] text-[#FCA5A5]'
                  : 'bg-[#0F172A] text-[#94A3B8]'
              }`}
            >
              {player.lastRoundDelta > 0
                ? `+${player.lastRoundDelta.toLocaleString('en-US')}`
                : player.lastRoundDelta.toLocaleString('en-US')}
            </div>
          )}

        {/* Status Text Footer */}
        {statusInfo && (
          <div
            className={`mt-1.5 py-1 px-2 rounded text-center text-[11px] font-bold ${statusInfo.bgClass} ${statusInfo.textClass} truncate`}
          >
            {statusInfo.text}
          </div>
        )}
      </div>

      {/* Mini Card Slots Indicator for Other Players */}
      {!isLocalPlayer &&
        phase !== 'LOBBY' &&
        !isOut &&
        phase !== 'SHOWDOWN_REVEAL' &&
        phase !== 'ROUND_RESOLUTION' &&
        phase !== 'GAME_OVER' && (
          <div className="flex items-center justify-center -space-x-2 rtl:space-x-reverse mt-1.5">
            {player.hand.map((c) => (
              <div
                key={c.id}
                style={{ borderColor: colorTheme.borderHex }}
                className="w-5 h-7 rounded-sm bg-[#1E293B] border shadow-sm"
              />
            ))}
          </div>
        )}

      {/* High Bidder Offer Assignment Controls Next to Active Player */}
      {showOfferCreatorControls && (
        <div className="mt-1.5 w-48 bg-[#0F172A] border-2 border-[#D97706] rounded-xl p-2 shadow-2xl z-30">
          <div className="text-[11px] font-bold text-[#FDE68A] mb-1 text-center">
            تحديد العرض لـ {player.name}
          </div>
          <div className="flex items-center gap-1 mb-1.5">
            <button
              type="button"
              aria-label={`إنقاص عرض ${player.name} 100`}
              onClick={() => onAdjustDraftOffer(player.id, Math.max(0, draftOfferAmount - 100))}
              className="w-7 h-7 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] rounded flex items-center justify-center border border-[#475569] cursor-pointer shrink-0"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min={0}
              step={50}
              aria-label={`مبلغ العرض لـ ${player.name}`}
              value={draftOfferAmount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onAdjustDraftOffer(player.id, isNaN(val) ? 0 : Math.max(0, val));
              }}
              className="w-full bg-[#1E293B] border border-[#475569] rounded px-1.5 py-1 text-center font-mono-num font-bold text-xs text-[#FBBF24] focus:outline-none focus:border-[#F59E0B]"
            />
            <button
              type="button"
              aria-label={`زيادة عرض ${player.name} 100`}
              onClick={() => onAdjustDraftOffer(player.id, draftOfferAmount + 100)}
              className="w-7 h-7 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] rounded flex items-center justify-center border border-[#475569] cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => onAdjustDraftOffer(player.id, 0)}
              className="py-0.5 bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] rounded text-[10px] font-mono-num font-bold border border-[#334155] cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => onAdjustDraftOffer(player.id, draftOfferAmount + 100)}
              className="py-0.5 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] rounded text-[10px] font-mono-num font-bold border border-[#334155] cursor-pointer"
            >
              +100
            </button>
            <button
              type="button"
              onClick={() => onAdjustDraftOffer(player.id, draftOfferAmount + 500)}
              className="py-0.5 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] rounded text-[10px] font-mono-num font-bold border border-[#334155] cursor-pointer"
            >
              +500
            </button>
            <button
              type="button"
              onClick={() => onAdjustDraftOffer(player.id, draftOfferAmount + 1000)}
              className="py-0.5 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] rounded text-[10px] font-mono-num font-bold border border-[#334155] cursor-pointer"
            >
              +1000
            </button>
          </div>
        </div>
      )}

      {/* High Bidder Counter-Offer (Bargain) Popup Next to Player */}
      {showBargainResponseControls && (
        <div className="mt-1.5 w-52 bg-[#0F172A] border-2 border-[#F59E0B] rounded-xl p-2.5 shadow-2xl z-30">
          <div className="text-xs font-bold text-[#FDE68A] text-center mb-1">
            طلب مكاسرة ({player.bargainCount}/2)
          </div>
          <div className="text-xs text-[#F8FAFC] text-center mb-2">
            يطلب:{' '}
            <span className="font-mono-num font-bold text-[#F59E0B]">
              {player.requestedBargain?.toLocaleString('en-US')}
            </span>{' '}
            <span className="text-[11px] text-[#94A3B8]">
              (الفرق +
              {Math.max(0, (player.requestedBargain || 0) - player.currentOffer).toLocaleString(
                'en-US'
              )}
              )
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onRespondBargain(player.id, true)}
              className="w-full py-1.5 px-2 bg-[#059669] hover:bg-[#047857] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>موافقة وزيادة العرض</span>
            </button>
            <button
              type="button"
              onClick={() => onRespondBargain(player.id, false)}
              className="w-full py-1.5 px-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>رفض المكاسرة</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
