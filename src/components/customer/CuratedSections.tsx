/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Crown, 
  Sparkles, 
  Clock, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Plus, 
  Check, 
  CheckCircle2, 
  ArrowUpRight 
} from 'lucide-react';
import { ServiceItem, PackageCombo, GalleryItem, SalonSettings } from '../../types/salon';
import { SalonArtwork } from '../common/SalonArtwork';

interface CuratedSectionsProps {
  services: ServiceItem[];
  packages: PackageCombo[];
  gallery: GalleryItem[];
  settings: SalonSettings;
  cartServiceIds: string[];
  onToggleService: (service: ServiceItem) => void;
  onOpenBooking: () => void;
  onOpenMakeupModal: () => void;
}

export const CuratedSections: React.FC<CuratedSectionsProps> = ({
  services,
  packages,
  gallery,
  settings,
  cartServiceIds,
  onToggleService,
  onOpenBooking,
  onOpenMakeupModal
}) => {
  const mostBooked = services.filter(s => s.is_popular).slice(0, 4);

  return (
    <div className="space-y-16 sm:space-y-24 py-8">
      {/* 1. MOST BOOKED SERVICES */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-[#8C235A]">
              Trending in Gachibowli
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
              Most Booked Services This Week
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {mostBooked.map((srv) => {
            const inCart = cartServiceIds.includes(srv.id);
            return (
              <div
                key={srv.id}
                className="bg-white rounded-2xl border border-[#EBD9D0] overflow-hidden p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group"
              >
                <div>
                  <div className="w-full h-36 rounded-xl overflow-hidden mb-3 bg-[#FAF7F5]">
                    <SalonArtwork type={srv.category_id.replace('cat-', '')} title={srv.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <h3 className="font-serif font-bold text-base text-slate-900 group-hover:text-[#5B132B] transition-colors line-clamp-1">
                    {srv.name}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                    {srv.benefits || srv.description}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{srv.duration_minutes}m</span>
                    </div>
                    <span className="font-serif font-bold text-base text-slate-900">
                      ₹{srv.discount_price || srv.price}
                    </span>
                  </div>
                  <button
                    onClick={() => onToggleService(srv)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                      inCart
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#5B132B] text-white hover:bg-[#430D1F]'
                    }`}
                  >
                    {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{inCart ? 'Added' : 'Add'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. BRIDAL & FESTIVE COMBOS / PACKAGES */}
      <section className="bg-gradient-to-br from-[#4A0E2E]/5 via-[#FAF4F0] to-[#D4AF37]/10 rounded-3xl p-6 sm:p-10 border border-[#EBD9D0]">
        <div className="max-w-2xl mb-8">
          <div className="flex items-center gap-2 mb-1 text-[#8C235A]">
            <Crown className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs uppercase tracking-widest font-bold">
              Exclusive Value Combos
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
            Curated Salon & Bridal Packages
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Enjoy full-day head-to-toe pampering with multi-service bundles crafted to provide maximum luxury at celebratory bundled pricing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-2xl p-6 border border-[#EBD9D0] shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#8C235A] bg-[#FAF4F0] px-2.5 py-1 rounded-full">
                    Complete Combo
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{pkg.duration_minutes} mins</span>
                  </div>
                </div>

                <h3 className="font-serif font-bold text-lg text-slate-900 mb-2">
                  {pkg.name}
                </h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  {pkg.description}
                </p>

                <div className="space-y-2 mb-6">
                  {pkg.service_names.map((name, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 line-through block">
                    ₹{pkg.original_price}
                  </span>
                  <span className="font-serif font-bold text-xl text-[#5B132B]">
                    ₹{pkg.package_price}
                  </span>
                </div>
                <a
                  href={`https://wa.me/91${(settings?.whatsapp || settings?.phone || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi The Glossy Looks, I would like to book the package: ${pkg.name} (₹${pkg.package_price})`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] transition-colors flex items-center gap-1.5"
                >
                  <span>Book Package</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. ARTIST GALLERY / LATEST WORKS */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-[#8C235A]">
              Real Transformations
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
              Artist Portfolio & Latest Works
            </h2>
          </div>
          <button
            onClick={onOpenMakeupModal}
            className="text-xs font-semibold text-[#5B132B] hover:text-[#8C235A] flex items-center gap-1"
          >
            <span>Book Makeup Artist</span>
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {gallery.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-2xl border border-[#EBD9D0] overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              <div className="h-52 w-full relative bg-[#FBF7F5] overflow-hidden">
                <SalonArtwork type="makeup" title={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {item.category}
                </span>
              </div>
              <div className="p-4">
                <h4 className="font-serif font-bold text-sm text-slate-900 group-hover:text-[#5B132B] transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. LOCATION, TIMINGS & GOOGLE MAPS */}
      <section className="bg-gradient-to-r from-[#2D0A1C] to-[#4A0E2E] rounded-3xl p-6 sm:p-10 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-2 mb-2 text-[#D4AF37]">
              <MapPin className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest font-bold">
                Visit Our Sanctuary
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight mb-3">
              The Glossy Looks Salon & Bridal Studio
            </h2>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed mb-6">
              Located conveniently in the heart of Gachibowli, close to DLF Cybercity and Hitec City. Walk-ins and pre-booked appointments welcomed 7 days a week.
            </p>

            <div className="space-y-3 text-xs mb-6">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>{settings.address}, {settings.city}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>Working Hours: {settings.opening_hours}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>Phone / WhatsApp: +91 {settings.phone}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={settings.google_maps_url}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-5 rounded-xl text-xs font-bold text-[#2D0A1C] bg-[#D4AF37] hover:bg-[#c49f2e] transition-colors flex items-center gap-2 shadow-lg"
              >
                <MapPin className="w-4 h-4" />
                <span>Get Directions on Google Maps</span>
              </a>
              <button
                onClick={onOpenBooking}
                className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              >
                Book Appointment Online
              </button>
            </div>
          </div>

          {/* Interactive Map Visual Placeholder */}
          <div className="h-64 sm:h-80 rounded-2xl overflow-hidden border border-white/20 bg-[#1D0612] p-4 flex flex-col justify-between relative shadow-2xl">
            <div className="flex justify-between items-center text-xs text-white/80">
              <span className="font-semibold">Google Maps Live Route</span>
              <span className="text-[#D4AF37]">Gachibowli, Hyderabad</span>
            </div>
            <div className="my-auto text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#5B132B] mx-auto flex items-center justify-center text-[#D4AF37] shadow-lg ring-4 ring-[#D4AF37]/30">
                <MapPin className="w-6 h-6 animate-bounce" />
              </div>
              <h4 className="font-serif font-bold text-sm text-white">31, Vinayak Nagar, Gachibowli</h4>
              <p className="text-[11px] text-white/70 max-w-xs mx-auto">
                Near Gachibowli flyover & Telecom Nagar. Dedicated client parking available.
              </p>
            </div>
            <a
              href={settings.google_maps_url}
              target="_blank"
              rel="noreferrer"
              className="text-center py-2 text-xs font-medium text-[#D4AF37] bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              Click here to launch Google Maps navigation ↗
            </a>
          </div>
        </div>
      </section>

      {/* FLOATING WHATSAPP BUTTON (Dynamic from salon settings) */}
      <aside aria-label="Quick contact" className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
        <a
          href={`https://wa.me/91${(settings?.whatsapp || settings?.phone || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent('Hi The Glossy Looks Salon, I would like to book an appointment')}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 bg-[#25D366] text-white py-3 px-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all group"
          title="Chat with The Glossy Looks on WhatsApp"
        >
          <MessageCircle className="w-5 h-5 fill-current" />
          <span className="text-xs font-bold hidden sm:inline">WhatsApp Us</span>
        </a>
      </aside>
    </div>
  );
};
