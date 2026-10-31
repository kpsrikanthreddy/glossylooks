/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight 
} from 'lucide-react';
import { Appointment } from '../../types/salon';
import { api } from '../../lib/api';

interface AppointmentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewReceipt: (apt: Appointment) => void;
  whatsappNumber?: string;
  phoneContact?: string;
}

export const AppointmentStatusModal: React.FC<AppointmentStatusModalProps> = ({
  isOpen,
  onClose,
  onViewReceipt,
  whatsappNumber,
  phoneContact
}) => {
  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const allApts = await api.getAppointments();
      const cleanPhone = searchPhone.replace(/\D/g, '');
      const filtered = allApts.filter(a => 
        a.customer_phone.includes(cleanPhone) ||
        a.booking_reference.toLowerCase().includes(searchPhone.toLowerCase().trim())
      );
      setAppointments(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'Confirmed':
        return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">Confirmed</span>;
      case 'Checked In':
        return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">Checked In</span>;
      case 'Service In Progress':
        return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">In Progress</span>;
      case 'Completed':
        return <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">Completed</span>;
      case 'Cancelled':
      case 'No Show':
        return <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">{status}</span>;
      default:
        return <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">Pending Review</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FAF7F5] rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200 border border-[#EBD9D0]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C235A]">
            Customer Self-Service
          </span>
          <h3 className="font-serif font-bold text-xl text-slate-900">
            Check Appointment & Bill Status
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter your 10-digit mobile number or booking reference to track your salon visit.
          </p>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              required
              value={searchPhone}
              onChange={e => setSearchPhone(e.target.value)}
              placeholder="e.g. 9849021234 or TGL-BK-2026-101"
              className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-[#EBD9D0] rounded-xl focus:ring-2 focus:ring-[#8C235A]/30 focus:border-[#8C235A] outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-4 text-xs font-bold text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl transition-colors disabled:opacity-60 shrink-0"
          >
            {loading ? 'Searching...' : 'Find'}
          </button>
        </form>

        {/* Results */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {hasSearched && appointments.length === 0 && !loading && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-700 font-semibold">No appointments found</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Please double check the phone number or contact salon reception directly{phoneContact ? ` at +91 ${phoneContact.replace(/\D/g, '').slice(-10)}` : ''}.
              </p>
            </div>
          )}

          {appointments.map(apt => (
            <div
              key={apt.id}
              className="bg-white rounded-2xl p-4 border border-[#EBD9D0] shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <span className="font-mono font-bold text-xs text-[#5B132B]">
                    {apt.booking_reference}
                  </span>
                  <div className="text-[11px] text-slate-500">
                    {apt.appointment_date} at {apt.time_slot}
                  </div>
                </div>
                {getStatusBadge(apt.status)}
              </div>

              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Client:</span>
                  <span className="font-medium">{apt.customer_name}</span>
                </div>
                {apt.assigned_staff_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Stylist:</span>
                    <span className="font-medium text-[#5B132B]">{apt.assigned_staff_name}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1 border-t border-slate-100">
                  <span className="text-slate-700">Services ({apt.services.length}):</span>
                  <span>₹{apt.final_amount}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => onViewReceipt(apt)}
                  className="text-xs font-semibold text-[#5B132B] hover:text-[#8C235A] flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Slip / Bill</span>
                </button>

                <a
                  href={`https://wa.me/91${(whatsappNumber || phoneContact || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi The Glossy Looks, checking on my booking ${apt.booking_reference}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-emerald-700 hover:underline"
                >
                  Ask Reception ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
