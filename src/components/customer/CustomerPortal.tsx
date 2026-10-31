/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  Receipt, 
  MapPin, 
  Sparkles, 
  LogOut, 
  ArrowRight, 
  RotateCcw, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Heart 
} from 'lucide-react';
import { Customer, Appointment, Order, ServiceItem } from '../../types/salon';
import { api } from '../../lib/api';

interface CustomerPortalProps {
  customer: Customer;
  onLogout: () => void;
  onRebookServices: (serviceNames: string[]) => void;
  onViewReceipt: (order?: Order, apt?: Appointment, type?: 'bill' | 'service_ticket') => void;
  onClose: () => void;
  whatsappNumber?: string;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  customer,
  onLogout,
  onRebookServices,
  onViewReceipt,
  onClose,
  whatsappNumber
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'appointments' | 'orders' | 'addresses'>('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCustomerData() {
      try {
        setLoading(true);
        const [aptsData, ordersData] = await Promise.all([
          api.getCustomerAppointments(customer.mobile),
          api.getCustomerOrders(customer.mobile)
        ]);
        setAppointments(aptsData);
        setOrders(ordersData);
      } catch (err) {
        console.error('Failed to load customer records:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCustomerData();
  }, [customer.mobile]);

  const upcomingApts = appointments.filter(a => ['Pending', 'Confirmed', 'Checked In', 'Service In Progress'].includes(a.status));
  const pastApts = appointments.filter(a => ['Completed', 'Cancelled', 'No Show'].includes(a.status));

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#FAF7F2] text-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[#D4AF37]/30 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#1A0F16] via-[#3B0E27] to-[#1A0F16] text-white p-5 sm:p-6 relative shrink-0 border-b border-[#D4AF37]/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F3D7D7] text-[#1A0F16] font-serif font-bold text-lg flex items-center justify-center shadow-lg">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-bold text-xl sm:text-2xl text-white">
                    {customer.name}
                  </h2>
                  <span className="text-[10px] bg-[#D4AF37] text-[#1A0F16] font-bold px-2 py-0.5 rounded-full">
                    {customer.loyalty_points} Glam Points
                  </span>
                </div>
                <p className="text-xs text-white/70 mt-0.5">
                  +91 {customer.mobile} {customer.email && `· ${customer.email}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onLogout}
                className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
              <button
                onClick={onClose}
                className="py-1.5 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#c9a32c] text-[#1A0F16] text-xs font-bold transition-colors"
              >
                Return to Salon
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 border-t border-white/10 pt-3 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'appointments'
                  ? 'bg-white text-[#1A0F16] shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>My Appointments ({appointments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'bg-white text-[#1A0F16] shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Past Orders & Invoices ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'profile'
                  ? 'bg-white text-[#1A0F16] shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile & Preferences</span>
            </button>

            <button
              onClick={() => setActiveTab('addresses')}
              className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'addresses'
                  ? 'bg-white text-[#1A0F16] shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Saved Addresses</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB 1: APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {/* Upcoming */}
              <div>
                <h3 className="font-serif font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
                  <span>Upcoming Salon Visits</span>
                  {upcomingApts.length > 0 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      {upcomingApts.length} Scheduled
                    </span>
                  )}
                </h3>

                {upcomingApts.length === 0 ? (
                  <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                    No upcoming appointments. Schedule your pampering session today!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingApts.map(apt => (
                      <div
                        key={apt.id}
                        className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8DCD5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-xs text-[#5B132B]">
                              {apt.booking_reference}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              apt.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {apt.status}
                            </span>
                          </div>
                          <h4 className="font-serif font-bold text-base text-slate-900">
                            {apt.services.map(s => s.name).join(' + ')}
                          </h4>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {apt.appointment_date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {apt.time_slot}
                            </span>
                            {apt.assigned_staff_name && (
                              <span className="text-[#5B132B] font-semibold">
                                Stylist: {apt.assigned_staff_name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onViewReceipt(undefined, apt, 'service_ticket')}
                            className="py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                          >
                            View Slip
                          </button>
                          <a
                            href={`https://wa.me/91${(whatsappNumber || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi The Glossy Looks, enquiring about appointment ${apt.booking_reference}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="py-2 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl"
                          >
                            Message Reception
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Appointments */}
              <div>
                <h3 className="font-serif font-bold text-base text-slate-900 mb-3">
                  Past Salon History
                </h3>
                {pastApts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No past appointments recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {pastApts.map(apt => (
                      <div
                        key={apt.id}
                        className="p-3 bg-white/70 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{apt.services.map(s => s.name).join(', ')}</div>
                          <div className="text-slate-500 text-[11px]">{apt.appointment_date} · Total: ₹{apt.final_amount}</div>
                        </div>
                        <button
                          onClick={() => onRebookServices(apt.services.map(s => s.name))}
                          className="py-1.5 px-3 text-xs font-semibold text-[#5B132B] bg-[#FAF4F0] hover:bg-[#F3E7E1] rounded-lg flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Rebook</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS & INVOICES */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-base text-slate-900">
                  Salon POS Orders & Downloadable Invoices
                </h3>
                <span className="text-xs text-slate-500">{orders.length} Invoices Found</span>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                  No completed POS bills or orders found under your mobile number.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map(order => (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-xs text-[#5B132B]">
                            {order.bill_number}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                            {order.invoice_number || 'Tax Invoice'}
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            {order.payment_status}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm text-slate-900">
                          {order.items.map(i => i.item_name).join(', ')}
                        </h4>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                          <span>{new Date(order.created_at).toLocaleDateString('en-IN')}</span>
                          <span>·</span>
                          <span>Paid via {order.primary_payment_mode}</span>
                          <span>·</span>
                          <span className="font-bold text-slate-900">Total: ₹{order.grand_total}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewReceipt(order, undefined, 'bill')}
                          className="py-2 px-3.5 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl flex items-center gap-1.5 shadow-sm"
                        >
                          <Receipt className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>View Receipt / Invoice</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROFILE & PREFERENCES */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 text-xs">
              <h3 className="font-serif font-bold text-base text-slate-900">
                Member Information & Skin Care Profile
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-[#FAF7F2] rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Full Name</span>
                  <span className="font-bold text-sm text-slate-900">{customer.name}</span>
                </div>

                <div className="p-3 bg-[#FAF7F2] rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Registered Mobile</span>
                  <span className="font-bold text-sm text-slate-900">+91 {customer.mobile}</span>
                </div>

                <div className="p-3 bg-[#FAF7F2] rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Birthday</span>
                  <span className="font-medium text-slate-800">{customer.birthday || 'Not specified'}</span>
                </div>

                <div className="p-3 bg-[#FAF7F2] rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Lifetime Salon Spend</span>
                  <span className="font-bold text-[#5B132B] text-sm">₹{customer.total_spend}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Allergies & Sensitivities</span>
                </span>
                <p className="text-slate-700">
                  {customer.allergies || 'No specific sensitivities on record. Inform your stylist during consultation.'}
                </p>
              </div>

              <div className="p-3 bg-[#FAF7F2] rounded-xl space-y-1">
                <span className="font-bold text-slate-800">Preferences & Notes</span>
                <p className="text-slate-600">
                  {customer.preferences || customer.notes || 'Prefers peaceful salon experience and herbal products.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SAVED ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 text-xs">
              <h3 className="font-serif font-bold text-base text-slate-900">
                Saved Locations
              </h3>

              <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-slate-200 flex items-start justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs">Primary Address</span>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    {customer.address || '31, Vinayak Nagar, Gachibowli, Hyderabad - 500032'}
                  </p>
                </div>
                <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold">
                  Default
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
