/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Printer, X, CheckCircle, RefreshCw } from 'lucide-react';
import { Order, Appointment } from '../../types/salon';
import { api } from '../../lib/api';

interface ThermalReceiptProps {
  order?: Order | null;
  appointment?: Appointment | null;
  type?: 'bill' | 'service_ticket';
  onClose: () => void;
  salonPhone?: string;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  order,
  appointment,
  type = 'bill',
  onClose,
  salonPhone
}) => {
  const [reprinting, setReprinting] = React.useState(false);
  const [reprintMessage, setReprintMessage] = React.useState('');

  const handlePrint = () => {
    window.print();
  };

  const handleAgentReprint = async () => {
    setReprinting(true);
    setReprintMessage('');
    try {
      const payload = order
        ? {
            bill_number: order.bill_number,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            items: order.items.map(i => ({ name: i.item_name, quantity: i.quantity, price: i.total_price, staff: i.staff_name })),
            subtotal: order.subtotal,
            discount: order.discount,
            tax: order.tax_amount,
            total: order.grand_total,
            payment_method: order.primary_payment_mode,
            payment_status: order.payment_status,
            date: new Date(order.created_at).toLocaleString('en-IN')
          }
        : {
            booking_reference: appointment?.booking_reference,
            customer_name: appointment?.customer_name,
            customer_phone: appointment?.customer_phone,
            date: appointment?.appointment_date,
            time_slot: appointment?.time_slot,
            assigned_staff: appointment?.assigned_staff_name || 'Counter Assigned',
            services: appointment?.services.map(s => ({ name: s.name, duration: s.duration, price: s.price }))
          };

      await api.reprintJob({
        job_type: type,
        order_id: order?.id,
        appointment_id: appointment?.id,
        payload
      });

      setReprintMessage('Dispatched to Salon Thermal Print Agent queue!');
      setTimeout(() => setReprintMessage(''), 4000);
    } catch (err: any) {
      setReprintMessage(`Error: ${err.message}`);
    } finally {
      setReprinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          title="Close receipt preview"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <span className="text-xs uppercase tracking-widest text-[#5B132B] font-semibold">
            {type === 'bill' ? 'POS Customer Receipt (80mm)' : 'Salon Service Appointment Slip'}
          </span>
        </div>

        {/* PRINTABLE AREA */}
        <div id="printable-receipt" className="border border-dashed border-slate-300 rounded-lg p-5 bg-[#FCFBF9] font-mono text-xs text-slate-800 shadow-inner">
          <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
            <img
              src="/assets/brand/glossy-looks-logo.png"
              alt="The Glossy Looks logo"
              className="w-10 h-10 rounded-full object-cover mx-auto mb-1.5"
            />
            <h3 className="font-serif font-bold text-base text-slate-900 tracking-tight">THE GLOSSY LOOKS</h3>
            <p className="text-[10px] text-slate-600">Professional Women Salon & Bridal Studio</p>
            <p className="text-[9px] text-slate-500 mt-0.5">31, Vinayak Nagar, Gachibowli, Hyderabad - 500032</p>
            <p className="text-[9px] text-slate-500">Phone / WhatsApp: {salonPhone ? (salonPhone.startsWith('+') ? salonPhone : `+91 ${salonPhone.replace(/\D/g, '').slice(-10)}`) : '+91 9848012345'}</p>
            <p className="text-[9px] text-slate-400">Hours: 10:00 AM - 10:00 PM</p>
          </div>

          {type === 'bill' && order && (
            <>
              <div className="flex justify-between py-0.5 text-[10px]">
                <span className="text-slate-500">Bill No:</span>
                <span className="font-bold text-slate-900">{order.bill_number}</span>
              </div>
              <div className="flex justify-between py-0.5 text-[10px]">
                <span className="text-slate-500">Date:</span>
                <span>{new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
              <div className="flex justify-between py-0.5 text-[10px]">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold">{order.customer_name}</span>
              </div>
              <div className="flex justify-between py-0.5 text-[10px]">
                <span className="text-slate-500">Mobile:</span>
                <span>{order.customer_phone}</span>
              </div>
              {order.cashier_name && (
                <div className="flex justify-between py-0.5 text-[10px]">
                  <span className="text-slate-500">Cashier:</span>
                  <span>{order.cashier_name}</span>
                </div>
              )}

              <div className="border-t border-b border-dashed border-slate-300 my-2.5 py-1.5">
                <div className="flex justify-between font-bold text-[10px] text-slate-700 mb-1">
                  <span>ITEM / SERVICE</span>
                  <span>QTY  AMT(₹)</span>
                </div>
                {order.items.map((item, idx) => (
                  <div key={idx} className="mb-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="truncate max-w-[190px]">{item.item_name}</span>
                      <span>{item.quantity}  ₹{item.total_price.toFixed(2)}</span>
                    </div>
                    {item.staff_name && (
                      <div className="text-[9px] text-slate-500 pl-2">
                        Stylist: {item.staff_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-[10px] pb-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span>₹{order.subtotal.toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-₹{order.discount.toFixed(2)}</span>
                  </div>
                )}
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>GST (5%):</span>
                    <span>₹{order.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs text-slate-900 pt-1 border-t border-slate-200">
                  <span>GRAND TOTAL:</span>
                  <span>₹{order.grand_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Payment Mode:</span>
                  <span className="font-semibold text-slate-900">{order.primary_payment_mode} ({order.payment_status})</span>
                </div>
                {order.due_amount > 0 && (
                  <div className="flex justify-between text-[10px] text-rose-700 font-bold">
                    <span>Due Balance:</span>
                    <span>₹{order.due_amount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {type === 'service_ticket' && appointment && (
            <>
              <div className="flex justify-between py-0.5 text-[10px]">
                <span className="text-slate-500">Booking Ref:</span>
                <span className="font-bold text-slate-900">{appointment.booking_reference}</span>
              </div>
              <div className="flex justify-between py-0.5 text-[10px]">
                <span className="text-slate-500">Appt Date:</span>
                <span className="font-semibold">{appointment.appointment_date} at {appointment.time_slot}</span>
              </div>
              <div className="flex justify-between py-0.5 text-[10px]">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold">{appointment.customer_name}</span>
              </div>
              <div className="flex justify-between py-0.5 text-[10px]">
                <span className="text-slate-500">Mobile:</span>
                <span>{appointment.customer_phone}</span>
              </div>
              <div className="flex justify-between py-0.5 text-[10px]">
                <span className="text-slate-500">Assigned Stylist:</span>
                <span className="font-bold text-[#5B132B]">{appointment.assigned_staff_name || 'Station Stylist'}</span>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 my-2.5 py-1.5">
                <div className="font-bold text-[10px] text-slate-700 mb-1">SCHEDULED SERVICES:</div>
                {appointment.services.map((srv, idx) => (
                  <div key={idx} className="flex justify-between text-[10px] mb-0.5">
                    <span>{idx + 1}. {srv.name}</span>
                    <span>{srv.duration}m</span>
                  </div>
                ))}
              </div>

              {appointment.notes && (
                <div className="text-[9px] text-slate-600 bg-amber-50 p-1.5 rounded mb-2">
                  <span className="font-semibold">Notes:</span> {appointment.notes}
                </div>
              )}
            </>
          )}

          <div className="text-center pt-2.5 text-[9px] text-slate-500 space-y-0.5">
            <p>✨ Thank you for choosing The Glossy Looks! ✨</p>
            <p>For bridal & party queries: {salonPhone ? (salonPhone.startsWith('+') ? salonPhone : `+91 ${salonPhone.replace(/\D/g, '').slice(-10)}`) : '+91 9848012345'}</p>
            <p className="text-[8px] text-slate-400 mt-1">Software: The Glossy Looks POS v1.0</p>
          </div>
        </div>

        {reprintMessage && (
          <div className="mt-3 p-2 text-xs bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-1.5 border border-emerald-200">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{reprintMessage}</span>
          </div>
        )}

        {/* ACTIONS */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={handleAgentReprint}
            disabled={reprinting}
            className="flex-1 py-2 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reprinting ? 'animate-spin' : ''}`} />
            <span>Send to Print Agent</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2 px-3 text-xs font-medium text-white bg-[#5B132B] hover:bg-[#430D1F] rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-[#5B132B]/10"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Print Browser (80mm)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
