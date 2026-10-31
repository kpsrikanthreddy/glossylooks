/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ServiceItem, 
  ServiceCategory 
} from '../../types/salon';
import { SalonArtwork } from '../common/SalonArtwork';
import { Clock, Plus, Check, Sparkles, MessageCircle, ArrowRight, Search, X } from 'lucide-react';

interface ServiceMenuSectionProps {
  categories: ServiceCategory[];
  services: ServiceItem[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  cartServiceIds: string[];
  onToggleService: (service: ServiceItem) => void;
  onOpenMakeupModal: () => void;
  whatsappNumber?: string;
}

export const ServiceMenuSection: React.FC<ServiceMenuSectionProps> = ({
  categories,
  services,
  activeCategoryId,
  onSelectCategory,
  cartServiceIds,
  onToggleService,
  onOpenMakeupModal,
  whatsappNumber
}) => {
  const [salonSubcategory, setSalonSubcategory] = useState<'salon' | 'facials'>('salon');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const categoryPriority = ['makeup', 'mani-pedi', 'salon', 'spa', 'body-polishing'];
  const displayCategoryName = (category: ServiceCategory) =>
    category.slug === 'mani-pedi' ? 'Nails Art' : category.name;

  // Filter out Facials from top-level category chips (Facials is now a subcategory inside Salon)
  const visibleCategories = categories
    .filter(cat => cat.slug !== 'facials' && cat.name.toLowerCase() !== 'facials' && cat.id !== 'cat-facials')
    .sort((a, b) => {
      const aIndex = categoryPriority.indexOf(a.slug);
      const bIndex = categoryPriority.indexOf(b.slug);
      return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
    });

  const salonCategory = categories.find(c => c.slug === 'salon' || c.id === 'cat-salon');
  const facialsCategory = categories.find(c => c.slug === 'facials' || c.id === 'cat-facials');
  const bodyPolishingCategory = categories.find(c => c.slug === 'body-polishing' || c.id === 'cat-body');

  // Curated pre-bridal packages shown when a customer selects Body Polishing.
  // The original supplied menu artwork is intentionally retained for each card.
  const preBridalPackages: ServiceItem[] = bodyPolishingCategory ? [
    {
      id: 'pre-bridal-package-6999',
      category_id: bodyPolishingCategory.id,
      name: 'Pre Bridal Package',
      slug: 'pre-bridal-package-6999',
      description: 'Threading, face wax/threading, normal wax, basic facial, hair spa, manicure, pedicure, gel polish, haircut and full body massage.',
      benefits: 'Complete pre-bridal essentials package',
      duration_minutes: 240,
      price: 6999,
      is_active: true,
      is_bridal_festive: true,
      image_url: '/assets/body-polishing/pre-bridal-package-6999.png'
    },
    {
      id: 'pre-bridal-package-9999',
      category_id: bodyPolishingCategory.id,
      name: 'Pre Bridal Package',
      slug: 'pre-bridal-package-9999',
      description: 'Full face threading, full body wax, full body D-Tan, luxury facial, manicure, pedicure, nail extension, gel polish, body polish, hair spa and haircut.',
      benefits: 'Luxury full-body bridal preparation',
      duration_minutes: 300,
      price: 9999,
      is_active: true,
      is_bridal_festive: true,
      image_url: '/assets/body-polishing/pre-bridal-package-9999.png'
    },
    {
      id: 'pre-bridal-package-15000',
      category_id: bodyPolishingCategory.id,
      name: 'Pre Bridal Package',
      slug: 'pre-bridal-package-15000',
      description: 'Full face threading, full body wax and D-Tan, luxury facial, manicure, pedicure, acrylic nail extension, gel polish, luxury body polish, hair spa and advanced haircut.',
      benefits: 'Premium bridal glow and nail-care package',
      duration_minutes: 360,
      price: 15000,
      is_active: true,
      is_bridal_festive: true,
      image_url: '/assets/body-polishing/pre-bridal-package-15000.png'
    }
  ] : [];

  const isSalonActive = activeCategoryId === salonCategory?.id || activeCategoryId === 'cat-salon';

  // Reset to default salon subcategory whenever navigating to/from salon
  useEffect(() => {
    if (isSalonActive) {
      setSalonSubcategory('salon');
    }
  }, [activeCategoryId, isSalonActive]);

  let filteredServices: ServiceItem[] = [];
  if (activeCategoryId === 'all') {
    filteredServices = services;
  } else if (isSalonActive) {
    if (salonSubcategory === 'facials' && facialsCategory) {
      filteredServices = services.filter(s => s.category_id === facialsCategory.id);
    } else {
      filteredServices = services.filter(s => s.category_id === (salonCategory?.id || 'cat-salon'));
    }
  } else {
    filteredServices = services.filter(s => s.category_id === activeCategoryId);
  }

  if (activeCategoryId === bodyPolishingCategory?.id || activeCategoryId === 'cat-body') {
    filteredServices = [...filteredServices, ...preBridalPackages];
  }

  const matchedServices = searchQuery.trim()
    ? [...services, ...preBridalPackages].filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.benefits.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <section id="services-section" className="py-6 sm:py-10">
      {/* Service search moved here from the header so it sits directly above the menu. */}
      <div className="relative max-w-2xl mx-auto mb-7 sm:mb-9">
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search for makeup, facial, haircut..."
            className="w-full pl-11 pr-10 py-3 text-sm bg-white border border-[#EBD9D0] rounded-2xl shadow-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/35 focus:border-[#D4AF37] transition-all"
            aria-label="Search salon services"
          />
          <Search className="w-5 h-5 text-[#8C235A] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowSearchResults(false);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#5B132B]"
              aria-label="Clear service search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showSearchResults && searchQuery.trim() && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-[#EBD9D0] overflow-hidden z-30 max-h-80 overflow-y-auto">
            <div className="p-3 border-b border-[#F2E8E2] flex items-center justify-between text-xs text-slate-500">
              <span>{matchedServices.length} services found</span>
              <button type="button" onClick={() => setShowSearchResults(false)} className="font-medium text-[#8C235A] hover:text-[#5B132B]">Close</button>
            </div>
            {matchedServices.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No services matched &ldquo;{searchQuery}&rdquo;. Try bridal, hair spa, or manicure.</div>
            ) : (
              <div className="divide-y divide-[#F2E8E2]">
                {matchedServices.map(service => {
                  const inCart = cartServiceIds.includes(service.id);
                  return (
                    <div key={service.id} className="p-3 hover:bg-[#FFFBF8] transition-colors flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-slate-900 truncate">{service.name}</h4>
                        <p className="text-[11px] text-slate-500 truncate">{service.benefits || service.description}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500"><span>{service.duration_minutes} mins</span><span>·</span><span className="font-bold text-[#8C235A]">₹{service.discount_price || service.price}</span></div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleService(service)}
                        className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${inCart ? 'bg-emerald-600 text-white' : 'bg-[#5B132B] text-white hover:bg-[#430D1F]'}`}
                      >
                        {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{inCart ? 'Added' : 'Add'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#8C235A]">
            Service Menu
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
            Select Your Pampering Journey
          </h2>
        </div>

        {/* Category Tabs / Chips (Facials removed from top-level chips, nested in Salon) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none max-w-full">
          <button
            onClick={() => onSelectCategory('all')}
            className={`whitespace-nowrap px-4 py-2 text-xs font-semibold rounded-full transition-all shrink-0 ${
              activeCategoryId === 'all'
                ? 'bg-[#5B132B] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-[#FAF4F0] border border-[#EBD9D0]'
            }`}
          >
            All Services
          </button>
          {visibleCategories.map((cat) => {
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  if (cat.slug === 'makeup') {
                    onOpenMakeupModal();
                  }
                }}
                className={`whitespace-nowrap px-4 py-2 text-xs font-semibold rounded-full transition-all shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#5B132B] text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-[#FAF4F0] border border-[#EBD9D0]'
                }`}
              >
                <span>{displayCategoryName(cat)}</span>
                {cat.slug === 'makeup' && (
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visible Subcategory Navigation inside Salon */}
      {isSalonActive && (
        <div className="mb-6 p-3 sm:p-4 bg-gradient-to-r from-[#FAF4F0] via-white to-[#FAF4F0] rounded-2xl border border-[#EBD9D0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5B132B] text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0">
              ✦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C235A]">
                  Salon Subcategories
                </h4>
                <span className="text-[10px] bg-[#5B132B]/10 text-[#5B132B] font-semibold px-2 py-0.5 rounded-full">
                  {salonSubcategory === 'facials' ? 'Viewing Facials' : 'Viewing Salon Services'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Explore haircuts, styling & hair spa or select our signature Facials subcategory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSalonSubcategory('salon')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                salonSubcategory === 'salon'
                  ? 'bg-[#5B132B] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-[#FAF4F0] border border-[#EBD9D0]'
              }`}
            >
              <span>Salon Services</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${salonSubcategory === 'salon' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {services.filter(s => s.category_id === (salonCategory?.id || 'cat-salon')).length}
              </span>
            </button>

            <button
              onClick={() => setSalonSubcategory('facials')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                salonSubcategory === 'facials'
                  ? 'bg-[#5B132B] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-[#FAF4F0] border border-[#EBD9D0]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Facials</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${salonSubcategory === 'facials' ? 'bg-white/20 text-white' : 'bg-[#FAF4F0] text-[#8C235A] font-bold'}`}>
                {services.filter(s => s.category_id === (facialsCategory?.id || 'cat-facials')).length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Subcategory Breadcrumb / Switcher note when in Facials */}
      {isSalonActive && salonSubcategory === 'facials' && (
        <div className="mb-4 flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-[#EBD9D0]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold text-slate-900">
              Facials & Skin Rejuvenation Menu
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              · Subcategory of Salon
            </span>
          </div>
          <button
            onClick={() => setSalonSubcategory('salon')}
            className="text-xs font-semibold text-[#5B132B] hover:text-[#8C235A] flex items-center gap-1 transition-colors"
          >
            <span>← Back to Salon Services</span>
          </button>
        </div>
      )}

      {/* Grid on Desktop & Responsive Horizontal/Wrap on Mobile */}
      {filteredServices.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-sm text-slate-500 font-medium">No services currently found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredServices.map((srv) => {
            const inCart = cartServiceIds.includes(srv.id);
            const parentCat = categories.find(c => c.id === srv.category_id);

            return (
              <div
                key={srv.id}
                className="bg-white rounded-2xl border border-[#EBD9D0] overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all group"
              >
                <div>
                  {/* Image Slot at Top */}
                  <div className="w-full h-44 relative bg-[#FAF7F5] overflow-hidden">
                    {srv.image_url ? (
                      <img
                        src={srv.image_url}
                        alt={`${srv.name} menu`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <SalonArtwork 
                        type={parentCat?.slug || 'salon'} 
                        title={srv.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    )}
                    {srv.is_popular && (
                      <span className="absolute top-2.5 left-2.5 bg-[#5B132B] text-[#D4AF37] text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md">
                        ★ Popular
                      </span>
                    )}
                    {srv.is_bridal_festive && (
                      <span className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm text-[#5B132B] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D4AF37]/50 shadow-sm">
                        Festive / Bridal
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5">
                    <div className="text-[10px] uppercase tracking-wider text-[#8C235A] font-bold mb-1">
                      {parentCat?.name || 'Salon'}
                    </div>
                    <h3 className="font-serif font-bold text-base text-slate-900 group-hover:text-[#5B132B] transition-colors leading-snug">
                      {srv.name}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1.5 leading-relaxed">
                      {srv.description}
                    </p>

                    {srv.benefits && (
                      <div className="mt-2.5 p-2 bg-[#FAF4F0] rounded-lg text-[11px] text-[#5B132B] leading-tight flex items-start gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#D4AF37] shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{srv.benefits}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with Duration, Price & Action */}
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{srv.duration_minutes} mins</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
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

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`https://wa.me/91${(whatsappNumber || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi The Glossy Looks salon, I am interested in booking: ${srv.name}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                      title="Quick WhatsApp Enquiry"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => onToggleService(srv)}
                      className={`py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                        inCart
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[#5B132B] text-white hover:bg-[#430D1F] shadow-sm shadow-[#5B132B]/15'
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
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visible In-Page Facials Subcategory Section Banner when browsing Salon */}
      {isSalonActive && salonSubcategory === 'salon' && (
        <div className="mt-8 p-5 bg-gradient-to-r from-[#1A0F16] via-[#3B0E27] to-[#1A0F16] text-white rounded-2xl border border-[#D4AF37]/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-[#1A0F16] flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
                Salon Subcategory · Skin Aesthetics
              </span>
              <h4 className="font-serif font-bold text-base text-white">
                Explore Facials & Skin Radiance Menu
              </h4>
              <p className="text-xs text-white/70">
                Hydra-glow facials, 24K gold radiance, O3+ bridal treatments & herbal clean-ups.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSalonSubcategory('facials');
              const el = document.getElementById('services-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="py-2.5 px-4 rounded-xl text-xs font-bold text-[#1A0F16] bg-gradient-to-r from-[#D4AF37] to-[#F3D7D7] hover:brightness-105 transition-all shadow-md shrink-0 flex items-center gap-1.5"
          >
            <span>View Facials Menu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </section>
  );
};
