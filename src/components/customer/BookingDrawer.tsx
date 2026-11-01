/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  Sparkles, 
  MessageCircle, 
  CheckCircle, 
  ArrowRight,
  ShieldCheck,
  UserCheck,
  MapPin
} from 'lucide-react';
import { ServiceItem, Appointment, Staff, SalonBranch } from '../../types/salon';
import { api } from '../../lib/api';

interface BookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedServices: ServiceItem[];
  onRemoveService: (serviceId: string) => void;
  onClearServices: () => void;
  onBookingSuccess: (appointment: Appointment) => void;
  whatsappNumber?: string;
}

const defaultBranchesFallback: SalonBranch[] = [
  {
    id: 'tgl-gachibowli-main',
    name: 'Gachibowli Main Flagship',
    code: 'GCB-01',
    address: '31, Vinayak Nagar, Gachibowli',
    city: 'Hyderabad, Telangana - 500032',
    phone: '8985799459',
    whatsapp_number: '8985799459',
    is_active: true,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-10-31T09:09:41.008Z'
  },
  {
    id: 'brn-1793346038689',
    name: 'Kondapur Branch',
    code: 'KND-02',
    address: 'Road No 2, Kondapur',
    city: 'Hyderabad, Telangana - 500084',
    phone: '9491914422',
    whatsapp_number: '9491914422',
    is_active: true,
    created_at: '2026-10-30T07:40:38.689Z',
    updated_at: '2026-10-30T07:40:38.689Z'
  }
];

const TIME_SLOTS = [
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
  '08:00 PM', '08:30 PM', '09:00 PM'
];

