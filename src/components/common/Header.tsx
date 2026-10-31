/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  MapPin, 
  ShoppingBag, 
  Calendar, 
  ShieldCheck, 
  X, 
  ChevronDown, 
  User as UserIcon, 
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { SalonSettings, Customer } from '../../types/salon';

interface HeaderProps {
  settings: SalonSettings;
  cartCount: number;
  currentCustomer: Customer | null;
  onOpenCart: () => void;
  onOpenBookings: () => void;
  onOpenCustomerAuth: () => void;
  onOpenCustomerPortal: () => void;
  onOpenEnquiry: () => void;
  onSwitchToAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  cartCount,
  currentCustomer,
  onOpenCart,
  onOpenBookings,
  onOpenCustomerAuth,
  onOpenCustomerPortal,
  onOpenEnquiry,
  onSwitchToAdmin
}) => {
  const [showLocationModal, setShowLocationModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#120B0F]/95 backdrop-blur-md border-b border-[#D4AF37]/30 transition-all text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 h-16 sm:h-20">
            {/* Zone 1: Brand & Location */}
            <div className="flex items-center gap-3 sm:gap-6">
              <a href="#" className="flex items-center gap-2.5 group">
                <img
                  src="/assets/brand/glossy-looks-logo.png"
                  alt="The Glossy Looks logo"
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover shadow-lg shadow-[#D4AF37]/20 ring-2 ring-[#D4AF37]/40"
                />
                <div className="flex flex-col">
                  <span className="font-serif font-bold text-base sm:text-xl tracking-tight text-white leading-none group-hover:text-[#D4AF37] transition-colors">
                    The Glossy Looks
                  </span>
                  <span className="text-[10px] text-[#D4AF37] font-medium tracking-wider uppercase mt-1">
                    Luxury Salon · Gachibowli
                  </span>
                </div>
              </a>

              {/* Location Selector */}
              <button
                onClick={() => setShowLocationModal(true)}
                className="hidden lg:flex items-center gap-1.5 text-xs text-white/80 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-[#D4AF37]/30 transition-colors"
                title="Salon Location & Timings"
              >
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="font-medium text-white/90">Gachibowli, Hyderabad</span>
                <ChevronDown className="w-3 h-3 text-white/50" />
              </button>
            </div>

            {/* Zone 2: Actions (Enquiry, Customer Portal, Cart, Admin) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Consultation / Enquiry modal */}
              <button
                onClick={onOpenEnquiry}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10"
                title="Salon Consultation Enquiry"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Enquire</span>
              </button>

              {/* Customer Portal Login / Profile */}
              {currentCustomer ? (
                <button
                  onClick={onOpenCustomerPortal}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#120B0F] bg-gradient-to-r from-[#D4AF37] to-[#F3D7D7] rounded-xl shadow-md transition-all"
                  title="My Salon Member Portal"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span className="max-w-[90px] truncate">{currentCustomer.name.split(' ')[0]}</span>
                </button>
              ) : (
                <button
                  onClick={onOpenCustomerAuth}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                  title="Login with Mobile OTP"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Member Login</span>
                </button>
              )}

              {/* Cart Drawer Trigger */}
              <button
                onClick={onOpenCart}
                className="relative flex items-center gap-2 bg-[#5B132B] hover:bg-[#430D1F] text-white px-3.5 py-2 rounded-xl transition-all shadow-md shadow-[#5B132B]/30 border border-[#D4AF37]/30"
                title="View Selected Services"
              >
                <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs font-bold hidden sm:inline">Booking</span>
                {cartCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-[#120B0F] text-[11px] font-bold flex items-center justify-center shrink-0">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Protected Salon Admin Switcher */}
              <button
                onClick={onSwitchToAdmin}
                className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-white/70 hover:text-[#D4AF37] hover:bg-white/5 rounded-xl transition-colors flex items-center gap-1.5 border border-white/10"
                title="Salon Operations Portal"
              >
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                <span className="hidden xl:inline">Salon Portal</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A0F16] border border-[#D4AF37]/40 text-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowLocationModal(false)}
              className="absolute right-4 top-4 p-1 text-white/40 hover:text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 text-[#D4AF37] mb-3">
              <MapPin className="w-5 h-5" />
              <h3 className="font-serif font-bold text-lg text-white">Salon Location</h3>
            </div>
            <p className="text-xs text-white font-semibold mb-1">The Glossy Looks - Gachibowli Branch</p>
            <p className="text-xs text-white/70 mb-4">{settings.address}, {settings.city}</p>
            <div className="p-3 bg-white/5 rounded-xl text-xs space-y-2 mb-4 border border-white/10">
              <div className="flex justify-between">
                <span className="text-white/50">Working Hours:</span>
                <span className="font-semibold text-white">{settings.opening_hours}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Phone / WhatsApp:</span>
                <span className="font-semibold text-[#D4AF37]">+91 {settings.phone}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={settings.google_maps_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 text-center text-xs font-bold text-[#120B0F] bg-[#D4AF37] hover:bg-[#c9a32c] rounded-xl transition-colors"
              >
                Open Google Maps
              </a>
              <button
                onClick={() => setShowLocationModal(false)}
                className="py-2 px-4 text-xs font-semibold text-white/70 bg-white/10 hover:bg-white/20 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
