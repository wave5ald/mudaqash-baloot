import React from 'react';
import { Card } from '../game/types';

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  highlighted?: boolean;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  faceDown = false,
  size = 'md',
  highlighted = false,
}) => {
  const sizeClasses = {
    sm: 'w-11 h-16 text-xs rounded-md',
    md: 'w-16 h-24 text-base rounded-lg',
    lg: 'w-20 h-28 text-lg rounded-lg',
  }[size];

  if (faceDown || !card) {
    return (
      <div
        className={`${sizeClasses} bg-[#1E293B] border-2 border-[#475569] shadow-md flex items-center justify-center relative select-none shrink-0`}
        aria-label="كرت مقلوب"
      >
        <div className="w-[82%] h-[84%] border border-[#334155] rounded-sm bg-[#0F172A] flex items-center justify-center">
          <div className="w-3.5 h-3.5 rotate-45 border border-[#D97706] bg-[#1E293B]" />
        </div>
      </div>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦';
  const textColor = isRed ? 'text-[#DC2626]' : 'text-[#0F172A]';
  const borderColor = highlighted ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]' : 'border-[#CBD5E1]';

  return (
    <div
      dir="ltr"
      className={`${sizeClasses} bg-[#FFFFFF] border-2 ${borderColor} shadow-md flex flex-col justify-between p-1.5 select-none shrink-0 relative`}
      aria-label={`كرت ${card.rank} ${card.suit}`}
    >
      <div className={`flex flex-col items-start leading-none ${textColor}`}>
        <span className="font-mono-num font-bold tracking-tighter">{card.rank}</span>
        <span className="text-[0.85em] leading-none">{card.suit}</span>
      </div>

      <div className={`self-center text-center leading-none ${textColor} ${size === 'sm' ? 'text-base' : size === 'md' ? 'text-2xl' : 'text-3xl'}`}>
        {card.suit}
      </div>

      <div className={`flex flex-col items-end leading-none rotate-180 ${textColor}`}>
        <span className="font-mono-num font-bold tracking-tighter">{card.rank}</span>
        <span className="text-[0.85em] leading-none">{card.suit}</span>
      </div>
    </div>
  );
};
