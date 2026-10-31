/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sparkles, Clock, Crown, Plus, Check, MessageCircle } from 'lucide-react';
import { ServiceItem } from '../../types/salon';
import { SalonArtwork } from '../common/SalonArtwork';

interface DedicatedMakeupModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: ServiceItem[];
  cartServiceIds: string[];
  onToggleService: (service: ServiceItem) => void;
  onOpenBooking: () => void;
  whatsappNumber?: string;
}

export const DedicatedMakeupModal: React.FC<DedicatedMakeupModalProps> = ({
  isOpen,
  onClose,
  services,
  cartServiceIds,
  onToggleService,
  onOpenBooking,
  whatsappNumber
}) => {
  if (!isOpen) return null;

  // Filter makeup services
  const makeupServices = services.filter(s => s.category_id === 'cat-makeup');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#FAF7F5] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[#D4AF37]/30 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4A0E2E] via-[#6B1D48] to-[#3B0A21] p-5 sm:p-7 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            title="Close Makeup Menu"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <Crown className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">
              The Glossy Looks Couture Studio
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            Bridal & Professional Makeup Artistry
          </h2>
          <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl">
            Custom-tailored makeup journeys for weddings, sangeet, cocktail evenings, and traditional celebrations by our celebrity-trained artists.
          </p>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {makeupServices.map((srv) => {
              const inCart = cartServiceIds.includes(srv.id);
              return (
                <div
                  key={srv.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EBD9D0] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Visual Card Image */}
                    <div className="w-full h-36 rounded-xl overflow-hidden mb-3.5 relative bg-[#F6EEEC]">
                      <SalonArtwork type="makeup" title={srv.name} className="w-full h-full object-cover" />
                      {srv.is_popular && (
                        <span className="absolute top-2 left-2 bg-[#5B132B] text-[#D4AF37] text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                          ★ Most Requested
                        </span>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-serif font-bold text-base sm:text-lg text-slate-900 group-hover:text-[#5B132B] transition-colors">
                        {srv.name}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      {srv.description}
                    </p>

                    {srv.benefits && (
                      <div className="p-2 bg-[#FAF4F0] rounded-lg text-[11px] text-[#5B132B] mb-3 flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                        <span>{srv.benefits}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{srv.duration_minutes} mins</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-serif font-bold text-lg text-slate-900">
                          ₹{srv.discount_price || srv.price}
                        </span>
                        {srv.discount_price && (
                          <span className="text-xs text-slate-400 line-through">
                            ₹{srv.price}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/91${(whatsappNumber || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi The Glossy Looks, I would like to enquire about ${srv.name}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                        title="Enquire on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => onToggleService(srv)}
                        className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          inCart
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-[#5B132B] text-white hover:bg-[#430D1F] shadow-sm shadow-[#5B132B]/20'
                        }`}
                      >
                        {inCart ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add / Book</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white p-4 border-t border-[#EBD9D0] flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600">
            Selected Makeup items will be added to your booking summary.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="py-2 px-4 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Continue Browsing
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenBooking();
              }}
              className="py-2.5 px-5 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <span>Proceed to Booking</span>
              <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