export const BookingDrawer: React.FC<BookingDrawerProps> = ({
  isOpen,
  onClose,
  selectedServices,
  onRemoveService,
  onClearServices,
  onBookingSuccess,
  whatsappNumber
}) => {
  const [branches, setBranches] = useState<SalonBranch[]>(defaultBranchesFallback);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('tgl-gachibowli-main');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState('11:00 AM');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getBranches()
        .then(data => {
          const active = (data || []).filter(b => b.is_active !== false);
          const hasKondapur = active.some(b => b.id === 'brn-1793346038689' || b.name.toLowerCase().includes('kondapur'));
          const finalBranches = active.length > 0
            ? (hasKondapur ? active : [...active, defaultBranchesFallback[1]])
            : defaultBranchesFallback;
          setBranches(finalBranches);
        })
        .catch(err => console.warn('Could not load branches for booking:', err));

      api.getStaff()
        .then(data => setStaffList(data.filter(s => s.is_active)))
        .catch(err => console.warn('Could not load staff for booking:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedBranch = branches.find(b => b.id === selectedBranchId) || branches[0];
  const totalAmount = selectedServices.reduce((sum, s) => sum + (s.discount_price || s.price), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedBranchId) {
      setErrorMessage('Please select a salon branch (Mandatory)');
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }
    if (selectedServices.length === 0) {
      setErrorMessage('Please select at least one salon service');
      return;
    }

    setSubmitting(true);
    try {
      const selectedStaffObj = staffList.find(s => s.id === selectedStaffId);
      const newApt = await api.createAppointment({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.replace(/\D/g, '').slice(-10),
        branch_id: selectedBranchId,
        appointment_date: appointmentDate,
        time_slot: timeSlot,
        services: selectedServices.map(s => ({
          id: s.id,
          name: s.name,
          duration: s.duration_minutes,
          price: s.discount_price || s.price,
          staff_id: selectedStaffObj ? selectedStaffObj.id : undefined,
          staff_name: selectedStaffObj ? selectedStaffObj.name : undefined
        })),
        assigned_staff_id: selectedStaffObj ? selectedStaffObj.id : undefined,
        assigned_staff_name: selectedStaffObj ? selectedStaffObj.name : undefined,
        notes: notes.trim(),
        booking_source: 'website'
      });

      setConfirmedAppointment(newApt);
      onBookingSuccess(newApt);
      onClearServices();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit appointment enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getWhatsAppBookingUrl = (apt: Appointment) => {
    const serviceNames = apt.services.map(s => s.name).join(', ');
    const branchInfo = branches.find(b => b.id === (apt.branch_id || selectedBranchId)) || selectedBranch;
    const branchText = branchInfo ? `${branchInfo.name} (${branchInfo.city || branchInfo.address})` : 'The Glossy Looks';
    const msg = `*New Booking Request - The Glossy Looks Salon*
Booking Ref: ${apt.booking_reference}
Salon Branch: ${branchText}
Name: ${apt.customer_name}
Phone: ${apt.customer_phone}
Date: ${apt.appointment_date}
Time Slot: ${apt.time_slot}
Preferred Specialist: ${apt.assigned_staff_name || 'Any Available Specialist'}
Services: ${serviceNames}
Total: ₹${apt.final_amount}
Notes: ${apt.notes || 'None'}

Please confirm my appointment slot. Thank you!`;
    const cleanNumber = (branchInfo?.whatsapp_number || whatsappNumber || '8985799459').replace(/\D/g, '').slice(-10);
    return `https://wa.me/91${cleanNumber}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="bg-[#FAF7F5] w-full max-w-lg h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-[#EBD9D0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#5B132B] text-[#D4AF37] flex items-center justify-center font-bold text-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-slate-900 leading-tight">
                {confirmedAppointment ? 'Booking Confirmed' : 'Appointment Booking'}
              </h3>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                The Glossy Looks · {selectedBranch?.name || 'Flagship'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmed State View */}
        {confirmedAppointment ? (
          <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center text-center my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 ring-8 ring-emerald-50">
              <CheckCircle className="w-8 h-8" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-[#8C235A]">
              Enquiry Received Successfully
            </span>
            <h2 className="text-2xl font-serif font-bold text-slate-900 mt-1 mb-2">
              Appointment Scheduled!
            </h2>
            <p className="text-xs text-slate-600 max-w-xs mb-4">
              Your booking has been registered in the salon admin system. Our reception team will confirm your slot.
            </p>

            {/* Reference Card */}
            <div className="w-full bg-white rounded-2xl p-4 border border-[#EBD9D0] text-left text-xs space-y-2 mb-6 shadow-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Booking Reference:</span>
                <span className="font-mono font-bold text-[#5B132B]">{confirmedAppointment.booking_reference}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Salon Branch:</span>
                <span className="font-semibold text-slate-800">
                  {branches.find(b => b.id === confirmedAppointment.branch_id)?.name || selectedBranch?.name || 'Gachibowli Main Flagship'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Slot:</span>
                <span className="font-semibold text-slate-800">{confirmedAppointment.appointment_date} at {confirmedAppointment.time_slot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-800">{confirmedAppointment.customer_name} ({confirmedAppointment.customer_phone})</span>
              </div>
              {confirmedAppointment.assigned_staff_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Stylist:</span>
                  <span className="font-semibold text-[#8C235A]">{confirmedAppointment.assigned_staff_name}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-slate-500">Estimated Total:</span>
                <span className="font-bold text-slate-900 text-sm">₹{confirmedAppointment.final_amount}</span>
              </div>
            </div>

            {/* Honest Automated WhatsApp Confirmation Status */}
            <div className="w-full mb-4">
              {confirmedAppointment.whatsapp_status === 'sent' || (confirmedAppointment as any)?.whatsapp_delivery?.sent ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-900">
                      WhatsApp Confirmation Dispatched
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                      An official confirmation template was sent from our verified WhatsApp number (+91 89857 99459) to <span className="font-semibold">+91 {confirmedAppointment.customer_phone}</span>.
                    </p>
                  </div>
                </div>
              ) : confirmedAppointment.whatsapp_status === 'pending_approval' || (confirmedAppointment as any)?.whatsapp_delivery?.status === 'pending_approval' ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left flex items-start gap-2.5">
                  <MessageCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-900">
                      Booking Confirmed · WhatsApp Pending Meta Approval
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      Your booking is confirmed in our salon register. Automated WhatsApp delivery is temporarily in review by Meta for live non-test numbers. You can also chat directly below.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left flex items-start gap-2.5">
                  <MessageCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Booking Confirmed
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Booking confirmed. WhatsApp confirmation could not be sent yet. Our reception team will confirm your slot shortly.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Direct WhatsApp Chat Trigger */}
            <a
              href={getWhatsAppBookingUrl(confirmedAppointment)}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg mb-3 transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Chat With Salon On WhatsApp{whatsappNumber ? ` (${whatsappNumber})` : ''}</span>
            </a>

            <button
              onClick={() => {
                setConfirmedAppointment(null);
                onClose();
              }}
              className="py-2.5 px-4 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              Done & Return to Salon
            </button>
          </div>
        ) : (
          /* Normal Cart & Booking Form */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* 1. Selected Services Summary */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#8C235A]">
                  Selected Services ({selectedServices.length})
                </h4>
                {selectedServices.length > 0 && (
                  <button
                    onClick={onClearServices}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selectedServices.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#EBD9D0]">
                  <p className="text-xs text-slate-500 font-medium">Your appointment cart is empty.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Select haircuts, makeup, or facials from our service menu.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedServices.map(srv => (
                    <div
                      key={srv.id}
                      className="bg-white rounded-xl p-3 border border-[#EBD9D0] flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-slate-900 truncate">{srv.name}</h5>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{srv.duration_minutes} mins</span>
                          <span>·</span>
                          <span className="font-bold text-[#5B132B]">₹{srv.discount_price || srv.price}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveService(srv.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Subtotal calculation */}
                  <div className="bg-[#FAF4F0] p-3 rounded-xl border border-[#EBD9D0] text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Duration:</span>
                      <span className="font-semibold">{totalDuration} minutes</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-[#EBD9D0]/60">
                      <span>Subtotal:</span>
                      <span className="font-serif text-base text-[#5B132B]">₹{totalAmount}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Customer Appointment Form */}
            {selectedServices.length > 0 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#8C235A]">
                  Appointment Details
                </h4>

                {/* 1. Salon Branch (Mandatory) */}
                <div className="bg-[#FAF4F0] p-3 rounded-xl border border-[#EBD9D0]">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Select Salon Branch *
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={selectedBranchId}
                      onChange={e => setSelectedBranchId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#EBD9D0] rounded-xl focus:ring-2 focus:ring-[#8C235A]/30 focus:border-[#8C235A] outline-none font-medium text-slate-800 cursor-pointer shadow-xs"
                    >
                      <option value="" disabled>-- Select salon branch (Required) --</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} — {b.city || b.address}
                        </option>
                      ))}
                    </select>
                    <MapPin className="w-4 h-4 text-[#8C235A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {selectedBranch && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="truncate">{selectedBranch.address}, {selectedBranch.city}</span>
                    </div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Customer Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="e.g. Divya Varma"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#EBD9D0] rounded-xl focus:ring-2 focus:ring-[#8C235A]/30 focus:border-[#8C235A] outline-none"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mobile Number (WhatsApp) *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#EBD9D0] rounded-xl focus:ring-2 focus:ring-[#8C235A]/30 focus:border-[#8C235A] outline-none"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preferred Date *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={appointmentDate}
                      onChange={e => setAppointmentDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#EBD9D0] rounded-xl focus:ring-2 focus:ring-[#8C235A]/30 focus:border-[#8C235A] outline-none"
                    />
                    <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Time Slot Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Select Time Slot (10 AM to 10 PM) *
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white border border-[#EBD9D0] rounded-xl">
                    {TIME_SLOTS.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTimeSlot(slot)}
                        className={`py-1.5 text-[11px] rounded-lg font-medium transition-colors ${
                          timeSlot === slot
                            ? 'bg-[#5B132B] text-white font-bold'
                            : 'bg-[#FAF7F5] text-slate-700 hover:bg-[#FAF4F0]'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stylist Preference */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preferred Stylist / Specialist (Optional)
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={e => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#EBD9D0] rounded-xl focus:ring-2 focus:ring-[#8C235A]/30 focus:border-[#8C235A] outline-none text-slate-800"
                  >
                    <option value="">Any Available Specialist</option>
                    {staffList.filter(s => s.is_active).map(st => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.title || st.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Special Notes or Stylist Preference (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Bringing bridal lehenga for draping, sensitive skin..."
                    className="w-full p-2.5 text-xs bg-white border border-[#EBD9D0] rounded-xl focus:ring-2 focus:ring-[#8C235A]/30 focus:border-[#8C235A] outline-none resize-none"
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#5B132B]/20 active:scale-[0.99] disabled:opacity-60"
                >
                  {submitting ? (
                    <span>Submitting Enquiry...</span>
                  ) : (
                    <>
                      <span>Submit Booking (₹{totalAmount})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>No upfront payment required · Pay at salon after service</span>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
