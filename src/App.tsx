/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ServiceCategory, 
  ServiceItem, 
  PackageCombo, 
  SalonSettings, 
  Appointment, 
  Order, 
  GalleryItem,
  Customer
} from './types/salon';
import { api } from './lib/api';
import { Header } from './components/common/Header';
import { CategoryCards } from './components/customer/CategoryCards';
import { DedicatedMakeupModal } from './components/customer/DedicatedMakeupModal';
import { ServiceMenuSection } from './components/customer/ServiceMenuSection';
import { CuratedSections } from './components/customer/CuratedSections';
import { BookingDrawer } from './components/customer/BookingDrawer';
import { AppointmentStatusModal } from './components/customer/AppointmentStatusModal';
import { CustomerAuthModal } from './components/customer/CustomerAuthModal';
import { CustomerPortal } from './components/customer/CustomerPortal';
import { EnquiryModal } from './components/customer/EnquiryModal';
import { MobileBottomNav } from './components/customer/MobileBottomNav';
import { AdminPortal } from './components/admin/AdminPortal';
import { ThermalReceipt } from './components/common/ThermalReceipt';
import { ArrowRight, Sparkles, Crown } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'customer' | 'admin'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      return 'admin';
    }
    return 'customer';
  });
  const [loading, setLoading] = useState(true);

  // Sync /admin URL with browser history & back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/admin')) {
        setCurrentView('admin');
      } else {
        setCurrentView('customer');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToAdmin = () => {
    if (window.location.pathname !== '/admin') {
      window.history.pushState(null, '', '/admin');
    }
    setCurrentView('admin');
  };

  const navigateToCustomer = () => {
    if (window.location.pathname === '/admin') {
      window.history.pushState(null, '', '/');
    }
    setCurrentView('customer');
  };

  // Data from backend
  const [settings, setSettings] = useState<SalonSettings>({
    brand_name: 'The Glossy Looks',
    salon_type: 'Professional Women Salon & Bridal Studio',
    address: '31, Vinayak Nagar, Gachibowli',
    city: 'Hyderabad, Telangana - 500032',
    phone: '9848012345',
    whatsapp: '9848012345',
    opening_hours: '10:00 AM to 10:00 PM (Monday to Sunday)',
    google_maps_url: 'https://share.google/TWPbPEEVlN5mPfqpL',
    announcement_text: 'Festive & Bridal Season Bookings Open! Avail complimentary hair styling on Bridal packages.'
  });
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [packages, setPackages] = useState<PackageCombo[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  // Customer UI & Auth state
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(() => {
    try {
      const saved = localStorage.getItem('the_glossy_looks_customer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = useState(false);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);

  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'home' | 'services' | 'book' | 'orders' | 'profile'>('home');

  // Receipt Preview Modal
  const [receiptModal, setReceiptModal] = useState<{
    isOpen: boolean;
    order?: Order | null;
    appointment?: Appointment | null;
    type?: 'bill' | 'service_ticket';
  }>({ isOpen: false });

  // Initial fetch
  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);
        const [settingsData, catsData, srvsData, pkgsData, galleryData] = await Promise.all([
          api.getSettings(),
          api.getCategories(),
          api.getServices(),
          api.getPackages(),
          api.getGallery()
        ]);
        if (settingsData) setSettings(settingsData);
        if (catsData) setCategories(catsData);
        if (srvsData) setServices(srvsData);
        if (pkgsData) setPackages(pkgsData);
        if (galleryData) setGallery(galleryData);
      } catch (err) {
        console.error('Failed to load store data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  const handleToggleService = (service: ServiceItem) => {
    setSelectedServices(prev => {
      const exists = prev.some(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  };

  const handleClearServices = () => {
    setSelectedServices([]);
  };

  const handleBookingSuccess = (newApt: Appointment) => {
    // Open receipt or notification
    console.log('Booked:', newApt);
  };

  const handleOpenReceipt = (order?: Order, apt?: Appointment, type?: 'bill' | 'service_ticket') => {
    setReceiptModal({
      isOpen: true,
      order: order || null,
      appointment: apt || null,
      type: type || 'bill'
    });
  };

  // If in admin view, render Admin Portal
  if (currentView === 'admin') {
    return (
      <>
        <AdminPortal
          onBackToWebsite={navigateToCustomer}
          onViewReceipt={handleOpenReceipt}
        />
        {receiptModal.isOpen && (
          <ThermalReceipt
            order={receiptModal.order}
            appointment={receiptModal.appointment}
            type={receiptModal.type}
            onClose={() => setReceiptModal({ isOpen: false })}
          />
        )}
      </>
    );
  }

  const handleRebookServices = (serviceNames: string[]) => {
    const matched = services.filter(s => serviceNames.includes(s.name));
    if (matched.length > 0) {
      setSelectedServices(prev => {
        const ids = new Set(prev.map(p => p.id));
        const toAdd = matched.filter(m => !ids.has(m.id));
        return [...prev, ...toAdd];
      });
      setIsCustomerPortalOpen(false);
      setIsBookingDrawerOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F5] flex flex-col selection:bg-[#F3D7D7] selection:text-[#5B132B]">
      {/* 1. Header */}
      <Header
        settings={settings}
        cartCount={selectedServices.length}
        currentCustomer={currentCustomer}
        onOpenCart={() => setIsBookingDrawerOpen(true)}
        onOpenBookings={() => {
          if (currentCustomer) {
            setIsCustomerPortalOpen(true);
          } else {
            setIsStatusModalOpen(true);
          }
        }}
        onOpenCustomerAuth={() => setIsCustomerAuthOpen(true)}
        onOpenCustomerPortal={() => setIsCustomerPortalOpen(true)}
        onOpenEnquiry={() => setIsEnquiryOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-4 sm:pt-8 pb-20 sm:pb-12">
        {/* Quick CTA Actions */}
        <section className="mb-4 sm:mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EBD9D0] shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF4F0] text-[#5B132B] flex items-center justify-center font-bold">
                <Crown className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-slate-900 leading-tight">
                  Bridal & Festive Season Consultations
                </h4>
                <p className="text-xs text-slate-500">
                  Complimentary pre-wedding skin and hair consultations in Gachibowli.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEnquiryOpen(true)}
                className="py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Enquire Now
              </button>
              <button
                onClick={() => setIsMakeupModalOpen(true)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-[#5B132B] bg-[#FAF4F0] hover:bg-[#F3E7E1] transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Makeup Menu</span>
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('services-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Book Appointment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* 3. Main Service Categories (Image Cards) */}
        <CategoryCards
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={(id) => {
            setActiveCategoryId(id);
            const el = document.getElementById('services-section');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenMakeupModal={() => setIsMakeupModalOpen(true)}
        />

        {/* 4. Full Service Menu (Categorized) */}
        <ServiceMenuSection
          categories={categories}
          services={services}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
          cartServiceIds={selectedServices.map(s => s.id)}
          onToggleService={handleToggleService}
          onOpenMakeupModal={() => setIsMakeupModalOpen(true)}
        />

        {/* 5. Curated Sections: Most Booked, Combos, Gallery, Reviews, Maps */}
        <CuratedSections
          services={services}
          packages={packages}
          gallery={gallery}
          settings={settings}
          cartServiceIds={selectedServices.map(s => s.id)}
          onToggleService={handleToggleService}
          onOpenBooking={() => setIsBookingDrawerOpen(true)}
          onOpenMakeupModal={() => setIsMakeupModalOpen(true)}
        />
      </main>

      {/* Customer Footer */}
      <footer className="bg-[#1F0714] text-white border-t border-[#3B0E27] py-10 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-white/70">
          <div className="flex items-center gap-3">
            <img
              src="/assets/brand/glossy-looks-logo.png"
              alt="The Glossy Looks logo"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div>
              <span className="font-serif font-bold text-sm text-white">The Glossy Looks</span>
              <p className="text-[11px] text-white/50">Professional Women Salon · 31, Vinayak Nagar, Gachibowli, Hyderabad</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                if (currentCustomer) {
                  setIsCustomerPortalOpen(true);
                } else {
                  setIsCustomerAuthOpen(true);
                }
              }}
              className="hover:text-white transition-colors"
            >
              My Bookings & Portal
            </button>
            <button
              onClick={() => setIsEnquiryOpen(true)}
              className="hover:text-white transition-colors"
            >
              Consultation Form
            </button>
            {settings?.whatsapp ? (
              <a
                href={`https://wa.me/91${settings.whatsapp.replace(/\D/g, '').slice(-10)}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
              >
                WhatsApp Us ({settings.whatsapp})
              </a>
            ) : null}
          </div>

          <p className="text-[11px] text-white/40">
            © {new Date().getFullYear()} The Glossy Looks. All rights reserved.
          </p>
        </div>
      </footer>

      {/* 6. Dedicated Makeup Modal */}
      <DedicatedMakeupModal
        isOpen={isMakeupModalOpen}
        onClose={() => setIsMakeupModalOpen(false)}
        services={services}
        cartServiceIds={selectedServices.map(s => s.id)}
        onToggleService={handleToggleService}
        onOpenBooking={() => setIsBookingDrawerOpen(true)}
      />

      {/* 7. Appointment Booking Drawer */}
      <BookingDrawer
        isOpen={isBookingDrawerOpen}
        onClose={() => setIsBookingDrawerOpen(false)}
        selectedServices={selectedServices}
        onRemoveService={handleRemoveService}
        onClearServices={handleClearServices}
        onBookingSuccess={handleBookingSuccess}
      />

      {/* 8. Appointment Status Modal */}
      <AppointmentStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onViewReceipt={apt => handleOpenReceipt(undefined, apt, 'service_ticket')}
      />

      {/* 9. Customer Auth Modal (Mobile OTP) */}
      <CustomerAuthModal
        isOpen={isCustomerAuthOpen}
        onClose={() => setIsCustomerAuthOpen(false)}
        onSuccess={(cust, token) => {
          setCurrentCustomer(cust);
          try {
            localStorage.setItem('the_glossy_looks_customer', JSON.stringify(cust));
            localStorage.setItem('the_glossy_looks_token', token);
          } catch (e) {
            console.error(e);
          }
          setIsCustomerPortalOpen(true);
        }}
      />

      {/* 10. Customer Portal (Appointments, Past Invoices, Profile, Rebooking) */}
      {currentCustomer && isCustomerPortalOpen && (
        <CustomerPortal
          customer={currentCustomer}
          onLogout={() => {
            setCurrentCustomer(null);
            try {
              localStorage.removeItem('the_glossy_looks_customer');
              localStorage.removeItem('the_glossy_looks_token');
            } catch (e) {
              console.error(e);
            }
            setIsCustomerPortalOpen(false);
          }}
          onRebookServices={handleRebookServices}
          onViewReceipt={handleOpenReceipt}
          onClose={() => setIsCustomerPortalOpen(false)}
        />
      )}

      {/* 11. Consultation & Wedding Enquiry Modal */}
      <EnquiryModal
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
      />

      {/* 12. Mobile Bottom Navigation (5 tabs: Home, Services, Book, Orders, Profile) */}
      <MobileBottomNav
        activeTab={mobileTab}
        onSelectTab={(tab) => {
          setMobileTab(tab);
          if (tab === 'home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (tab === 'services') {
            const el = document.getElementById('services-section');
            el?.scrollIntoView({ behavior: 'smooth' });
          } else if (tab === 'book') {
            setIsBookingDrawerOpen(true);
          } else if (tab === 'orders') {
            if (currentCustomer) {
              setIsCustomerPortalOpen(true);
            } else {
              setIsCustomerAuthOpen(true);
            }
          } else if (tab === 'profile') {
            if (currentCustomer) {
              setIsCustomerPortalOpen(true);
            } else {
              setIsCustomerAuthOpen(true);
            }
          }
        }}
        cartCount={selectedServices.length}
      />

      {/* 13. Thermal Receipt Preview & Print Modal */}
      {receiptModal.isOpen && (
        <ThermalReceipt
          order={receiptModal.order}
          appointment={receiptModal.appointment}
          type={receiptModal.type}
          onClose={() => setReceiptModal({ isOpen: false })}
        />
      )}
    </div>
  );
}
