import React from 'react';
import {
  Users,
  Bot,
  Play,
  Copy,
  Check,
  Crown,
  Coins,
  Layers,
  LogIn,
  LogOut,
  PlusCircle,
  Trash2,
  Trophy,
  Palette,
  Lock,
} from 'lucide-react';
import {
  CARDS_PER_PLAYER,
  getActiveRanksForPlayerCount,
  getPlayerColorOption,
  MIN_PLAYERS_TO_START,
  PLAYER_COLORS,
} from '../game/rules';
import { GameState, PlayerColorId, RoomSettings } from '../game/types';

interface LobbyModalProps {
  gameState: GameState;
  localPlayerId: string;
  localPlayerName: string;
  onChangePlayerName: (name: string) => void;
  isConnectedToRoom: boolean;
  isHost: boolean;
  joinCodeInput: string;
  onChangeJoinCodeInput: (code: string) => void;
  connectionError: string | null;
  isConnecting: boolean;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onLeaveRoom: () => void;
  onUpdateSettings: (partial: Partial<RoomSettings>) => void;
  onSelectColor: (colorId: PlayerColorId) => void;
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
  onStartMatch: () => void;
}

const WINNING_TARGET_PRESETS = [
  { label: '10,000', value: 10000 },
  { label: '50,000', value: 50000 },
  { label: '100,000', value: 100000 },
  { label: '1,000,000', value: 1000000 },
];

