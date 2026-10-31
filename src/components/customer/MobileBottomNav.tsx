/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, Sparkles, Calendar, Receipt, User } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'home' | 'services' | 'book' | 'orders' | 'profile';
  onSelectTab: (tab: 'home' | 'services' | 'book' | 'orders' | 'profile') => void;
  cartCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  cartCount
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#120B0F]/95 backdrop-blur-md border-t border-[#D4AF37]/30 px-2 py-1 shadow-2xl">
      <div className="grid grid-cols-5 items-center h-14">
        {/* 1. Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
            activeTab === 'home' ? 'text-[#D4AF37]' : 'text-white/60 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Home</span>
        </button>

        {/* 2. Services */}
        <button
          onClick={() => onSelectTab('services')}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
            activeTab === 'services' ? 'text-[#D4AF37]' : 'text-white/60 hover:text-white'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Services</span>
        </button>

        {/* 3. Book (Action Center) */}
        <button
          onClick={() => onSelectTab('book')}
          className={`flex flex-col items-center justify-center min-h-[44px] relative transition-colors ${
            activeTab === 'book' ? 'text-[#D4AF37]' : 'text-white/60 hover:text-white'
          }`}
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F3D7D7] text-[#120B0F] flex items-center justify-center font-bold shadow-md">
              <Calendar className="w-4 h-4" />
            </div>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-[#120B0F]">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold mt-0.5">Book</span>
        </button>

        {/* 4. Orders */}
        <button
          onClick={() => onSelectTab('orders')}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
            activeTab === 'orders' ? 'text-[#D4AF37]' : 'text-white/60 hover:text-white'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Orders</span>
        </button>

        {/* 5. Profile */}
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
            activeTab === 'profile' ? 'text-[#D4AF37]' : 'text-white/60 hover:text-white'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Profile</span>
        </button>
      </div>
    </nav>
  );
};
