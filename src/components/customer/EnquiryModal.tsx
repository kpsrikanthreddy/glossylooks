/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Send, Phone, MessageCircle, CheckCircle, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultService?: string;
  whatsappNumber?: string;
  phoneContact?: string;
}

export const EnquiryModal: React.FC<EnquiryModalProps> = ({
  isOpen,
  onClose,
  defaultService = 'Bridal & Party Makeup',
  whatsappNumber,
  phoneContact
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceInterest, setServiceInterest] = useState(defaultService);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setLoading(true);
    try {
      await api.createEnquiry({
        name,
        phone,
        email,
        service_interest: serviceInterest,
        message
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-[#D4AF37]/40 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="font-serif font-bold text-xl text-slate-900 mb-1">
              Enquiry Received!
            </h3>
            <p className="text-xs text-slate-600 mb-4 max-w-xs mx-auto">
              Our salon manager in Gachibowli will reach out on WhatsApp/Call shortly to assist with your requirements.
            </p>
            <div className="flex gap-2">
              <a
                href={`https://wa.me/91${(whatsappNumber || phoneContact || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi The Glossy Looks, I submitted an enquiry for ${serviceInterest}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 bg-[#25D366] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Chat on WhatsApp</span>
              </a>
              <button
                onClick={onClose}
                className="py-2.5 px-4 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <div className="flex items-center gap-1.5 text-[#8C235A] mb-1">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Consultation & Inquiries
                </span>
              </div>
              <h3 className="font-serif font-bold text-xl text-slate-900">
                Talk to Our Salon Stylists
              </h3>
              <p className="text-[11px] text-slate-500">
                Questions about packages, wedding dates, or group bookings? Send us a quick note.
              </p>
            </div>

            <div>
              <label className="block font-semibold mb-1">Your Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Swathi"
                className="w-full p-2 bg-white border border-[#E8DCD5] rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Mobile / WhatsApp Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="10-digit number"
                className="w-full p-2 bg-white border border-[#E8DCD5] rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Service of Interest</label>
              <input
                type="text"
                value={serviceInterest}
                onChange={e => setServiceInterest(e.target.value)}
                className="w-full p-2 bg-white border border-[#E8DCD5] rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Message or Wedding Date</label>
              <textarea
                rows={2}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell us about the occasion, date, or preferences..."
                className="w-full p-2 bg-white border border-[#E8DCD5] rounded-xl outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#5B132B] hover:bg-[#430D1F] text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-[#5B132B]/20"
            >
              <span>{loading ? 'Submitting...' : 'Send Enquiry to Salon'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>

            <div className="text-center pt-1 text-[11px] text-slate-500 flex items-center justify-center gap-2">
              <a href={`tel:+91${(phoneContact || whatsappNumber || '').replace(/\D/g, '').slice(-10)}`} className="flex items-center gap-1 font-semibold text-[#5B132B] hover:underline">
                <Phone className="w-3.5 h-3.5" />
                <span>Call {phoneContact || whatsappNumber || 'Salon'}</span>
              </a>
              <span>·</span>
              <a href={`https://wa.me/91${(whatsappNumber || phoneContact || '').replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-emerald-700 hover:underline">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Us</span>
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
