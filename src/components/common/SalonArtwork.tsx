/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Sparkles, 
  Scissors, 
  Flower2, 
  Heart, 
  Crown, 
  Flame, 
  Palette, 
  Gem, 
  Feather, 
  Smile, 
  Star 
} from 'lucide-react';

interface ArtworkProps {
  type: string;
  className?: string;
  title?: string;
}

export const SalonArtwork: React.FC<ArtworkProps> = ({ type, className = '', title }) => {
  switch (type) {
    case 'hero':
      return (
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4A0E2E] via-[#6B1D48] to-[#2D0A1C] text-white p-6 md:p-12 shadow-2xl ${className}`}>
          {/* Subtle background decorative shapes */}
          <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-transparent blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-gradient-to-tr from-[#E8A598]/20 to-transparent blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl text-left">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[#D4AF37] font-serif text-sm tracking-widest uppercase font-semibold">
                  Luxury Women Salon & Bridal Studio
                </span>
                <span className="text-white/40">·</span>
                <span className="text-xs text-white/80 font-medium">Gachibowli, Hyderabad</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight leading-tight mb-4">
                Redefining Glamour & Elegance for Every Woman
              </h1>
              <p className="text-white/80 text-sm md:text-base leading-relaxed mb-6">
                Step into a sanctuary of bespoke beauty. From couture bridal makeup and master hair styling to skin revitalizing facials and calming organic spa rituals.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-white/90">
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
                  <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Celebrity Bridal Artistry</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Open Daily 10 AM – 10 PM</span>
                </div>
              </div>
            </div>

            {/* Visual Accent Card */}
            <div className="relative shrink-0 w-full md:w-80 h-72 rounded-2xl overflow-hidden border border-[#D4AF37]/30 shadow-2xl bg-gradient-to-b from-[#3D0C24] to-[#1F0513] p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs tracking-wider uppercase text-[#D4AF37] font-semibold">Signature Look</span>
                <Gem className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div className="my-auto text-center py-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-[#D4AF37] via-[#F3D7D7] to-[#8C235A] p-1 shadow-lg mb-3 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-[#3D0C24] flex items-center justify-center text-[#D4AF37]">
                    <Crown className="w-10 h-10" />
                  </div>
                </div>
                <h4 className="font-serif text-lg font-semibold text-white">Royal Indian Bridal</h4>
                <p className="text-xs text-white/70 mt-1">HD Airbrush · Lashes · Saree Draping · Hair Updo</p>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-white/60">Starting at</span>
                <span className="text-[#D4AF37] font-bold text-base">₹15,999</span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'salon':
      return (
        <div className={`w-full h-full bg-gradient-to-br from-[#4A0E2E]/10 via-[#F3D7D7]/30 to-[#FAF7F5] flex flex-col items-center justify-center p-4 ${className}`}>
          <div className="w-14 h-14 rounded-2xl bg-[#4A0E2E] text-white flex items-center justify-center shadow-md mb-2">
            <Scissors className="w-7 h-7 text-[#D4AF37]" />
          </div>
          <span className="text-xs font-serif font-semibold text-[#4A0E2E]">Hair & Styling</span>
        </div>
      );

    case 'spa':
      return (
        <div className={`w-full h-full bg-gradient-to-br from-[#2E4A3E]/10 via-[#E8F3E8]/40 to-[#FAF7F5] flex flex-col items-center justify-center p-4 ${className}`}>
          <div className="w-14 h-14 rounded-2xl bg-[#2E4A3E] text-white flex items-center justify-center shadow-md mb-2">
            <Flame className="w-7 h-7 text-[#A5D6A7]" />
          </div>
          <span className="text-xs font-serif font-semibold text-[#2E4A3E]">Wellness & Calm</span>
        </div>
      );

    case 'facials':
      return (
        <div className={`w-full h-full bg-gradient-to-br from-[#8C235A]/10 via-[#FCE4EC]/50 to-[#FAF7F5] flex flex-col items-center justify-center p-4 ${className}`}>
          <div className="w-14 h-14 rounded-2xl bg-[#8C235A] text-white flex items-center justify-center shadow-md mb-2">
            <Sparkles className="w-7 h-7 text-[#F48FB1]" />
          </div>
          <span className="text-xs font-serif font-semibold text-[#8C235A]">Skin Radiance</span>
        </div>
      );

    case 'makeup':
      return (
        <div className={`w-full h-full bg-gradient-to-br from-[#D4AF37]/15 via-[#FFF8E1]/50 to-[#FAF7F5] flex flex-col items-center justify-center p-4 ${className}`}>
          <div className="w-14 h-14 rounded-2xl bg-[#5B132B] text-white flex items-center justify-center shadow-md mb-2">
            <Crown className="w-7 h-7 text-[#D4AF37]" />
          </div>
          <span className="text-xs font-serif font-semibold text-[#5B132B]">Bridal & Glam</span>
        </div>
      );

    case 'body-polishing':
      return (
        <div className={`w-full h-full bg-gradient-to-br from-[#795548]/10 via-[#EFEBE9]/50 to-[#FAF7F5] flex flex-col items-center justify-center p-4 ${className}`}>
          <div className="w-14 h-14 rounded-2xl bg-[#5D4037] text-white flex items-center justify-center shadow-md mb-2">
            <Feather className="w-7 h-7 text-[#FFCC80]" />
          </div>
          <span className="text-xs font-serif font-semibold text-[#5D4037]">Body Polish</span>
        </div>
      );

    case 'mani-pedi':
      return (
        <div className={`w-full h-full bg-gradient-to-br from-[#C2185B]/10 via-[#F8BBD0]/40 to-[#FAF7F5] flex flex-col items-center justify-center p-4 ${className}`}>
          <div className="w-14 h-14 rounded-2xl bg-[#880E4F] text-white flex items-center justify-center shadow-md mb-2">
            <Gem className="w-7 h-7 text-[#F48FB1]" />
          </div>
          <span className="text-xs font-serif font-semibold text-[#880E4F]">Nails & Care</span>
        </div>
      );

    default:
      return (
        <div className={`w-full h-full bg-gradient-to-br from-[#5B132B]/10 to-[#FAF7F5] flex flex-col items-center justify-center p-4 ${className}`}>
          <div className="w-12 h-12 rounded-xl bg-[#5B132B] text-[#D4AF37] flex items-center justify-center shadow-sm mb-1.5">
            <Flower2 className="w-6 h-6" />
          </div>
          <span className="text-xs font-serif font-medium text-[#5B132B] truncate max-w-[90%]">{title || 'The Glossy Looks'}</span>
        </div>
      );
  }
};