export const LobbyModal: React.FC<LobbyModalProps> = ({
  gameState,
  localPlayerId,
  localPlayerName,
  onChangePlayerName,
  isConnectedToRoom,
  isHost,
  joinCodeInput,
  onChangeJoinCodeInput,
  connectionError,
  isConnecting,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onUpdateSettings,
  onSelectColor,
  onAddBot,
  onRemoveBot,
  onStartMatch,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(gameState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const localPlayer = gameState.players.find((p) => p.id === localPlayerId);
  const effectivePlayerCount = Math.max(MIN_PLAYERS_TO_START, gameState.players.length);
  const activeRanks = getActiveRanksForPlayerCount(effectivePlayerCount);
  const lowestRankLabel = activeRanks[activeRanks.length - 1]?.label || 'J';
  const totalDeckCards = effectivePlayerCount * CARDS_PER_PLAYER;
  const canStartMatch = gameState.players.length >= MIN_PLAYERS_TO_START;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#0B0F17]/95 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#111827] border-2 border-[#334155] rounded-2xl p-5 shadow-2xl my-auto">
        {/* Header Lockup */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3.5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B462C] border-2 border-[#D97706] flex items-center justify-center shadow-md">
              <span className="text-lg font-bold text-[#F59E0B]">♠</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#F8FAFC] tracking-tight">
                مداقش — Mudaqash
              </h1>
              <p className="text-xs text-[#94A3B8]">
                طاولة بلوت جماعية للمزايدة والعروض والتحدي المباشر (من 4 إلى 10 لاعبين)
              </p>
            </div>
          </div>

          {isConnectedToRoom && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#0F172A] border border-[#D97706] px-3 py-1.5 rounded-xl">
                <span className="text-xs text-[#94A3B8]">كود الغرفة:</span>
                <span
                  data-testid="room-code-display"
                  className="font-mono-num font-bold text-base text-[#F59E0B] tracking-wider"
                >
                  {gameState.roomCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  aria-label="نسخ كود الغرفة"
                  className="p-1 hover:bg-[#1E293B] rounded text-[#CBD5E1] cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[#10B981]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={onLeaveRoom}
                className="px-3 py-2 bg-[#7F1D1D] hover:bg-[#991B1B] border border-[#EF4444] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج من الغرفة</span>
              </button>
            </div>
          )}
        </div>

        {/* Step 1: Not yet in a room (Pre-Creation Settings + Create or Join) */}
        {!isConnectedToRoom ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nickname Input */}
              <div>
                <label
                  htmlFor="player-nickname-input"
                  className="block text-xs font-bold text-[#CBD5E1] mb-1.5"
                >
                  اسم اللاعب (عربي / إنجليزي)
                </label>
                <input
                  id="player-nickname-input"
                  type="text"
                  maxLength={18}
                  placeholder="أدخل اسمك على الطاولة..."
                  value={localPlayerName}
                  onChange={(e) => onChangePlayerName(e.target.value)}
                  className="w-full bg-[#0F172A] border-2 border-[#334155] focus:border-[#F59E0B] rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#F8FAFC] focus:outline-none"
                />
              </div>

              {/* Pre-Room Winning Target Selection */}
              <div>
                <label
                  htmlFor="pre-winning-target-input"
                  className="block text-xs font-bold text-[#CBD5E1] mb-1.5 flex items-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>حد الفوز لإنهاء الطاولة (قبل إنشاء الغرفة)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="pre-winning-target-input"
                    type="number"
                    min={1000}
                    step={5000}
                    value={gameState.settings.winningTarget}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      onUpdateSettings({
                        winningTarget: isNaN(val) ? 100000 : Math.max(1000, val),
                      });
                    }}
                    className="w-full bg-[#0F172A] border-2 border-[#334155] focus:border-[#F59E0B] rounded-xl px-3 py-2 text-sm font-mono-num font-bold text-[#F59E0B] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  {WINNING_TARGET_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => onUpdateSettings({ winningTarget: preset.value })}
                      className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border cursor-pointer truncate ${
                        gameState.settings.winningTarget === preset.value
                          ? 'bg-[#D97706] text-white border-[#F59E0B]'
                          : 'bg-[#0F172A] text-[#94A3B8] border-[#334155] hover:border-[#475569]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {connectionError && (
              <div className="p-3 bg-[#7F1D1D] border border-[#EF4444] rounded-xl text-xs font-bold text-[#FECACA]">
                {connectionError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Create Room Card */}
              <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] mb-1">
                    إنشاء غرفة جديدة
                  </h2>
                  <p className="text-xs text-[#94A3B8] mb-3">
                    افتح طاولة خاصة بحد فوز{' '}
                    <span className="font-mono-num font-bold text-[#F59E0B]">
                      {gameState.settings.winningTarget.toLocaleString('en-US')}
                    </span>{' '}
                    واختر لون مربعك الخاص أو أضف لاعبين آليين (الحد الأدنى 4 لاعبين).
                  </p>
                </div>
                <button
                  type="button"
                  data-start="true"
                  disabled={!localPlayerName.trim() || isConnecting}
                  onClick={onCreateRoom}
                  className="w-full py-3 px-4 bg-[#D97706] hover:bg-[#B45309] disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>إنشاء غرفة</span>
                </button>
              </div>

              {/* Join Room Card */}
              <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] mb-1">
                    انضمام لغرفة
                  </h2>
                  <p className="text-xs text-[#94A3B8] mb-2.5">
                    أدخل كود الغرفة المكون من 4 خانات للجلوس واختيار لون مربعك الخاص.
                  </p>
                  <input
                    type="text"
                    aria-label="كود الغرفة للانضمام"
                    maxLength={4}
                    placeholder="مثال: MDQ5"
                    value={joinCodeInput}
                    onChange={(e) => onChangeJoinCodeInput(e.target.value.toUpperCase())}
                    className="w-full bg-[#1E293B] border border-[#475569] rounded-lg px-3 py-2 text-center font-mono-num font-bold text-base text-[#F59E0B] uppercase tracking-widest mb-3 focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <button
                  type="button"
                  disabled={
                    !localPlayerName.trim() || joinCodeInput.trim().length < 4 || isConnecting
                  }
                  onClick={onJoinRoom}
                  className="w-full py-3 px-4 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isConnecting ? 'جاري الاتصال...' : 'انضمام لغرفة'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Step 2: Inside Room Pre-Game Configuration & Exclusive 10-Color Picker */
          <div className="space-y-4">
            {/* Host Settings Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#0F172A] border border-[#1E293B] rounded-xl p-3">
              {/* Starting Balance Toggle (500 or 2000) */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#94A3B8] mb-1.5">
                  <Coins className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>رأس المال البدائي</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ startingBalance: 500 })}
                    className={`py-1.5 rounded-lg font-mono-num font-bold text-xs border cursor-pointer ${
                      gameState.settings.startingBalance === 500
                        ? 'bg-[#D97706] text-white border-[#F59E0B]'
                        : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]'
                    }`}
                  >
                    500
                  </button>
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ startingBalance: 2000 })}
                    className={`py-1.5 rounded-lg font-mono-num font-bold text-xs border cursor-pointer ${
                      gameState.settings.startingBalance === 2000
                        ? 'bg-[#D97706] text-white border-[#F59E0B]'
                        : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]'
                    }`}
                  >
                    2,000
                  </button>
                </div>
              </div>

              {/* Fixed 4 Cards per Player & Dynamic Deck Info */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#94A3B8] mb-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>نظام الكروت والورق</span>
                </div>
                <div className="bg-[#1E293B] border border-[#10B981]/60 rounded-lg px-2 py-1.5 text-xs flex items-center justify-between gap-1 whitespace-nowrap">
                  <span className="font-bold text-[#10B981]">4 كروت</span>
                  <span className="font-mono-num text-[11px] text-[#F8FAFC]">
                    {totalDeckCards} كرت (A-{lowestRankLabel})
                  </span>
                </div>
              </div>

              {/* Winning Target (حد الفوز) */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#94A3B8] mb-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>حد الفوز بالطاولة</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ winningTarget: 100000 })}
                    className={`py-1.5 rounded-lg font-mono-num font-bold text-xs border cursor-pointer ${
                      gameState.settings.winningTarget === 100000
                        ? 'bg-[#D97706] text-white border-[#F59E0B]'
                        : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]'
                    }`}
                  >
                    100,000
                  </button>
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ winningTarget: 1000000 })}
                    className={`py-1.5 rounded-lg font-mono-num font-bold text-xs border cursor-pointer ${
                      gameState.settings.winningTarget === 1000000
                        ? 'bg-[#D97706] text-white border-[#F59E0B]'
                        : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]'
                    }`}
                  >
                    1,000,000
                  </button>
                </div>
              </div>

              {/* Minimum & Maximum Players Info */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#94A3B8] mb-1.5">
                  <Users className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>عدد اللاعبين (4 - 10)</span>
                </div>
                <div className="flex items-center justify-between bg-[#1E293B] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs">
                  <span className="font-mono-num font-bold text-[#F8FAFC]">
                    {gameState.players.length} / {gameState.settings.maxPlayers}
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      canStartMatch ? 'text-[#10B981]' : 'text-[#F59E0B]'
                    }`}
                  >
                    {canStartMatch
                      ? 'جاهز للبدء'
                      : `يتطلب ${MIN_PLAYERS_TO_START - gameState.players.length} بعد`}
                  </span>
                </div>
              </div>
            </div>

            {/* 10 Exclusive Player Box Colors Selector */}
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#F8FAFC]">
                  <Palette className="w-4 h-4 text-[#F59E0B]" />
                  <span>اختر لون مربعك الخاص على الطاولة (10 ألوان حصرية — لا يتكرر اللون بين لاعبين)</span>
                </div>
                {localPlayer && (
                  <span className="text-xs text-[#94A3B8]">
                    لونك الحالي:{' '}
                    <strong
                      style={{ color: getPlayerColorOption(localPlayer.colorId).accentHex }}
                    >
                      {getPlayerColorOption(localPlayer.colorId).nameArabic}
                    </strong>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PLAYER_COLORS.map((colorOpt) => {
                  const owner = gameState.players.find((p) => p.colorId === colorOpt.id);
                  const isMine = owner?.id === localPlayerId;
                  const isTakenByOther = Boolean(owner && owner.id !== localPlayerId);

                  return (
                    <button
                      key={colorOpt.id}
                      type="button"
                      disabled={isTakenByOther}
                      onClick={() => onSelectColor(colorOpt.id)}
                      style={{
                        backgroundColor: colorOpt.bgHex,
                        borderColor: isMine
                          ? '#FFFFFF'
                          : isTakenByOther
                          ? '#334155'
                          : colorOpt.borderHex,
                      }}
                      className={`px-2.5 py-2 rounded-xl border-2 flex items-center justify-between transition-all ${
                        isTakenByOther
                          ? 'opacity-45 cursor-not-allowed'
                          : 'cursor-pointer hover:scale-[1.02]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          style={{ backgroundColor: colorOpt.borderHex }}
                          className="w-3 h-3 rounded-sm shrink-0 border border-white/30"
                        />
                        <span className="text-[11px] font-bold text-[#F8FAFC] whitespace-nowrap">
                          {colorOpt.nameArabic}
                        </span>
                      </div>

                      {isMine ? (
                        <Check className="w-3.5 h-3.5 text-white shrink-0" />
                      ) : isTakenByOther ? (
                        <span className="flex items-center gap-0.5 text-[10px] text-[#CBD5E1] shrink-0">
                          <Lock className="w-2.5 h-2.5" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seated Players Grid (Up to 10 seats) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#94A3B8]">
                  المقاعد على الطاولة ({gameState.players.length}/10 — الحد الأدنى للعب 4 لاعبين)
                </span>
                {isHost && gameState.players.length < gameState.settings.maxPlayers && (
                  <button
                    type="button"
                    onClick={onAddBot}
                    className="px-3 py-1 bg-[#1E293B] hover:bg-[#334155] border border-[#475569] rounded-lg text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>إضافة لاعب آلي (Bot)</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Array.from({ length: gameState.settings.maxPlayers }).map((_, idx) => {
                  const occupant = gameState.players[idx];
                  if (!occupant) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="h-14 rounded-xl border border-dashed border-[#334155] bg-[#0F172A]/50 flex items-center justify-center text-xs text-[#475569]"
                      >
                        مقعد #{idx + 1} متاح
                      </div>
                    );
                  }
                  const seatColor = getPlayerColorOption(occupant.colorId);
                  return (
                    <div
                      key={occupant.id}
                      style={{
                        backgroundColor: seatColor.bgHex,
                        borderColor: seatColor.borderHex,
                      }}
                      className="h-14 rounded-xl border-2 px-2.5 py-1.5 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[#F8FAFC] truncate">
                          {occupant.name}
                        </span>
                        {occupant.isHost ? (
                          <Crown className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                        ) : occupant.isBot && isHost ? (
                          <button
                            type="button"
                            aria-label={`حذف ${occupant.name}`}
                            onClick={() => onRemoveBot(occupant.id)}
                            className="text-[#CBD5E1] hover:text-[#EF4444] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#E2E8F0]">
                        <span>{seatColor.nameArabic}</span>
                        <span className="font-mono-num font-bold text-[#10B981]">
                          {occupant.balance.toLocaleString('en-US')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Start Match Footer */}
            <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between gap-4">
              <div className="text-xs text-[#94A3B8]">
                {!canStartMatch ? (
                  <span className="text-[#F59E0B] font-bold">
                    لا يمكن بدء اللعب بأقل من 4 لاعبين (يوجد حالياً {gameState.players.length} — أضف{' '}
                    {MIN_PLAYERS_TO_START - gameState.players.length} لاعبين للبدء).
                  </span>
                ) : (
                  <span>
                    مجموع الورق لهذه الطاولة:{' '}
                    <strong className="font-mono-num text-[#10B981]">
                      {totalDeckCards} كرت
                    </strong>{' '}
                    (من الأكة A إلى {lowestRankLabel}) — 4 كروت لكل لاعب.
                  </span>
                )}
              </div>

              {isHost ? (
                <button
                  type="button"
                  data-start="true"
                  disabled={!canStartMatch}
                  onClick={onStartMatch}
                  className="px-6 py-2.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl flex items-center gap-2 cursor-pointer whitespace-nowrap shadow-lg"
                >
                  <Play className="w-4 h-4" />
                  <span>بدء الجولة الأولى</span>
                </button>
              ) : (
                <div className="px-4 py-2 bg-[#1E293B] rounded-xl text-xs font-bold text-[#F59E0B]">
                  بانتظار مضيف الغرفة لبدء الجولة...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
