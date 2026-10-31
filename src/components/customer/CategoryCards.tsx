/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ServiceCategory } from '../../types/salon';
import { SalonArtwork } from '../common/SalonArtwork';
import { Sparkles, ArrowRight } from 'lucide-react';

interface CategoryCardsProps {
  categories: ServiceCategory[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onOpenMakeupModal: () => void;
}

export const CategoryCards: React.FC<CategoryCardsProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  onOpenMakeupModal
}) => {
  // Facials is now a subcategory inside Salon, not a separate home-page category card
  const displayCategories = categories.filter(
    cat => cat.slug !== 'facials' && cat.name.toLowerCase() !== 'facials' && cat.id !== 'cat-facials'
  );

  return (
    <section className="py-6 sm:py-10">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#8C235A]">
            Explore Services
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
            Curated Beauty & Wellness Categories
          </h2>
        </div>
        <button
          onClick={() => onSelectCategory('all')}
          className="text-xs font-semibold text-[#5B132B] hover:text-[#8C235A] flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Responsive Grid / Horizontal Scroll for Mobile (5 core categories) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {displayCategories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          const isMakeup = cat.slug === 'makeup';

          return (
            <button
              key={cat.id}
              onClick={() => {
                if (isMakeup) {
                  onOpenMakeupModal();
                  onSelectCategory(cat.id);
                } else {
                  onSelectCategory(cat.id);
                }
              }}
              className={`group flex flex-col rounded-2xl overflow-hidden text-left transition-all p-3 border relative ${
                isActive
                  ? 'bg-white border-[#5B132B] ring-2 ring-[#5B132B]/20 shadow-md'
                  : 'bg-white border-[#EBD9D0] hover:border-[#5B132B]/50 hover:shadow-sm'
              }`}
            >
              {isMakeup && (
                <span className="absolute top-2 right-2 z-10 w-2 h-2 rounded-full bg-[#D4AF37] ring-4 ring-[#D4AF37]/20" />
              )}

              {/* Artwork Box */}
              <div className="w-full h-24 sm:h-28 rounded-xl overflow-hidden mb-2.5 bg-[#FAF7F5] group-hover:scale-[1.02] transition-transform">
                <SalonArtwork type={cat.slug} title={cat.name} className="w-full h-full object-cover" />
              </div>

              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-sm text-slate-900 group-hover:text-[#5B132B] transition-colors truncate">
                  {cat.name}
                </h3>
                {isMakeup && (
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                )}
              </div>

              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {cat.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};
