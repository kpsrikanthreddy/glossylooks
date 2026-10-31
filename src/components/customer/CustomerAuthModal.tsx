/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Phone, KeyRound, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { Customer } from '../../types/salon';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer, token: string) => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [demoMessage, setDemoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendCustomerOTP(cleanMobile);
      setDemoMessage(res.message);
      setStep('otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!otp.trim()) {
      setErrorMessage('Please enter the 4-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
      const res = await api.verifyCustomerOTP(cleanMobile, otp.trim());
      onSuccess(res.customer, res.token);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1A0F16] border border-[#D4AF37]/30 text-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-white/50 hover:text-white rounded-full hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#8C235A] text-[#1A0F16] mx-auto flex items-center justify-center font-bold text-lg shadow-lg mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
            The Glossy Looks Member Access
          </span>
          <h3 className="font-serif font-bold text-xl text-white mt-1">
            {step === 'phone' ? 'Login via Mobile OTP' : 'Enter 4-Digit OTP'}
          </h3>
          <p className="text-xs text-white/70 mt-1">
            {step === 'phone'
              ? 'Access past salon orders, rebook favorite services & loyalty points.'
              : `We sent a code to +91 ${mobile}`}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="9849021234"
                  maxLength={10}
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]"
                />
                <Phone className="w-4 h-4 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-rose-900/40 border border-rose-500/50 rounded-xl text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-[#1A0F16] bg-gradient-to-r from-[#D4AF37] to-[#F3D7D7] hover:brightness-105 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#D4AF37]/20 disabled:opacity-60"
            >
              <span>{loading ? 'Sending Code...' : 'Get Login OTP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2 text-[10px] text-white/50 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instant SMS verification · Demo login: try 9849021234</span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {demoMessage && (
              <div className="p-2.5 bg-[#D4AF37]/15 border border-[#D4AF37]/40 rounded-xl text-xs text-[#E6C265]">
                {demoMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                One-Time Password (OTP)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 1234"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-white/5 border border-white/20 rounded-xl text-white tracking-widest text-center text-sm font-mono placeholder-white/30 focus:outline-none focus:border-[#D4AF37]"
                />
                <KeyRound className="w-4 h-4 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-rose-900/40 border border-rose-500/50 rounded-xl text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="py-2.5 px-3 rounded-xl text-xs font-medium bg-white/10 text-white/70 hover:bg-white/15"
              >
                Change Number
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-[#1A0F16] bg-gradient-to-r from-[#D4AF37] to-[#F3D7D7] hover:brightness-105 transition-all flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-60"
              >
                <span>{loading ? 'Verifying...' : 'Verify & Enter'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
